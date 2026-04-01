"use client";

import Link from "next/link";

export function AuthEmailPreview({ previewUrl }: { previewUrl: string | null }) {
  if (!previewUrl) {
    return null;
  }

  return (
    <div className="rounded-[1.4rem] border border-border bg-background/70 px-4 py-4 text-sm leading-7 text-muted-foreground">
      Development preview:{" "}
      <Link href={previewUrl} className="font-semibold text-foreground underline decoration-border underline-offset-4">
        open the email link directly
      </Link>
      .
    </div>
  );
}
