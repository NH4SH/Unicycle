import { Skeleton } from "@/components/ui/skeleton";

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="surface-panel space-y-3 p-3">
          <Skeleton className="aspect-[4/5] w-full rounded-[1.5rem]" />
          <Skeleton className="h-3 w-1/3 rounded-full" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ))}
    </div>
  );
}
