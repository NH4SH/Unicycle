import "server-only";

import heicConvert from "heic-convert";
import sharp from "sharp";
import { UTApi, UTFile } from "uploadthing/server";

const utapi = new UTApi();

const HEIC_EXTENSIONS = [".heic", ".heif", ".heics", ".heifs"];
const HEIC_MIME_TYPES = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];

const IMAGE_PIPELINE_CONFIG = {
  listing: {
    maxSourceBytes: 20 * 1024 * 1024,
    maxDimension: 2000,
    initialQuality: 84,
    reducedQuality: 80,
    minimumQuality: 76,
    targetMaxBytes: 2_400_000
  },
  profile: {
    maxSourceBytes: 10 * 1024 * 1024,
    maxDimension: 1400,
    initialQuality: 86,
    reducedQuality: 82,
    minimumQuality: 78,
    targetMaxBytes: 900_000
  }
} as const;

type ImageUploadPurpose = keyof typeof IMAGE_PIPELINE_CONFIG;

type UploadThingUploadedFile = {
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
  ufsUrl: string;
};

type OptimizedUploadResult = {
  key: string;
  url: string;
  width: number;
  height: number;
  size: number;
  contentType: string;
};

function hasHeicExtension(fileName: string) {
  const lower = fileName.toLowerCase();
  return HEIC_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function isHeicLikeFile(fileName: string, mimeType: string) {
  return HEIC_MIME_TYPES.includes(mimeType.toLowerCase()) || hasHeicExtension(fileName);
}

function toJpegName(fileName: string, purpose: ImageUploadPurpose) {
  const withoutExtension = fileName.replace(/\.[^.]+$/u, "");
  return `${withoutExtension}-${purpose}.jpg`;
}

async function fetchUploadedFileBuffer(file: UploadThingUploadedFile) {
  const sourceUrl = file.ufsUrl || file.url;
  const response = await fetch(sourceUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("We couldn't read the uploaded image back for optimization.");
  }

  return Buffer.from(await response.arrayBuffer());
}

async function normalizeInputBuffer(file: UploadThingUploadedFile, sourceBuffer: Buffer) {
  if (!isHeicLikeFile(file.name, file.type)) {
    return sourceBuffer;
  }

  const converted = await heicConvert({
    buffer: sourceBuffer,
    format: "JPEG",
    quality: 0.94
  });

  if (Buffer.isBuffer(converted)) {
    return converted;
  }

  if (converted instanceof Uint8Array) {
    return Buffer.from(converted);
  }

  return Buffer.from(new Uint8Array(converted));
}

async function renderOptimizedJpeg(sourceBuffer: Buffer, maxDimension: number, quality: number) {
  return sharp(sourceBuffer, { failOn: "none" })
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true
    })
    .jpeg({
      quality,
      mozjpeg: true,
      progressive: true
    })
    .toBuffer({ resolveWithObject: true });
}

async function optimizeImageBuffer(sourceBuffer: Buffer, purpose: ImageUploadPurpose) {
  const config = IMAGE_PIPELINE_CONFIG[purpose];
  const attempts = [
    { maxDimension: config.maxDimension, quality: config.initialQuality },
    { maxDimension: Math.round(config.maxDimension * 0.92), quality: config.reducedQuality },
    { maxDimension: Math.round(config.maxDimension * 0.84), quality: config.minimumQuality }
  ];

  let finalResult: Awaited<ReturnType<typeof renderOptimizedJpeg>> | null = null;

  for (const attempt of attempts) {
    const nextResult = await renderOptimizedJpeg(sourceBuffer, attempt.maxDimension, attempt.quality);
    finalResult = nextResult;

    if (nextResult.data.byteLength <= config.targetMaxBytes) {
      return nextResult;
    }
  }

  if (!finalResult) {
    throw new Error("We couldn't optimize this image.");
  }

  return finalResult;
}

async function safeDeleteUploadThingFile(fileKey: string) {
  try {
    await utapi.deleteFiles(fileKey);
  } catch {
    // Keep optimization resilient even if storage cleanup misses once.
  }
}

// UploadThing gives HoosFinds a raw file first. We immediately normalize that
// upload into a display-safe JPEG so listing/profile surfaces only persist the
// optimized asset URL, not the original iPhone-sized upload.
export async function optimizeAndReplaceUploadedImage(file: UploadThingUploadedFile, purpose: ImageUploadPurpose): Promise<OptimizedUploadResult> {
  try {
    const config = IMAGE_PIPELINE_CONFIG[purpose];
    if (file.size > config.maxSourceBytes) {
      throw new Error(
        purpose === "listing"
          ? "Listing photos can be up to 20 MB each."
          : "Profile photos can be up to 10 MB each."
      );
    }

    const sourceBuffer = await fetchUploadedFileBuffer(file);
    const normalizedBuffer = await normalizeInputBuffer(file, sourceBuffer);
    const optimized = await optimizeImageBuffer(normalizedBuffer, purpose);
    const uploadBytes = new Uint8Array(optimized.data);

    const uploadResult = await utapi.uploadFiles(
      new UTFile([uploadBytes], toJpegName(file.name, purpose), {
        type: "image/jpeg",
        lastModified: Date.now()
      }),
      {
        contentDisposition: "inline"
      }
    );

    if (uploadResult.error || !uploadResult.data) {
      throw new Error(uploadResult.error?.message ?? "We couldn't store the optimized image.");
    }

    await safeDeleteUploadThingFile(file.key);

    return {
      key: uploadResult.data.key,
      url: uploadResult.data.ufsUrl,
      width: optimized.info.width ?? 0,
      height: optimized.info.height ?? 0,
      size: optimized.data.byteLength,
      contentType: "image/jpeg"
    };
  } catch (error) {
    await safeDeleteUploadThingFile(file.key);

    if (process.env.NODE_ENV !== "production") {
      console.error("[image-upload-processing] failed to optimize upload", {
        fileName: file.name,
        fileType: file.type,
        purpose,
        error
      });
    }

    throw error;
  }
}
