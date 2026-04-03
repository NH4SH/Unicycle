import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "surface-field flex min-h-[110px] w-full rounded-[1.15rem] px-4 py-3 text-sm text-foreground placeholder:text-foreground/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uva-blue/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-white/42",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
