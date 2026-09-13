import { MODULES } from "./constants.js";

const SETTINGS_KEY = "magic-gallery.settings";
const DEVICE_KEY = "magic-gallery.device";
const CARDS_KEY = "magic-gallery.cards";

export const defaultSettings = {
  language: "en",
  defaultSort: "artist",
  defaultSortDirection: "asc",
  defaultMobileGalleryColumns: 3,
  defaultDesktopGalleryColumns: 7,
  modules: MODULES.map((module, index) => ({ id: module.id, order: index + 1, hidden: false })),
};

export const defaultDevice = {
  bundleSameName: true,
  desktopBundleSameName: true,
  mobileBundleSameName: true,
  galleryColumns: 7,
  desktopGalleryColumns: 7,
  mobileGalleryColumns: 3,
  mobileFiltersOpen: false,
  latestAdditionsOpen: true,
};

export function loadSettings() {
  return mergeSettings(readJson(SETTINGS_KEY, {}));
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(mergeSettings(settings)));
}

export async function loadRemoteSettings() {
  const response = await fetch("/api/settings", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Remote settings unavailable");
  const data = await response.json();
  return mergeSettings(data.settings || {});
}

export async function saveRemoteSettings(settings) {
  const merged = mergeSettings(settings);
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings: merged }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Cloudflare settings save unavailable");
  }
  saveSettings(merged);
  return merged;
}

export function loadDevice() {
  return { ...defaultDevice, ...readJson(DEVICE_KEY, {}) };
}

export function saveDevice(device) {
  localStorage.setItem(DEVICE_KEY, JSON.stringify({ ...defaultDevice, ...device }));
}

export async function loadRemoteCards() {
  const response = await fetch("/api/cards", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Remote cards unavailable");
  const data = await response.json();
  const cards = Array.isArray(data.cards) ? data.cards : [];
  saveCachedCards(cards);
  return cards;
}

export async function saveRemoteCards(cards) {
  const response = await fetch("/api/cards", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cards }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Cloudflare save unavailable");
  }
  saveCachedCards(cards);
}

export function loadCachedCards() {
  return readJson(CARDS_KEY, []);
}

export function saveCachedCards(cards) {
  localStorage.setItem(CARDS_KEY, JSON.stringify(Array.isArray(cards) ? cards : []));
}

function mergeSettings(settings) {
  const existingModules = Array.isArray(settings.modules) ? settings.modules : [];
  const modules = MODULES.map((module, index) => {
    const current = existingModules.find((item) => item.id === module.id);
    return {
      id: module.id,
      order: Number(current?.order) || index + 1,
      hidden: Boolean(current?.hidden),
    };
  });
  return {
    ...defaultSettings,
    ...settings,
    defaultMobileGalleryColumns: clampNumber(settings.defaultMobileGalleryColumns, 1, 3, defaultSettings.defaultMobileGalleryColumns),
    defaultDesktopGalleryColumns: clampNumber(settings.defaultDesktopGalleryColumns, 2, 7, defaultSettings.defaultDesktopGalleryColumns),
    modules,
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
