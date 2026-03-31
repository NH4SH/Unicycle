const PLACE_LABELS = [
  "The Corner",
  "Newcomb",
  "JPJ",
  "Grounds",
  "UVA",
  "Rotunda",
  "Scott Stadium",
  "Clemons",
  "Rice Hall",
  "Pavilion",
  "Alumni Hall",
  "Clark Hall",
  "Boylan",
  "Trin",
  "The Southern",
  "Charlottesville"
] as const;

const PLACE_QUERY_MAP = {
  "The Corner": "The Corner Charlottesville VA",
  Newcomb: "Newcomb Hall University of Virginia",
  JPJ: "John Paul Jones Arena Charlottesville VA",
  Grounds: "University of Virginia Charlottesville VA",
  UVA: "University of Virginia Charlottesville VA",
  Rotunda: "Rotunda University of Virginia",
  "Scott Stadium": "Scott Stadium Charlottesville VA",
  Clemons: "Clemons Library University of Virginia",
  "Rice Hall": "Rice Hall University of Virginia",
  Pavilion: "Pavilion at the University of Virginia",
  "Alumni Hall": "Alumni Hall University of Virginia",
  "Clark Hall": "Clark Hall University of Virginia",
  Boylan: "Boylan Heights Charlottesville VA",
  Trin: "Trinity Irish Pub Charlottesville VA",
  "The Southern": "The Southern Cafe and Music Hall Charlottesville VA",
  Charlottesville: "Charlottesville VA"
} satisfies Record<(typeof PLACE_LABELS)[number], string>;

const normalizedPlaceMap = new Map(
  PLACE_LABELS.map((label) => [label.toLowerCase(), { label, query: PLACE_QUERY_MAP[label] }])
);

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const placePattern = new RegExp(
  `(^|[^\\w])(${[...PLACE_LABELS].sort((a, b) => b.length - a.length).map(escapeForRegex).join("|")})(?=$|[^\\w])`,
  "gi"
);

export function getPlaceMapHref(placeName: string) {
  const entry = normalizedPlaceMap.get(placeName.trim().toLowerCase());
  if (!entry) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.query)}`;
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
