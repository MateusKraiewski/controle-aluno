"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { cancelLesson, createLesson, editLesson, removeLesson, restoreCancelledLesson, type LessonConflict } from "@/app/actions/lessons";
import { generateWeeklyDates, intervalsOverlap } from "@/features/calendar/domain";
import { translate, type Locale } from "@/lib/locales";
import { dateAt, formatDate, fromDateKey, localDateKey, type Lesson } from "./lesson-model";
import { MakeupSection } from "./makeup-section";

type Scope = "this" | "following" | "all";
type Draft = { subject: string; topic: string; date: string; startsAt: string; endsAt: string; repeat: string; weekdays: number[]; endsOn: string };
type Props = {
  mode: "create" | Lesson; persisted: boolean; locale: Locale; existing: Lesson[];
  onClose: () => void; onLocalChange: (update: (lessons: Lesson[]) => Lesson[]) => void; onDone: (message: string) => void;
};

const weekdayNames: [number, string][] = [[1, "Segunda"], [2, "Terça"], [3, "Quarta"], [4, "Quinta"], [5, "Sexta"], [6, "Sábado"], [7, "Domingo"]];

function readDraft(form: HTMLFormElement): Draft {
  const data = new FormData(form);
  return {
    subject: String(data.get("subject") ?? "").trim(), topic: String(data.get("topic") ?? "").trim(),
    date: String(data.get("date") ?? ""), startsAt: String(data.get("time") ?? ""), endsAt: String(data.get("endsAt") ?? ""),
    repeat: String(data.get("repeat") || "none"), weekdays: data.getAll("weekdays").map(Number), endsOn: String(data.get("endsOn") || ""),
  };
}

function useFocusTrap(onClose: () => void) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const dialog = ref.current;
    const focusable = () => [...(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]') ?? [])];
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== "Tab") return;
      const items = focusable(); const first = items[0]; const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    focusable()[0]?.focus();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);
  return ref;
}

export function LessonDialog({ mode, persisted, locale, existing, onClose, onLocalChange, onDone }: Props) {
  const t = (text: string) => translate(locale, text);
  const dialogRef = useFocusTrap(onClose);
  const editing = mode === "create" ? null : mode;
  const [repeatChoice, setRepeatChoice] = useState("none");
  const [scope, setScope] = useState<Scope>("this");
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<LessonConflict[] | null>(null);
  const [retry, setRetry] = useState<(() => void) | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const seriesScopes = persisted && editing?.isSeries;
  const scopeNote = scope === "this" ? "" : t("Aulas da série já registradas, canceladas ou alteradas individualmente não mudam.");

  function localConflicts(dates: string[], draft: Draft): LessonConflict[] {
    const found: LessonConflict[] = [];
    for (const lesson of existing) {
      const key = localDateKey(lesson.date);
      if (lesson.id === editing?.id || lesson.status === "cancelled" || !dates.includes(key)) continue;
      if (intervalsOverlap({ startsAt: draft.startsAt, endsAt: draft.endsAt }, { startsAt: lesson.time, endsAt: lesson.endTime })) {
        found.push({ id: lesson.id, subject: lesson.subject, date: key, startsAt: lesson.time, endsAt: lesson.endTime });
      }
    }
    return found;
  }

  async function submit(draft: Draft, allowConflicts: boolean) {
    setError("");
    if (draft.endsAt <= draft.startsAt) { setError(t("O horário final precisa ser depois do inicial.")); return; }
    let dates = [draft.date];
    if (!editing && draft.repeat !== "none") {
      try { dates = generateWeeklyDates({ startDate: draft.date, endDate: draft.endsOn, weekdays: draft.weekdays, everyWeeks: draft.repeat === "biweekly" ? 2 : 1 }); }
      catch { setError(t("Confira os dias e o período da recorrência.")); return; }
      if (dates.length === 0 || dates.length > 300) { setError(t("A série precisa gerar entre 1 e 300 aulas.")); return; }
    }
    if (!persisted) {
      const found = allowConflicts ? [] : localConflicts(dates, draft);
      if (found.length) { setConflicts(found); setRetry(() => () => { void submit(draft, true); }); return; }
      if (editing) {
        onLocalChange((lessons) => lessons.map((lesson) => lesson.id === editing.id ? { ...lesson, subject: draft.subject, plannedContent: draft.topic, date: fromDateKey(draft.date, draft.startsAt), time: draft.startsAt, endTime: draft.endsAt } : lesson));
        onDone(t("Aula alterada nesta demonstração.")); return;
      }
      const created = dates.map((key, index): Lesson => ({ id: `demo-${Date.now()}-${index}`, subject: draft.subject, date: fromDateKey(key, draft.startsAt), time: draft.startsAt, endTime: draft.endsAt, plannedContent: draft.topic, studiedContent: null, teacher: "Professor(a) a definir", status: "upcoming", isSeries: dates.length > 1, isException: false, cancellationReason: null, replaces: null, replacedBy: null, teacherRecords: [] }));
      onLocalChange((lessons) => [...lessons, ...created]);
      onDone(t("Aula adicionada à demonstração desta sessão. Crie uma conta para salvar seus registros.")); return;
    }
    setBusy(true);
    try {
      const result = editing
        ? await editLesson(editing.id, { subject: draft.subject, topic: draft.topic, date: draft.date, startsAt: draft.startsAt, endsAt: draft.endsAt, scope, allowConflicts })
        : await createLesson({ subject: draft.subject, topic: draft.topic, date: draft.date, startsAt: draft.startsAt, endsAt: draft.endsAt, repeat: draft.repeat, weekdays: draft.weekdays, endsOn: draft.endsOn, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, allowConflicts });
      if (!result.ok) {
        setError(t(result.error));
        if ("conflicts" in result && result.conflicts) { setConflicts(result.conflicts); setRetry(() => () => { void submit(draft, true); }); }
        return;
      }
      if (editing) onDone(t("Alterações salvas."));
      else onDone(t(dates.length > 1 ? "Série e aulas salvas no calendário." : "Aula salva no seu calendário."));
    } finally { setBusy(false); }
  }

  async function runAction(action: () => Promise<{ ok: boolean; error?: string; conflicts?: LessonConflict[] }>, success: string, retryAction?: () => void) {
    setBusy(true); setError(""); setConflicts(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(t(result.error ?? "Não foi possível concluir. Tente novamente."));
        if (result.conflicts && retryAction) { setConflicts(result.conflicts); setRetry(() => retryAction); }
        return;
      }
      onDone(success);
    } finally { setBusy(false); }
  }

  function cancelSelected() {
    if (!editing) return;
    if (!persisted) {
      onLocalChange((lessons) => lessons.map((lesson) => lesson.id === editing.id ? { ...lesson, status: "cancelled", cancellationReason: cancelReason.trim() || null } : lesson));
      onDone(t("Aula cancelada nesta demonstração.")); return;
    }
    void runAction(() => cancelLesson(editing.id, scope, cancelReason), t("Aula cancelada. Ela continua no histórico como cancelada, não como falta."));
  }
  function restoreSelected() {
    if (!editing) return;
    if (!persisted) { onLocalChange((lessons) => lessons.map((lesson) => lesson.id === editing.id ? { ...lesson, status: "upcoming", cancellationReason: null } : lesson)); onDone(t("Aula reativada.")); return; }
    const lessonId = editing.id;
    const restore = (allowConflicts: boolean) => runAction(() => restoreCancelledLesson(lessonId, allowConflicts), t("Aula reativada."), () => { void restore(true); });
    void restore(false);
  }
  function deleteSelected() {
    if (!editing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    if (!persisted) { onLocalChange((lessons) => lessons.filter((lesson) => lesson.id !== editing.id)); onDone(t("Aula excluída.")); return; }
    void runAction(() => removeLesson(editing.id, scope), t("Aula excluída."));
  }

  const defaults = editing
    ? { subject: editing.subject, topic: editing.plannedContent, date: localDateKey(editing.date), time: editing.time, endsAt: editing.endTime }
    : { subject: "", topic: "", date: localDateKey(dateAt(1, "09:00")), time: "09:00", endsAt: "10:00" };

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="lesson-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="dialog-heading"><div><p className="eyebrow">{t("AGENDA DO ALUNO")}</p><h2 id="dialog-title">{t(editing ? "Editar aula" : "Adicionar aula")}</h2></div><button className="dialog-close" type="button" onClick={onClose} aria-label={t("Fechar")}>×</button></div>
      <p className="dialog-help">{t(persisted ? (editing ? "As alterações ficam salvas no seu calendário." : "A aula será salva no seu calendário.") : "Crie uma conta para salvar suas aulas.")}</p>
      <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setConflicts(null); void submit(readDraft(event.currentTarget), false); }}>
        <label>{t("Matéria")}<input name="subject" autoComplete="off" placeholder={t("Ex.: História…")} required maxLength={48} defaultValue={defaults.subject} /></label>
        <label>{t("O que você vai estudar?")}<input name="topic" autoComplete="off" placeholder={t("Ex.: Brasil Colônia…")} required maxLength={500} defaultValue={defaults.topic} /></label>
        {seriesScopes ? <fieldset className="scope-options"><legend>{t("Aplicar a")}</legend>
          {([["this", "Somente esta aula"], ["following", "Esta e as próximas da série"], ["all", "Todas as aulas da série"]] as [Scope, string][]).map(([value, label]) => <label key={value}><input type="radio" name="scope" value={value} checked={scope === value} onChange={() => { setScope(value); setConfirmDelete(false); }} />{t(label)}</label>)}
          {scopeNote ? <small>{scopeNote}</small> : null}
        </fieldset> : null}
        <div className="form-row"><label>{t("Data")}<input name="date" type="date" required defaultValue={defaults.date} disabled={scope !== "this"} /></label><label>{t("Início")}<input name="time" type="time" required defaultValue={defaults.time} /></label><label>{t("Fim")}<input name="endsAt" type="time" required defaultValue={defaults.endsAt} /></label></div>
        {scope !== "this" ? <input type="hidden" name="date" value={defaults.date} /> : null}
        {!editing ? <><label>{t("Repetir")}<select name="repeat" value={repeatChoice} onChange={(event) => setRepeatChoice(event.target.value)}><option value="none">{t("Uma vez")}</option><option value="weekly">{t("Toda semana")}</option><option value="biweekly">{t("A cada duas semanas")}</option></select></label>
          {repeatChoice !== "none" ? <><fieldset className="weekday-options"><legend>{t("Dias da semana")}</legend>{weekdayNames.map(([day, name]) => <label key={day}><input type="checkbox" name="weekdays" value={day} />{t(name)}</label>)}</fieldset><label>{t("Repetir até")}<input name="endsOn" type="date" required defaultValue={localDateKey(dateAt(85, "09:00"))} min={localDateKey(dateAt(1, "09:00"))} /></label></> : null}</> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {conflicts && retry ? <div className="conflict-box" role="alert"><strong>{t("Horário sobreposto")}</strong><ul>{conflicts.map((item) => <li key={`${item.id}-${item.date}`}>{item.subject} · {formatDate(item.date, { weekday: "short", day: "numeric", month: "short" }, locale)} · {item.startsAt}–{item.endsAt}</li>)}</ul>
          <div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => { setConflicts(null); setRetry(null); }}>{t("Rever horário")}</button><button type="button" className="primary-button" disabled={busy} onClick={() => { setConflicts(null); retry(); }}>{t("Salvar mesmo assim")}</button></div></div> : null}
        <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>{t("Cancelar")}</button><button type="submit" className="primary-button" disabled={busy}>{t(editing ? "Salvar alterações" : "Adicionar à agenda")}</button></div>
      </form>
      {editing ? <div className="lesson-danger-zone">
        <MakeupSection lesson={editing} persisted={persisted} locale={locale} onLocalChange={onLocalChange} onDone={onDone} />
        {editing.status === "cancelled"
          ? <button type="button" className="secondary-button" disabled={busy} onClick={restoreSelected}>{t("Reativar aula")}</button>
          : <div className="cancel-row"><label>{t("Motivo do cancelamento (opcional)")}<input value={cancelReason} maxLength={300} onChange={(event) => setCancelReason(event.target.value)} /></label><button type="button" className="secondary-button" disabled={busy} onClick={cancelSelected}>{t(scope === "this" ? "Cancelar esta aula" : "Cancelar aulas selecionadas")}</button></div>}
        <button type="button" className="danger-button" disabled={busy} onClick={deleteSelected}>{t(confirmDelete ? "Confirmar exclusão definitiva" : scope === "this" ? "Excluir aula" : "Excluir aulas selecionadas")}</button>
        {confirmDelete ? <small role="alert">{t("A exclusão apaga o registro. Para manter o histórico, prefira cancelar.")}</small> : null}
      </div> : null}
    </section>
  </div>;
}
