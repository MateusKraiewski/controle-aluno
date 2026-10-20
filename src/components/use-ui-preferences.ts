"use client";

import { useEffect, useSyncExternalStore } from "react";
import { translate, type Locale } from "@/lib/locales";
import { getServerUiPreferencesSnapshot, getUiPreferencesSnapshot, parseUiPreferences, subscribeUiPreferences } from "@/lib/preferences";

/** Locale/theme from the device preferences, applied to <html> like the dashboard does. */
export function useUiPreferences() {
  const snapshot = useSyncExternalStore(subscribeUiPreferences, getUiPreferencesSnapshot, getServerUiPreferencesSnapshot);
  const preferences = parseUiPreferences(snapshot);
  const locale: Locale = preferences.locale ?? "pt-BR";
  const theme = preferences.theme ?? "light";
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [locale, theme]);
  return { locale, theme, t: (text: string) => translate(locale, text) };
}
