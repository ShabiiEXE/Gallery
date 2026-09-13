import { CARD_KINDS } from "./constants.js";
import { setIconUrl } from "./set-icons.js";

const LOCAL_CARD_ASSET_VERSION = "20260912-vivi-sign";

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
  const sorted = cards.filter((card) => {
    return (!filters.type || normalizedKind(card.kind) === normalizedKind(filters.type))
      && (!filters.foil || card.foil)
      && (!filters.set || card.setName === filters.set || card.setCode === filters.set)
      && (!filters.artist || card.artist === filters.artist || card.cardArtist === filters.artist);
  }).sort((a, b) => compareCards(a, b, filters.sort || "artist", direction));
  return keepPartnersTogether(sorted);
}

export function bundleCards(cards, enabled) {
  if (!enabled) return cards.map((card) => ({ card, count: 1 }));
  const groups = new Map();
  cards.forEach((card) => {
    const key = card.partnerId ? `partner:${card.id}` : card.name.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(card);
  });
  return [...groups.values()].map((items) => ({ card: pickBundleCover(items), count: items.length, items }));
}

export function renderGallery(groups, { onOpen, getHref }) {
  galleryGrid.innerHTML = groups.map(({ card, count }) => cardTile(card, count, getHref?.(card))).join("");
  markOverflowTitles();
  galleryGrid.querySelectorAll("[data-card-open]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      onOpen(link.dataset.cardId);
    });
  });
}

export function renderCardTile(card, count = 1, options = {}) {
  return cardTile(card, count, options.href);
}

function cardTile(card, count, href = "#") {
  const showingBack = isArtistProof(card) && card.backImage;
  const showImage = showingBack ? card.backImage : card.frontImage;
  const artist = card.artist || card.cardArtist || "";
  const foilImage = card.foil && !isArtistProof(card);
  const saturationBoost = !isProxy(card);
  return `
    <a class="card-tile ${foilImage ? "foil" : ""} ${card.foil ? "is-foil" : ""} ${saturationBoost ? "saturation-boost" : ""}" href="${escapeAttribute(href)}" data-card-tile data-card-open data-card-id="${card.id}" aria-label="${escapeAttribute(`Open ${card.name}`)}">
      ${count > 1 ? `<span class="bundle-count">×${count}</span>` : ""}
      <span class="card-open">
        <span class="card-image-wrap"><img data-card-image src="${escapeAttribute(cacheImage(showImage))}" alt=""></span>
      </span>
      <span class="tile-meta">
        <span class="tile-name" data-title="${escapeAttribute(card.name)}"><span class="tile-name-text">${escapeHtml(card.name)}</span>${card.foil ? foilStar() : ""}</span>
        <span class="tile-sub">
          <span>${escapeHtml(artist)}</span>
        </span>
        <span class="tile-foot">
          ${shouldShowSetIcon(card) ? `<span class="set-icon">${setIcon(card.setCode || card.setName)}</span>` : ""}
          <span class="tag tile-kind">
            <span class="kind-default">${escapeHtml(shortKind(card.kind))}</span>
            <span class="kind-mobile-three">${escapeHtml(mobileThreeKind(card.kind))}</span>
          </span>
          <span class="tile-year">${card.signatureYear ? escapeHtml(card.signatureYear) : ""}</span>
        </span>
      </span>
    </a>
  `;
}

function markOverflowTitles() {
  galleryGrid.querySelectorAll(".card-tile").forEach((tile) => {
    const title = tile.querySelector(".tile-name");
    tile.querySelector("[data-title-tooltip]")?.remove();
    if (!title) return;
    tile.classList.remove("has-title-overflow");
    tile.style.removeProperty("--title-tooltip-left");
    tile.style.removeProperty("--title-tooltip-top");
    if (title.scrollWidth <= title.clientWidth + 1) return;
    const tooltip = document.createElement("span");
    tooltip.className = "tile-title-tooltip";
    tooltip.dataset.titleTooltip = "";
    tooltip.textContent = title.dataset.title || title.textContent.trim();
    tile.classList.add("has-title-overflow");
    tile.style.setProperty("--title-tooltip-left", `${title.offsetLeft}px`);
    tile.style.setProperty("--title-tooltip-top", `${title.offsetTop}px`);
    tile.append(tooltip);
  });
}

function pickBundleCover(cards) {
  return cards.find((card) => isArtistProof(card) && card.backImage) || cards[0];
}

function isArtistProof(card) {
  return ["artist proof", "ap", "altered artist proof", "altered ap"].includes(String(card.kind || "").trim().toLowerCase());
}

function isProxy(card) {
  return String(card.kind || "").toLowerCase().includes("proxy");
}

function shouldShowSetIcon(card) {
  const code = String(card.setCode || card.setName || "").trim().toLowerCase();
  return !isProxy(card) || code === "xpip" || code === "xmot";
}

function shortKind(kind) {
  return String(kind || "")
    .replace("Signed + Altered", "Signed + Alt")
    .replace(/^Altered$/, "Alter")
    .replace("Artist Proof", "AP");
}

function mobileThreeKind(kind) {
  const value = shortKind(kind);
  if (value === "Custom Proxy") return "Proxy";
  if (value === "Altered AP") return "Alt AP";
  if (value === "Signed + Alt") return "Sign + Alt";
  return value;
}

function normalizedKind(kind) {
  return String(kind || "") === "Altered" ? "Alter" : String(kind || "");
}

function foilStar() {
  return `<img class="tile-foil-star" src="assets/glow.svg" alt="" aria-hidden="true">`;
}

function setIcon(code) {
  const normalized = String(code || "").trim().toLowerCase();
  if (!normalized) return "?";
  const url = setIconUrl(normalized);
  return url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(normalized)}" loading="lazy">` : "?";
}

function cacheImage(src) {
  const value = String(src || "");
  if (!value.startsWith("assets/cards/")) return value;
  return `${value}${value.includes("?") ? "&" : "?"}v=${LOCAL_CARD_ASSET_VERSION}`;
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

function compareCards(a, b, sort, direction = 1) {
  if (sort === "deck") return compareDecks(a, b, direction);
  if (sort === "name") return compareText(a.name, b.name) * direction;
  if (sort === "year") return (compareText(a.signatureYear, b.signatureYear) || compareText(a.name, b.name)) * direction;
  if (sort === "type") return (compareType(a.kind, b.kind) || compareText(a.name, b.name)) * direction;
  return (compareText(a.artist || a.cardArtist, b.artist || b.cardArtist) || compareText(a.name, b.name)) * direction;
}

function compareType(a, b) {
  const order = ["Altered Artist Proof", "Artist Proof", "Signed + Altered", "Alter", "Custom Proxy", "Signed"];
  const aIndex = order.indexOf(normalizedKind(a));
  const bIndex = order.indexOf(normalizedKind(b));
  return (aIndex === -1 ? order.length : aIndex) - (bIndex === -1 ? order.length : bIndex);
}

function compareDecks(a, b, direction) {
  const aDeck = String(a.deckName || "").trim();
  const bDeck = String(b.deckName || "").trim();
  if (aDeck && !bDeck) return -1;
  if (!aDeck && bDeck) return 1;
  if (aDeck || bDeck) return (compareText(aDeck, bDeck) || compareText(a.name, b.name)) * direction;
  return compareText(a.name, b.name);
}

function compareText(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, { numeric: true, sensitivity: "base" });
}

function keepPartnersTogether(cards) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const pointedBy = new Map();
  cards.forEach((card) => {
    if (card.partnerId && !pointedBy.has(card.partnerId)) pointedBy.set(card.partnerId, card.id);
  });
  const seen = new Set();
  const ordered = [];
  cards.forEach((card) => {
    if (seen.has(card.id)) return;
    const partner = byId.get(card.partnerId) || byId.get(pointedBy.get(card.id));
    ordered.push(card);
    seen.add(card.id);
    if (partner && !seen.has(partner.id)) {
      ordered.push(partner);
      seen.add(partner.id);
    }
  });
  return ordered;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
