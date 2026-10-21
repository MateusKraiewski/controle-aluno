"use client";

import { useState, type FormEvent } from "react";
import { updateStudyRecord } from "@/app/actions/lessons";
import { ResolutionBox } from "@/components/collaboration/resolution-box";
import { translate, type Locale } from "@/lib/locales";
import { formatDate, lessonSummary, statusLabels, type AttendanceStatus, type Lesson, type Status } from "./lesson-model";

const teacherAttendanceLabels = { present: "Compareceu", absent: "Não compareceu", excused: "Falta justificada" } as const;

export function StatusPill({ status, locale }: { status: Status; locale: Locale }) {
  return <span className={`status-pill status-${status}`}><span className="status-dot" />{translate(locale, statusLabels[status])}</span>;
}

type LessonRowProps = {
  lesson: Lesson; locale: Locale; editable?: boolean; persisted?: boolean;
  onChange?: (value: AttendanceStatus) => void; onRecordChange?: (value: StudyRecord) => void; onOpen?: () => void;
};

type StudyRecord = Pick<Lesson, "studiedContent" | "privateNote" | "nextStep">;
const recordDraft = (lesson: Lesson) => ({ studiedContent: lesson.studiedContent ?? "", privateNote: lesson.privateNote ?? "", nextStep: lesson.nextStep ?? "" });

export function LessonRow({ lesson, editable, locale, persisted = false, onChange, onRecordChange, onOpen }: LessonRowProps) {
  const t = (text: string) => translate(locale, text);
  const [editingContent, setEditingContent] = useState(false);
  const [draft, setDraft] = useState(() => recordDraft(lesson));
  const [contentNotice, setContentNotice] = useState("");
  const cancelled = lesson.status === "cancelled";
  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await updateStudyRecord(lesson.id, draft);
    if (!result.ok) { setContentNotice(t(result.error)); return; }
    onRecordChange?.({ studiedContent: draft.studiedContent.trim() || null, privateNote: draft.privateNote.trim() || null, nextStep: draft.nextStep.trim() || null });
    setContentNotice(t("Registro da aula salvo.")); setEditingContent(false);
  }
  return <article className={`lesson-row ${cancelled ? "is-cancelled" : ""}`}><span className={`subject-mark mark-${lesson.subject.toLowerCase()}`} aria-hidden="true">{lesson.subject.slice(0, 1)}</span>
    <div className="lesson-main"><div className="lesson-title-line"><strong>{lesson.subject}</strong><StatusPill status={lesson.status} locale={locale} />{lesson.isException ? <span className="exception-tag">{t("alteração nesta data")}</span> : null}</div>
      <p>{(editable ? lesson.plannedContent : lessonSummary(lesson)) || t("Aula sem conteúdo registrado")}</p>
      {editable && lesson.studiedContent ? <p className="studied-line"><span>{t("Estudado:")}</span> {lesson.studiedContent}</p> : null}
      {editable && lesson.nextStep ? <p className="studied-line"><span>{t("Próximo passo:")}</span> {lesson.nextStep}</p> : null}
      {editable && lesson.privateNote ? <p className="studied-line"><span>{t("Nota privada:")}</span> {lesson.privateNote}</p> : null}
      {lesson.replaces ? <p className="studied-line link-line"><span>{t("Reposição da aula de")}</span> {formatDate(lesson.replaces.date, { day: "numeric", month: "short" }, locale)}</p> : null}
      {lesson.replacedBy ? <p className="studied-line link-line"><span>{t("Reposta em")}</span> {formatDate(lesson.replacedBy.date, { day: "numeric", month: "short" }, locale)}</p> : null}
      {lesson.teacherRecords.map((record) => <p className="studied-line" key={record.teacherName}><span>{record.teacherName} {t("registrou:")}</span> {t(teacherAttendanceLabels[record.attendance])}{lesson.divergent ? <span className="exception-tag">{t("Registros diferentes")}</span> : null}</p>)}
      {editable && persisted ? <ResolutionBox lessonId={lesson.id} divergent={lesson.divergent} resolution={lesson.resolution} t={t} onMessage={setContentNotice} /> : null}
      {cancelled && lesson.cancellationReason ? <p className="studied-line"><span>{t("Motivo:")}</span> {lesson.cancellationReason}</p> : null}
      <span className="lesson-meta">{formatDate(lesson.date, { weekday: "short", day: "numeric", month: "short" }, locale)} · {lesson.time}–{lesson.endTime} · {lesson.teacher}</span></div>
    {editable && !cancelled ? <label className="status-select"><span className="sr-only">{t("Situação de")} {lesson.subject}</span><select value={lesson.status} aria-label={`${t("Registrar situação de")} ${lesson.subject}`} onChange={(event) => onChange?.(event.target.value as AttendanceStatus)}>
      <option value="attended">{t("Presença")}</option><option value="student-absent">{t("Faltei")}</option><option value="teacher-absent">{t("Relatei falta do professor")}</option><option value="upcoming">{t("Agendada")}</option>
    </select></label> : <span className="row-time">◷ {lesson.time}</span>}
    {editable ? <div className="study-record-actions">
      {persisted && !cancelled ? editingContent
        ? <form className="study-record-form" onSubmit={(event) => { void saveContent(event); }}>
          <label>{t("O que foi estudado?")}<textarea value={draft.studiedContent} onChange={(event) => { const value = event.target.value; setDraft((current) => ({ ...current, studiedContent: value })); }} maxLength={2000} rows={3} /></label>
          <label>{t("Próximo passo ou tarefa")}<input value={draft.nextStep} onChange={(event) => { const value = event.target.value; setDraft((current) => ({ ...current, nextStep: value })); }} maxLength={500} /></label>
          <label>{t("Nota privada (só você vê)")}<textarea value={draft.privateNote} onChange={(event) => { const value = event.target.value; setDraft((current) => ({ ...current, privateNote: value })); }} maxLength={2000} rows={2} /></label>
          <button className="text-button" type="submit">{t("Salvar registro")}</button><button className="text-button" type="button" onClick={() => { setDraft(recordDraft(lesson)); setEditingContent(false); }}>{t("Cancelar")}</button></form>
        : <button className="text-button" type="button" onClick={() => setEditingContent(true)}>{t(lesson.studiedContent || lesson.privateNote || lesson.nextStep ? "Editar registro da aula" : "Registrar o que foi estudado")}</button> : null}
      {onOpen ? <button className="text-button" type="button" onClick={onOpen}>{t("Editar ou cancelar aula")}</button> : null}
      {contentNotice ? <span className="study-record-notice" role="status">{contentNotice}</span> : null}
    </div> : null}
  </article>;
}
