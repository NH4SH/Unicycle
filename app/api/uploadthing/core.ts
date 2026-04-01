import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { getAuthSession } from "@/lib/auth";
import { optimizeAndReplaceUploadedImage } from "@/lib/image-upload-processing.server";

const f = createUploadthing();

export const ourFileRouter = {
  listingImage: f({
    image: {
      maxFileSize: "32MB",
      maxFileCount: 6
    }
  })
    .middleware(async () => {
      const session = await getAuthSession();
      if (!session?.user) throw new UploadThingError("Unauthorized");

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        const optimized = await optimizeAndReplaceUploadedImage(file, "listing");

        return {
          uploaderId: metadata.userId,
          url: optimized.url,
          width: optimized.width,
          height: optimized.height,
          size: optimized.size
        };
      } catch {
        throw new UploadThingError("We couldn't optimize one of your listing photos. Try a different image and upload again.");
      }
    }),
  profileImage: f({
    image: {
      maxFileSize: "16MB",
      maxFileCount: 1
    }
  })
    .middleware(async () => {
      const session = await getAuthSession();
      if (!session?.user) throw new UploadThingError("Unauthorized");

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        const optimized = await optimizeAndReplaceUploadedImage(file, "profile");

        return {
          uploaderId: metadata.userId,
          url: optimized.url,
          width: optimized.width,
          height: optimized.height,
          size: optimized.size
        };
      } catch {
        throw new UploadThingError("We couldn't optimize that profile photo. Try a different image and upload again.");
      }
    })
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
