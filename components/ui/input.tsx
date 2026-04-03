import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "surface-field flex h-11 w-full rounded-[1.15rem] px-4 py-2 text-sm text-foreground placeholder:text-foreground/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uva-blue/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-white/42",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
