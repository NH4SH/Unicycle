import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
};

export function EmptyState({ title, description, ctaHref, ctaLabel }: EmptyStateProps) {
  return (
    <div className="surface-panel-dashed p-10 text-center">
      <div className="surface-pill mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center text-uva-orange dark:text-orange-50">
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="editorial-eyebrow">HoosFinds</p>
      <h3 className="mt-2 font-display text-3xl font-extrabold tracking-tight">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {ctaHref && ctaLabel ? (
        <Button className="mt-6" asChild>
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
