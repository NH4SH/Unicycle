"use client";

import { Toaster as Sonner } from "sonner";

import { useTheme } from "@/components/providers/theme-provider";

export function Toaster() {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      toastOptions={{
        classNames: {
          toast: "rounded-2xl border border-border bg-card text-foreground",
          title: "font-semibold",
          description: "text-muted-foreground"
        }
      }}
    />
  );
}
