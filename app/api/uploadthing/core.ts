import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { getAuthSession } from "@/lib/auth";

const f = createUploadthing();

export const ourFileRouter = {
  listingImage: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 6
    }
  })
    .middleware(async () => {
      const session = await getAuthSession();
      if (!session?.user) throw new UploadThingError("Unauthorized");

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploaderId: metadata.userId,
        url: file.url
      };
    })
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
