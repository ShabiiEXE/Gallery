import { LANGUAGES } from "./constants.js";
import { icon } from "./icons.js";
import { setIconUrl } from "./set-icons.js";

const DEFAULT_CARD_BACK = "https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/f/f8/Magic_card_back.jpg/revision/latest/scale-to-width-down/250?cb=20140813141013";
const BLACK_MAGE_ORIGINAL = "assets/cards/blackmage_og.jpg";
const LOCAL_CARD_ASSET_VERSION = "20260912-vivi-sign";

export function renderCardDetail({ card, cards, canEdit = false }) {
  const related = relatedCards(card, cards);
  const language = LANGUAGES.find((item) => item.value === card.language) || LANGUAGES[0];
  const shownFront = isArtistProof(card) && card.backImage ? card.backImage : card.frontImage;
  const shownBack = isArtistProof(card) && card.backImage ? card.frontImage : card.backImage || DEFAULT_CARD_BACK;
  const canFlip = Boolean(card.backImage || card.originalBackImage || String(card.name || "").includes("//"));
  const originalImage = originalCardImage(card);
  const originalFront = originalFrontImage(card, shownFront);
  const originalBack = originalBackImage(card);
  const foilBothFaces = card.foil && card.backImage && !isArtistProof(card);
  const foilBackOnly = card.foil && card.backImage && isArtistProof(card);

  return `
    <div class="modal-head">
      <span></span>
      <div class="modal-head-actions">
        ${canEdit ? `<button class="icon-button" type="button" data-edit-card title="Edit" aria-label="Edit">${icon("pencil")}</button>` : ""}
        <button class="icon-button" type="button" data-close-detail title="Close" aria-label="Close">${icon("close")}</button>
      </div>
    </div>
    <div class="detail-layout">
      <div class="card-stage" data-card-stage>
        <div class="preview-card ${card.foil ? "foil-sheen" : ""} ${foilBothFaces ? "foil-both-faces" : ""} ${foilBackOnly ? "foil-back-only" : ""}" data-preview-card data-can-flip="${canFlip ? "true" : "false"}">
          ${imageFace(shownFront || card.frontImage, "preview-front", "data-preview-front-image")}
          ${imageFace(shownBack, "preview-back", "data-preview-back-image")}
        </div>
        <div class="card-stage-controls">
          ${canFlip ? `<button class="card-control-button" type="button" data-card-flip title="Flip card" aria-label="Flip card">${flipIcon()}</button>` : ""}
          ${originalImage ? `<button class="card-control-button card-art-toggle" type="button" data-card-art-toggle data-original-art="${escapeAttribute(cacheImage(originalFront))}" data-custom-art="${escapeAttribute(cacheImage(shownFront || card.frontImage))}" data-original-back="${escapeAttribute(cacheImage(originalBack))}" data-original-back-needs-fetch="${needsOriginalBackFetch(card) ? "true" : "false"}" data-is-ap="${isArtistProof(card) ? "true" : "false"}" data-scryfall-url="${escapeAttribute(card.scryfallUrl || "")}" data-custom-back="${escapeAttribute(cacheImage(shownBack))}" data-has-custom-back="${card.backImage ? "true" : "false"}" aria-pressed="false" title="Show original card graphic" aria-label="Toggle card graphic">${eyeIcon()}</button>` : ""}
          <button class="card-control-button" type="button" data-share-card title="Copy card link" aria-label="Copy card link">${shareIcon()}</button>
        </div>
      </div>
      <div class="detail-info">
        <div class="detail-title">
          <h2 class="${card.foil ? "foil-title" : ""}">${detailCardNameHtml(card.name)}${card.foil ? foilStar() : ""}</h2>
          <div class="detail-lines detail-title-lines">
            ${line(shortKind(card.kind), artistValue(card))}
            ${line(signatureLabel(card), escapeHtml(signatureValue(card)))}
          </div>
        </div>
        <div class="detail-lines card-info-lines">
          ${line("Collection", collectionValue(card))}
          ${line("Language", `<img class="flag" src="assets/flags/${language.flag}.svg" alt=""> ${language.label}`)}
          ${line("Original Card Artist", card.cardArtist ? escapeHtml(card.cardArtist) : "")}
          ${descriptionBlock(card.description)}
        </div>
        ${deckBox(card)}
      </div>
    </div>
    ${related.length ? relatedList(related) : ""}
  `;

  function relatedList(items) {
    return `
      <section class="related-list">
        <h3>Other versions in the collection:</h3>
        <div class="related-grid">
          ${items.map((item) => relatedCard(item)).join("")}
        </div>
      </section>
    `;
  }
}

function relatedCards(card, cards) {
  const linkedIds = new Set([card.partnerId, ...cards.filter((item) => item.partnerId === card.id).map((item) => item.id)].filter(Boolean));
  return cards.filter((item) => item.id !== card.id && (item.name === card.name || linkedIds.has(item.id)));
}

export function bindDetailInteractions(root, handlers) {
  const preview = root.querySelector("[data-preview-card]");
  if (preview) {
    const canFlip = preview.dataset.canFlip === "true";
    const manual = { x: 0, y: 0 };
    const tilt = { x: 0, y: 0 };
    const gyro = { x: 0, y: 0 };
    let drag = null;
    let gyroPermissionAsked = false;
    const controller = new AbortController();
    const mobileMotion = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const applyRotation = () => {
      const x = Math.max(-58, Math.min(58, manual.x + tilt.x + gyro.x));
      const yRaw = manual.y + tilt.y + gyro.y;
      const y = canFlip ? yRaw : Math.max(-48, Math.min(48, yRaw));
      preview.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
    };
    const updateShine = (event) => {
      const rect = preview.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      preview.style.setProperty("--shine-x", `${Math.max(0, Math.min(100, x * 100)).toFixed(1)}%`);
      preview.style.setProperty("--shine-y", `${Math.max(0, Math.min(100, y * 100)).toFixed(1)}%`);
    };
    root.addEventListener("pointermove", (event) => {
      updateShine(event);
      if (drag) {
        event.preventDefault();
        manual.y = drag.startY + ((event.clientX - drag.x) * 0.55);
        manual.x = drag.startX - ((event.clientY - drag.y) * 0.55);
        manual.x = Math.max(-58, Math.min(58, manual.x));
        if (!canFlip) {
          manual.y = Math.max(-48, Math.min(48, manual.y));
        }
        applyRotation();
        return;
      }
      if (!mobileMotion) return;
      const rect = root.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) - 0.5;
      const y = ((event.clientY - rect.top) / rect.height) - 0.5;
      tilt.y = x * 34;
      tilt.x = y * -28;
      applyRotation();
    });
    const handleOrientation = (event) => {
      if (drag) return;
      const beta = Number(event.beta) || 0;
      const gamma = Number(event.gamma) || 0;
      gyro.x = Math.max(-16, Math.min(16, (beta - 48) * -0.32));
      gyro.y = Math.max(-18, Math.min(18, gamma * 0.42));
      applyRotation();
    };
    window.addEventListener("deviceorientation", handleOrientation, { signal: controller.signal });
    root.closest("dialog")?.addEventListener("close", () => controller.abort(), { once: true });
    preview.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      requestGyroPermission();
      preview.setPointerCapture(event.pointerId);
      tilt.x = 0;
      tilt.y = 0;
      drag = { x: event.clientX, y: event.clientY, startX: manual.x, startY: manual.y };
      preview.classList.add("is-dragging");
    });
    preview.addEventListener("pointerup", () => {
      drag = null;
      preview.classList.remove("is-dragging");
    });
    preview.addEventListener("pointercancel", () => {
      drag = null;
      preview.classList.remove("is-dragging");
    });
    preview.addEventListener("dblclick", () => {
      manual.x = 0;
      manual.y = 0;
      tilt.x = 0;
      tilt.y = 0;
      applyRotation();
    });
    root.addEventListener("pointerleave", () => {
      if (drag) return;
      tilt.x = 0;
      tilt.y = 0;
      applyRotation();
    });
    root.querySelector("[data-card-flip]")?.addEventListener("click", () => {
      const facingBack = Math.abs(normalizeRotation(manual.y) - 180) < 90;
      manual.x = 0;
      manual.y = facingBack ? 0 : 180;
      tilt.x = 0;
      tilt.y = 0;
      applyRotation();
    });
    root.querySelector("[data-card-art-toggle]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const front = root.querySelector("[data-preview-front-image]");
      const back = root.querySelector("[data-preview-back-image]");
      if (!front) return;
      const original = button.getAttribute("aria-pressed") !== "true";
      if (original && back && button.dataset.originalBackNeedsFetch === "true") {
        const scryfallBack = await fetchOriginalBackImage(button.dataset.scryfallUrl);
        if (scryfallBack) {
          if (button.dataset.isAp === "true") button.dataset.originalArt = scryfallBack;
          else button.dataset.originalBack = scryfallBack;
          button.dataset.originalBackNeedsFetch = "false";
        }
      }
      front.src = original ? button.dataset.originalArt : button.dataset.customArt;
      if (back) back.src = original ? button.dataset.originalBack : button.dataset.customBack;
      button.setAttribute("aria-pressed", original ? "true" : "false");
      button.title = original ? "Show custom card graphic" : "Show original card graphic";
    });
    function requestGyroPermission() {
      if (gyroPermissionAsked || typeof DeviceOrientationEvent === "undefined") return;
      gyroPermissionAsked = true;
      if (typeof DeviceOrientationEvent.requestPermission !== "function") return;
      DeviceOrientationEvent.requestPermission().catch(() => {});
    }
  }
  root.querySelector("[data-edit-card]")?.addEventListener("click", handlers.onEdit);
  root.querySelector("[data-close-detail]")?.addEventListener("click", handlers.onClose);
  root.querySelector("[data-share-card]")?.addEventListener("click", (event) => {
    handlers.onShare?.(event.currentTarget);
  });
  root.querySelectorAll("[data-switch-card]").forEach((button) => {
    button.addEventListener("click", () => handlers.onSwitch(button.dataset.switchCard));
  });
}

function deckBox(card) {
  if (!card.deckName && !card.moxfieldUrl) return "";
  const originalArt = artCropImage(card.deckImage || card.commanderImage || card.frontImage);
  return `
    <section class="deck-box" data-deck-box style="--deck-bg: url('${escapeAttribute(cacheImage(originalArt))}')">
      <a class="deck-box-link" href="${card.moxfieldUrl || "#"}" target="_blank" rel="noreferrer" aria-label="${escapeAttribute(card.deckName || "Moxfield deck")}"></a>
      <span class="deck-copy">
        <span class="deck-title-row">
          <b>${escapeHtml(card.deckName || "Moxfield deck")}</b>
        </span>
        <span class="deck-meta-row">
          ${deckFormatPill(card)}
          ${commanderRolePill(card)}
        </span>
        ${deckOwners(card)}
      </span>
      <span class="deck-commander-art"></span>
      <img class="moxfield-corner-mark" src="assets/moxfield-favicon.ico" alt="">
    </section>
  `;
}

function eyeIcon() {
  return `
    <svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.8 12s3.2-6 9.2-6 9.2 6 9.2 6-3.2 6-9.2 6-9.2-6-9.2-6Z"></path>
      <circle cx="12" cy="12" r="2.6"></circle>
    </svg>
  `;
}

function flipIcon() {
  return `
    <svg class="flip-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.2 7.6A7.2 7.2 0 0 1 19 12.8"></path>
      <path d="M19 7.4v5.4h-5.4"></path>
      <path d="M16.8 16.4A7.2 7.2 0 0 1 5 11.2"></path>
      <path d="M5 16.6v-5.4h5.4"></path>
    </svg>
  `;
}

function shareIcon() {
  return `
    <svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 12.8 15.5 16.9"></path>
      <path d="M15.5 7.1 8.5 11.2"></path>
      <circle cx="6" cy="12" r="2.4"></circle>
      <circle cx="18" cy="6" r="2.4"></circle>
      <circle cx="18" cy="18" r="2.4"></circle>
    </svg>
  `;
}

function deckFormatPill(card) {
  const format = String(card.deckFormat || "").trim();
  if (!format) return "";
  if (format.toLowerCase() !== "commander") {
    return `<span class="tag bracket-tag">${escapeHtml(format)}</span>`;
  }
  if (!card.deckBracket) {
    return `<span class="tag bracket-tag">Commander</span>`;
  }
  const bracket = String(card.deckBracket).trim().match(/\d+/)?.[0] || "";
  return `<span class="tag bracket-tag bracket-${escapeHtml(bracket)}">Commander Bracket ${escapeHtml(card.deckBracket)}</span>`;
}

function commanderRolePill(card) {
  if (card.deckFormat?.toLowerCase() !== "commander") return "";
  return `<span class="deck-role-pill">${card.deckCommander ? "Commander" : "Part of the 99"}</span>`;
}

function deckOwners(card) {
  const owners = Array.isArray(card.deckOwners) && card.deckOwners.length
    ? card.deckOwners
    : card.deckOwner
      ? [{ name: card.deckOwner, avatar: card.deckOwnerAvatar }]
      : [];
  const colors = deckColorPips(card.deckColors);
  if (!owners.length && !colors) return "";
  return `
    <span class="deck-owner-list">
      ${owners.map((owner) => `
        <span class="deck-owner">
          ${owner.avatar ? `<img src="${escapeAttribute(owner.avatar)}" alt="">` : ""}
          ${escapeHtml(owner.name || "")}
        </span>
      `).join("")}
      ${colors}
    </span>
  `;
}

function deckColorPips(colors) {
  const normalized = normalizeDeckColors(colors);
  if (!normalized.length) return "";
  return `
    <span class="deck-color-pips" aria-label="Deck colors ${escapeAttribute(normalized.join(""))}">
      ${normalized.map((color) => `<img class="mana-pip" src="${manaSymbolUrl(color)}" alt="${escapeAttribute(color)}">`).join("")}
    </span>
  `;
}

function manaSymbolUrl(color) {
  return `https://svgs.scryfall.io/card-symbols/${encodeURIComponent(color)}.svg`;
}

function normalizeDeckColors(colors) {
  const values = Array.isArray(colors) ? colors : String(colors || "").split("");
  const seen = new Set();
  values.forEach((value) => {
    const color = String(value || "").trim().charAt(0).toUpperCase();
    if ("WUBRG".includes(color)) seen.add(color);
  });
  return ["W", "U", "B", "R", "G"].filter((color) => seen.has(color));
}

function signatureLabel(card) {
  if (card.kind?.toLowerCase().includes("proxy")) return "Created";
  return card.kind?.toLowerCase().includes("alter") ? "Alteration" : "Signature";
}

function signatureValue(card) {
  if (card.signaturePlace && card.signatureYear) return `${card.signaturePlace} (${card.signatureYear})`;
  return card.signaturePlace || card.signatureYear || "";
}

function artistValue(card) {
  if (!card.artist) return "";
  return `${escapeHtml(card.artist)}${socialLink(card.artistSocialUrl)}`;
}

function originalCardImage(card) {
  if (/blank hero token/i.test(card.name || "")) return BLACK_MAGE_ORIGINAL;
  if (isArtistProof(card) && card.backImage) return card.originalImage || card.frontImage || "";
  const candidates = [card.originalImage, card.commanderImage].filter(Boolean);
  return candidates.find((image) => image !== card.frontImage) || "";
}

function originalFrontImage(card, shownFront) {
  if (isArtistProof(card) && card.backImage) return card.originalBackImage || DEFAULT_CARD_BACK;
  return originalCardImage(card) || shownFront || "";
}

function originalBackImage(card) {
  if (isArtistProof(card) && card.backImage) return card.originalImage || card.frontImage || DEFAULT_CARD_BACK;
  return card.originalBackImage || DEFAULT_CARD_BACK;
}

function needsOriginalBackFetch(card) {
  return Boolean(card.scryfallUrl && !card.originalBackImage && card.backImage);
}

async function fetchOriginalBackImage(url) {
  const apiUrl = scryfallApiFromUrl(url);
  if (!apiUrl) return "";
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) return "";
    const card = await response.json();
    const backImages = card.card_faces?.[1]?.image_uris || {};
    return backImages.large || backImages.normal || backImages.small || backImages.png || "";
  } catch {
    return "";
  }
}

function scryfallApiFromUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] === "card" && parts[1] && parts[2]) {
      return `https://api.scryfall.com/cards/${encodeURIComponent(parts[1])}/${encodeURIComponent(parts[2])}`;
    }
  } catch {
    return "";
  }
  return "";
}

function isArtistProof(card) {
  return ["artist proof", "ap", "altered artist proof", "altered ap"].includes(String(card.kind || "").trim().toLowerCase());
}

function cardLinkIcon(card) {
  if (!card.scryfallUrl) return "";
  return `<a class="collection-card-link" href="${escapeAttribute(card.scryfallUrl)}" target="_blank" rel="noreferrer" aria-label="Open card link"><img src="${escapeAttribute(faviconUrl(card.scryfallUrl))}" alt=""></a>`;
}

function descriptionBlock(description) {
  return description ? `<div class="description-copy">${escapeHtml(description)}</div>` : "";
}

function socialLink(url) {
  if (!url) return "";
  const name = socialName(url);
  return `<a class="social-link" href="${escapeAttribute(url)}" target="_blank" rel="noreferrer" title="${escapeAttribute(name)}" aria-label="${escapeAttribute(name)}"><img src="${escapeAttribute(faviconUrl(url))}" alt=""></a>`;
}

function socialName(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("x.com") || host.includes("twitter")) return "X";
    if (host.includes("artstation")) return "ArtStation";
    if (host.includes("bluesky")) return "Bluesky";
    return host;
  } catch {
    return "Artist link";
  }
}

function faviconUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host.includes("scryfall")) return "assets/scryfall-favicon.ico";
    if (host.includes("moxfield")) return "assets/moxfield-favicon.ico";
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=64`;
  } catch {
    return "";
  }
}

function imageFace(src, className, attributes = "") {
  return `<div class="preview-face ${className}"><img src="${escapeAttribute(cacheImage(src))}" alt="" draggable="false" ${attributes}></div>`;
}

function normalizeRotation(value) {
  return ((value % 360) + 360) % 360;
}

function line(label, value) {
  if (!value) return "";
  return `<div class="detail-line"><b>${label}</b><span>${value}</span></div>`;
}

function setIcon(code) {
  const normalized = String(code.setCode || code.setName || code || "").trim().toLowerCase();
  if (isProxy(code) && normalized !== "xpip" && normalized !== "xmot") return "";
  if (!normalized) return "";
  const url = setIconUrl(normalized);
  return url ? `<span class="detail-set-icon"><img src="${escapeHtml(url)}" alt="${escapeHtml(normalized)}"></span>` : "";
}

function collectionValue(card) {
  const text = [
    card.setName,
    card.collectorNumber ? `#${card.collectorNumber}` : "",
    card.setYear ? `(${card.setYear})` : "",
  ].filter(Boolean).join(" ");
  if (!text && !card.setCode) return "";
  return `${setIcon(card)}<span>${escapeHtml(text)}</span>${cardLinkIcon(card)}`;
}

function relatedCard(card) {
  const showingBack = isArtistProof(card) && card.backImage;
  const image = showingBack ? card.backImage : card.frontImage || DEFAULT_CARD_BACK;
  return `
    <button class="related-tile ${card.foil ? "foil" : ""}" type="button" data-switch-card="${card.id}">
      <span class="card-image-wrap"><img src="${escapeAttribute(cacheImage(image))}" alt="" draggable="false"></span>
      <span class="tile-meta">
        <span class="tile-name" data-full-name="${escapeAttribute(card.name)}"><span class="tile-name-text">${escapeHtml(card.name)}</span>${card.foil ? tileFoilStar() : ""}</span>
        <span class="tile-foot">
          ${shouldShowSetIcon(card) ? `<span class="set-icon">${setIconImage(card.setCode || card.setName)}</span>` : ""}
          <span class="tag tile-kind">${escapeHtml(shortKind(card.kind))}</span>
        </span>
      </span>
    </button>
  `;
}

function setIconImage(code) {
  const normalized = String(code || "").trim().toLowerCase();
  if (!normalized) return "?";
  const url = setIconUrl(normalized);
  return url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(normalized)}" loading="lazy">` : "?";
}

function shouldShowSetIcon(card) {
  const code = String(card.setCode || card.setName || "").trim().toLowerCase();
  return !isProxy(card) || code === "xpip" || code === "xmot";
}

function cacheImage(src) {
  const value = String(src || "");
  if (!value.startsWith("assets/cards/")) return value;
  return `${value}${value.includes("?") ? "&" : "?"}v=${LOCAL_CARD_ASSET_VERSION}`;
}

function shortKind(kind) {
  return String(kind || "")
    .replace("Signed + Altered", "Signed + Alt")
    .replace(/^Altered$/, "Alter")
    .replace("Artist Proof", "Artist Proof")
    .replace("Altered Artist Proof", "Altered AP");
}

function isProxy(card) {
  return String(card?.kind || "").toLowerCase().includes("proxy");
}

function tileFoilStar() {
  return `<img class="tile-foil-star" src="assets/glow.svg" alt="" aria-hidden="true">`;
}

function foilStar() {
  return `<img class="foil-title-star" src="assets/glow.svg" alt="" aria-hidden="true">`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function detailCardNameHtml(name) {
  const value = String(name || "");
  if (/^sp\s*\/\/\s*dr$/i.test(value.trim())) return escapeHtml(value);
  return escapeHtml(value).replace(/\s*\/\/\s*/g, " // <br>");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function artCropImage(value) {
  return String(value || "").replace("-normal.webp", "-art_crop.webp");
}
