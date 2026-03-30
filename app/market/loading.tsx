import { GridSkeleton } from "@/components/shared/grid-skeleton";

export default function MarketLoading() {
  return (
    <div className="container space-y-6 py-8 md:space-y-8 md:py-10">
      <div className="space-y-2">
        <div className="h-3 w-32 rounded-full bg-secondary" />
        <div className="h-10 w-72 rounded-2xl bg-secondary" />
        <div className="h-4 w-[28rem] max-w-full rounded-full bg-secondary" />
      </div>
      <GridSkeleton count={8} />
    </div>
  );
}
