import { MODULES } from "./constants.js";

const SETTINGS_KEY = "magic-gallery.settings";
const DEVICE_KEY = "magic-gallery.device";

export const defaultSettings = {
  language: "en",
  defaultSort: "artist",
  defaultSortDirection: "asc",
  modules: MODULES.map((module, index) => ({ id: module.id, order: index + 1, hidden: false })),
};

export const defaultDevice = {
  bundleSameName: true,
  desktopBundleSameName: true,
  mobileBundleSameName: true,
  galleryColumns: 7,
  desktopGalleryColumns: 7,
  mobileGalleryColumns: 4,
  mobileFiltersOpen: false,
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
  return Array.isArray(data.cards) ? data.cards : [];
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
    modules,
  };
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
