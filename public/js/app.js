import { MODULES } from "./constants.js";
import { getAuthStatus, login, logout } from "./auth.js";
import { bindDetailInteractions, renderCardDetail } from "./detail.js";
import { applyTranslations, t } from "./i18n.js";
import { initForm, openCardForm } from "./form.js";
import { LANGUAGES } from "./constants.js";
import { closeFlagSelects, syncCustomSelect, syncFlagSelect, syncSetSelect } from "./custom-select.js";
import { icon } from "./icons.js";
import {
  loadCachedCards,
  loadDevice,
  loadRemoteCards,
  loadRemoteSettings,
  loadSettings,
  saveDevice,
  saveRemoteCards,
  saveRemoteSettings,
  saveSettings,
} from "./state.js";
import { bundleCards, filteredCards, renderCardTile, renderFilters, renderGallery } from "./gallery.js";
import { PHOTO_ASSETS } from "./photo-assets.js";

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
const filterToggleButton = $("filterToggleButton");
const typeFilter = $("typeFilter");
const foilFilter = $("foilFilter");
const setFilter = $("setFilter");
const artistFilter = $("artistFilter");
const sortSelect = $("sortSelect");
const sortDirectionButton = $("sortDirectionButton");
const separatorToggle = $("separatorToggle");
const bundleToggle = $("bundleToggle");
const cardScaleRange = $("cardScaleRange");
const defaultSortSelect = $("defaultSortSelect");
const defaultSortDirectionSelect = $("defaultSortDirectionSelect");
const defaultMobileDisplaySelect = $("defaultMobileDisplaySelect");
const defaultDesktopDisplaySelect = $("defaultDesktopDisplaySelect");
const editDialog = $("editDialog");
const cardDialog = $("cardDialog");
const cardDetail = $("cardDetail");
const detailPrevButton = $("detailPrevButton");
const detailNextButton = $("detailNextButton");
const resultCount = $("resultCount");
const emptyState = $("emptyState");
const galleryGrid = $("galleryGrid");
const clearCacheButton = $("clearCacheButton");
const lastEditText = $("lastEditText");
const latestAdditions = $("latestAdditions");
const latestToggle = $("latestToggle");
const brandLink = document.querySelector(".brand");
const brandMark = document.querySelector(".brand-mark");

const app = {
  cards: [],
  settings: loadSettings(),
  device: loadDevice(),
  filters: { type: "", foil: false, set: "", artist: "", sort: "artist", direction: "asc" },
  remoteLoaded: false,
  authed: false,
  version: null,
  activeCardId: "",
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

document.addEventListener("DOMContentLoaded", start);

async function start() {
  registerServiceWorker();
  initForm({ onSave: upsertCard, onDelete: deleteCard, getCards: () => app.cards });
  bindEvents();
  const cachedCards = loadCachedCards();
  if (cachedCards.length) {
    app.cards = cachedCards;
    app.filters.sort = app.settings.defaultSort;
    app.filters.direction = app.settings.defaultSortDirection;
    render();
    openDetailFromHash();
    warmOfflineCache();
  }
  const versionPromise = loadVersion();
  const settingsPromise = loadRemoteSettings();
  const authPromise = getAuthStatus();
  const cardsPromise = loadRemoteCards();
  const [settingsResult, cardsResult] = await Promise.allSettled([settingsPromise, cardsPromise]);
  if (settingsResult.status === "fulfilled") {
    app.settings = settingsResult.value;
    saveSettings(app.settings);
  } else {
    app.settings = loadSettings();
  }
  if (cardsResult.status === "fulfilled") {
    app.cards = cardsResult.value;
    app.remoteLoaded = true;
  } else {
    app.remoteLoaded = false;
  }
  app.filters.sort = app.settings.defaultSort;
  app.filters.direction = app.settings.defaultSortDirection;
  render();
  if (!cardDialog.open) openDetailFromHash();
  else if (cardDialog.open && app.activeCardId) openDetail(app.activeCardId, { updateHash: false });
  warmOfflineCache();
  versionPromise.then((version) => {
    app.version = version;
    renderFooter();
  }).catch(() => {});
  authPromise.then((authed) => {
    app.authed = authed;
    render();
    if (cardDialog.open && app.activeCardId) openDetail(app.activeCardId, { updateHash: false });
  }).catch(() => {});
}

function bindEvents() {
  bindBackdrop();
  bindBrandFoil();
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
  detailPrevButton?.addEventListener("click", () => cycleDetailCard(-1));
  detailNextButton?.addEventListener("click", () => cycleDetailCard(1));
  filterToggleButton?.addEventListener("click", toggleMobileFilters);
  latestToggle?.addEventListener("click", toggleLatestAdditions);
  latestAdditions?.addEventListener("scroll", syncLatestMask, { passive: true });
  languageSelect.addEventListener("change", () => syncFlagSelect(languageSelect, LANGUAGES));
  document.addEventListener("click", () => closeFlagSelects());
  window.addEventListener("resize", () => {
    syncDisplayRange();
    renderLatestAdditions();
    syncLatestMask();
  });
  window.addEventListener("hashchange", handleHashChange);
  window.addEventListener("popstate", handleHashChange);
  [loginDialog, settingsDialog, editDialog, cardDialog].forEach((dialog) => {
    dialog?.addEventListener("close", () => {
      if (dialog === cardDialog) {
        const activeId = app.activeCardId;
        app.activeCardId = "";
        if (activeId && findCardByHash()?.id === activeId) clearCardHash();
        updateDetailNav();
      }
      updateModalScrollLock();
    });
    dialog?.addEventListener("cancel", () => requestAnimationFrame(updateModalScrollLock));
  });
  filterForm.addEventListener("input", updateFiltersFromForm);
  filterForm.addEventListener("change", updateFiltersFromForm);
  sortDirectionButton.addEventListener("click", () => {
    const next = sortDirectionButton.dataset.direction === "asc" ? "desc" : "asc";
    sortDirectionButton.dataset.direction = next;
    sortDirectionButton.classList.toggle("is-desc", next === "desc");
    sortDirectionButton.setAttribute("aria-label", next === "asc" ? "Sort up" : "Sort down");
    filterForm.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function updateFiltersFromForm(event) {
  syncExclusiveViewToggles(event?.target);
  app.filters = {
    type: typeFilter.value,
    foil: foilFilter.checked,
    set: setFilter.value,
    artist: artistFilter.value,
    sort: sortSelect.value,
    direction: sortDirectionButton.dataset.direction || "asc",
  };
  persistDeviceControls();
  saveDevice(app.device);
  renderGalleryOnly();
}

function syncExclusiveViewToggles(changedControl) {
  if (changedControl === separatorToggle && separatorToggle.checked) {
    bundleToggle.checked = false;
  }
  if (changedControl === bundleToggle && bundleToggle.checked) {
    separatorToggle.checked = false;
  }
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

function bindBrandFoil() {
  if (!brandLink || !brandMark) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  brandLink.addEventListener("pointermove", (event) => {
    const rect = brandMark.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));
    brandMark.style.setProperty("--brand-shine-x", `${(clampedX * 100).toFixed(1)}%`);
    brandMark.style.setProperty("--brand-shine-y", `${(clampedY * 100).toFixed(1)}%`);
    brandMark.style.setProperty("--brand-tilt-y", `${((clampedX - 0.5) * 18).toFixed(2)}deg`);
    brandMark.style.setProperty("--brand-tilt-x", `${((0.5 - clampedY) * 16).toFixed(2)}deg`);
  }, { passive: true });
  brandLink.addEventListener("pointerleave", () => {
    brandMark.style.setProperty("--brand-shine-x", "50%");
    brandMark.style.setProperty("--brand-shine-y", "50%");
    brandMark.style.setProperty("--brand-tilt-x", "0deg");
    brandMark.style.setProperty("--brand-tilt-y", "0deg");
  });
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
  warmOfflineCache();
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
  defaultMobileDisplaySelect.value = String(app.settings.defaultMobileGalleryColumns || 3);
  defaultDesktopDisplaySelect.value = String(app.settings.defaultDesktopGalleryColumns || 7);
  syncFlagSelect(languageSelect, LANGUAGES);
  syncCustomSelect(defaultSortSelect);
  syncCustomSelect(defaultSortDirectionSelect);
  syncCustomSelect(defaultMobileDisplaySelect);
  syncCustomSelect(defaultDesktopDisplaySelect);
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

async function commitSettings() {
  app.settings.language = languageSelect.value;
  app.settings.defaultSort = defaultSortSelect.value || "artist";
  app.settings.defaultSortDirection = defaultSortDirectionSelect.value || "asc";
  app.settings.defaultMobileGalleryColumns = clamp(Number(defaultMobileDisplaySelect.value) || 3, 1, 3);
  app.settings.defaultDesktopGalleryColumns = clamp(Number(defaultDesktopDisplaySelect.value) || 7, 2, 7);
  app.settings.modules = [...moduleSettings.querySelectorAll("[data-module-setting]")].map((row, index) => ({
    id: row.dataset.moduleSetting,
    order: Number(row.querySelector("[data-module-order]").value) || index + 1,
    hidden: row.querySelector("[data-module-hidden]").checked,
  }));
  saveSettings(app.settings);
  try {
    app.settings = await saveRemoteSettings(app.settings);
  } catch (error) {
    alert(error.message || "Cloudflare settings save unavailable");
    return;
  }
  app.filters.sort = app.settings.defaultSort;
  app.filters.direction = app.settings.defaultSortDirection;
  app.device.mobileGalleryColumns = app.settings.defaultMobileGalleryColumns;
  app.device.desktopGalleryColumns = app.settings.defaultDesktopGalleryColumns;
  app.device.galleryColumns = window.matchMedia("(max-width: 820px)").matches
    ? app.device.mobileGalleryColumns
    : app.device.desktopGalleryColumns;
  saveDevice(app.device);
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
  const previousPartnerId = existing >= 0 ? nextCards[existing].partnerId || "" : "";
  const savedCard = existing >= 0 ? { ...nextCards[existing], ...card } : { ...card, createdAt: new Date().toISOString() };
  if (existing >= 0) nextCards.splice(existing, 1, savedCard);
  else nextCards.unshift(savedCard);
  syncPartnerLinks(nextCards, savedCard, previousPartnerId);
  await saveRemoteCards(nextCards);
  app.cards = nextCards;
  editDialog.close();
  cardDialog.close();
  render();
  warmOfflineCache();
}

function syncPartnerLinks(cards, savedCard, previousPartnerId) {
  const currentPartnerId = savedCard.partnerId || "";
  cards.forEach((card) => {
    if (card.id === savedCard.id) return;
    if (card.partnerId === savedCard.id && card.id !== currentPartnerId) {
      card.partnerId = "";
      card.updatedAt = new Date().toISOString();
    }
    if (previousPartnerId && card.id === previousPartnerId && card.id !== currentPartnerId && card.partnerId === savedCard.id) {
      card.partnerId = "";
      card.updatedAt = new Date().toISOString();
    }
    if (currentPartnerId && card.id === currentPartnerId) {
      card.partnerId = savedCard.id;
      card.updatedAt = new Date().toISOString();
    }
  });
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

function openDetail(id, options = {}) {
  const { updateHash = true } = options;
  const card = app.cards.find((item) => item.id === id);
  if (!card) return;
  app.activeCardId = card.id;
  if (updateHash) setCardHash(card);
  cardDetail.innerHTML = renderCardDetail({ card, cards: app.cards, canEdit: app.authed });
  bindDetailInteractions(cardDetail, {
    onEdit: () => openEditCard(card),
    onClose: () => cardDialog.close(),
    onSwitch: openDetail,
    onShare: (button) => shareCardLink(card, button),
  });
  if (!cardDialog.open) cardDialog.showModal();
  updateDetailNav();
  updateModalScrollLock();
}

function cycleDetailCard(direction) {
  const cards = detailNavigationCards();
  if (cards.length < 2 || !app.activeCardId) return;
  const index = cards.findIndex((card) => card.id === app.activeCardId);
  const currentIndex = index >= 0 ? index : 0;
  const nextIndex = (currentIndex + direction + cards.length) % cards.length;
  openDetail(cards[nextIndex].id);
}

function detailNavigationCards() {
  const visible = filteredCards(app.cards, app.filters);
  return visible.some((card) => card.id === app.activeCardId) ? visible : app.cards;
}

function updateDetailNav() {
  const canCycle = cardDialog.open && detailNavigationCards().length > 1;
  [detailPrevButton, detailNextButton].forEach((button) => {
    if (!button) return;
    button.hidden = !canCycle;
  });
}

function handleHashChange() {
  if (location.hash) {
    openDetailFromHash();
    return;
  }
  if (cardDialog.open) cardDialog.close();
}

function openDetailFromHash() {
  const card = findCardByHash();
  if (card) openDetail(card.id, { updateHash: false });
}

function setCardHash(card) {
  const slug = cardSlug(card);
  if (!slug) return;
  const next = `${cleanPathAndSearch()}#${slug}`;
  if (location.hash.slice(1) === slug) return;
  history.pushState(null, "", next);
}

function clearCardHash() {
  history.pushState(null, "", cleanPathAndSearch());
}

function findCardByHash() {
  const raw = location.hash.slice(1);
  if (!raw) return null;
  let requested = "";
  try {
    requested = decodeURIComponent(raw).toLowerCase();
  } catch {
    requested = raw.toLowerCase();
  }
  return app.cards.find((card) => cardSlug(card).toLowerCase() === requested) || null;
}

function cardSlug(card) {
  const base = slugBase(card.name);
  const matches = app.cards.filter((item) => slugBase(item.name) === base);
  const index = matches.findIndex((item) => item.id === card.id);
  return index > 0 ? `${base}_${index}` : base;
}

function slugBase(value) {
  return String(value || "card")
    .trim()
    .replace(/\/\//g, " ")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "") || "card";
}

async function shareCardLink(card, button) {
  setCardHash(card);
  const url = shareUrl(card);
  try {
    await navigator.clipboard.writeText(url);
    showShareFeedback(button, "Copied");
  } catch {
    fallbackCopy(url);
    showShareFeedback(button, "Copied");
  }
}

function shareUrl(card) {
  const url = new URL(location.href);
  url.searchParams.delete("fresh");
  url.hash = cardHashHref(card);
  return url.toString();
}

function fallbackCopy(value) {
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function showShareFeedback(button, label) {
  if (!button) return;
  const previous = button.title || "Copy card link";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.dataset.copied = "true";
  window.setTimeout(() => {
    button.title = previous;
    button.setAttribute("aria-label", previous);
    delete button.dataset.copied;
  }, 1200);
}

function render() {
  document.documentElement.lang = app.settings.language;
  applyTranslations(app.settings);
  const loginTitle = app.authed ? t(app.settings, "logout") : t(app.settings, "login");
  loginButton.innerHTML = app.authed ? icon("exit") : icon("pencil");
  loginButton.title = loginTitle;
  loginButton.setAttribute("aria-label", loginTitle);
  settingsButton.hidden = !app.authed;
  settingsButton.disabled = window.matchMedia("(max-width: 820px)").matches;
  addCardButton.hidden = !app.authed;
  addCardButton.disabled = !app.authed;
  addCardButton.title = app.authed ? "" : "Log in to add cards";
  syncLatestAdditions();
  syncDisplayRange();
  bundleToggle.checked = app.device.bundleSameName;
  cardScaleRange.value = app.device.galleryColumns || 7;
  sortSelect.value = app.filters.sort || app.settings.defaultSort || "artist";
  sortDirectionButton.dataset.direction = app.filters.direction || app.settings.defaultSortDirection || "asc";
  sortDirectionButton.classList.toggle("is-desc", sortDirectionButton.dataset.direction === "desc");
  applyModuleSettings();
  renderFilters(app.cards, app.filters);
  typeFilter.value = app.filters.type || "";
  foilFilter.checked = Boolean(app.filters.foil);
  syncCustomSelect(typeFilter);
  syncSetSelect(setFilter);
  syncCustomSelect(artistFilter);
  syncCustomSelect(sortSelect);
  renderGalleryOnly();
}

function syncDisplayRange() {
  const mobile = window.matchMedia("(max-width: 820px)").matches;
  const mobileMaxColumns = window.matchMedia("(max-width: 380px)").matches ? 2 : 3;
  const fallback = mobile ? app.settings.defaultMobileGalleryColumns : app.settings.defaultDesktopGalleryColumns;
  settingsButton.disabled = mobile;
  cardScaleRange.min = mobile ? "1" : "2";
  cardScaleRange.max = mobile ? String(mobileMaxColumns) : "7";
  const key = mobile ? "mobileGalleryColumns" : "desktopGalleryColumns";
  const bundleKey = mobile ? "mobileBundleSameName" : "desktopBundleSameName";
  const separatorKey = mobile ? "mobileShowSortSeparators" : "desktopShowSortSeparators";
  const value = Number(app.device[key] ?? app.device.galleryColumns) || fallback || (mobile ? mobileMaxColumns : 7);
  const clamped = Math.max(Number(cardScaleRange.min), Math.min(Number(cardScaleRange.max), value));
  app.device[key] = clamped;
  app.device.galleryColumns = clamped;
  app.device.bundleSameName = app.device[bundleKey] ?? app.device.bundleSameName;
  app.device.showSortSeparators = app.device[separatorKey] ?? app.device.showSortSeparators;
  if (app.device.showSortSeparators) {
    app.device.bundleSameName = false;
    app.device[bundleKey] = false;
  }
  cardScaleRange.value = clamped;
  bundleToggle.checked = app.device.bundleSameName;
  separatorToggle.checked = Boolean(app.device.showSortSeparators);
  document.body.classList.toggle("filters-open", Boolean(app.device.mobileFiltersOpen));
  filterToggleButton?.setAttribute("aria-expanded", app.device.mobileFiltersOpen ? "true" : "false");
}

function updateModalScrollLock() {
  const open = [loginDialog, settingsDialog, editDialog, cardDialog].some((dialog) => dialog?.open);
  document.documentElement.classList.toggle("has-modal-open", open);
  document.body.classList.toggle("has-modal-open", open);
}

function renderGalleryOnly() {
  const visible = filteredCards(app.cards, app.filters);
  const groups = bundleCards(visible, app.device.bundleSameName);
  const columns = app.device.galleryColumns || 7;
  const mobileColumns = Math.max(1, Math.min(4, columns));
  const activeSort = app.filters.sort || app.settings.defaultSort || "artist";
  const showSeparators = app.device.showSortSeparators && !["name", "latest"].includes(activeSort);
  galleryGrid?.style.setProperty("--gallery-columns", `${columns}`);
  galleryGrid?.style.setProperty("--gallery-mobile-columns", `${mobileColumns}`);
  if (galleryGrid) {
    galleryGrid.dataset.mobileColumns = String(mobileColumns);
    galleryGrid.classList.toggle("has-sort-separators", Boolean(showSeparators));
  }
  renderGallery(groups, {
    onOpen: openDetail,
    getHref: cardHashHref,
    separators: showSeparators,
    sort: activeSort,
  });
  if (cardDialog.open) updateDetailNav();
  resultCount.textContent = `${visible.length} card${visible.length === 1 ? "" : "s"}`;
  renderFooter();
  renderLatestAdditions();
  if (emptyState) emptyState.hidden = app.cards.length > 0;
  if (galleryGrid) galleryGrid.hidden = app.cards.length === 0;
}

function renderLatestAdditions() {
  if (!latestAdditions) return;
  const latest = [...app.cards]
    .sort((a, b) => Date.parse(b.createdAt || b.updatedAt || "") - Date.parse(a.createdAt || a.updatedAt || ""))
    .slice(0, 5);
  latestAdditions.innerHTML = latest.map((card) => renderCardTile(card, 1, { href: cardHashHref(card), loading: "eager" })).join("");
  latestAdditions.querySelectorAll("[data-card-open]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openDetail(link.dataset.cardId);
    });
  });
  requestAnimationFrame(syncLatestMask);
}

function syncLatestMask() {
  if (!latestAdditions) return;
  const maxScroll = Math.max(0, latestAdditions.scrollWidth - latestAdditions.clientWidth);
  const edgeThreshold = 18;
  latestAdditions.classList.toggle("can-scroll-left", latestAdditions.scrollLeft > edgeThreshold);
  latestAdditions.classList.toggle("can-scroll-right", maxScroll - latestAdditions.scrollLeft > edgeThreshold);
}

function cardHashHref(card) {
  const slug = cardSlug(card);
  return slug ? `#${slug}` : "#";
}

function cleanPathAndSearch() {
  const url = new URL(location.href);
  url.searchParams.delete("fresh");
  const query = url.searchParams.toString();
  return `${url.pathname}${query ? `?${query}` : ""}`;
}

function renderFooter() {
  if (app.version) clearCacheButton.textContent = formatVersion(app.version);
  const dates = app.cards.map((card) => Date.parse(card.updatedAt || card.createdAt || "")).filter(Number.isFinite);
  if (!dates.length) return;
  const latest = new Date(Math.max(...dates));
  lastEditText.textContent = `Last edit ${latest.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;
}

async function loadVersion() {
  try {
    const response = await fetch("version.json", { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function formatVersion(version) {
  const number = String(version.version || "").replace(/^v/i, "");
  const date = String(version.date || "").replace(/^\./, "");
  return number && date ? `v${number}.${date}` : "v50.09.12";
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

function persistDeviceControls() {
  const mobile = window.matchMedia("(max-width: 820px)").matches;
  const columns = Number(cardScaleRange.value) || (mobile ? 4 : 7);
  if (mobile) {
    app.device.mobileGalleryColumns = columns;
    app.device.mobileBundleSameName = bundleToggle.checked;
    app.device.mobileShowSortSeparators = separatorToggle.checked;
  } else {
    app.device.desktopGalleryColumns = columns;
    app.device.desktopBundleSameName = bundleToggle.checked;
    app.device.desktopShowSortSeparators = separatorToggle.checked;
  }
  app.device.galleryColumns = columns;
  app.device.bundleSameName = bundleToggle.checked;
  app.device.showSortSeparators = separatorToggle.checked;
}

function toggleMobileFilters() {
  app.device.mobileFiltersOpen = !app.device.mobileFiltersOpen;
  saveDevice(app.device);
  document.body.classList.toggle("filters-open", app.device.mobileFiltersOpen);
  filterToggleButton?.setAttribute("aria-expanded", app.device.mobileFiltersOpen ? "true" : "false");
}

function toggleLatestAdditions() {
  app.device.latestAdditionsOpen = app.device.latestAdditionsOpen === false;
  saveDevice(app.device);
  syncLatestAdditions();
}

function syncLatestAdditions() {
  const open = app.device.latestAdditionsOpen !== false;
  document.body.classList.toggle("latest-closed", !open);
  latestToggle?.setAttribute("aria-expanded", open ? "true" : "false");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").then(() => warmOfflineCache()).catch(() => {});
}

function warmOfflineCache() {
  if (!("serviceWorker" in navigator)) return;
  const urls = [
    ...PHOTO_ASSETS,
    ...cardCacheUrls(app.cards),
  ];
  navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage({ type: "CACHE_URLS", urls });
  }).catch(() => {});
}

function cardCacheUrls(cards) {
  const urls = new Set();
  cards.forEach((card) => {
    [
      card.frontImage,
      card.backImage,
      card.originalImage,
      card.originalBackImage,
      card.deckImage,
      card.commanderImage,
      card.deckOwnerAvatar,
      ...(Array.isArray(card.deckOwners) ? card.deckOwners.map((owner) => owner.avatar) : []),
    ].filter(Boolean).forEach((url) => urls.add(url));
  });
  return [...urls];
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
