"use client";

import { UploadButton } from "@uploadthing/react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";

type ProfileImagePickerProps = {
  value: string;
  username: string;
  name?: string | null;
  disabled?: boolean;
  onChange: (url: string) => void;
};

export function ProfileImagePicker({ value, username, name, disabled, onChange }: ProfileImagePickerProps) {
  return (
    <div className="surface-subtle flex flex-col gap-4 rounded-[1.5rem] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <UserAvatar name={name} username={username} imageUrl={value || null} className="h-20 w-20" fallbackClassName="text-lg" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">Profile photo</p>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Use a clear headshot or personal avatar. We’ll show this on your profile, listings, and messages.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <UploadButton<OurFileRouter, "profileImage">
          endpoint="profileImage"
          onClientUploadComplete={(result: { url: string }[]) => {
            const nextUrl = result[0]?.url;
            if (nextUrl) {
              onChange(nextUrl);
            }
          }}
          onUploadError={(error: Error) => {
            toast.error(error.message);
          }}
          disabled={disabled}
          appearance={{
            container: "ut-button:rounded-full",
            button:
              "ut-ready:bg-[#E57200] ut-ready:text-white ut-uploading:bg-[#1F2A44] ut-button:h-11 ut-button:px-5 ut-button:rounded-full ut-button:text-sm ut-button:font-medium",
            allowedContent: "hidden"
          }}
          content={{
            button({ isUploading }) {
              return isUploading ? "Uploading..." : "Upload photo";
            }
          }}
        />
        {value ? (
          <Button type="button" variant="outline" onClick={() => onChange("")} disabled={disabled}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
