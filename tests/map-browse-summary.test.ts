import assert from "node:assert/strict";
import test from "node:test";

import { summarizeMapBrowseLocations } from "@/lib/map-browse-summary";

test("deduplicates listings within each community and across all areas", () => {
  const { communities, summary } = summarizeMapBrowseLocations([
    {
      id: "newcomb",
      communityId: "central-grounds",
      communityName: "Central Grounds",
      communityDescription: "Core campus",
      listings: [{ id: "listing-1" }, { id: "listing-2" }],
      fashionListings: [{ id: "listing-1" }]
    },
    {
      id: "rotunda",
      communityId: "central-grounds",
      communityName: "Central Grounds",
      communityDescription: "Core campus",
      listings: [{ id: "listing-1" }],
      fashionListings: [{ id: "listing-1" }]
    },
    {
      id: "flats",
      communityId: "west-main",
      communityName: "West Main",
      communityDescription: "West Main",
      listings: [{ id: "listing-1" }, { id: "listing-3" }],
      fashionListings: [{ id: "listing-3" }]
    }
  ]);

  const centralGrounds = communities.find((community) => community.id === "central-grounds");
  const westMain = communities.find((community) => community.id === "west-main");

  assert.ok(centralGrounds);
  assert.ok(westMain);
  assert.equal(centralGrounds.totalCount, 2);
  assert.equal(centralGrounds.fashionCount, 1);
  assert.equal(centralGrounds.locationCount, 2);
  assert.equal(westMain.totalCount, 2);
  assert.equal(westMain.fashionCount, 1);
  assert.equal(summary.totalCount, 3);
  assert.equal(summary.fashionCount, 2);
  assert.equal(summary.locationCount, 3);
  assert.equal(communities[0]?.id, "central-grounds");
});
