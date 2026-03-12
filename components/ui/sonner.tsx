"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="light"
      toastOptions={{
        classNames: {
          toast: "rounded-2xl border border-border bg-white",
          title: "font-semibold",
          description: "text-muted-foreground"
        }
      }}
    />
  );
}
