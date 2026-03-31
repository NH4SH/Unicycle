"use client";

import { generateReactHelpers } from "@uploadthing/react";

import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();

type UploadThingFileLike = {
  url?: string | null;
  ufsUrl?: string | null;
  serverData?: {
    url?: string | null;
  } | null;
};

export function getUploadedFileUrl(file: UploadThingFileLike) {
  return file.ufsUrl ?? file.url ?? file.serverData?.url ?? null;
}
