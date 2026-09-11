import { CARD_KINDS } from "./constants.js";

const $ = (id) => document.getElementById(id);
const typeFilter = $("typeFilter");
const setFilter = $("setFilter");
const artistFilter = $("artistFilter");
const galleryGrid = $("galleryGrid");

export function renderFilters(cards, filters) {
  fillFilter(typeFilter, [["", "All types"], ...CARD_KINDS.map((kind) => [kind, kind])], filters.type);
  fillFilter(setFilter, [["", "All sets", "planeswalker"], ...uniqueSets(cards)], filters.set);
  fillFilter(artistFilter, [["", "All artists"], ...unique(cards.map((card) => card.artist || card.cardArtist)).map((artist) => [artist, artist])], filters.artist);
}

export function filteredCards(cards, filters) {
  const direction = filters.direction === "desc" ? -1 : 1;
  return cards.filter((card) => {
    return (!filters.type || card.kind === filters.type)
      && (!filters.set || card.setName === filters.set || card.setCode === filters.set)
      && (!filters.artist || card.artist === filters.artist || card.cardArtist === filters.artist);
  }).sort((a, b) => compareCards(a, b, filters.sort || "artist") * direction);
}

export function bundleCards(cards, enabled) {
  if (!enabled) return cards.map((card) => ({ card, count: 1 }));
  const groups = new Map();
  cards.forEach((card) => {
    const key = card.name.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(card);
  });
  return [...groups.values()].map((items) => ({ card: pickBundleCover(items), count: items.length, items }));
}

export function renderGallery(groups, { onOpen }) {
  galleryGrid.innerHTML = groups.map(({ card, count }) => cardTile(card, count)).join("");
  galleryGrid.querySelectorAll("[data-card-open]").forEach((button) => {
    button.addEventListener("click", () => onOpen(button.dataset.cardId));
  });
}

function cardTile(card, count) {
  const showImage = isArtistProof(card) && card.backImage ? card.backImage : card.frontImage;
  const artist = card.artist || card.cardArtist || "";
  return `
    <article class="card-tile ${card.foil ? "foil" : ""}" data-card-tile data-card-id="${card.id}">
      ${count > 1 ? `<span class="bundle-count">×${count}</span>` : ""}
      <button class="card-open" type="button" data-card-open data-card-id="${card.id}">
        <span class="card-image-wrap"><img data-card-image src="${showImage}" alt=""></span>
      </button>
      <span class="tile-meta">
        <span class="tile-name">${escapeHtml(card.name)}${card.foil ? foilStar() : ""}</span>
        <span class="tile-sub">
          <span>${escapeHtml(artist)}</span>
        </span>
        <span class="tile-foot">
          ${isProxy(card) ? "" : `<span class="set-icon">${setIcon(card.setCode || card.setName)}</span>`}
          <span class="tag tile-kind">${escapeHtml(shortKind(card.kind))}</span>
          <span>${card.signatureYear ? escapeHtml(card.signatureYear) : ""}</span>
        </span>
      </span>
    </article>
  `;
}

function pickBundleCover(cards) {
  return cards.find((card) => isArtistProof(card) && card.backImage) || cards[0];
}

function isArtistProof(card) {
  return card.kind === "Artist Proof" || card.kind === "Altered Artist Proof";
}

function isProxy(card) {
  return String(card.kind || "").toLowerCase().includes("proxy");
}

function shortKind(kind) {
  return String(kind || "")
    .replace("Signed + Altered", "Signed + Alt")
    .replace("Artist Proof", "AP");
}

function foilStar() {
  return `
    <svg class="tile-foil-star" viewBox="0 0 18 18" aria-hidden="true">
      <path d="m9 1.7 1.35 4.08 4.3-1.2-2.28 3.62 3.68 2.45-4.38.38.47 4.45L9 12.45l-3.14 3.03.47-4.45-4.38-.38L5.63 8.2 3.35 4.58l4.3 1.2L9 1.7Z"></path>
    </svg>
  `;
}

function setIcon(code) {
  const normalized = String(code || "").trim().toLowerCase();
  if (!normalized) return "?";
  const iconCode = normalized === "sld" || normalized.includes("secret lair") ? "star" : normalized;
  return `<img src="https://svgs.scryfall.io/sets/${escapeHtml(iconCode)}.svg" alt="${escapeHtml(normalized)}" loading="lazy">`;
}

function fillFilter(select, entries, value) {
  const previous = value || select.value || "";
  select.innerHTML = entries.map(([entryValue, label, icon]) => `<option value="${escapeHtml(entryValue)}" data-icon="${escapeHtml(icon || "")}">${escapeHtml(label)}</option>`).join("");
  select.value = entries.some(([entryValue]) => entryValue === previous) ? previous : "";
}

function uniqueSets(cards) {
  const sets = new Map();
  cards.forEach((card) => {
    const value = card.setName || card.setCode;
    if (!value || sets.has(value)) return;
    sets.set(value, [value, value, card.setCode || card.setName || "plst"]);
  });
  return [...sets.values()].sort((a, b) => a[1].localeCompare(b[1]));
}

function compareCards(a, b, sort) {
  if (sort === "year") return compareText(a.signatureYear, b.signatureYear) || compareText(a.name, b.name);
  if (sort === "type") return compareText(a.kind, b.kind) || compareText(a.name, b.name);
  return compareText(a.artist || a.cardArtist, b.artist || b.cardArtist) || compareText(a.name, b.name);
}

function compareText(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, { numeric: true, sensitivity: "base" });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
