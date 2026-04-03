export type CampusPickupLocationType =
  | "academic"
  | "library"
  | "student_center"
  | "dining"
  | "athletics"
  | "landmark"
  | "public_meetup"
  | "greek_life"
  | "dorm"
  | "apartment";

export type CampusPickupLocation = {
  id: string;
  name: string;
  shortLabel: string;
  type: CampusPickupLocationType;
  area: string;
  latitude: number;
  longitude: number;
  searchTerms: string[];
  isPublicSafeSpot: boolean;
  mapsQuery?: string;
};

export const DEFAULT_CAMPUS_MAP_CENTER = {
  latitude: 38.0355,
  longitude: -78.5056
} as const;

export const UVA_PICKUP_LOCATIONS: CampusPickupLocation[] = [
  {
    id: "newcomb",
    name: "Newcomb",
    shortLabel: "near Newcomb",
    type: "student_center",
    area: "Central Grounds",
    latitude: 38.0359,
    longitude: -78.5048,
    searchTerms: ["newcomb hall", "student activities", "newcomb hall uva"],
    isPublicSafeSpot: true
  },
  {
    id: "rotunda",
    name: "Rotunda",
    shortLabel: "by the Rotunda",
    type: "landmark",
    area: "Central Grounds",
    latitude: 38.0356,
    longitude: -78.5034,
    searchTerms: ["academical village", "lawn", "university of virginia rotunda"],
    isPublicSafeSpot: true
  },
  {
    id: "south-lawn",
    name: "South Lawn",
    shortLabel: "on South Lawn",
    type: "public_meetup",
    area: "Central Grounds",
    latitude: 38.0345,
    longitude: -78.5046,
    searchTerms: ["south lawn", "amphitheater"],
    isPublicSafeSpot: true
  },
  {
    id: "clemons",
    name: "Clemons",
    shortLabel: "by Clemons",
    type: "library",
    area: "Central Grounds",
    latitude: 38.0372,
    longitude: -78.5066,
    searchTerms: ["clemons library", "library"],
    isPublicSafeSpot: true
  },
  {
    id: "shannon",
    name: "Shannon",
    shortLabel: "near Shannon",
    type: "library",
    area: "Central Grounds",
    latitude: 38.0363,
    longitude: -78.5061,
    searchTerms: ["alderman", "shannon library", "main library"],
    isPublicSafeSpot: true,
    mapsQuery: "Shannon Library University of Virginia"
  },
  {
    id: "rice-hall",
    name: "Rice Hall",
    shortLabel: "by Rice Hall",
    type: "academic",
    area: "Engineering",
    latitude: 38.0318,
    longitude: -78.5103,
    searchTerms: ["engineering", "eschool", "thornton"],
    isPublicSafeSpot: true
  },
  {
    id: "clark-hall",
    name: "Clark Hall",
    shortLabel: "near Clark Hall",
    type: "academic",
    area: "Engineering",
    latitude: 38.0327,
    longitude: -78.5094,
    searchTerms: ["clark", "engineering side"],
    isPublicSafeSpot: true
  },
  {
    id: "alumni-hall",
    name: "Alumni Hall",
    shortLabel: "at Alumni Hall",
    type: "public_meetup",
    area: "North Grounds edge",
    latitude: 38.0342,
    longitude: -78.5152,
    searchTerms: ["alumni", "ivy road"],
    isPublicSafeSpot: true
  },
  {
    id: "jpj",
    name: "JPJ",
    shortLabel: "by JPJ",
    type: "athletics",
    area: "North Grounds",
    latitude: 38.0455,
    longitude: -78.5069,
    searchTerms: ["john paul jones", "arena"],
    isPublicSafeSpot: true,
    mapsQuery: "John Paul Jones Arena Charlottesville VA"
  },
  {
    id: "scott-stadium",
    name: "Scott Stadium",
    shortLabel: "near Scott Stadium",
    type: "athletics",
    area: "Athletics",
    latitude: 38.0311,
    longitude: -78.5125,
    searchTerms: ["stadium", "football", "athletics"],
    isPublicSafeSpot: true
  },
  {
    id: "the-corner",
    name: "The Corner",
    shortLabel: "near the Corner",
    type: "landmark",
    area: "The Corner",
    latitude: 38.0349,
    longitude: -78.5003,
    searchTerms: ["corner", "14th street", "elliewood"],
    isPublicSafeSpot: true,
    mapsQuery: "The Corner Charlottesville VA"
  },
  {
    id: "boylan",
    name: "Boylan",
    shortLabel: "by Boylan",
    type: "public_meetup",
    area: "The Corner",
    latitude: 38.0362,
    longitude: -78.4987,
    searchTerms: ["boylan heights", "boylan"],
    isPublicSafeSpot: true,
    mapsQuery: "Boylan Heights Charlottesville VA"
  },
  {
    id: "mad-bowl",
    name: "Mad Bowl",
    shortLabel: "around Mad Bowl",
    type: "greek_life",
    area: "Rugby / Greek life",
    latitude: 38.0402,
    longitude: -78.5034,
    searchTerms: ["madison bowl", "rugby", "frat row", "sorority row", "greek row"],
    isPublicSafeSpot: true
  },
  {
    id: "lambeth",
    name: "Lambeth",
    shortLabel: "near Lambeth",
    type: "dorm",
    area: "North Grounds housing",
    latitude: 38.0405,
    longitude: -78.5165,
    searchTerms: ["lambeth commons", "lambeth field", "north grounds housing"],
    isPublicSafeSpot: true
  },
  {
    id: "alderman-road",
    name: "Alderman Road Dorms",
    shortLabel: "by Alderman dorms",
    type: "dorm",
    area: "Alderman Road",
    latitude: 38.0357,
    longitude: -78.5116,
    searchTerms: ["gooch", "dillard", "balz", "bice", "old dorms"],
    isPublicSafeSpot: true
  },
  {
    id: "ohill",
    name: "O-Hill",
    shortLabel: "near O-Hill",
    type: "dining",
    area: "Observatory Hill",
    latitude: 38.0354,
    longitude: -78.5099,
    searchTerms: ["observatory hill", "ohill dining"],
    isPublicSafeSpot: true
  },
  {
    id: "hereford",
    name: "Hereford",
    shortLabel: "near Hereford",
    type: "dorm",
    area: "Hereford residential",
    latitude: 38.0408,
    longitude: -78.5143,
    searchTerms: ["hereford college", "residential college"],
    isPublicSafeSpot: true
  },
  {
    id: "grandmarc",
    name: "GrandMarc",
    shortLabel: "by GrandMarc",
    type: "apartment",
    area: "The Corner edge",
    latitude: 38.0326,
    longitude: -78.4998,
    searchTerms: ["grand marc", "15th street"],
    isPublicSafeSpot: true
  },
  {
    id: "standard",
    name: "The Standard",
    shortLabel: "near The Standard",
    type: "apartment",
    area: "Wertland / 14th",
    latitude: 38.0342,
    longitude: -78.4989,
    searchTerms: ["standard charlottesville", "wertland"],
    isPublicSafeSpot: true
  },
  {
    id: "flats",
    name: "The Flats",
    shortLabel: "by The Flats",
    type: "apartment",
    area: "West Main",
    latitude: 38.0318,
    longitude: -78.5099,
    searchTerms: ["flats at west village", "west main"],
    isPublicSafeSpot: true
  },
  {
    id: "jpa-maury",
    name: "JPA & Maury",
    shortLabel: "around JPA",
    type: "apartment",
    area: "JPA",
    latitude: 38.0282,
    longitude: -78.5077,
    searchTerms: ["jefferson park avenue", "maury", "jpa"],
    isPublicSafeSpot: true
  },
  {
    id: "pavilion",
    name: "Pavilion",
    shortLabel: "at the Pavilion",
    type: "landmark",
    area: "Downtown edge",
    latitude: 38.0295,
    longitude: -78.4778,
    searchTerms: ["pavilion downtown", "ting pavilion", "downtown mall"],
    isPublicSafeSpot: true,
    mapsQuery: "Ting Pavilion Charlottesville VA"
  },
  {
    id: "barracks-road",
    name: "Barracks Road",
    shortLabel: "near Barracks Road",
    type: "public_meetup",
    area: "Barracks",
    latitude: 38.0436,
    longitude: -78.5007,
    searchTerms: ["barracks shopping center", "whole foods", "barracks road shopping center"],
    isPublicSafeSpot: true,
    mapsQuery: "Barracks Road Shopping Center Charlottesville VA"
  }
];

export const FEATURED_PICKUP_LOCATION_IDS = [
  "newcomb",
  "the-corner",
  "clemons",
  "rice-hall",
  "jpj",
  "rotunda",
  "alumni-hall",
  "scott-stadium"
] as const;

const byId = new Map(UVA_PICKUP_LOCATIONS.map((location) => [location.id, location]));
const byName = new Map(UVA_PICKUP_LOCATIONS.map((location) => [location.name.toLowerCase(), location]));
const bySearchTerm = new Map<string, CampusPickupLocation>();

for (const location of UVA_PICKUP_LOCATIONS) {
  for (const term of [location.name, location.shortLabel, location.area, ...location.searchTerms]) {
    bySearchTerm.set(term.toLowerCase(), location);
  }
}

export const FEATURED_PICKUP_LOCATIONS = FEATURED_PICKUP_LOCATION_IDS.map((id) => byId.get(id)).filter(
  (location): location is CampusPickupLocation => Boolean(location)
);

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizePickupLocationValue(value: string) {
  const normalized = collapseWhitespace(value);
  const known = getCampusPickupLocation(normalized);
  return known?.name ?? normalized;
}

export function getCampusPickupLocation(value: string) {
  const normalized = collapseWhitespace(value).toLowerCase();
  return byName.get(normalized) ?? bySearchTerm.get(normalized) ?? null;
}

export function getCampusPickupLocationById(id: string) {
  return byId.get(id) ?? null;
}

export function isKnownCampusPickupLocation(value: string) {
  return Boolean(getCampusPickupLocation(value));
}

export function searchCampusPickupLocations(query: string) {
  const normalized = collapseWhitespace(query).toLowerCase();

  if (!normalized) {
    return UVA_PICKUP_LOCATIONS;
  }

  return UVA_PICKUP_LOCATIONS.filter((location) => {
    const haystack = [location.name, location.shortLabel, location.area, ...location.searchTerms].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });
}

export function getPickupLocationMapHref(value: string) {
  const known = getCampusPickupLocation(value);
  if (known) {
    const query = known.mapsQuery ?? `${known.name} ${known.area} Charlottesville VA`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  const normalized = collapseWhitespace(value);
  if (!normalized) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${normalized} Charlottesville VA`)}`;
}

export function getPickupLocationShortLabel(value: string) {
  return getCampusPickupLocation(value)?.shortLabel ?? value;
}

export function getPickupLocationArea(value: string) {
  return getCampusPickupLocation(value)?.area ?? null;
}

export function getKnownCampusPickupLocations(values: string[]) {
  const seen = new Set<string>();
  const locations: CampusPickupLocation[] = [];

  for (const value of values) {
    const known = getCampusPickupLocation(value);
    if (known && !seen.has(known.id)) {
      seen.add(known.id);
      locations.push(known);
    }
  }

  return locations;
}

export function getCampusMapCenterForValues(values: string[]) {
  const known = getKnownCampusPickupLocations(values);
  if (known.length === 0) {
    return DEFAULT_CAMPUS_MAP_CENTER;
  }

  const latitude = known.reduce((sum, location) => sum + location.latitude, 0) / known.length;
  const longitude = known.reduce((sum, location) => sum + location.longitude, 0) / known.length;

  return { latitude, longitude };
}
