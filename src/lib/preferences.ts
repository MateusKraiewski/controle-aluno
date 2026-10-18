import type { Locale } from "./locales";

export type Theme = "light" | "dark";
export type UiPreferences = { locale: Locale; theme: Theme };

const storageKey = "aula-em-dia:preferences:v1";

export function subscribeUiPreferences(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("aula-em-dia:preferences", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("aula-em-dia:preferences", onChange);
  };
}

export function getUiPreferencesSnapshot() {
  try { return localStorage.getItem(storageKey) ?? ""; } catch { return ""; }
}

export function getServerUiPreferencesSnapshot() { return ""; }

export function parseUiPreferences(snapshot: string): Partial<UiPreferences> {
  try {
    const value: unknown = JSON.parse(snapshot || "null");
    if (!value || typeof value !== "object") return {};
    const preferences = value as Record<string, unknown>;
    return {
      ...(preferences.locale === "pt-BR" || preferences.locale === "pt-PT" || preferences.locale === "en" || preferences.locale === "es" ? { locale: preferences.locale } : {}),
      ...(preferences.theme === "light" || preferences.theme === "dark" ? { theme: preferences.theme } : {}),
    };
  } catch { return {}; }
}

export function loadUiPreferences(): Partial<UiPreferences> {
  return parseUiPreferences(getUiPreferencesSnapshot());
}

export function saveUiPreferences(preferences: UiPreferences) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(preferences));
    window.dispatchEvent(new Event("aula-em-dia:preferences"));
  } catch {
    // Preferences are optional; storage may be disabled or full.
  }
}
