import { Skeleton } from "@/components/ui/skeleton";

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="space-y-2 rounded-3xl border border-border/70 bg-white p-3">
          <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-7 w-1/2 rounded-full" />
        </div>
      ))}
    </div>
  );
}
