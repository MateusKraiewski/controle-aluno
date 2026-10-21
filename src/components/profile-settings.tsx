"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { updateTimeZone } from "@/app/actions/profile";
import { localeOptions, type Locale } from "@/lib/locales";
import { saveUiPreferences } from "@/lib/preferences";
import { useUiPreferences } from "./use-ui-preferences";

const noSubscription = () => () => {};
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function ProfileSettings({ name, timeZone }: { name: string; timeZone: string | null }) {
  const { locale, theme, t } = useUiPreferences();
  // The browser's zone and zone list exist only on the client; the server renders the saved value.
  const detected = useSyncExternalStore(noSubscription, browserTimeZone, () => null);
  const zones = useMemo(() => {
    const all = detected && typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    return [...new Set([timeZone ?? detected ?? "UTC", ...all])];
  }, [detected, timeZone]);
  const [chosen, setChosen] = useState<string | null>(null);
  const zone = chosen ?? timeZone ?? detected ?? "UTC";
  const setZone = setChosen;
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true); setNotice("");
    try { const result = await updateTimeZone(zone); setNotice(t(result.ok ? "Fuso horário salvo." : result.error)); }
    finally { setBusy(false); }
  }

  return <main className="collab-page" id="conteudo-principal">
    <header className="collab-header"><Link href="/" className="text-button">← {t("Voltar à agenda")}</Link><h1>{t("Perfil")}</h1><p>{name}</p></header>
    {notice ? <p className="notice" role="status">{notice}</p> : null}
    <section className="panel collab-panel"><h2>{t("Fuso horário")}</h2>
      <p className="history-hint">{t("Novas séries de aulas usam este fuso. Aulas já criadas mantêm a data e a hora que você escolheu.")}</p>
      {!timeZone && detected ? <p className="history-hint">{t("Ainda não definido; o navegador indica:")} {detected}</p> : null}
      <div className="collab-form"><label>{t("Fuso horário")}<select value={zone} onChange={(event) => setZone(event.target.value)}>{zones.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <button type="button" className="primary-button" disabled={busy} onClick={() => { void save(); }}>{t("Salvar")}</button></div>
    </section>
    <section className="panel collab-panel"><h2>{t("Neste dispositivo")}</h2>
      <div className="collab-form"><label>{t("Idioma da interface")}<select value={locale} onChange={(event) => saveUiPreferences({ locale: event.target.value as Locale, theme })}>{localeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <button type="button" className="secondary-button" onClick={() => saveUiPreferences({ locale, theme: theme === "light" ? "dark" : "light" })}>{t(theme === "light" ? "Ativar tema escuro" : "Ativar tema claro")}</button></div>
    </section>
  </main>;
}
