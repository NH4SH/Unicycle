import { BrowseModeTabs } from "@/components/market/browse-mode-tabs";
import { MapBrowseClient } from "@/components/market/map-browse-client";
import { getAuthSession } from "@/lib/auth";
import { getMapBrowseData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const session = await getAuthSession();
  const data = await getMapBrowseData(session?.user.id);

  return (
    <div className="container space-y-4 pt-2 pb-8 md:space-y-5 md:pt-3 md:pb-10">
      <div className="grid gap-2 border-b border-border/80 pb-4">
        <div className="space-y-1">
          <p className="editorial-eyebrow">Map browse</p>
          <h1 className="font-display text-[2rem] font-extrabold tracking-tight sm:text-[2.35rem] md:text-[2.8rem]">
            See what&apos;s near your corner of Grounds.
          </h1>
          <p className="max-w-3xl text-sm text-foreground/72 dark:text-white/74 md:text-[0.98rem]">
            Browse HoosFinds geographically by pickup community, then zoom into the spots students actually use for local handoffs.
          </p>
        </div>
        <BrowseModeTabs active="map" />
      </div>

      <MapBrowseClient data={data} />
    </div>
  );
}
