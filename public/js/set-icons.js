export function scryfallSetIconCode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "sld" || normalized.includes("secret lair")) return "star";
  if (normalized === "pfin" || normalized.includes("final fantasy art series")) return "fin";
  return normalized;
}
