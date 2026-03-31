"use client";

import { Fragment, type ReactNode } from "react";

import { getPlaceMapHref, splitTextWithPlaceLinks } from "@/lib/place-links";
import { cn } from "@/lib/utils";

type LinkedPlaceTextProps = {
  text: string;
  className?: string;
  linkClassName?: string;
};

export function LinkedPlaceText({ text, className, linkClassName }: LinkedPlaceTextProps) {
  const lines = text.split("\n");

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {lines.map((line, lineIndex) => {
        const parts = splitTextWithPlaceLinks(line);

        return (
          <Fragment key={`${line}-${lineIndex}`}>
            {parts.map((part, index) =>
              part.type === "place" ? (
                <a
                  key={`${part.value}-${index}`}
                  href={part.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "underline decoration-border/35 underline-offset-4 transition hover:text-uva-blue hover:decoration-uva-blue",
                    linkClassName
                  )}
                >
                  {part.value}
                </a>
              ) : (
                <Fragment key={`${part.value}-${index}`}>{part.value}</Fragment>
              )
            )}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </Fragment>
        );
      })}
    </span>
  );
}

type PlaceMapLinkProps = {
  place: string;
  className?: string;
  children?: ReactNode;
};

export function PlaceMapLink({ place, className, children }: PlaceMapLinkProps) {
  const href = getPlaceMapHref(place);

  if (!href) {
    return <>{children ?? place}</>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("transition hover:text-uva-blue", className)}
    >
      {children ?? place}
    </a>
  );
}
