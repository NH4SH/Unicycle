import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-uva-orange text-white shadow-soft hover:-translate-y-0.5 hover:bg-[#d86b00] active:translate-y-0",
        secondary:
          "border border-border bg-card/80 text-foreground hover:border-uva-orange/45 hover:bg-card",
        ghost: "text-muted-foreground hover:bg-card/70 hover:text-foreground",
        outline: "border border-border bg-transparent text-foreground hover:bg-card/60",
        blue: "bg-uva-blue text-white shadow-soft hover:-translate-y-0.5 hover:bg-[#1c2540]"
      },
      size: {
        default: "h-11 px-6",
        sm: "min-h-11 px-4 text-xs md:min-h-9",
        lg: "h-12 px-8",
        icon: "touch-icon"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
