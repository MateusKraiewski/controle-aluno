"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { localeOptions, type Locale, translate } from "@/lib/locales";
import { getServerUiPreferencesSnapshot, getUiPreferencesSnapshot, parseUiPreferences, saveUiPreferences, subscribeUiPreferences } from "@/lib/preferences";

type Mode = "sign-in" | "sign-up";

export default function AuthForm() {
  const router = useRouter();
  const preferencesSnapshot = useSyncExternalStore(subscribeUiPreferences, getUiPreferencesSnapshot, getServerUiPreferencesSnapshot);
  const preferences = parseUiPreferences(preferencesSnapshot);
  const locale: Locale = preferences.locale ?? "pt-BR";
  const theme = preferences.theme ?? "light";
  const t = (text: string) => translate(locale, text);
  const [mode, setMode] = useState<Mode>("sign-in");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#171d19" : "#243d34");
  }, [locale, theme]);
  function changeLocale(value: Locale) { saveUiPreferences({ locale: value, theme }); }
  function changeTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    saveUiPreferences({ locale, theme: nextTheme });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    const name = String(form.get("name") ?? "").trim();
    setPending(true);
    setMessage("");
    try {
      const result = mode === "sign-up"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setMessage(t(result.error.status === 429 ? "Muitas tentativas. Aguarde alguns minutos e tente novamente." : "Não foi possível concluir. Confira os dados ou tente novamente."));
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setMessage(t("Não foi possível conectar ao serviço da conta. Tente novamente."));
    } finally {
      setPending(false);
    }
  }

  return <main className="auth-shell">
    <div className="auth-preferences"><label className="sr-only" htmlFor="auth-locale">{t("Idioma da interface")}</label><select id="auth-locale" className="language-select" aria-label={t("Idioma da interface")} value={locale} onChange={(event) => changeLocale(event.target.value as Locale)}>{localeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button className="theme-toggle" type="button" onClick={changeTheme} aria-label={theme === "light" ? t("Ativar tema escuro") : t("Ativar tema claro")} title={theme === "light" ? t("Tema escuro") : t("Tema claro")}>{theme === "light" ? "☾" : "☀"}</button></div>
    <Link className="brand auth-brand" href="/"><span className="brand-mark">a.</span><span>Aula em Dia<small>{t("seu espaço de estudos")}</small></span></Link>
    <section className="auth-card" aria-labelledby="auth-title">
      <p className="eyebrow">{t("SEU RITMO, SEU CAMINHO")}</p>
      <h1 id="auth-title">{mode === "sign-in" ? t("Entre no seu espaço") : t("Crie sua conta de aluno")}</h1>
      <p className="auth-intro">{t("Organize as aulas e acompanhe seu histórico em um só lugar.")}</p>
      <div className="auth-tabs" role="group" aria-label={t("Tipo de acesso")}>
        <button type="button" aria-pressed={mode === "sign-in"} className={mode === "sign-in" ? "is-active" : ""} onClick={() => { setMode("sign-in"); setMessage(""); }}>{t("Entrar")}</button>
        <button type="button" aria-pressed={mode === "sign-up"} className={mode === "sign-up" ? "is-active" : ""} onClick={() => { setMode("sign-up"); setMessage(""); }}>{t("Criar conta")}</button>
      </div>
      <form className="auth-form" onSubmit={(event) => { void submit(event); }}>
        {mode === "sign-up" ? <label>{t("Nome")}<input name="name" autoComplete="name" required minLength={2} maxLength={80} /></label> : null}
        <label>{t("E-mail")}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label>{t("Senha")}<input name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={8} maxLength={128} /></label>
        {message ? <p className="auth-message" role="status">{message}</p> : null}
        <button className="primary-button auth-submit" type="submit" disabled={pending}>{pending ? t("Aguarde…") : mode === "sign-in" ? t("Entrar") : t("Criar conta")}</button>
      </form>
      <Link className="auth-back" href="/">{t("Voltar para a demonstração")}</Link>
    </section>
  </main>;
}
