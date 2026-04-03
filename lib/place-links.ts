import { getPickupLocationMapHref, UVA_PICKUP_LOCATIONS } from "@/lib/campus-pickup-locations";

const EXTRA_PLACE_QUERY_MAP = {
  Grounds: "University of Virginia Charlottesville VA",
  UVA: "University of Virginia Charlottesville VA",
  Charlottesville: "Charlottesville VA"
} as const;

const PLACE_LABELS = [...UVA_PICKUP_LOCATIONS.map((location) => location.name), ...Object.keys(EXTRA_PLACE_QUERY_MAP)];

const normalizedPlaceMap = new Map(
  UVA_PICKUP_LOCATIONS.map((location) => [location.name.toLowerCase(), getPickupLocationMapHref(location.name)])
);

for (const [label, query] of Object.entries(EXTRA_PLACE_QUERY_MAP)) {
  normalizedPlaceMap.set(label.toLowerCase(), `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
}

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const placePattern = new RegExp(
  `(^|[^\\w])(${[...PLACE_LABELS].sort((a, b) => b.length - a.length).map(escapeForRegex).join("|")})(?=$|[^\\w])`,
  "gi"
);

export function getPlaceMapHref(placeName: string) {
  return normalizedPlaceMap.get(placeName.trim().toLowerCase()) ?? getPickupLocationMapHref(placeName);
}

export function splitTextWithPlaceLinks(text: string) {
  const output: Array<{ type: "text"; value: string } | { type: "place"; value: string; href: string }> = [];
  let lastIndex = 0;

  text.replace(placePattern, (match, prefix: string, place: string, offset: number) => {
    const start = offset;
    const prefixLength = prefix?.length ?? 0;

    if (start > lastIndex) {
      output.push({
        type: "text",
        value: text.slice(lastIndex, start)
      });
    }

    if (prefixLength > 0) {
      output.push({
        type: "text",
        value: prefix
      });
    }

    const href = getPlaceMapHref(place);
    if (href) {
      output.push({
        type: "place",
        value: place,
        href
      });
    } else {
      output.push({
        type: "text",
        value: place
      });
    }

    lastIndex = start + match.length;
    return match;
  });

  if (lastIndex < text.length) {
    output.push({
      type: "text",
      value: text.slice(lastIndex)
    });
  }

  return output;
}
