import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-5xl font-black">Drop not found</h1>
      <p className="max-w-md text-muted-foreground">This listing might have sold or been removed from UniCycle.</p>
      <Button asChild>
        <Link href="/market">Back to marketplace</Link>
      </Button>
    </div>
  );
}
