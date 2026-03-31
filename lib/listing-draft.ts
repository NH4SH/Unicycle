type ListingDraftDetails = {
  brand: string;
  size: string;
  color: string;
  description: string;
};

function parseDetailValue(line: string, label: string) {
  const match = new RegExp(`${label}:\\s*([^•]+)`, "i").exec(line);
  return match?.[1]?.trim() ?? "";
}

export function unpackListingDescription(rawDescription: string): ListingDraftDetails {
  const trimmed = rawDescription.trim();
  if (!trimmed) {
    return {
      brand: "",
      size: "",
      color: "",
      description: ""
    };
  }

  const sections = trimmed.split(/\n\s*\n/);
  const firstLine = sections[0]?.trim() ?? "";
  const hasStructuredMeta = /(^|•)\s*(Brand|Size|Color):/i.test(firstLine);

  if (!hasStructuredMeta) {
    return {
      brand: "",
      size: "",
      color: "",
      description: trimmed
    };
  }

  return {
    brand: parseDetailValue(firstLine, "Brand"),
    size: parseDetailValue(firstLine, "Size"),
    color: parseDetailValue(firstLine, "Color"),
    description: sections.slice(1).join("\n\n").trim()
  };
}

export function packListingDescription({
  description,
  brand,
  size,
  color
}: {
  description: string;
  brand?: string;
  size?: string;
  color?: string;
}) {
  const styleLine = [
    brand?.trim() ? `Brand: ${brand.trim()}` : null,
    size?.trim() ? `Size: ${size.trim()}` : null,
    color?.trim() ? `Color: ${color.trim()}` : null
  ]
    .filter(Boolean)
    .join(" • ");

  const trimmedDescription = description.trim();
  return styleLine ? `${styleLine}\n\n${trimmedDescription}` : trimmedDescription;
}
