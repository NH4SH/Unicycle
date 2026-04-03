import {
  getCampusPickupLocation,
  getPickupLocationContextLabel,
  getPickupLocationPublicLabel,
  normalizePickupLocationValue,
  type CampusPickupLocation
} from "@/lib/campus-pickup-locations";

export type PickupSearchEntry = {
  key: string;
  value: string;
  displayName: string;
  context: string;
  location: CampusPickupLocation | null;
};

export function buildFeaturedPickupEntries(locations: CampusPickupLocation[]): PickupSearchEntry[] {
  return locations.map((location) => ({
    key: location.id,
    value: location.name,
    displayName: location.publicLabel,
    context: getPickupLocationContextLabel(location.name) ?? location.area,
    location
  }));
}

export function buildRestrictedPickupEntries(options: readonly string[]) {
  return options.map((option) => {
    const location = getCampusPickupLocation(option);

    return {
      key: option,
      value: option,
      displayName: location ? getPickupLocationPublicLabel(option) : option,
      context: location ? getPickupLocationContextLabel(option) ?? location.area : "Saved listing meetup spot",
      location
    };
  });
}

export function togglePickupSelection(
  current: string[],
  rawValue: string,
  maxSelections: number,
  { normalize = true }: { normalize?: boolean } = {}
) {
  const nextValue = normalize ? normalizePickupLocationValue(rawValue) : rawValue.trim();
  if (!nextValue) {
    return current;
  }

  if (maxSelections === 1) {
    return [nextValue];
  }

  if (current.includes(nextValue)) {
    return current.filter((item) => item !== nextValue);
  }

  if (current.length >= maxSelections) {
    return [...current.slice(1), nextValue];
  }

  return [...current, nextValue];
}

export function getSelectedPickupLocationNames(values: string[], entries: PickupSearchEntry[]) {
  const selectedNames = new Set<string>();

  for (const value of values) {
    const entry = entries.find((candidate) => candidate.value === value);
    if (entry?.location?.name) {
      selectedNames.add(entry.location.name);
      continue;
    }

    const location = getCampusPickupLocation(value);
    if (location?.name) {
      selectedNames.add(location.name);
    }
  }

  return [...selectedNames];
}

export function getSelectablePickupValue(locationName: string, entries: PickupSearchEntry[]) {
  return entries.find((entry) => entry.location?.name === locationName)?.value ?? locationName;
}
