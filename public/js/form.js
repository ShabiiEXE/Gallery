import { CARD_KINDS, LANGUAGES } from "./constants.js";
import { syncCustomSelect, syncFlagSelect } from "./custom-select.js";
import { PHOTO_ASSETS } from "./photo-assets.js";
import { searchScryfall } from "./scryfall.js";
import { setIconUrl } from "./set-icons.js";

const CLEAR_IMAGE_VALUE = "__clear_image__";

const $ = (id) => document.getElementById(id);
const cardKind = $("cardKind");
const cardLanguage = $("cardLanguage");
const lookupInput = $("lookupInput");
const lookupButton = $("lookupButton");
const lookupResults = $("lookupResults");
const cardForm = $("cardForm");
const cardFormMessage = $("cardFormMessage");
const editDialog = $("editDialog");
const editTitle = $("editTitle");
const editingId = $("editingId");
const cardName = $("cardName");
const partnerInput = $("partnerInput");
const partnerSelect = $("partnerSelect");
const partnerSelectField = $("partnerSelectField");
const foilInput = $("foilInput");
const frontPhoto = $("frontPhoto");
const backPhoto = $("backPhoto");
const frontAssetSelect = $("frontAssetSelect");
const backAssetSelect = $("backAssetSelect");
const frontAssetPreview = $("frontAssetPreview");
const backAssetPreview = $("backAssetPreview");
const collectorArtist = $("collectorArtist");
const artistSocialInput = $("artistSocialInput");
const artistSocialFavicon = $("artistSocialFavicon");
const artistLabel = $("artistLabel");
const signatureYear = $("signatureYear");
const signaturePlace = $("signaturePlace");
const descriptionInput = $("descriptionInput");
const moxfieldInput = $("moxfieldInput");
const fetchDeckButton = $("fetchDeckButton");
const clearDeckButton = $("clearDeckButton");
const deckNameInput = $("deckNameInput");
const deckFormatInput = $("deckFormatInput");
const deckBracketInput = $("deckBracketInput");
const deckOwnerInput = $("deckOwnerInput");
const deckOwnersEditor = $("deckOwnersEditor");
const deckMetaPreview = $("deckMetaPreview");
const commanderRoleField = $("commanderRoleField");
const deckCommanderRoleOption = $("deckCommanderRoleOption");
const deckCommanderInput = $("deckCommanderInput");
const deckTokenInput = $("deckTokenInput");
const setNameInput = $("setNameInput");
const setCodeInput = $("setCodeInput");
const setCodeIcon = $("setCodeIcon");
const collectorNumberInput = $("collectorNumberInput");
const setYearInput = $("setYearInput");
const cardArtistInput = $("cardArtistInput");
const scryfallInput = $("scryfallInput");
const saveCardButton = $("saveCardButton");
const copyCardButton = $("copyCardButton");
const deleteCardButton = $("deleteCardButton");
const closeEditButton = document.querySelector("[data-close-edit]");
let getCards = () => [];

export function initForm({ onSave, onDelete, getCards: getCardsCallback }) {
  getCards = typeof getCardsCallback === "function" ? getCardsCallback : getCards;
  fillSelect(cardKind, CARD_KINDS.map((kind) => [kind, kind]));
  fillSelect(cardLanguage, LANGUAGES.map((language) => [language.value, language.label]));
  fillPhotoAssetSelect(frontAssetSelect);
  fillPhotoAssetSelect(backAssetSelect);
  syncCustomSelect(cardKind);
  syncFlagSelect(cardLanguage, LANGUAGES);
  syncCustomSelect(frontAssetSelect);
  syncCustomSelect(backAssetSelect);

  cardKind.addEventListener("change", () => {
    updateArtistLabel();
    syncCustomSelect(cardKind);
  });
  cardLanguage.addEventListener("change", () => syncFlagSelect(cardLanguage, LANGUAGES));
  lookupButton.addEventListener("click", runLookup);
  lookupInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    runLookup();
  });
  fetchDeckButton.addEventListener("click", fetchDeck);
  clearDeckButton.addEventListener("click", clearDeckData);
  moxfieldInput.addEventListener("input", scheduleDeckFetch);
  moxfieldInput.addEventListener("paste", scheduleDeckFetch);
  frontAssetSelect?.addEventListener("change", () => applyPhotoAsset(frontAssetSelect, frontPhoto, frontAssetPreview, "frontImage"));
  backAssetSelect?.addEventListener("change", () => applyPhotoAsset(backAssetSelect, backPhoto, backAssetPreview, "backImage"));
  frontPhoto.addEventListener("change", () => clearPhotoAssetWhenUploaded(frontAssetSelect, frontPhoto, frontAssetPreview));
  backPhoto.addEventListener("change", () => clearPhotoAssetWhenUploaded(backAssetSelect, backPhoto, backAssetPreview));
  artistSocialInput.addEventListener("input", updateSocialFavicon);
  deckFormatInput.addEventListener("input", updateCommanderRoleField);
  deckCommanderInput.addEventListener("change", syncDeckRoleChecks);
  deckTokenInput.addEventListener("change", syncDeckRoleChecks);
  setCodeInput.addEventListener("input", updateSetIcon);
  partnerInput.addEventListener("change", () => updatePartnerField());
  cardForm.addEventListener("keydown", preventAccidentalSubmit);
  document.querySelectorAll("[data-save-card]").forEach((button) => {
    button.addEventListener("click", () => saveCurrent(onSave));
  });
  copyCardButton.addEventListener("click", () => copyCurrent(onSave));
  closeEditButton?.addEventListener("click", () => editDialog.close());
  deleteCardButton.addEventListener("click", async () => {
    cardFormMessage.textContent = "Saving to Cloudflare...";
    deleteCardButton.disabled = true;
    try {
      await onDelete(editingId.value);
    } catch (error) {
      cardFormMessage.textContent = error.message;
    } finally {
      deleteCardButton.disabled = false;
    }
  });
  updateArtistLabel();
}

export function openCardForm(card = null) {
  cardForm.reset();
  lookupResults.innerHTML = "";
  cardFormMessage.textContent = "";
  deleteCardButton.hidden = !card;
  copyCardButton.hidden = !card;
  editTitle.textContent = card ? "Edit card" : "Add card";

  const data = card || {};
  editingId.value = data.id || "";
  fillPhotoAssetSelect(frontAssetSelect);
  fillPhotoAssetSelect(backAssetSelect);
  cardName.value = data.name || "";
  cardKind.value = data.kind === "Altered" ? "Alter" : data.kind || "Signed";
  cardLanguage.value = data.language || "en";
  partnerInput.checked = Boolean(data.partnerId);
  foilInput.checked = Boolean(data.foil);
  collectorArtist.value = data.artist || "";
  signatureYear.value = data.signatureYear || "";
  signaturePlace.value = data.signaturePlace || "";
  descriptionInput.value = data.description || "";
  moxfieldInput.value = data.moxfieldUrl || "";
  deckNameInput.value = data.deckName || "";
  deckFormatInput.value = data.deckFormat || "";
  deckBracketInput.value = data.deckBracket || "";
  deckOwnerInput.value = data.deckOwner || "";
  deckTokenInput.checked = Boolean(data.deckToken);
  deckCommanderInput.checked = !deckTokenInput.checked && Boolean(data.deckCommander);
  setNameInput.value = data.setName || "";
  setCodeInput.value = data.setCode || "";
  collectorNumberInput.value = data.collectorNumber || "";
  setYearInput.value = data.setYear || "";
  cardArtistInput.value = data.cardArtist || "";
  scryfallInput.value = data.scryfallUrl || "";
  artistSocialInput.value = data.artistSocialUrl || "";
  cardForm.dataset.frontImage = data.frontImage || "";
  cardForm.dataset.backImage = data.backImage || "";
  cardForm.dataset.originalImage = data.originalImage || "";
  cardForm.dataset.originalBackImage = data.originalBackImage || "";
  cardForm.dataset.commanderImage = data.commanderImage || "";
  cardForm.dataset.deckImage = data.deckImage || "";
  cardForm.dataset.deckOwnerAvatar = data.deckOwnerAvatar || "";
  cardForm.dataset.deckOwners = JSON.stringify(Array.isArray(data.deckOwners) ? data.deckOwners : []);
  cardForm.dataset.deckColors = JSON.stringify(Array.isArray(data.deckColors) ? data.deckColors : []);
  fillPartnerSelect(data.partnerId || "");
  renderDeckOwnersEditor();
  renderDeckMetaPreview();
  syncPhotoAssetSelect(frontAssetSelect, frontAssetPreview, cardForm.dataset.frontImage);
  syncPhotoAssetSelect(backAssetSelect, backAssetPreview, cardForm.dataset.backImage);
  updateArtistLabel();
  syncCustomSelect(cardKind);
  syncFlagSelect(cardLanguage, LANGUAGES);
  updateSetIcon();
  updateSocialFavicon();
  updateCommanderRoleField();
  updatePartnerField();
  editDialog.showModal();
  document.documentElement.classList.add("has-modal-open");
  document.body.classList.add("has-modal-open");
}

async function fetchDeck() {
  const deckUrl = moxfieldInput.value.trim();
  if (!deckUrl) return;
  if (!isMoxfieldDeckUrl(deckUrl)) return;
  cardFormMessage.textContent = "Fetching Moxfield deck...";
  try {
    const response = await fetch(`/api/moxfield-deck?url=${encodeURIComponent(deckUrl)}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not fetch that deck.");
    applyDeck(payload.deck);
    cardFormMessage.textContent = "Deck info added.";
  } catch (error) {
    cardFormMessage.textContent = error.message;
  }
}

function applyDeck(deck) {
  moxfieldInput.value = deck.url || moxfieldInput.value;
  if (deck.name) deckNameInput.value = deck.name;
  if (deck.format) deckFormatInput.value = deck.format;
  if (deck.bracket) deckBracketInput.value = deck.bracket;
  if (deck.owner) deckOwnerInput.value = deck.owner;
  if (deck.ownerAvatar) cardForm.dataset.deckOwnerAvatar = deck.ownerAvatar;
  if (Array.isArray(deck.owners)) cardForm.dataset.deckOwners = JSON.stringify(deck.owners);
  if (Array.isArray(deck.colors)) cardForm.dataset.deckColors = JSON.stringify(deck.colors);
  if (deck.deckImage) cardForm.dataset.deckImage = deck.deckImage;
  if (deck.commanderImage) cardForm.dataset.commanderImage = deck.commanderImage;
  renderDeckOwnersEditor();
  renderDeckMetaPreview();
  updateCommanderRoleField();
}

function clearDeckData() {
  window.clearTimeout(deckFetchTimer);
  lastAutoFetchedDeck = "";
  moxfieldInput.value = "";
  deckNameInput.value = "";
  deckFormatInput.value = "";
  deckBracketInput.value = "";
  deckOwnerInput.value = "";
  deckCommanderInput.checked = false;
  deckTokenInput.checked = false;
  cardForm.dataset.deckOwnerAvatar = "";
  cardForm.dataset.deckOwners = "[]";
  cardForm.dataset.deckColors = "[]";
  cardForm.dataset.deckImage = "";
  cardForm.dataset.commanderImage = "";
  renderDeckOwnersEditor();
  renderDeckMetaPreview();
  updateCommanderRoleField();
  cardFormMessage.textContent = "Moxfield deck data cleared.";
}

let deckFetchTimer = 0;
let lastAutoFetchedDeck = "";

function scheduleDeckFetch() {
  window.clearTimeout(deckFetchTimer);
  deckFetchTimer = window.setTimeout(() => {
    const deckUrl = moxfieldInput.value.trim();
    if (!isMoxfieldDeckUrl(deckUrl) || deckUrl === lastAutoFetchedDeck) return;
    lastAutoFetchedDeck = deckUrl;
    fetchDeck();
  }, 450);
}

function isMoxfieldDeckUrl(value) {
  return /^https?:\/\/(?:www\.)?moxfield\.com\/decks\/[A-Za-z0-9_-]+/i.test(String(value || "").trim());
}

async function runLookup() {
  const query = lookupInput.value.trim();
  if (!query) return;
  lookupResults.innerHTML = `<p class="form-message">Searching...</p>`;
  try {
    const results = await searchScryfall(query, cardLanguage.value);
    lookupResults.innerHTML = results.map((card, index) => resultTemplate(card, index)).join("");
    lookupResults.querySelectorAll("[data-result-index]").forEach((button) => {
      button.addEventListener("click", () => applyScryfall(results[Number(button.dataset.resultIndex)]));
    });
  } catch (error) {
    lookupResults.innerHTML = `<p class="form-message">${error.message}</p>`;
  }
}

function resultTemplate(card, index) {
  if (card.externalUrl) {
    return `
      <div class="lookup-result">
        <span></span>
        <span>${card.externalUrl}</span>
        <button class="button ghost" type="button" data-result-index="${index}">Use link</button>
      </div>
    `;
  }
  return `
    <div class="lookup-result">
      <img src="${card.frontImage}" alt="">
      <span><b>${card.name}</b><br>${card.setName} #${card.collectorNumber}</span>
      <button class="button ghost" type="button" data-result-index="${index}">Use</button>
    </div>
  `;
}

function applyScryfall(card) {
  if (card.externalUrl) {
    scryfallInput.value = card.externalUrl;
    lookupResults.innerHTML = "";
    return;
  }
  cardName.value = card.name || "";
  setNameInput.value = card.setName || "";
  setCodeInput.value = card.setCode || "";
  collectorNumberInput.value = card.collectorNumber || "";
  setYearInput.value = card.setYear || "";
  cardArtistInput.value = card.cardArtist || "";
  collectorArtist.value ||= card.cardArtist || "";
  scryfallInput.value = card.scryfallUrl || "";
  cardForm.dataset.originalImage = card.frontImage || cardForm.dataset.originalImage || "";
  cardForm.dataset.originalBackImage = card.backImage || cardForm.dataset.originalBackImage || "";
  cardForm.dataset.frontImage ||= card.frontImage || "";
  cardForm.dataset.commanderImage ||= card.frontImage || "";
  lookupResults.innerHTML = "";
  updateSetIcon();
}

async function saveCurrent(onSave) {
  const card = await cardFromForm();
  if (!card) return;

  setSaveDisabled(true);
  cardFormMessage.textContent = "Saving to Cloudflare...";
  try {
    await onSave(card);
    editDialog.close();
  } catch (error) {
    cardFormMessage.textContent = error.message;
  } finally {
    setSaveDisabled(false);
  }
}

async function copyCurrent(onSave) {
  const card = await cardFromForm({ copy: true });
  if (!card) return;

  setSaveDisabled(true);
  cardFormMessage.textContent = "Copying listing...";
  try {
    await onSave(card);
    editDialog.close();
  } catch (error) {
    cardFormMessage.textContent = error.message;
  } finally {
    setSaveDisabled(false);
  }
}

async function cardFromForm({ copy = false } = {}) {
  if (!cardName.value.trim()) {
    cardFormMessage.textContent = "Card name is required.";
    return null;
  }

  const frontImage = await imageValue(frontPhoto, cardForm.dataset.frontImage);
  if (!frontImage) {
    cardFormMessage.textContent = "Front photo is required. Use Scryfall lookup or upload an image.";
    return null;
  }
  const backImage = await imageValue(backPhoto, cardForm.dataset.backImage);
  return {
    id: copy ? crypto.randomUUID() : editingId.value || crypto.randomUUID(),
    name: cardName.value.trim(),
    kind: cardKind.value,
    foil: foilInput.checked,
    language: cardLanguage.value,
    frontImage,
    backImage,
    originalImage: cardForm.dataset.originalImage || "",
    originalBackImage: cardForm.dataset.originalBackImage || "",
    artist: collectorArtist.value.trim(),
    signatureYear: signatureYear.value.trim(),
    signaturePlace: signaturePlace.value.trim(),
    description: descriptionInput.value.trim(),
    artistSocialUrl: artistSocialInput.value.trim(),
    moxfieldUrl: moxfieldInput.value.trim(),
    deckName: deckNameInput.value.trim(),
    deckFormat: deckFormatInput.value.trim(),
    deckBracket: deckBracketInput.value.trim(),
    deckOwner: deckOwnerInput.value.trim(),
    deckCommander: isCommanderDeck() && !deckTokenInput.checked ? deckCommanderInput.checked : false,
    deckToken: hasDeckData() ? deckTokenInput.checked : false,
    deckOwnerAvatar: cardForm.dataset.deckOwnerAvatar || "",
    deckOwners: safeJsonArray(cardForm.dataset.deckOwners),
    deckColors: safeJsonArray(cardForm.dataset.deckColors),
    deckImage: cardForm.dataset.deckImage || "",
    commanderImage: cardForm.dataset.commanderImage || frontImage,
    setName: setNameInput.value.trim(),
    setCode: setCodeInput.value.trim(),
    collectorNumber: collectorNumberInput.value.trim(),
    setYear: setYearInput.value.trim(),
    cardArtist: cardArtistInput.value.trim(),
    scryfallUrl: scryfallInput.value.trim(),
    partnerId: copy ? "" : partnerInput.checked ? partnerSelect.value : "",
    updatedAt: new Date().toISOString(),
  };
}

function fillPartnerSelect(value = "") {
  const currentId = editingId.value;
  const partnerCards = getCards()
    .filter((card) => card.id && card.id !== currentId)
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }));
  partnerSelect.innerHTML = [`<option value="">Choose partner</option>`, ...partnerCards.map((card) => `<option value="${escapeHtml(card.id)}">${escapeHtml(card.name || "Untitled")}</option>`)].join("");
  partnerSelect.value = partnerCards.some((card) => card.id === value) ? value : "";
  syncCustomSelect(partnerSelect);
}

function updatePartnerField() {
  partnerSelectField.hidden = !partnerInput.checked;
  if (!partnerInput.checked) partnerSelect.value = "";
  syncCustomSelect(partnerSelect);
}

function setSaveDisabled(disabled) {
  document.querySelectorAll("[data-save-card]").forEach((button) => {
    button.disabled = disabled;
  });
  saveCardButton.disabled = disabled;
  copyCardButton.disabled = disabled;
}

function updateArtistLabel() {
  const kind = cardKind.value;
  artistLabel.textContent = kind.includes("Proxy") ? "Proxy artist" : kind.includes("Alter") ? "Alter artist" : "Artist";
}

function updateSetIcon() {
  if (!setCodeIcon) return;
  const code = setCodeInput.value.trim().toLowerCase();
  setCodeIcon.hidden = !code;
  if (!code) return;
  setCodeIcon.src = setIconUrl(code);
  setCodeIcon.alt = code;
}

function updateSocialFavicon() {
  if (!artistSocialFavicon) return;
  const src = faviconUrl(artistSocialInput.value.trim());
  artistSocialFavicon.hidden = !src;
  if (!src) {
    artistSocialFavicon.removeAttribute("src");
    return;
  }
  artistSocialFavicon.src = src;
}

function faviconUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host.includes("scryfall")) return "assets/scryfall-favicon.ico";
    if (host.includes("moxfield")) return "assets/moxfield.png";
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=64`;
  } catch {
    return "";
  }
}

function preventAccidentalSubmit(event) {
  if (event.key !== "Enter") return;
  if (event.target === lookupInput) return;
  if (event.target instanceof HTMLTextAreaElement) return;
  event.preventDefault();
}

function updateCommanderRoleField() {
  if (!commanderRoleField) return;
  const commanderDeck = isCommanderDeck();
  commanderRoleField.hidden = !hasDeckData();
  commanderRoleField.classList.toggle("token-only", !commanderDeck);
  if (deckCommanderRoleOption) deckCommanderRoleOption.hidden = !commanderDeck;
  if (!commanderDeck) {
    deckCommanderInput.checked = false;
  }
}

function isCommanderDeck() {
  return deckFormatInput.value.trim().toLowerCase() === "commander";
}

function hasDeckData() {
  return Boolean(
    moxfieldInput.value.trim()
    || deckNameInput.value.trim()
    || deckFormatInput.value.trim()
    || deckOwnerInput.value.trim()
    || cardForm.dataset.deckImage
    || cardForm.dataset.commanderImage
    || safeJsonArray(cardForm.dataset.deckOwners).length
    || safeJsonArray(cardForm.dataset.deckColors).length
    || deckTokenInput.checked
  );
}

function syncDeckRoleChecks(event) {
  if (event?.target === deckTokenInput && deckTokenInput.checked) {
    deckCommanderInput.checked = false;
  }
  if (event?.target === deckCommanderInput && deckCommanderInput.checked) {
    deckTokenInput.checked = false;
  }
}

function fillSelect(select, entries) {
  select.innerHTML = entries.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

function fillPhotoAssetSelect(select) {
  if (!select) return;
  const usedImages = usedPhotoAssetNames();
  const options = PHOTO_ASSETS.map((path) => {
    const usedBy = usedImages.get(path) || [];
    const usedLabel = usedBy.length ? `Used by ${usedBy.join(", ")}` : "";
    return `<option value="${escapeHtml(path)}" data-image="${escapeHtml(path)}" data-used="${usedBy.length ? "true" : ""}" data-used-label="${escapeHtml(usedLabel)}">${escapeHtml(photoAssetLabel(path))}</option>`;
  });
  select.innerHTML = [`<option value="">Current/uploaded image</option>`, `<option value="${CLEAR_IMAGE_VALUE}">Clear image</option>`, ...options].join("");
}

function usedPhotoAssetNames() {
  const currentId = editingId.value;
  return getCards().reduce((map, card) => {
    if (!card?.id || card.id === currentId) return map;
    [card.frontImage, card.backImage].forEach((image) => {
      if (!PHOTO_ASSETS.includes(image)) return;
      if (!map.has(image)) map.set(image, []);
      const names = map.get(image);
      const name = card.name || "Untitled";
      if (!names.includes(name)) names.push(name);
    });
    return map;
  }, new Map());
}

function applyPhotoAsset(select, input, preview, datasetKey) {
  if (!select) return;
  if (select.value === CLEAR_IMAGE_VALUE) {
    cardForm.dataset[datasetKey] = "";
    if (input) input.value = "";
    updatePhotoAssetPreview(preview, "");
    syncCustomSelect(select);
    return;
  }
  if (!select.value) return;
  cardForm.dataset[datasetKey] = select.value;
  if (input) input.value = "";
  updatePhotoAssetPreview(preview, select.value);
  syncCustomSelect(select);
}

function clearPhotoAssetWhenUploaded(select, input, preview) {
  if (!select || !input?.files?.length) return;
  select.value = "";
  updatePhotoAssetPreview(preview, "");
  syncCustomSelect(select);
}

function syncPhotoAssetSelect(select, preview, image) {
  if (!select) return;
  select.value = PHOTO_ASSETS.includes(image) ? image : "";
  updatePhotoAssetPreview(preview, select.value);
  syncCustomSelect(select);
}

function updatePhotoAssetPreview(preview, image) {
  if (!preview) return;
  const img = preview.querySelector("img");
  preview.hidden = !image;
  if (!img) return;
  if (!image) {
    img.removeAttribute("src");
    return;
  }
  img.src = image;
  img.alt = photoAssetLabel(image);
}

function photoAssetLabel(path) {
  return String(path || "")
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ");
}

function renderDeckOwnersEditor() {
  const owners = safeJsonArray(cardForm.dataset.deckOwners);
  if (!owners.length) {
    deckOwnersEditor.innerHTML = "";
    return;
  }
  deckOwnersEditor.innerHTML = `
    <span>Deck owners</span>
    <div class="deck-owner-editor-list">
      ${owners.map((owner, index) => `
        <div class="deck-owner-editor-row" data-owner-index="${index}">
          ${owner.avatar ? `<img src="${escapeHtml(owner.avatar)}" alt="">` : "<span></span>"}
          <b>${escapeHtml(owner.name || "")}</b>
          <button class="icon-button" type="button" data-owner-move="-1" title="Move up" aria-label="Move up">↑</button>
          <button class="icon-button" type="button" data-owner-move="1" title="Move down" aria-label="Move down">↓</button>
          <button class="danger-button icon-only-button" type="button" data-owner-remove title="Remove owner" aria-label="Remove owner">×</button>
        </div>
      `).join("")}
    </div>
  `;
  deckOwnersEditor.querySelectorAll("[data-owner-move]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("[data-owner-index]");
      const from = Number(row?.dataset.ownerIndex);
      const to = from + Number(button.dataset.ownerMove);
      if (to < 0 || to >= owners.length) return;
      const next = [...owners];
      [next[from], next[to]] = [next[to], next[from]];
      setDeckOwners(next);
    });
  });
  deckOwnersEditor.querySelectorAll("[data-owner-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("[data-owner-index]");
      const index = Number(row?.dataset.ownerIndex);
      setDeckOwners(owners.filter((_, ownerIndex) => ownerIndex !== index));
    });
  });
}

function setDeckOwners(owners) {
  cardForm.dataset.deckOwners = JSON.stringify(owners);
  deckOwnerInput.value = owners.map((owner) => owner.name).filter(Boolean).join(", ");
  cardForm.dataset.deckOwnerAvatar = owners[0]?.avatar || "";
  renderDeckOwnersEditor();
  renderDeckMetaPreview();
}

function renderDeckMetaPreview() {
  if (!deckMetaPreview) return;
  const colors = normalizeDeckColors(safeJsonArray(cardForm.dataset.deckColors));
  const deckImage = cardForm.dataset.deckImage || cardForm.dataset.commanderImage || "";
  deckMetaPreview.hidden = !colors.length && !deckImage;
  if (deckMetaPreview.hidden) {
    deckMetaPreview.innerHTML = "";
    return;
  }
  deckMetaPreview.innerHTML = `
    ${colors.length ? `
      <div class="deck-meta-preview-row">
        <span>Deck colors</span>
        <span class="deck-color-pips" aria-label="Deck colors ${escapeAttribute(colors.join(""))}">
          ${colors.map((color) => `
            <button class="deck-color-remove" type="button" data-deck-color-remove="${escapeAttribute(color)}" title="Remove ${escapeAttribute(color)}" aria-label="Remove ${escapeAttribute(color)}">
              <img class="mana-pip" src="${manaSymbolUrl(color)}" alt="${escapeAttribute(color)}">
              <span aria-hidden="true">&times;</span>
            </button>
          `).join("")}
        </span>
      </div>
    ` : ""}
    ${deckImage ? `
      <div class="deck-meta-preview-row deck-photo-preview">
        <span>Deck photo</span>
        <img src="${escapeAttribute(deckImage)}" alt="">
      </div>
    ` : ""}
  `;
  deckMetaPreview.querySelectorAll("[data-deck-color-remove]").forEach((button) => {
    button.addEventListener("click", () => removeDeckColor(button.dataset.deckColorRemove));
  });
}

function removeDeckColor(color) {
  const remove = String(color || "").trim().charAt(0).toUpperCase();
  if (!remove) return;
  const colors = normalizeDeckColors(safeJsonArray(cardForm.dataset.deckColors))
    .filter((value) => value !== remove);
  cardForm.dataset.deckColors = JSON.stringify(colors);
  renderDeckMetaPreview();
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

function safeJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function imageValue(input, fallback) {
  const file = input.files?.[0];
  if (!file) return Promise.resolve(fallback || "");
  return compressImage(file).catch(() => readFileAsDataUrl(file));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1000;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
  if (!blob) throw new Error("Could not compress image.");
  return readFileAsDataUrl(blob);
}
