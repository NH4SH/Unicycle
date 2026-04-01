import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-10">
      <Card className="surface-panel-strong w-full max-w-xl">
        <CardContent className="space-y-7 p-8">
          <div className="space-y-3 text-center">
            <p className="editorial-eyebrow">HoosFinds</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">{title}</h1>
            <p className="mx-auto max-w-md text-sm leading-7 text-muted-foreground">{description}</p>
          </div>

          {children}

          {footer ? (
            footer
          ) : (
            <div className="space-y-2 text-center text-xs leading-6 text-muted-foreground">
              <p>
                UVA domains only: <span className="font-semibold text-foreground">@virginia.edu</span> and
                <span className="font-semibold text-foreground"> @mail.virginia.edu</span>.
              </p>
              <p>
                Want the meetup basics first?{" "}
                <Link
                  href="/safety"
                  className="font-semibold text-foreground/88 transition hover:text-uva-orange dark:text-white/92 dark:hover:text-uva-orange"
                >
                  Read safety guidance
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
