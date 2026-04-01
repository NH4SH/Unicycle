"use client";

const HEIC_EXTENSIONS = [".heic", ".heif", ".heics", ".heifs"];
const HEIC_MIME_TYPES = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];

type PrepareUploadImagesOptions = {
  maxDimension: number;
  quality?: number;
  purpose: "listing" | "profile";
};

function hasHeicExtension(fileName: string) {
  const lower = fileName.toLowerCase();
  return HEIC_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function isHeicLikeFile(file: File) {
  return HEIC_MIME_TYPES.includes(file.type.toLowerCase()) || hasHeicExtension(file.name);
}

function replaceWithJpegExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/u, "") + ".jpg";
}

async function convertHeicToBlob(file: File, quality: number) {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality
  });

  return Array.isArray(converted) ? converted[0] : converted;
}

async function loadImageDimensions(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Could not decode image."));
      nextImage.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function normalizeImageBlobToJpeg(fileName: string, blob: Blob, maxDimension: number, quality: number, lastModified: number) {
  const image = await loadImageDimensions(blob);
  const longestSide = Math.max(image.width, image.height);
  const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare the image for upload.");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const outputBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (!nextBlob) {
        reject(new Error("Could not prepare the image for upload."));
        return;
      }

      resolve(nextBlob);
    }, "image/jpeg", quality);
  });

  return new File([outputBlob], replaceWithJpegExtension(fileName), {
    type: "image/jpeg",
    lastModified
  });
}

export async function prepareImagesForUpload(files: File[], options: PrepareUploadImagesOptions) {
  const quality = options.quality ?? 0.86;

  return Promise.all(
    files.map(async (file) => {
      if (!isHeicLikeFile(file)) {
        return file;
      }

      try {
        // Normalize HEIC/HEIF before UploadThing sees the file so the stored
        // asset is already browser-safe everywhere HoosFinds renders it.
        const convertedBlob = await convertHeicToBlob(file, quality);
        return await normalizeImageBlobToJpeg(file.name, convertedBlob, options.maxDimension, quality, file.lastModified);
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[upload-image-prep] could not convert HEIC/HEIF image", {
            fileName: file.name,
            fileType: file.type,
            purpose: options.purpose,
            error
          });
        }

        const contextLabel = options.purpose === "listing" ? "listing photo" : "profile photo";
        throw new Error(
          `We couldn't process one of your HEIC photos for this ${contextLabel}. Try a different image or export it as JPEG and try again.`
        );
      }
    })
  );
}
