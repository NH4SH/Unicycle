import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <p className="editorial-eyebrow">HoosFinds</p>
      <h1 className="font-display text-5xl font-extrabold tracking-tight">This find isn&apos;t here anymore.</h1>
      <p className="max-w-md text-sm leading-7 text-muted-foreground">
        The listing may have sold, been removed, or moved out of the feed.
      </p>
      <Button asChild>
        <Link href="/market">Back to browse</Link>
      </Button>
    </div>
  );
}
