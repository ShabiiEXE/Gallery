export async function searchScryfall(query, language = "en") {
  const parsed = parseCardInput(query);
  if (parsed.kind === "scryfall") return [await fetchScryfallCard(parsed.value)];
  if (parsed.kind === "external") return [{ externalUrl: parsed.value, name: "", note: "External card-market link saved for reference." }];
  const scryfallLanguage = scryfallLanguageCode(language);
  const languageQuery = scryfallLanguage && scryfallLanguage !== "en" ? ` lang:${scryfallLanguage}` : "";
  const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(`${parsed.value}${languageQuery}`)}&unique=prints&order=released`);
  if (!response.ok) throw new Error("No Scryfall cards found");
  const data = await response.json();
  return (data.data || []).slice(0, 8).map(mapScryfallCard);
}

export async function fetchScryfallImagesForCard(card) {
  const language = scryfallLanguageCode(card.language);
  const languageQuery = language && language !== "en" ? ` lang:${language}` : "";
  const name = String(card.name || "").split("//")[0].trim();
  const queries = [
    card.oracleId ? `oracleid:${card.oracleId}${languageQuery}` : "",
    name ? `!"${name}"${languageQuery}` : "",
    card.scryfallUrl || "",
  ].filter(Boolean);

  for (const query of queries) {
    const result = query.startsWith("http")
      ? await fetchScryfallCard(query).catch(() => null)
      : await fetchFirstScryfallSearch(query).catch(() => null);
    if (result?.frontImage) return result;
  }
  return { frontImage: "", backImage: "" };
}

function scryfallLanguageCode(language) {
  return {
    en: "en",
    es: "es",
    jp: "ja",
    fr: "fr",
    de: "de",
    it: "it",
  }[language] || "en";
}

export function parseCardInput(value) {
  const input = String(value || "").trim();
  if (/^https?:\/\/(?:www\.)?scryfall\.com\//i.test(input)) return { kind: "scryfall", value: input };
  if (/^https?:\/\/(?:www\.)?(cardmarket|tcgplayer)\./i.test(input)) return { kind: "external", value: input };
  return { kind: "name", value: input };
}

async function fetchScryfallCard(url) {
  const apiUrl = scryfallApiFromUrl(url);
  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error("Could not read Scryfall link");
  return mapScryfallCard(await response.json());
}

async function fetchFirstScryfallSearch(query) {
  const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints&order=released`);
  if (!response.ok) throw new Error("No Scryfall cards found");
  const data = await response.json();
  const card = data.data?.[0];
  if (!card) throw new Error("No Scryfall cards found");
  return mapScryfallCard(card);
}

function scryfallApiFromUrl(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts[0] === "card" && parts[1] && parts[2]) {
    return `https://api.scryfall.com/cards/${parts[1]}/${parts[2]}`;
  }
  return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(parts.at(-1)?.replaceAll("-", " ") || "")}`;
}

export function mapScryfallCard(card) {
  const face = card.card_faces?.[0] || card;
  const backFace = card.card_faces?.[1];
  const images = face.image_uris || card.image_uris || {};
  const backImages = backFace?.image_uris || {};
  return {
    name: card.name,
    frontImage: images.normal || images.large || images.small || "",
    backImage: backImages.normal || backImages.large || backImages.small || "",
    setName: card.set_name || "",
    setCode: card.set || "",
    collectorNumber: card.collector_number || "",
    setYear: (card.released_at || "").slice(0, 4),
    cardArtist: face.artist || card.artist || "",
    scryfallUrl: card.scryfall_uri || "",
    oracleId: card.oracle_id || "",
  };
}
