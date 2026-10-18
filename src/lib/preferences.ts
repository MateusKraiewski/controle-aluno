import type { Locale } from "./locales";

export type Theme = "light" | "dark";
export type UiPreferences = { locale: Locale; theme: Theme };

const storageKey = "aula-em-dia:preferences:v1";

export function loadUiPreferences(): Partial<UiPreferences> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (!value || typeof value !== "object") return {};
    const preferences = value as Record<string, unknown>;
    return {
      ...(preferences.locale === "pt-BR" || preferences.locale === "pt-PT" || preferences.locale === "en" || preferences.locale === "es"
        ? { locale: preferences.locale }
        : {}),
      ...(preferences.theme === "light" || preferences.theme === "dark" ? { theme: preferences.theme } : {}),
    };
  } catch {
    return {};
  }
}

export function saveUiPreferences(preferences: UiPreferences) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch {
    // Preferences are optional; storage may be disabled or full.
  }
}
