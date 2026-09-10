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
      <h2>Overview</h2>
      <div class="modal-head-actions">
        ${canEdit ? `<button class="button ghost" type="button" data-edit-card>Edit</button>` : ""}
        <button class="icon-button" type="button" data-close-detail aria-label="Close">×</button>
      </div>
    </div>
    <div class="detail-layout">
      <div class="card-stage">
        <div class="preview-card ${card.foil ? "foil-sheen" : ""}" data-preview-card>
          ${imageFace(shownFront || card.frontImage, "preview-front")}
          ${shownBack ? imageFace(shownBack, "preview-back") : back}
        </div>
      </div>
      <div class="detail-info">
        <div class="detail-title">
          <h2 class="${card.foil ? "foil-title" : ""}">${escapeHtml(card.name)}</h2>
          <span class="tag">${escapeHtml(card.kind)}</span>
        </div>
        <div class="detail-lines">
          ${line("Artist", card.artist || card.cardArtist)}
          ${line("Set", `${card.setName || ""} ${card.collectorNumber ? `#${card.collectorNumber}` : ""}`)}
          ${line("Language", `<img class="flag" src="assets/flags/${language.flag}.svg" alt=""> ${language.label}`)}
          ${line("Signature year", card.signatureYear)}
          ${line("Signature info", card.signaturePlace)}
          ${line("Description", card.description)}
          ${line("Scryfall", card.scryfallUrl ? `<a href="${card.scryfallUrl}" target="_blank" rel="noreferrer">Open card</a>` : "")}
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
    preview.addEventListener("click", () => {
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
      <img src="${card.commanderImage || card.frontImage}" alt="">
      <span>
        <b>${escapeHtml(card.deckName || "Moxfield deck")}</b><br>
        ${escapeHtml(card.deckFormat || "")}
        ${card.deckFormat?.toLowerCase() === "commander" && card.deckBracket ? `<span class="tag">Bracket ${escapeHtml(card.deckBracket)}</span>` : ""}
        ${card.deckOwner ? `<br>${escapeHtml(card.deckOwner)}` : ""}
      </span>
    </a>
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
