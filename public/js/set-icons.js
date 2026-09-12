export function scryfallSetIconCode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "xpip" || normalized.includes("pimpmydeck") || normalized.includes("pimp my deck")) return "custom:pimp-my-deck.png";
  if (normalized === "xmot" || normalized.includes("xmot")) return "custom:mot.png";
  if (normalized === "sld" || normalized.includes("secret lair")) return "star";
  if (normalized === "afin" || normalized === "pfin" || normalized.includes("final fantasy art series")) return "fin";
  return normalized;
}

export function setIconUrl(value) {
  const code = scryfallSetIconCode(value);
  if (!code) return "";
  if (code.startsWith("custom:")) return `assets/${code.slice(7)}`;
  return `https://svgs.scryfall.io/sets/${encodeURIComponent(code)}.svg`;
}
