import { LANGUAGES } from "./constants.js";
import { icon } from "./icons.js";

export function renderCardDetail({ card, cards, canEdit = false }) {
  const related = cards.filter((item) => item.name === card.name && item.id !== card.id);
  const language = LANGUAGES.find((item) => item.value === card.language) || LANGUAGES[0];
  const back = card.backImage
    ? imageFace(card.backImage, "")
    : isArtistProof(card)
      ? `<div class="preview-face preview-back white-back">Artist Proof</div>`
      : `<div class="preview-face preview-back magic-back">Magic</div>`;
  const shownFront = isArtistProof(card) && card.backImage ? card.backImage : card.frontImage;
  const shownBack = isArtistProof(card) && card.backImage ? card.frontImage : "";
  const canFlip = Boolean(card.backImage);

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
          ${imageFace(shownFront || card.frontImage, "preview-front")}
          ${shownBack ? imageFace(shownBack, "preview-back") : back}
        </div>
      </div>
      <div class="detail-info">
        <div class="detail-title">
          <h2 class="${card.foil ? "foil-title" : ""}">${escapeHtml(card.name)}</h2>
          <span class="tag">${escapeHtml(card.kind)}</span>
          ${card.artist ? `<span class="detail-title-artist">${escapeHtml(card.artist)}${socialLink(card.artistSocialUrl)}</span>` : ""}
        </div>
        <div class="detail-lines">
          ${line(signatureLabel(card), signatureValue(card))}
          ${line("Info", `${setIcon(card.setCode)}<span>${escapeHtml([card.setName, card.collectorNumber ? `#${card.collectorNumber}` : ""].filter(Boolean).join(" "))}</span>`)}
          ${line("Language", `<img class="flag" src="assets/flags/${language.flag}.svg" alt=""> ${language.label}`)}
          ${differentArtist(card) ? line("Card artist", card.cardArtist) : ""}
          ${scryfallLink(card)}
          ${descriptionBlock(card.description)}
        </div>
        ${deckBox(card)}
        ${related.length ? relatedList(related) : ""}
      </div>
    </div>
  `;

  function relatedList(items) {
    return `
      <section class="related-list">
        <h3>Also in gallery</h3>
        ${items.map((item) => `
          <button class="related-card" type="button" data-switch-card="${item.id}">
            <img src="${item.frontImage}" alt="">
            <span><b>${escapeHtml(item.kind)}</b><br>${escapeHtml(item.artist || item.cardArtist || "")}</span>
          </button>
        `).join("")}
      </section>
    `;
  }
}

export function bindDetailInteractions(root, handlers) {
  const preview = root.querySelector("[data-preview-card]");
  const stage = root.querySelector("[data-card-stage]");
  if (preview) {
    const canFlip = preview.dataset.canFlip === "true";
    const rotation = { x: 0, y: 0 };
    let drag = null;
    let moved = false;
    const applyRotation = () => {
      if (!canFlip) rotation.y = Math.max(-38, Math.min(38, rotation.y));
      preview.style.transform = `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`;
    };
    const updateShine = (event) => {
      const rect = preview.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      preview.style.setProperty("--shine-x", `${Math.max(0, Math.min(100, x * 100)).toFixed(1)}%`);
      preview.style.setProperty("--shine-y", `${Math.max(0, Math.min(100, y * 100)).toFixed(1)}%`);
    };
    preview.addEventListener("pointermove", (event) => {
      updateShine(event);
      if (drag) {
        event.preventDefault();
        moved = moved || Math.abs(event.clientX - drag.x) > 4 || Math.abs(event.clientY - drag.y) > 4;
        rotation.y = drag.startY + ((event.clientX - drag.x) * 0.45);
        rotation.x = drag.startX - ((event.clientY - drag.y) * 0.45);
        applyRotation();
        return;
      }
    });
    preview.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      preview.setPointerCapture(event.pointerId);
      drag = { x: event.clientX, y: event.clientY, startX: rotation.x, startY: rotation.y };
      moved = false;
      preview.classList.add("is-dragging");
    });
    preview.addEventListener("pointerup", () => {
      if (canFlip && !moved) {
        rotation.x = 0;
        rotation.y = Math.abs(normalizeRotation(rotation.y) - 180) < 65 ? 0 : 180;
        applyRotation();
      }
      drag = null;
      preview.classList.remove("is-dragging");
    });
    preview.addEventListener("pointercancel", () => {
      drag = null;
      preview.classList.remove("is-dragging");
    });
    preview.addEventListener("dblclick", () => {
      rotation.x = 0;
      rotation.y = 0;
      applyRotation();
    });
    stage?.addEventListener("pointermove", (event) => {
      if (drag || preview.matches(":hover")) return;
      const rect = stage.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) - 0.5;
      const y = ((event.clientY - rect.top) / rect.height) - 0.5;
      rotation.y = x * 34;
      rotation.x = y * -28;
      applyRotation();
    });
    stage?.addEventListener("pointerleave", () => {
      if (drag) return;
      rotation.x = 0;
      rotation.y = canFlip && Math.abs(normalizeRotation(rotation.y) - 180) < 65 ? 180 : 0;
      applyRotation();
    });
  }
  root.querySelector("[data-edit-card]")?.addEventListener("click", handlers.onEdit);
  root.querySelector("[data-close-detail]")?.addEventListener("click", handlers.onClose);
  root.querySelectorAll("[data-switch-card]").forEach((button) => {
    button.addEventListener("click", () => handlers.onSwitch(button.dataset.switchCard));
  });
}

function deckBox(card) {
  if (!card.deckName && !card.moxfieldUrl) return "";
  return `
    <a class="deck-box" href="${card.moxfieldUrl || "#"}" target="_blank" rel="noreferrer">
      <span class="moxfield-mark" aria-hidden="true"><img src="assets/moxfield-favicon.ico" alt=""></span>
      <span class="deck-copy">
        <b>${escapeHtml(card.deckName || "Moxfield deck")}</b>
        <span class="deck-meta-row">
          ${card.deckFormat ? `<span>${escapeHtml(card.deckFormat)}</span>` : ""}
          ${bracketTag(card)}
        </span>
        ${commanderRoleTag(card)}
        ${deckOwners(card)}
      </span>
      <span class="deck-commander-art" style="--deck-bg: url('${escapeAttribute(card.deckImage || card.commanderImage || card.frontImage)}')"></span>
    </a>
  `;
}

function commanderRoleTag(card) {
  if (card.deckFormat?.toLowerCase() !== "commander") return "";
  return `<span class="deck-role-pill">${card.deckCommander ? "Commander" : "Part of the 99"}</span>`;
}

function bracketTag(card) {
  if (card.deckFormat?.toLowerCase() !== "commander" || !card.deckBracket) return "";
  const bracket = String(card.deckBracket).trim().match(/\d+/)?.[0] || "";
  return `<span class="tag bracket-tag bracket-${escapeHtml(bracket)}">Bracket ${escapeHtml(card.deckBracket)}</span>`;
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

function differentArtist(card) {
  return card.artist && card.cardArtist && card.artist.trim().toLowerCase() !== card.cardArtist.trim().toLowerCase();
}

function signatureLabel(card) {
  return card.kind?.toLowerCase().includes("alter") ? "Alter" : "Signature";
}

function signatureValue(card) {
  const parts = [card.signaturePlace, card.signatureYear].filter(Boolean).map(escapeHtml);
  return parts.join(", ");
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

function imageFace(src, className) {
  return `<div class="preview-face ${className}"><img src="${src}" alt="" draggable="false"></div>`;
}

function line(label, value) {
  if (!value) return "";
  return `<div class="detail-line"><b>${label}</b><span>${value}</span></div>`;
}

function setIcon(code) {
  const normalized = String(code || "").trim().toLowerCase();
  if (!normalized) return "";
  return `<span class="detail-set-icon"><img src="https://svgs.scryfall.io/sets/${escapeHtml(normalized)}.svg" alt="${escapeHtml(normalized)}"></span>`;
}

function normalizeRotation(value) {
  return ((value % 360) + 360) % 360;
}

function isArtistProof(card) {
  return card.kind === "Artist Proof" || card.kind === "Altered Artist Proof";
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
