import { CARD_KINDS, LANGUAGES } from "./constants.js";
import { searchScryfall } from "./scryfall.js";

const $ = (id) => document.getElementById(id);
const cardKind = $("cardKind");
const cardLanguage = $("cardLanguage");
const cardLanguageFlag = $("cardLanguageFlag");
const lookupInput = $("lookupInput");
const lookupButton = $("lookupButton");
const lookupResults = $("lookupResults");
const cardForm = $("cardForm");
const cardFormMessage = $("cardFormMessage");
const editDialog = $("editDialog");
const editTitle = $("editTitle");
const editingId = $("editingId");
const cardName = $("cardName");
const foilInput = $("foilInput");
const frontPhoto = $("frontPhoto");
const backPhoto = $("backPhoto");
const collectorArtist = $("collectorArtist");
const artistSocialInput = $("artistSocialInput");
const artistLabel = $("artistLabel");
const signatureYear = $("signatureYear");
const signaturePlace = $("signaturePlace");
const descriptionInput = $("descriptionInput");
const moxfieldInput = $("moxfieldInput");
const fetchDeckButton = $("fetchDeckButton");
const deckNameInput = $("deckNameInput");
const deckFormatInput = $("deckFormatInput");
const deckBracketInput = $("deckBracketInput");
const deckOwnerInput = $("deckOwnerInput");
const setNameInput = $("setNameInput");
const setCodeInput = $("setCodeInput");
const setCodeIcon = $("setCodeIcon");
const collectorNumberInput = $("collectorNumberInput");
const setYearInput = $("setYearInput");
const cardArtistInput = $("cardArtistInput");
const scryfallInput = $("scryfallInput");
const saveCardButton = $("saveCardButton");
const deleteCardButton = $("deleteCardButton");

export function initForm({ onSave, onDelete }) {
  fillSelect(cardKind, CARD_KINDS.map((kind) => [kind, kind]));
  fillSelect(cardLanguage, LANGUAGES.map((language) => [language.value, language.label]));

  cardKind.addEventListener("change", updateArtistLabel);
  cardLanguage.addEventListener("change", updateLanguageFlag);
  lookupButton.addEventListener("click", runLookup);
  fetchDeckButton.addEventListener("click", fetchDeck);
  moxfieldInput.addEventListener("input", scheduleDeckFetch);
  moxfieldInput.addEventListener("paste", scheduleDeckFetch);
  setCodeInput.addEventListener("input", updateSetIcon);
  saveCardButton.addEventListener("click", () => saveCurrent(onSave));
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
  editTitle.textContent = card ? "Edit card" : "Add card";

  const data = card || {};
  editingId.value = data.id || "";
  cardName.value = data.name || "";
  cardKind.value = data.kind || "Signed";
  cardLanguage.value = data.language || "en";
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
  setNameInput.value = data.setName || "";
  setCodeInput.value = data.setCode || "";
  collectorNumberInput.value = data.collectorNumber || "";
  setYearInput.value = data.setYear || "";
  cardArtistInput.value = data.cardArtist || "";
  scryfallInput.value = data.scryfallUrl || "";
  artistSocialInput.value = data.artistSocialUrl || "";
  cardForm.dataset.frontImage = data.frontImage || "";
  cardForm.dataset.backImage = data.backImage || "";
  cardForm.dataset.commanderImage = data.commanderImage || "";
  cardForm.dataset.deckImage = data.deckImage || "";
  cardForm.dataset.deckOwnerAvatar = data.deckOwnerAvatar || "";
  updateArtistLabel();
  updateLanguageFlag();
  updateSetIcon();
  editDialog.showModal();
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
  if (deck.deckImage) cardForm.dataset.deckImage = deck.deckImage;
  if (deck.commanderImage) cardForm.dataset.commanderImage = deck.commanderImage;
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
    const results = await searchScryfall(query);
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
  cardForm.dataset.frontImage ||= card.frontImage || "";
  cardForm.dataset.commanderImage ||= card.frontImage || "";
  lookupResults.innerHTML = "";
  updateSetIcon();
}

async function saveCurrent(onSave) {
  if (!cardName.value.trim()) {
    cardFormMessage.textContent = "Card name is required.";
    return;
  }

  const frontImage = await imageValue(frontPhoto, cardForm.dataset.frontImage);
  if (!frontImage) {
    cardFormMessage.textContent = "Front photo is required. Use Scryfall lookup or upload an image.";
    return;
  }
  const backImage = await imageValue(backPhoto, cardForm.dataset.backImage);

  saveCardButton.disabled = true;
  cardFormMessage.textContent = "Saving to Cloudflare...";
  try {
    await onSave({
      id: editingId.value || crypto.randomUUID(),
      name: cardName.value.trim(),
      kind: cardKind.value,
      foil: foilInput.checked,
      language: cardLanguage.value,
      frontImage,
      backImage,
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
      deckOwnerAvatar: cardForm.dataset.deckOwnerAvatar || "",
      deckImage: cardForm.dataset.deckImage || "",
      commanderImage: cardForm.dataset.commanderImage || frontImage,
      setName: setNameInput.value.trim(),
      setCode: setCodeInput.value.trim(),
      collectorNumber: collectorNumberInput.value.trim(),
      setYear: setYearInput.value.trim(),
      cardArtist: cardArtistInput.value.trim(),
      scryfallUrl: scryfallInput.value.trim(),
      updatedAt: new Date().toISOString(),
    });
    editDialog.close();
  } catch (error) {
    cardFormMessage.textContent = error.message;
  } finally {
    saveCardButton.disabled = false;
  }
}

function updateArtistLabel() {
  const kind = cardKind.value;
  artistLabel.textContent = kind.includes("Proxy") ? "Proxy artist" : kind.includes("Alter") ? "Alter artist" : "Artist";
}

function updateLanguageFlag() {
  const language = LANGUAGES.find((item) => item.value === cardLanguage.value) || LANGUAGES[0];
  cardLanguageFlag.src = `assets/flags/${language.flag}.svg`;
  cardLanguageFlag.alt = language.label;
}

function updateSetIcon() {
  const code = setCodeInput.value.trim().toLowerCase();
  setCodeIcon.hidden = !code;
  if (!code) return;
  setCodeIcon.src = `https://svgs.scryfall.io/sets/${encodeURIComponent(code)}.svg`;
  setCodeIcon.alt = code;
}

function fillSelect(select, entries) {
  select.innerHTML = entries.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

function imageValue(input, fallback) {
  const file = input.files?.[0];
  if (!file) return Promise.resolve(fallback || "");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
