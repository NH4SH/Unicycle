import { getCampusPickupCommunityById, type CampusPickupCommunityId } from "@/lib/campus-pickup-locations";

type ListingIdSource = {
  id: string;
};

export type MapBrowseLocationSummarySource = {
  id: string;
  communityId: CampusPickupCommunityId;
  communityName: string;
  communityDescription: string;
  listings: ListingIdSource[];
  fashionListings: ListingIdSource[];
};

export type MapBrowseTotals = {
  totalCount: number;
  fashionCount: number;
  locationCount: number;
};

export type MapBrowseCommunitySummary = {
  id: CampusPickupCommunityId;
  name: string;
  shortLabel: string;
  description: string;
  totalCount: number;
  fashionCount: number;
  locationCount: number;
};

export function summarizeMapBrowseLocations(locations: MapBrowseLocationSummarySource[]) {
  const totalListingIds = new Set<string>();
  const totalFashionIds = new Set<string>();
  const communityBuckets = new Map<
    CampusPickupCommunityId,
    {
      sample: MapBrowseLocationSummarySource;
      locationCount: number;
      listingIds: Set<string>;
      fashionIds: Set<string>;
      priority: number;
    }
  >();

  for (const location of locations) {
    for (const listing of location.listings) {
      totalListingIds.add(listing.id);
    }

    for (const listing of location.fashionListings) {
      totalFashionIds.add(listing.id);
    }

    const communityMeta = getCampusPickupCommunityById(location.communityId);
    const bucket =
      communityBuckets.get(location.communityId) ??
      {
        sample: location,
        locationCount: 0,
        listingIds: new Set<string>(),
        fashionIds: new Set<string>(),
        priority: communityMeta?.priority ?? 0
      };

    bucket.locationCount += 1;

    for (const listing of location.listings) {
      bucket.listingIds.add(listing.id);
    }

    for (const listing of location.fashionListings) {
      bucket.fashionIds.add(listing.id);
    }

    communityBuckets.set(location.communityId, bucket);
  }

  const communities = [...communityBuckets.values()]
    .map((bucket) => {
      const communityMeta = getCampusPickupCommunityById(bucket.sample.communityId);

      return {
        id: bucket.sample.communityId,
        name: communityMeta?.name ?? bucket.sample.communityName,
        shortLabel: communityMeta?.shortLabel ?? bucket.sample.communityName,
        description: communityMeta?.description ?? bucket.sample.communityDescription,
        totalCount: bucket.listingIds.size,
        fashionCount: bucket.fashionIds.size,
        locationCount: bucket.locationCount,
        priority: bucket.priority
      };
    })
    .sort((a, b) => {
      if (b.fashionCount === a.fashionCount) {
        if (b.totalCount === a.totalCount) {
          return b.priority - a.priority;
        }

        return b.totalCount - a.totalCount;
      }

      return b.fashionCount - a.fashionCount;
    })
    .map((community) => ({
      id: community.id,
      name: community.name,
      shortLabel: community.shortLabel,
      description: community.description,
      totalCount: community.totalCount,
      fashionCount: community.fashionCount,
      locationCount: community.locationCount
    }));

  return {
    communities,
    summary: {
      totalCount: totalListingIds.size,
      fashionCount: totalFashionIds.size,
      locationCount: locations.length
    } satisfies MapBrowseTotals
  };
}
