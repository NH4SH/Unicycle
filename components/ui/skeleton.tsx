import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-2xl bg-gradient-to-r from-secondary via-card to-secondary bg-[length:220%_100%]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
