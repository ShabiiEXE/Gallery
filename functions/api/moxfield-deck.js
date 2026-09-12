export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const input = url.searchParams.get("url") || url.searchParams.get("id") || "";
  const id = moxfieldDeckId(input);
  if (!id) return json({ ok: false, error: "Paste a valid Moxfield deck link." }, 400);

  const response = await fetch(`https://api2.moxfield.com/v3/decks/all/${encodeURIComponent(id)}`, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Gallery/0.1 (+https://github.com/ShabiiEXE/Gallery)",
    },
  });

  if (!response.ok) {
    return json({
      ok: false,
      error: `Moxfield returned ${response.status}. The deck may be private, missing, or temporarily blocking server fetches.`,
    }, response.status === 404 ? 404 : 502);
  }

  const deck = await response.json();
  return json({ ok: true, deck: normalizeDeck(deck, id) });
}

function normalizeDeck(deck, id) {
  const commanders = zoneCards(deck.commanders || deck.commander || deck.boards?.commanders);
  const primaryCommander = commanders[0] || {};
  const commanderFace = deck.mainCardIdIsBackFace ? "back" : "front";
  const owner = deck.createdByUser || deck.owner || deck.author || deck.user || {};
  const owners = deckOwners(deck, owner);
  const commanderImage = firstUrl([
    moxfieldCardImage(primaryCommander.card || primaryCommander, commanderFace),
    pickNamedUrl(primaryCommander, ["art_crop", "image", "normal", "thumbnail"]),
    pickNamedUrl(commanders, ["art_crop", "image", "normal", "thumbnail"]),
  ]);
  const mainImage = firstUrl([
    pickNamedUrl(deck.main, ["art_crop", "image", "normal", "thumbnail"]),
    moxfieldCardImage(deck.main),
  ]);
  const deckImage = firstUrl([
    pickNamedUrl(deck.media, ["banner", "header", "cover", "thumbnail", "preview", "url"]),
    pickDirectNamedUrl(deck, ["banner", "header", "cover", "thumbnail", "preview", "image"]),
    commanderImage,
    mainImage,
  ]);

  return {
    id,
    url: `https://www.moxfield.com/decks/${id}`,
    name: text(deck.name || deck.title),
    format: formatName(deck.format || deck.formatName || deck.deckFormat),
    bracket: text(deck.bracket || deck.commanderBracket || deck.edhBracket || deck.powerLevel || deck.power_level),
    owner: text(owners.map((item) => item.name).filter(Boolean).join(", ")),
    ownerAvatar: owners[0]?.avatar || "",
    owners,
    colors: deckColors(deck, commanders),
    deckImage,
    commanderImage,
  };
}

function deckColors(deck, commanders = []) {
  const values = [
    deck.colors,
    deck.colorIdentity,
    deck.color_identity,
    deck.identity,
    deck.colorIdentities,
    deck.commanderColorIdentity,
    deck.commanderColorIdentities,
    ...commanders.flatMap((item) => [
      item.colors,
      item.colorIdentity,
      item.color_identity,
      item.card?.colors,
      item.card?.colorIdentity,
      item.card?.color_identity,
    ]),
  ];
  const colors = new Set();
  values.forEach((value) => collectColors(value, colors));
  return ["W", "U", "B", "R", "G"].filter((color) => colors.has(color));
}

function collectColors(value, colors) {
  if (!value) return;
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (/^[WUBRG]+$/.test(normalized)) normalized.split("").forEach((color) => colors.add(color));
    else normalized.split(/[^A-Z]+/).map(colorCode).filter(Boolean).forEach((color) => colors.add(color));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectColors(item, colors));
    return;
  }
  if (typeof value !== "object") return;
  Object.entries(value).forEach(([key, item]) => {
    const color = colorCode(key);
    if (color && item) colors.add(color);
    else collectColors(item, colors);
  });
}

function colorCode(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (["W", "WHITE"].includes(normalized)) return "W";
  if (["U", "BLUE"].includes(normalized)) return "U";
  if (["B", "BLACK"].includes(normalized)) return "B";
  if (["R", "RED"].includes(normalized)) return "R";
  if (["G", "GREEN"].includes(normalized)) return "G";
  return "";
}

function deckOwners(deck, primaryOwner) {
  const rawOwners = [
    primaryOwner,
    deck.owners,
    deck.collaborators,
    deck.authors,
    deck.users,
    deck.sharedWithUsers,
    deck.contributors,
  ];
  const owners = rawOwners.flatMap((value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.users)) return value.users;
    if (Array.isArray(value.owners)) return value.owners;
    if (typeof value === "object" && !ownerName(value)) return Object.values(value).filter((item) => item && typeof item === "object");
    if (typeof value === "object") return [value];
    return [];
  });
  const byName = new Map();
  owners.forEach((item) => {
    const name = ownerName(item);
    if (!name || byName.has(name.toLowerCase())) return;
    byName.set(name.toLowerCase(), {
      name,
      avatar: firstUrl([
        pickDirectNamedUrl(item, ["avatar", "profile", "image", "photo", "picture"]),
        pickNamedUrl(item, ["avatar", "profile", "image", "photo", "picture"]),
      ]),
    });
  });
  return [...byName.values()];
}

function ownerName(item) {
  return text(item?.displayName || item?.userName || item?.username || item?.name || item?.ownerName);
}

function moxfieldDeckId(value) {
  const textValue = String(value || "").trim();
  if (!textValue) return "";
  try {
    const url = new URL(textValue);
    const parts = url.pathname.split("/").filter(Boolean);
    const deckIndex = parts.findIndex((part) => part.toLowerCase() === "decks");
    return deckIndex >= 0 ? sanitizeId(parts[deckIndex + 1]) : "";
  } catch {
    return sanitizeId(textValue);
  }
}

function sanitizeId(value) {
  return /^[A-Za-z0-9_-]{8,80}$/.test(String(value || "")) ? String(value) : "";
}

function zoneCards(zone) {
  if (!zone) return [];
  if (Array.isArray(zone)) return zone;
  if (Array.isArray(zone.cards)) return zone.cards;
  if (zone.cards && typeof zone.cards === "object") return Object.values(zone.cards).filter(Boolean);
  if (zone.card) return [zone];
  return Object.values(zone).filter(Boolean);
}

function formatName(value) {
  if (!value) return "";
  if (typeof value === "string") return titleCase(value);
  return titleCase(value.name || value.displayName || value.key || value.id || "");
}

function titleCase(value) {
  return text(value).replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function text(value) {
  return String(value || "").trim();
}

function firstUrl(values) {
  return values.find((value) => /^https?:\/\//i.test(value || "")) || "";
}

function moxfieldCardImage(card, face = "front") {
  const faceId = moxfieldFaceId(card, face);
  if (faceId) return `https://assets.moxfield.net/cards/card-face-${faceId}-art_crop.webp`;
  const scryfallId = card?.card?.scryfall_id || card?.card?.scryfallId || card?.scryfall_id || card?.scryfallId || card?.scryfallOracleId || "";
  if (/^[0-9a-f-]{36}$/i.test(scryfallId)) return `https://cards.scryfall.io/art_crop/front/${scryfallId[0]}/${scryfallId[1]}/${scryfallId}.jpg`;
  const id = card?.card?.id || card?.id || card?.cardId || "";
  return id ? `https://assets.moxfield.net/cards/card-${id}-art_crop.webp` : "";
}

function moxfieldFaceId(card, face) {
  const faces = card?.card?.card_faces || card?.card_faces || card?.card?.faces || card?.faces || [];
  const faceIndex = face === "back" ? 1 : 0;
  const selected = Array.isArray(faces) ? faces[faceIndex] : null;
  return selected?.id || selected?.cardFaceId || "";
}

function pickDirectNamedUrl(value, hints) {
  if (!value || typeof value !== "object") return "";
  const urls = Object.entries(value)
    .filter(([key, item]) => typeof item === "string"
      && hints.some((hint) => key.toLowerCase().includes(hint))
      && isImageLikeUrl(item))
    .map(([, item]) => item);
  return urls[0] || "";
}

function pickNamedUrl(value, hints) {
  const seen = new Set();
  const queue = [value];
  const fallback = [];
  while (queue.length) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    if (typeof current === "object") seen.add(current);
    if (typeof current === "string") {
      if (isImageLikeUrl(current)) fallback.push(current);
      continue;
    }
    if (Array.isArray(current)) {
      current.forEach((item) => queue.push(item));
      continue;
    }
    Object.entries(current).forEach(([key, item]) => {
      const normalizedKey = key.toLowerCase();
      if (typeof item === "string" && /^https?:\/\//i.test(item)) {
        if (!isImageLikeUrl(item)) return;
        if (hints.some((hint) => normalizedKey.includes(hint))) fallback.unshift(item);
        else fallback.push(item);
      } else if (item && typeof item === "object") {
        queue.push(item);
      }
    });
  }
  return fallback[0] || "";
}

function isImageLikeUrl(value) {
  return /^https?:\/\//i.test(value)
    && (/\.(webp|png|jpe?g)(\?|$)/i.test(value) || /^https:\/\/assets\.moxfield\.net\//i.test(value));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
