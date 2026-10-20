"use client";

import { useState, type FormEvent } from "react";
import { scheduleMakeup, type LessonConflict } from "@/app/actions/lessons";
import { translate, type Locale } from "@/lib/locales";
import { dateAt, formatDate, fromDateKey, localDateKey, type Lesson } from "./lesson-model";

type Props = {
  lesson: Lesson; persisted: boolean; locale: Locale;
  onLocalChange: (update: (lessons: Lesson[]) => Lesson[]) => void; onDone: (message: string) => void;
};

/** Jornada E: a make-up lesson is linked to the original instead of moving or erasing it. */
export function MakeupSection({ lesson, persisted, locale, onLocalChange, onDone }: Props) {
  const t = (text: string) => translate(locale, text);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<LessonConflict[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [slot, setSlot] = useState({ date: localDateKey(dateAt(7, lesson.time)), startsAt: lesson.time, endsAt: lesson.endTime, reason: "" });

  if (lesson.replacedBy) return null;
  if (!open) return <button type="button" className="secondary-button" onClick={() => setOpen(true)}>{t("Marcar reposição")}</button>;

  async function submit(allowConflicts: boolean) {
    setError(""); setConflicts(null);
    if (slot.endsAt <= slot.startsAt) { setError(t("O horário final precisa ser depois do inicial.")); return; }
    const message = t("Reposição marcada. A aula original continua no histórico.");
    if (!persisted) {
      const id = `demo-${Date.now()}`;
      onLocalChange((lessons) => [
        ...lessons.map((item) => item.id !== lesson.id ? item : { ...item, replacedBy: { id, date: slot.date }, ...(item.status === "upcoming" ? { status: "cancelled" as const, cancellationReason: slot.reason || null } : {}) }),
        { ...lesson, id, date: fromDateKey(slot.date, slot.startsAt), time: slot.startsAt, endTime: slot.endsAt, status: "upcoming", studiedContent: null, isSeries: false, isException: false, cancellationReason: null, replaces: { id: lesson.id, date: localDateKey(lesson.date) }, replacedBy: null, teacherRecords: [] },
      ]);
      onDone(message); return;
    }
    setBusy(true);
    try {
      const result = await scheduleMakeup(lesson.id, { ...slot, allowConflicts });
      if (!result.ok) { setError(t(result.error)); if ("conflicts" in result && result.conflicts) setConflicts(result.conflicts); return; }
      onDone(message);
    } finally { setBusy(false); }
  }

  return <form className="makeup-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submit(false); }}>
    <strong>{t("Repor esta aula")}</strong>
    <small>{t("Uma aula ainda sem registro fica cancelada com o motivo; uma falta já registrada é mantida.")}</small>
    <div className="form-row"><label>{t("Nova data")}<input type="date" required value={slot.date} onChange={(event) => setSlot({ ...slot, date: event.target.value })} /></label>
      <label>{t("Início")}<input type="time" required value={slot.startsAt} onChange={(event) => setSlot({ ...slot, startsAt: event.target.value })} /></label>
      <label>{t("Fim")}<input type="time" required value={slot.endsAt} onChange={(event) => setSlot({ ...slot, endsAt: event.target.value })} /></label></div>
    <label>{t("Motivo (opcional)")}<input value={slot.reason} maxLength={300} onChange={(event) => setSlot({ ...slot, reason: event.target.value })} /></label>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {conflicts ? <div className="conflict-box" role="alert"><strong>{t("Horário sobreposto")}</strong><ul>{conflicts.map((item) => <li key={item.id}>{item.subject} · {formatDate(item.date, { weekday: "short", day: "numeric", month: "short" }, locale)} · {item.startsAt}–{item.endsAt}</li>)}</ul>
      <button type="button" className="primary-button" disabled={busy} onClick={() => { void submit(true); }}>{t("Repor mesmo assim")}</button></div> : null}
    <div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>{t("Cancelar")}</button><button type="submit" className="primary-button" disabled={busy}>{t("Marcar reposição")}</button></div>
  </form>;
}
