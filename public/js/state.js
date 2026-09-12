import { MODULES } from "./constants.js";

const LEGACY_CARD_KEY = "magic-gallery.cards";
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
  galleryColumns: 7,
};

export function loadCards() {
  try {
    localStorage.removeItem(LEGACY_CARD_KEY);
  } catch {
    // Card data is Cloudflare-only; ignore browsers that block localStorage.
  }
  return [];
}

export function loadSettings() {
  return mergeSettings(readJson(SETTINGS_KEY, {}));
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(mergeSettings(settings)));
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
