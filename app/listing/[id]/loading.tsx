import { Skeleton } from "@/components/ui/skeleton";

export default function ListingLoading() {
  return (
    <div className="container space-y-8 py-8 md:py-10">
      <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <Skeleton className="aspect-[4/5] w-full rounded-[2rem]" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-24 w-20 rounded-[1.3rem]" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-10 w-4/5 rounded-2xl" />
          <Skeleton className="h-10 w-1/3 rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-[1.8rem]" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40 w-full rounded-[1.8rem]" />
            <Skeleton className="h-40 w-full rounded-[1.8rem]" />
          </div>
          <Skeleton className="h-36 w-full rounded-[1.8rem]" />
        </div>
      </div>
    </div>
  );
}
