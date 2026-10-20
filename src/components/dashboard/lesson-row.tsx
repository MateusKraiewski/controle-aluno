"use client";

import { useState, type FormEvent } from "react";
import { updateStudyRecord } from "@/app/actions/lessons";
import { translate, type Locale } from "@/lib/locales";
import { formatDate, lessonSummary, statusLabels, type AttendanceStatus, type Lesson, type Status } from "./lesson-model";

export function StatusPill({ status, locale }: { status: Status; locale: Locale }) {
  return <span className={`status-pill status-${status}`}><span className="status-dot" />{translate(locale, statusLabels[status])}</span>;
}

type LessonRowProps = {
  lesson: Lesson; locale: Locale; editable?: boolean; persisted?: boolean;
  onChange?: (value: AttendanceStatus) => void; onStudiedChange?: (value: string | null) => void; onOpen?: () => void;
};

export function LessonRow({ lesson, editable, locale, persisted = false, onChange, onStudiedChange, onOpen }: LessonRowProps) {
  const t = (text: string) => translate(locale, text);
  const [editingContent, setEditingContent] = useState(false);
  const [content, setContent] = useState(lesson.studiedContent ?? "");
  const [contentNotice, setContentNotice] = useState("");
  const cancelled = lesson.status === "cancelled";
  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await updateStudyRecord(lesson.id, content);
    if (!result.ok) { setContentNotice(t(result.error)); return; }
    onStudiedChange?.(content.trim() || null); setContentNotice(t("Conteúdo estudado salvo.")); setEditingContent(false);
  }
  return <article className={`lesson-row ${cancelled ? "is-cancelled" : ""}`}><span className={`subject-mark mark-${lesson.subject.toLowerCase()}`} aria-hidden="true">{lesson.subject.slice(0, 1)}</span>
    <div className="lesson-main"><div className="lesson-title-line"><strong>{lesson.subject}</strong><StatusPill status={lesson.status} locale={locale} />{lesson.isException ? <span className="exception-tag">{t("alteração nesta data")}</span> : null}</div>
      <p>{(editable ? lesson.plannedContent : lessonSummary(lesson)) || t("Aula sem conteúdo registrado")}</p>
      {editable && lesson.studiedContent ? <p className="studied-line"><span>{t("Estudado:")}</span> {lesson.studiedContent}</p> : null}
      {cancelled && lesson.cancellationReason ? <p className="studied-line"><span>{t("Motivo:")}</span> {lesson.cancellationReason}</p> : null}
      <span className="lesson-meta">{formatDate(lesson.date, { weekday: "short", day: "numeric", month: "short" }, locale)} · {lesson.time}–{lesson.endTime} · {lesson.teacher}</span></div>
    {editable && !cancelled ? <label className="status-select"><span className="sr-only">{t("Situação de")} {lesson.subject}</span><select value={lesson.status} aria-label={`${t("Registrar situação de")} ${lesson.subject}`} onChange={(event) => onChange?.(event.target.value as AttendanceStatus)}>
      <option value="attended">{t("Presença")}</option><option value="student-absent">{t("Faltei")}</option><option value="teacher-absent">{t("Relatei falta do professor")}</option><option value="upcoming">{t("Agendada")}</option>
    </select></label> : <span className="row-time">◷ {lesson.time}</span>}
    {editable ? <div className="study-record-actions">
      {persisted && !cancelled ? editingContent
        ? <form className="study-record-form" onSubmit={(event) => { void saveContent(event); }}><label>{t("O que foi estudado?")}<textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={3} /></label><button className="text-button" type="submit">{t("Salvar conteúdo")}</button><button className="text-button" type="button" onClick={() => { setContent(lesson.studiedContent ?? ""); setEditingContent(false); }}>{t("Cancelar")}</button></form>
        : <button className="text-button" type="button" onClick={() => setEditingContent(true)}>{t("Registrar conteúdo estudado")}</button> : null}
      {onOpen ? <button className="text-button" type="button" onClick={onOpen}>{t("Editar ou cancelar aula")}</button> : null}
      {contentNotice ? <span className="study-record-notice" role="status">{contentNotice}</span> : null}
    </div> : null}
  </article>;
}
