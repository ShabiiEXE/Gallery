import { LANGUAGES } from "./constants.js";
import { icon } from "./icons.js";

const DEFAULT_CARD_BACK = "https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/f/f8/Magic_card_back.jpg/revision/latest/scale-to-width-down/250?cb=20140813141013";

export function renderCardDetail({ card, cards, canEdit = false }) {
  const related = cards.filter((item) => item.name === card.name && item.id !== card.id);
  const language = LANGUAGES.find((item) => item.value === card.language) || LANGUAGES[0];
  const shownFront = isArtistProof(card) && card.backImage ? card.backImage : card.frontImage;
  const shownBack = isArtistProof(card) && card.backImage ? card.frontImage : card.backImage || DEFAULT_CARD_BACK;
  const canFlip = Boolean(card.backImage);
  const originalImage = originalCardImage(card);

  return `
    <div class="modal-head">
      <span></span>
      <div class="modal-head-actions">
        ${canEdit ? `<button class="icon-button" type="button" data-edit-card title="Edit" aria-label="Edit">${icon("pencil")}</button>` : ""}
        <button class="icon-button" type="button" data-close-detail aria-label="Close">×</button>
      </div>
    </div>
    <div class="detail-layout">
      <div class="card-stage" data-card-stage>
        <div class="preview-card ${card.foil ? "foil-sheen" : ""}" data-preview-card data-can-flip="${canFlip ? "true" : "false"}">
          ${imageFace(shownFront || card.frontImage, "preview-front", "data-preview-front-image")}
          ${imageFace(shownBack, "preview-back")}
        </div>
        ${canFlip || originalImage ? `
          <div class="card-stage-controls">
            ${canFlip ? `<button class="card-control-button" type="button" data-card-flip title="Flip card" aria-label="Flip card">${flipIcon()}</button>` : ""}
            ${originalImage ? `<button class="card-control-button card-art-toggle" type="button" data-card-art-toggle data-original-art="${escapeAttribute(originalImage)}" data-custom-art="${escapeAttribute(card.frontImage)}" aria-pressed="false" title="Show original card graphic" aria-label="Toggle card graphic">${eyeIcon()}</button>` : ""}
          </div>
        ` : ""}
      </div>
      <div class="detail-info">
        <div class="detail-title">
          <h2 class="${card.foil ? "foil-title" : ""}">${escapeHtml(card.name)}${card.foil ? foilStar() : ""}</h2>
          <div class="detail-lines detail-title-lines">
            ${line(shortKind(card.kind), artistValue(card))}
            ${line(signatureLabel(card), escapeHtml(signatureValue(card)))}
          </div>
        </div>
        <div class="detail-lines card-info-lines">
          ${line("Collection", `${setIcon(card)}<span>${escapeHtml([card.setName, card.collectorNumber ? `#${card.collectorNumber}` : ""].filter(Boolean).join(" "))}</span>`)}
          ${line("Language", `<img class="flag" src="assets/flags/${language.flag}.svg" alt=""> ${language.label}`)}
          ${line("Original Card Artist", escapeHtml(card.cardArtist || card.artist))}
          ${scryfallLink(card)}
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
        <h3>Also in gallery</h3>
        <div class="related-grid">
          ${items.map((item) => relatedCard(item)).join("")}
        </div>
      </section>
    `;
  }
}

export function bindDetailInteractions(root, handlers) {
  const preview = root.querySelector("[data-preview-card]");
  if (preview) {
    const canFlip = preview.dataset.canFlip === "true";
    const manual = { x: 0, y: 0 };
    const tilt = { x: 0, y: 0 };
    let drag = null;
    const applyRotation = () => {
      const x = manual.x + tilt.x;
      const y = canFlip ? manual.y + tilt.y : Math.max(-48, Math.min(48, manual.y + tilt.y));
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
        if (!canFlip) {
          manual.y = Math.max(-48, Math.min(48, manual.y));
        }
        applyRotation();
        return;
      }
      const rect = root.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) - 0.5;
      const y = ((event.clientY - rect.top) / rect.height) - 0.5;
      tilt.y = x * 34;
      tilt.x = y * -28;
      applyRotation();
    });
    preview.addEventListener("pointerdown", (event) => {
      event.preventDefault();
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
      manual.y += 180;
      tilt.x = 0;
      tilt.y = 0;
      applyRotation();
    });
  }
  root.querySelector("[data-edit-card]")?.addEventListener("click", handlers.onEdit);
  root.querySelector("[data-close-detail]")?.addEventListener("click", handlers.onClose);
  root.querySelectorAll("[data-switch-card]").forEach((button) => {
    button.addEventListener("click", () => handlers.onSwitch(button.dataset.switchCard));
  });
  root.querySelector("[data-card-art-toggle]")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    const image = root.querySelector("[data-preview-front-image]");
    if (!image) return;
    const original = button.getAttribute("aria-pressed") !== "true";
    image.src = original ? button.dataset.originalArt : button.dataset.customArt;
    button.setAttribute("aria-pressed", original ? "true" : "false");
    button.title = original ? "Show custom card graphic" : "Show original card graphic";
  });
}

function deckBox(card) {
  if (!card.deckName && !card.moxfieldUrl) return "";
  const originalArt = artCropImage(card.deckImage || card.commanderImage || card.frontImage);
  return `
    <section class="deck-box" data-deck-box style="--deck-bg: url('${escapeAttribute(originalArt)}')">
      <a class="deck-box-link" href="${card.moxfieldUrl || "#"}" target="_blank" rel="noreferrer" aria-label="${escapeAttribute(card.deckName || "Moxfield deck")}"></a>
      <span class="deck-copy">
        <span class="deck-title-row">
          <img class="moxfield-mark" src="assets/moxfield-favicon.ico" alt="" aria-hidden="true">
          <b>${escapeHtml(card.deckName || "Moxfield deck")}</b>
        </span>
        <span class="deck-meta-row">
          ${deckFormatPill(card)}
          ${commanderRolePill(card)}
        </span>
        ${deckOwners(card)}
      </span>
      <span class="deck-commander-art"></span>
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
  if (!owners.length) return "";
  return `
    <span class="deck-owner-list">
      ${owners.map((owner) => `
        <span class="deck-owner">
          ${owner.avatar ? `<img src="${escapeAttribute(owner.avatar)}" alt="">` : ""}
          ${escapeHtml(owner.name || "")}
        </span>
      `).join("")}
    </span>
  `;
}

function signatureLabel(card) {
  return card.kind?.toLowerCase().includes("alter") ? "Altered" : "Signature";
}

function signatureValue(card) {
  const parts = [card.signaturePlace, card.signatureYear].filter(Boolean);
  return parts.join(", ");
}

function artistValue(card) {
  if (!card.artist) return "";
  return `${escapeHtml(card.artist)}${socialLink(card.artistSocialUrl)}`;
}

function originalCardImage(card) {
  const candidates = [card.originalImage, card.commanderImage].filter(Boolean);
  return candidates.find((image) => image !== card.frontImage) || "";
}

function isArtistProof(card) {
  return card.kind === "Artist Proof" || card.kind === "Altered Artist Proof";
}

function scryfallLink(card) {
  if (!card.scryfallUrl) return "";
  return `<div class="scryfall-logo-row"><a href="${escapeAttribute(card.scryfallUrl)}" target="_blank" rel="noreferrer" aria-label="Open on Scryfall"><img src="assets/scryfall-favicon.ico" alt=""></a></div>`;
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
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=64`;
  } catch {
    return "";
  }
}

function imageFace(src, className, attributes = "") {
  return `<div class="preview-face ${className}"><img src="${escapeAttribute(src)}" alt="" draggable="false" ${attributes}></div>`;
}

function line(label, value) {
  if (!value) return "";
  return `<div class="detail-line"><b>${label}</b><span>${value}</span></div>`;
}

function setIcon(code) {
  if (isProxy(code)) return "";
  const normalized = String(code.setCode || code.setName || code || "").trim().toLowerCase();
  if (!normalized) return "";
  const iconCode = normalized === "sld" || normalized.includes("secret lair") ? "star" : normalized;
  return `<span class="detail-set-icon"><img src="https://svgs.scryfall.io/sets/${escapeHtml(iconCode)}.svg" alt="${escapeHtml(normalized)}"></span>`;
}

function relatedCard(card) {
  const image = card.frontImage || DEFAULT_CARD_BACK;
  return `
    <button class="related-tile ${card.foil ? "foil" : ""}" type="button" data-switch-card="${card.id}">
      <span class="card-image-wrap"><img src="${escapeAttribute(image)}" alt="" draggable="false"></span>
      <span class="tile-meta">
        <span class="tile-name">${escapeHtml(card.name)}${card.foil ? tileFoilStar() : ""}</span>
        <span class="tile-foot">
          ${isProxy(card) ? "" : `<span class="set-icon">${setIconImage(card.setCode || card.setName)}</span>`}
          <span class="tag tile-kind">${escapeHtml(shortKind(card.kind))}</span>
        </span>
      </span>
    </button>
  `;
}

function setIconImage(code) {
  const normalized = String(code || "").trim().toLowerCase();
  if (!normalized) return "?";
  const iconCode = normalized === "sld" || normalized.includes("secret lair") ? "star" : normalized;
  return `<img src="https://svgs.scryfall.io/sets/${escapeHtml(iconCode)}.svg" alt="${escapeHtml(normalized)}" loading="lazy">`;
}

function shortKind(kind) {
  return String(kind || "")
    .replace("Signed + Altered", "Signed + Alt")
    .replace("Artist Proof", "AP");
}

function isProxy(card) {
  return String(card?.kind || "").toLowerCase().includes("proxy");
}

function tileFoilStar() {
  return `
    <svg class="tile-foil-star" viewBox="0 0 18 18" aria-hidden="true">
      <path d="m9 1.7 1.35 4.08 4.3-1.2-2.28 3.62 3.68 2.45-4.38.38.47 4.45L9 12.45l-3.14 3.03.47-4.45-4.38-.38L5.63 8.2 3.35 4.58l4.3 1.2L9 1.7Z"></path>
    </svg>
  `;
}

function foilStar() {
  return `
    <svg class="foil-title-star" viewBox="0 0 18 18" aria-hidden="true">
      <path d="m9 1.7 1.35 4.08 4.3-1.2-2.28 3.62 3.68 2.45-4.38.38.47 4.45L9 12.45l-3.14 3.03.47-4.45-4.38-.38L5.63 8.2 3.35 4.58l4.3 1.2L9 1.7Z"></path>
    </svg>
  `;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function artCropImage(value) {
  return String(value || "").replace("-normal.webp", "-art_crop.webp");
}
