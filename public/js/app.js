import { MODULES } from "./constants.js";
import { getAuthStatus, login, logout } from "./auth.js";
import { bindDetailInteractions, renderCardDetail } from "./detail.js";
import { applyTranslations, t } from "./i18n.js";
import { initForm, openCardForm } from "./form.js";
import { LANGUAGES } from "./constants.js";
import { closeFlagSelects, syncCustomSelect, syncFlagSelect, syncSetSelect } from "./custom-select.js";
import { icon } from "./icons.js";
import {
  loadCards,
  loadDevice,
  loadRemoteCards,
  loadSettings,
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
const moduleSettings = $("moduleSettings");
const filterForm = $("filterForm");
const typeFilter = $("typeFilter");
const setFilter = $("setFilter");
const artistFilter = $("artistFilter");
const sortSelect = $("sortSelect");
const sortDirectionButton = $("sortDirectionButton");
const bundleToggle = $("bundleToggle");
const cardScaleRange = $("cardScaleRange");
const defaultSortSelect = $("defaultSortSelect");
const defaultSortDirectionSelect = $("defaultSortDirectionSelect");
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
  filters: { type: "", set: "", artist: "", sort: "artist", direction: "asc" },
  remoteLoaded: false,
  authed: false,
};

document.addEventListener("DOMContentLoaded", start);

async function start() {
  initForm({ onSave: upsertCard, onDelete: deleteCard });
  bindEvents();
  app.authed = await getAuthStatus();
  try {
    app.cards = await loadRemoteCards();
    app.remoteLoaded = true;
  } catch {
    app.remoteLoaded = false;
  }
  app.filters.sort = app.settings.defaultSort;
  app.filters.direction = app.settings.defaultSortDirection;
  render();
}

function bindEvents() {
  bindBackdrop();
  loginButton.addEventListener("click", () => {
    if (app.authed) {
      doLogout();
      return;
    }
    loginDialog.showModal();
    updateModalScrollLock();
  });
  submitLogin.addEventListener("click", doLogin);
  addCardButton.addEventListener("click", openAddCard);
  settingsButton.addEventListener("click", openSettings);
  saveSettingsButton.addEventListener("click", commitSettings);
  clearCacheButton.addEventListener("click", clearBrowserCache);
  languageSelect.addEventListener("change", () => syncFlagSelect(languageSelect, LANGUAGES));
  document.addEventListener("click", () => closeFlagSelects());
  [loginDialog, settingsDialog, editDialog, cardDialog].forEach((dialog) => {
    dialog?.addEventListener("close", () => {
      updateModalScrollLock();
      render();
    });
    dialog?.addEventListener("cancel", () => requestAnimationFrame(updateModalScrollLock));
  });
  filterForm.addEventListener("input", () => {
    app.filters = {
      type: typeFilter.value,
      set: setFilter.value,
      artist: artistFilter.value,
      sort: sortSelect.value,
      direction: sortDirectionButton.dataset.direction || "asc",
    };
    app.device.bundleSameName = bundleToggle.checked;
    app.device.galleryCardSize = Number(cardScaleRange.value) || 170;
    saveDevice(app.device);
    renderGalleryOnly();
  });
  sortDirectionButton.addEventListener("click", () => {
    const next = sortDirectionButton.dataset.direction === "asc" ? "desc" : "asc";
    sortDirectionButton.dataset.direction = next;
    sortDirectionButton.classList.toggle("is-desc", next === "desc");
    sortDirectionButton.setAttribute("aria-label", next === "asc" ? "Sort up" : "Sort down");
    filterForm.dispatchEvent(new Event("input", { bubbles: true }));
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
  app.cards = await loadRemoteCards();
  render();
}

async function doLogout() {
  await logout();
  app.authed = false;
  render();
}

function openSettings() {
  languageSelect.value = app.settings.language;
  defaultSortSelect.value = app.settings.defaultSort || "artist";
  defaultSortDirectionSelect.value = app.settings.defaultSortDirection || "asc";
  syncFlagSelect(languageSelect, LANGUAGES);
  syncCustomSelect(defaultSortSelect);
  syncCustomSelect(defaultSortDirectionSelect);
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
  updateModalScrollLock();
}

function commitSettings() {
  app.settings.language = languageSelect.value;
  app.settings.defaultSort = defaultSortSelect.value || "artist";
  app.settings.defaultSortDirection = defaultSortDirectionSelect.value || "asc";
  app.settings.modules = [...moduleSettings.querySelectorAll("[data-module-setting]")].map((row, index) => ({
    id: row.dataset.moduleSetting,
    order: Number(row.querySelector("[data-module-order]").value) || index + 1,
    hidden: row.querySelector("[data-module-hidden]").checked,
  }));
  saveSettings(app.settings);
  app.filters.sort = app.settings.defaultSort;
  app.filters.direction = app.settings.defaultSortDirection;
  settingsDialog.close();
  render();
}

function openAddCard() {
  if (!app.authed) {
    loginDialog.showModal();
    updateModalScrollLock();
    return;
  }
  openCardForm();
}

function openEditCard(card) {
  if (!app.authed) {
    loginDialog.showModal();
    updateModalScrollLock();
    return;
  }
  openCardForm(card);
}

async function upsertCard(card) {
  if (!app.authed) return;
  if (!app.remoteLoaded) {
    app.cards = await loadRemoteCards();
    app.remoteLoaded = true;
  }
  const existing = app.cards.findIndex((item) => item.id === card.id);
  const nextCards = [...app.cards];
  if (existing >= 0) nextCards.splice(existing, 1, { ...nextCards[existing], ...card });
  else nextCards.unshift({ ...card, createdAt: new Date().toISOString() });
  await saveRemoteCards(nextCards);
  app.cards = nextCards;
  render();
}

async function deleteCard(id) {
  if (!app.authed) return;
  if (!app.remoteLoaded) return;
  if (!id) return;
  const nextCards = app.cards.filter((card) => card.id !== id);
  await saveRemoteCards(nextCards);
  app.cards = nextCards;
  editDialog.close();
  cardDialog.close();
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
  updateModalScrollLock();
}

function render() {
  document.documentElement.lang = app.settings.language;
  applyTranslations(app.settings);
  const loginTitle = app.authed ? t(app.settings, "logout") : t(app.settings, "login");
  loginButton.innerHTML = app.authed ? icon("exit") : icon("pencil");
  loginButton.title = loginTitle;
  loginButton.setAttribute("aria-label", loginTitle);
  settingsButton.hidden = !app.authed;
  addCardButton.hidden = !app.authed;
  addCardButton.disabled = !app.authed;
  addCardButton.title = app.authed ? "" : "Log in to add cards";
  bundleToggle.checked = app.device.bundleSameName;
  cardScaleRange.value = app.device.galleryCardSize || 170;
  sortSelect.value = app.filters.sort || app.settings.defaultSort || "artist";
  sortDirectionButton.dataset.direction = app.filters.direction || app.settings.defaultSortDirection || "asc";
  sortDirectionButton.classList.toggle("is-desc", sortDirectionButton.dataset.direction === "desc");
  applyModuleSettings();
  renderFilters(app.cards, app.filters);
  syncCustomSelect(typeFilter);
  syncSetSelect(setFilter);
  syncCustomSelect(artistFilter);
  syncCustomSelect(sortSelect);
  renderGalleryOnly();
}

function updateModalScrollLock() {
  const open = [loginDialog, settingsDialog, editDialog, cardDialog].some((dialog) => dialog?.open);
  document.documentElement.classList.toggle("has-modal-open", open);
  document.body.classList.toggle("has-modal-open", open);
}

function renderGalleryOnly() {
  const visible = filteredCards(app.cards, app.filters);
  const groups = bundleCards(visible, app.device.bundleSameName);
  galleryGrid?.style.setProperty("--gallery-card-size", `${app.device.galleryCardSize || 170}px`);
  renderGallery(groups, { onOpen: openDetail });
  resultCount.textContent = `${visible.length} card${visible.length === 1 ? "" : "s"}`;
  if (emptyState) emptyState.hidden = app.cards.length > 0;
  if (galleryGrid) galleryGrid.hidden = app.cards.length === 0;
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

async function clearBrowserCache() {
  clearCacheButton.disabled = true;
  clearCacheButton.textContent = "Resetting site...";
  try {
    localStorage.clear();
    sessionStorage.clear();
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
