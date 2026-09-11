import { LANGUAGES } from "./constants.js";

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

  return `
    <div class="modal-head">
      <span></span>
      <div class="modal-head-actions">
        ${canEdit ? `<button class="icon-button" type="button" data-edit-card title="Edit" aria-label="Edit">${pencilIcon()}</button>` : ""}
        <button class="icon-button" type="button" data-close-detail aria-label="Close">×</button>
      </div>
    </div>
    <div class="detail-layout">
      <div class="card-stage">
        <div class="preview-card ${card.foil ? "foil-sheen" : ""}" data-preview-card>
          ${imageFace(shownFront || card.frontImage, "preview-front")}
          ${shownBack ? imageFace(shownBack, "preview-back") : back}
        </div>
        <button class="ghost-button flip-card-button" type="button" data-flip-card>Flip</button>
      </div>
      <div class="detail-info">
        <div class="detail-title">
          <h2 class="${card.foil ? "foil-title" : ""}">${escapeHtml(card.name)}</h2>
          <span class="tag">${escapeHtml(card.kind)}</span>
          ${card.artist ? `<span class="detail-title-artist">${escapeHtml(card.artist)}${socialLink(card.artistSocialUrl)}</span>` : ""}
        </div>
        <div class="detail-lines">
          ${line("Artist", artistValue(card))}
          ${differentArtist(card) ? line("Card artist", card.cardArtist) : ""}
          ${line("Set", `${card.setName || ""} ${card.collectorNumber ? `#${card.collectorNumber}` : ""}`)}
          ${line("Language", `<img class="flag" src="assets/flags/${language.flag}.svg" alt=""> ${language.label}`)}
          ${line(signatureLabel(card), signatureValue(card))}
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
  if (preview) {
    preview.addEventListener("pointermove", (event) => {
      if (preview.classList.contains("is-flipped")) return;
      const rect = preview.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      preview.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 18}deg)`;
    });
    preview.addEventListener("pointerleave", () => {
      preview.style.transform = preview.classList.contains("is-flipped") ? "rotateY(180deg)" : "";
    });
    root.querySelector("[data-flip-card]")?.addEventListener("click", () => {
      preview.classList.toggle("is-flipped");
      preview.style.transform = preview.classList.contains("is-flipped") ? "rotateY(180deg)" : "";
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
      <span class="deck-commander-art" style="--deck-bg: url('${escapeAttribute(card.deckImage || card.commanderImage || card.frontImage)}')">
        <img src="${escapeAttribute(card.commanderImage || card.deckImage || card.frontImage)}" alt="">
      </span>
      <span class="deck-copy">
        <b>${escapeHtml(card.deckName || "Moxfield deck")}</b>
        <span class="deck-meta-row">
          ${card.deckFormat ? `<span>${escapeHtml(card.deckFormat)}</span>` : ""}
          ${card.deckFormat?.toLowerCase() === "commander" && card.deckBracket ? `<span class="tag bracket-tag">Bracket ${escapeHtml(card.deckBracket)}</span>` : ""}
        </span>
        ${card.deckOwner ? `<span class="deck-owner">${ownerAvatar(card)}${escapeHtml(card.deckOwner)}</span>` : ""}
      </span>
    </a>
  `;
}

function ownerAvatar(card) {
  return card.deckOwnerAvatar ? `<img src="${escapeAttribute(card.deckOwnerAvatar)}" alt="">` : "";
}

function artistValue(card) {
  return `${escapeHtml(card.artist || card.cardArtist || "")}${card.artistSocialUrl ? socialLink(card.artistSocialUrl) : ""}`;
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

function pencilIcon() {
  return `
    <svg class="pencil-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"></path>
      <path d="M13.5 6.5l4 4"></path>
    </svg>
  `;
}

function imageFace(src, className) {
  return `<div class="preview-face ${className}"><img src="${src}" alt=""></div>`;
}

function line(label, value) {
  if (!value) return "";
  return `<div class="detail-line"><b>${label}</b><span>${value}</span></div>`;
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
