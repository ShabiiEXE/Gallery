import { MODULES } from "./constants.js";
import { getAuthStatus, login, logout } from "./auth.js";
import { bindDetailInteractions, renderCardDetail } from "./detail.js";
import { applyTranslations, t } from "./i18n.js";
import { initForm, openCardForm } from "./form.js";
import { LANGUAGES } from "./constants.js";
import {
  loadCards,
  loadDevice,
  loadRemoteCards,
  loadSettings,
  saveCards,
  saveDevice,
  saveRemoteCards,
  saveSettings,
} from "./state.js";
import { bundleCards, filteredCards, renderFilters, renderGallery } from "./gallery.js";

const $ = (id) => document.getElementById(id);
const loginButton = $("loginButton");
const loginDialog = $("loginDialog");
const submitLogin = $("submitLogin");
const loginMessage = $("loginMessage");
const passwordInput = $("passwordInput");
const addCardButton = $("addCardButton");
const settingsButton = $("settingsButton");
const settingsDialog = $("settingsDialog");
const saveSettingsButton = $("saveSettings");
const languageSelect = $("languageSelect");
const settingsLanguageFlag = $("settingsLanguageFlag");
const moduleSettings = $("moduleSettings");
const filterForm = $("filterForm");
const searchInput = $("searchInput");
const typeFilter = $("typeFilter");
const setFilter = $("setFilter");
const artistFilter = $("artistFilter");
const bundleToggle = $("bundleToggle");
const editDialog = $("editDialog");
const cardDialog = $("cardDialog");
const cardDetail = $("cardDetail");
const resultCount = $("resultCount");
const emptyState = $("emptyState");
const galleryGrid = $("galleryGrid");
const clearCacheButton = $("clearCacheButton");

const app = {
  cards: loadCards(),
  settings: loadSettings(),
  device: loadDevice(),
  filters: { query: "", type: "", set: "", artist: "" },
  authed: false,
};

document.addEventListener("DOMContentLoaded", start);

async function start() {
  initForm({ onSave: upsertCard, onDelete: deleteCard });
  bindEvents();
  app.authed = await getAuthStatus();
  if (app.authed) {
    try {
      const remoteCards = await loadRemoteCards();
      if (remoteCards.length) app.cards = remoteCards;
    } catch {
      // Local-first fallback keeps the MVP usable without a KV binding.
    }
  }
  render();
}

function bindEvents() {
  bindBackdrop();
  loginButton.addEventListener("click", () => app.authed ? doLogout() : loginDialog.showModal());
  submitLogin.addEventListener("click", doLogin);
  addCardButton.addEventListener("click", openAddCard);
  document.querySelectorAll("[data-open-add]").forEach((button) => button.addEventListener("click", openAddCard));
  settingsButton.addEventListener("click", openSettings);
  saveSettingsButton.addEventListener("click", commitSettings);
  clearCacheButton.addEventListener("click", clearBrowserCache);
  languageSelect.addEventListener("change", () => updateSettingsLanguageFlag());
  [loginDialog, settingsDialog, editDialog, cardDialog].forEach((dialog) => {
    dialog?.addEventListener("close", () => render());
  });
  filterForm.addEventListener("input", () => {
    app.filters = {
      query: searchInput.value,
      type: typeFilter.value,
      set: setFilter.value,
      artist: artistFilter.value,
    };
    app.device.bundleSameName = bundleToggle.checked;
    saveDevice(app.device);
    renderGalleryOnly();
  });
}

function bindBackdrop() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let frame = 0;
  window.addEventListener("pointermove", (event) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const x = ((event.clientX / window.innerWidth) - 0.5) * -14;
      const y = ((event.clientY / window.innerHeight) - 0.5) * -14;
      const backdropX = ((event.clientX / window.innerWidth) - 0.5) * -26;
      const backdropY = ((event.clientY / window.innerHeight) - 0.5) * -26;
      document.documentElement.style.setProperty("--grid-x", `${x.toFixed(2)}px`);
      document.documentElement.style.setProperty("--grid-y", `${y.toFixed(2)}px`);
      document.documentElement.style.setProperty("--backdrop-x", `${backdropX.toFixed(2)}px`);
      document.documentElement.style.setProperty("--backdrop-y", `${backdropY.toFixed(2)}px`);
    });
  }, { passive: true });
}

async function doLogin() {
  loginMessage.textContent = "Checking...";
  const ok = await login(passwordInput.value);
  if (!ok) {
    loginMessage.textContent = "Wrong password or EDIT_PASSWORD is not configured.";
    return;
  }
  app.authed = true;
  loginDialog.close();
  passwordInput.value = "";
  await syncRemote();
  render();
}

async function doLogout() {
  await logout();
  app.authed = false;
  render();
}

function openSettings() {
  languageSelect.value = app.settings.language;
  updateSettingsLanguageFlag();
  moduleSettings.innerHTML = MODULES.map((module, index) => {
    const item = app.settings.modules.find((entry) => entry.id === module.id) || { order: index + 1, hidden: false };
    return `
      <div class="module-row" data-module-setting="${module.id}">
        <b>${module.label}</b>
        <label><span>Order</span><input type="number" min="1" value="${item.order}" data-module-order></label>
        <label class="check-filter"><input type="checkbox" ${item.hidden ? "checked" : ""} data-module-hidden><span>Hide</span></label>
      </div>
    `;
  }).join("");
  settingsDialog.showModal();
}

function commitSettings() {
  app.settings.language = languageSelect.value;
  app.settings.modules = [...moduleSettings.querySelectorAll("[data-module-setting]")].map((row, index) => ({
    id: row.dataset.moduleSetting,
    order: Number(row.querySelector("[data-module-order]").value) || index + 1,
    hidden: row.querySelector("[data-module-hidden]").checked,
  }));
  saveSettings(app.settings);
  settingsDialog.close();
  render();
}

function openAddCard() {
  if (!app.authed) {
    loginDialog.showModal();
    return;
  }
  openCardForm();
}

function openEditCard(card) {
  if (!app.authed) {
    loginDialog.showModal();
    return;
  }
  openCardForm(card);
}

function upsertCard(card) {
  if (!app.authed) return;
  const existing = app.cards.findIndex((item) => item.id === card.id);
  if (existing >= 0) app.cards.splice(existing, 1, { ...app.cards[existing], ...card });
  else app.cards.unshift({ ...card, createdAt: new Date().toISOString() });
  persistCards();
  render();
}

function deleteCard(id) {
  if (!app.authed) return;
  if (!id) return;
  app.cards = app.cards.filter((card) => card.id !== id);
  editDialog.close();
  cardDialog.close();
  persistCards();
  render();
}

function openDetail(id) {
  const card = app.cards.find((item) => item.id === id);
  if (!card) return;
  cardDetail.innerHTML = renderCardDetail({ card, cards: app.cards, canEdit: app.authed });
  bindDetailInteractions(cardDetail, {
    onEdit: () => openEditCard(card),
    onClose: () => cardDialog.close(),
    onSwitch: openDetail,
  });
  if (!cardDialog.open) cardDialog.showModal();
}

function render() {
  document.documentElement.lang = app.settings.language;
  applyTranslations(app.settings);
  loginButton.textContent = app.authed ? t(app.settings, "logout") : t(app.settings, "login");
  loginButton.title = loginButton.textContent;
  addCardButton.disabled = !app.authed;
  addCardButton.title = app.authed ? "" : "Log in to add cards";
  document.querySelectorAll("[data-open-add]").forEach((button) => {
    button.disabled = !app.authed;
    button.title = app.authed ? "" : "Log in to add cards";
  });
  bundleToggle.checked = app.device.bundleSameName;
  applyModuleSettings();
  renderFilters(app.cards, app.filters);
  renderGalleryOnly();
}

function renderGalleryOnly() {
  const visible = filteredCards(app.cards, app.filters);
  const groups = bundleCards(visible, app.device.bundleSameName);
  renderGallery(groups, { onOpen: openDetail });
  resultCount.textContent = `${visible.length} card${visible.length === 1 ? "" : "s"}`;
  emptyState.hidden = app.cards.length > 0;
  galleryGrid.hidden = app.cards.length === 0;
}

function applyModuleSettings() {
  [...app.settings.modules]
    .sort((a, b) => a.order - b.order)
    .forEach((item, index) => {
      const element = document.querySelector(`[data-module="${item.id}"]`);
      if (!element) return;
      element.style.order = index;
      element.hidden = item.hidden;
    });
}

function persistCards() {
  saveCards(app.cards);
  if (app.authed) syncRemote();
}

async function syncRemote() {
  try {
    await saveRemoteCards(app.cards);
  } catch {
    // Cloudflare KV sync is optional until the project has its namespace bound.
  }
}

function updateSettingsLanguageFlag() {
  const language = LANGUAGES.find((item) => item.value === languageSelect.value) || LANGUAGES[0];
  settingsLanguageFlag.src = `assets/flags/${language.flag}.svg`;
  settingsLanguageFlag.alt = language.label;
}

async function clearBrowserCache() {
  clearCacheButton.disabled = true;
  clearCacheButton.textContent = "Clearing cache...";
  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } finally {
    const url = new URL(window.location.href);
    url.searchParams.set("fresh", Date.now().toString());
    window.location.replace(url.toString());
  }
}
