import { GridSkeleton } from "@/components/shared/grid-skeleton";

export default function MarketLoading() {
  return (
    <div className="container space-y-6 py-8">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-xl bg-secondary" />
        <div className="h-4 w-72 rounded-xl bg-secondary" />
      </div>
      <GridSkeleton count={10} />
    </div>
  );
}
