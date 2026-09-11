import { CARD_KINDS } from "./constants.js";

const $ = (id) => document.getElementById(id);
const typeFilter = $("typeFilter");
const setFilter = $("setFilter");
const artistFilter = $("artistFilter");
const galleryGrid = $("galleryGrid");

export function renderFilters(cards, filters) {
  fillFilter(typeFilter, [["", "All types"], ...CARD_KINDS.map((kind) => [kind, kind])], filters.type);
  fillFilter(setFilter, [["", "All sets"], ...unique(cards.map((card) => card.setName || card.setCode)).map((set) => [set, set])], filters.set);
  fillFilter(artistFilter, [["", "All artists"], ...unique(cards.map((card) => card.artist || card.cardArtist)).map((artist) => [artist, artist])], filters.artist);
}

export function filteredCards(cards, filters) {
  const query = filters.query.trim().toLowerCase();
  return cards.filter((card) => {
    const haystack = [card.name, card.artist, card.cardArtist, card.setName, card.setCode, card.kind].join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && (!filters.type || card.kind === filters.type)
      && (!filters.set || card.setName === filters.set || card.setCode === filters.set)
      && (!filters.artist || card.artist === filters.artist || card.cardArtist === filters.artist);
  });
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
        <span class="tile-name">${escapeHtml(card.name)}</span>
        <span class="tile-sub">
          <span>${escapeHtml(artist)}</span>
        </span>
        <span class="tile-foot">
          <span class="set-icon">${setIcon(card.setCode)}</span>
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

function setIcon(code) {
  const normalized = String(code || "").trim().toLowerCase();
  if (!normalized) return "?";
  return `<img src="https://svgs.scryfall.io/sets/${escapeHtml(normalized)}.svg" alt="${escapeHtml(normalized)}" loading="lazy">`;
}

function fillFilter(select, entries, value) {
  const previous = value || select.value || "";
  select.innerHTML = entries.map(([entryValue, label]) => `<option value="${escapeHtml(entryValue)}">${escapeHtml(label)}</option>`).join("");
  select.value = entries.some(([entryValue]) => entryValue === previous) ? previous : "";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
