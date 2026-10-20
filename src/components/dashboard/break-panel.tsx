"use client";

import { useState, type FormEvent } from "react";
import { scheduleBreak } from "@/app/actions/lessons";
import { translate, type Locale } from "@/lib/locales";
import { localDateKey, type Lesson } from "./lesson-model";

type Props = { lessons: Lesson[]; persisted: boolean; locale: Locale; onLocalChange: (update: (lessons: Lesson[]) => Lesson[]) => void; onDone: (message: string) => void };

/** Holidays and breaks: cancel every untouched lesson in a period, after showing how many. */
export function BreakPanel({ lessons, persisted, locale, onLocalChange, onDone }: Props) {
  const t = (text: string) => translate(locale, text);
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState({ from: "", to: "", reason: "" });
  const [preview, setPreview] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return <button type="button" className="text-button" onClick={() => setOpen(true)}>{t("Feriados e pausas")}</button>;

  function demoMatches(lesson: Lesson) {
    const key = localDateKey(lesson.date);
    return lesson.status === "upcoming" && key >= range.from && key <= range.to;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (range.to < range.from) { setError(t("A data final precisa ser igual ou depois da inicial.")); return; }
    const confirm = preview !== null;
    if (!persisted) {
      if (!confirm) { setPreview(lessons.filter(demoMatches).length); return; }
      onLocalChange((current) => current.map((lesson) => demoMatches(lesson) ? { ...lesson, status: "cancelled", cancellationReason: range.reason } : lesson));
      setOpen(false); setPreview(null); onDone(t("Período registrado. As aulas ficam canceladas, não como faltas.")); return;
    }
    setBusy(true);
    try {
      const result = await scheduleBreak(range, confirm);
      if (!result.ok) { setError(t(result.error)); return; }
      if (result.preview) { setPreview(result.count); return; }
      setOpen(false); setPreview(null); onDone(t("Período registrado. As aulas ficam canceladas, não como faltas."));
    } finally { setBusy(false); }
  }

  const change = (field: keyof typeof range) => (value: string) => { setRange((current) => ({ ...current, [field]: value })); setPreview(null); };
  return <form className="makeup-form break-form" onSubmit={(event) => { void submit(event); }}>
    <strong>{t("Feriados e pausas")}</strong>
    <small>{t("Cancela as aulas do período que ainda não têm registro. Aulas com presença ou falta registrada não mudam.")}</small>
    <div className="form-row"><label>{t("De")}<input type="date" required value={range.from} onChange={(event) => change("from")(event.target.value)} /></label>
      <label>{t("Até")}<input type="date" required value={range.to} onChange={(event) => change("to")(event.target.value)} /></label></div>
    <label>{t("Motivo")}<input required maxLength={300} placeholder={t("Ex.: Férias de inverno")} value={range.reason} onChange={(event) => change("reason")(event.target.value)} /></label>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {preview !== null ? <p className="conflict-box" role="status">{preview === 1 ? t("1 aula será cancelada.") : `${preview} ${t("aulas serão canceladas.")}`}</p> : null}
    <div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => { setOpen(false); setPreview(null); }}>{t("Cancelar")}</button>
      <button type="submit" className="primary-button" disabled={busy || preview === 0}>{t(preview === null ? "Ver aulas afetadas" : "Confirmar período")}</button></div>
  </form>;
}
