import assert from "node:assert/strict";
import test from "node:test";

import {
  getCampusPickupLocation,
  getKnownCampusPickupLocations,
  getPickupLocationPublicLabel,
  normalizePickupLocationValue
} from "@/lib/campus-pickup-locations";
import {
  buildRestrictedPickupEntries,
  getSelectablePickupValue,
  getSelectedPickupLocationNames,
  togglePickupSelection
} from "@/lib/pickup-option-utils";

test("normalizes exact high-confidence campus aliases", () => {
  assert.equal(normalizePickupLocationValue("Newcomb Hall"), "Newcomb");
  assert.equal(normalizePickupLocationValue("main library"), "Shannon");
  assert.equal(getCampusPickupLocation("ting pavilion")?.name, "Pavilion");
});

test("preserves ambiguous custom pickup text", () => {
  assert.equal(normalizePickupLocationValue("main street"), "main street");
  assert.equal(normalizePickupLocationValue("north grounds"), "north grounds");
  assert.equal(getCampusPickupLocation("main street"), null);
  assert.equal(getPickupLocationPublicLabel("north grounds"), "north grounds");
});

test("restricted meetup entries keep stored values while still resolving known aliases", () => {
  const entries = buildRestrictedPickupEntries(["main library", "north grounds", "Custom quad spot"]);

  assert.equal(entries[0]?.value, "main library");
  assert.equal(entries[0]?.displayName, "Shannon");
  assert.equal(entries[1]?.value, "north grounds");
  assert.equal(entries[1]?.displayName, "north grounds");
  assert.equal(entries[2]?.value, "Custom quad spot");

  assert.deepEqual(togglePickupSelection([], "main library", 1, { normalize: false }), ["main library"]);
  assert.deepEqual(getSelectedPickupLocationNames(["main library", "north grounds"], entries), ["Shannon"]);
  assert.equal(getSelectablePickupValue("Shannon", entries), "main library");
});

test("known-location extraction still recognizes exact legacy aliases", () => {
  const knownLocations = getKnownCampusPickupLocations(["main library", "main street", "Newcomb"]);

  assert.deepEqual(
    knownLocations.map((location) => location.name),
    ["Shannon", "Newcomb"]
  );
});
