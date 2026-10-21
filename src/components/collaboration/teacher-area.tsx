"use client";

import { useState } from "react";
import Link from "next/link";
import { createTeacherInvite, recordTeacherAttendance, revokeTeacherLink } from "@/app/actions/collaboration";
import { formatDate } from "@/components/dashboard/lesson-model";
import { useUiPreferences } from "@/components/use-ui-preferences";
import { ResolutionBox, type ResolutionState } from "./resolution-box";

export type TeacherLinkView = { id: string; status: "pending" | "accepted" | "revoked"; expiresAt: string; studentName: string | null; subjects: string[] };
export type TeacherLessonView = {
  id: string; studentName: string; subject: string; date: string; startsAt: string; endsAt: string; plannedContent: string | null;
  status: "planned" | "cancelled"; cancellationReason: string | null;
  studentAttendance: "unrecorded" | "attended" | "student_absent" | "teacher_absent"; teacherAttendance: "present" | "absent" | "excused" | null;
  divergent: boolean; resolution: ResolutionState;
};

const studentReport: Record<TeacherLessonView["studentAttendance"], string> = {
  unrecorded: "Ainda não registrada", attended: "Aluno registrou presença", student_absent: "Aluno registrou que faltou", teacher_absent: "Aluno relatou ausência do professor",
};

export function TeacherArea({ links, lessons }: { links: TeacherLinkView[]; lessons: TeacherLessonView[] }) {
  const { locale, t } = useUiPreferences();
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setBusy(true); setNotice("");
    try { const result = await action(); setNotice(t(result.ok ? success : result.error ?? "Não foi possível concluir. Tente novamente.")); }
    finally { setBusy(false); }
  }
  async function invite() {
    setBusy(true); setNotice("");
    try {
      const result = await createTeacherInvite();
      if (result.ok) setCode(result.code); else setNotice(t(result.error));
    } finally { setBusy(false); }
  }

  const accepted = links.filter((link) => link.status === "accepted");
  const pending = links.filter((link) => link.status === "pending");
  return <main className="collab-page" id="conteudo-principal">
    <header className="collab-header"><Link href="/" className="text-button">← {t("Voltar à agenda")}</Link><h1>{t("Área do professor")}</h1>
      <p>{t("Você vê somente as matérias que cada aluno escolheu compartilhar, e registra apenas a sua própria presença.")}</p></header>
    {notice ? <p className="notice" role="status">{notice}</p> : null}
    <section className="panel collab-panel"><h2>{t("Convidar aluno")}</h2>
      <p className="history-hint">{t("O código vale 7 dias e só pode ser usado uma vez. Ele aparece apenas agora; envie ao aluno por um canal de confiança.")}</p>
      {code ? <p className="invite-code" aria-live="polite"><span>{t("Código do convite")}</span><strong>{code}</strong></p> : null}
      <button type="button" className="primary-button" disabled={busy} onClick={() => { void invite(); }}>{t("Gerar código de convite")}</button>
      {pending.length ? <ul className="collab-list">{pending.map((link) => <li key={link.id}><span>{t("Convite pendente")} · {t("expira em")} {formatDate(new Date(link.expiresAt), { day: "numeric", month: "short" }, locale)}</span>
        <button type="button" className="text-button" disabled={busy} onClick={() => { void run(() => revokeTeacherLink(link.id), "Convite cancelado."); }}>{t("Cancelar convite")}</button></li>)}</ul> : null}
    </section>
    <section className="panel collab-panel"><h2>{t("Alunos vinculados")}</h2>
      {accepted.length ? <ul className="collab-list">{accepted.map((link) => <li key={link.id}><span><strong>{link.studentName}</strong> · {link.subjects.join(", ")}</span>
        <button type="button" className="text-button" disabled={busy} onClick={() => { void run(() => revokeTeacherLink(link.id), "Vínculo encerrado."); }}>{t("Encerrar vínculo")}</button></li>)}</ul>
        : <p className="empty-note">{t("Nenhum aluno vinculado ainda.")}</p>}
    </section>
    <section className="panel collab-panel"><h2>{t("Aulas compartilhadas (30 dias antes e depois)")}</h2>
      {lessons.length ? <div className="lesson-list">{lessons.map((lesson) => {
        const divergent = lesson.divergent;
        return <article className={`lesson-row ${lesson.status === "cancelled" ? "is-cancelled" : ""}`} key={lesson.id}>
          <div className="lesson-main"><div className="lesson-title-line"><strong>{lesson.subject}</strong> · {lesson.studentName}{divergent ? <span className="exception-tag">{t("Registros diferentes")}</span> : null}</div>
            <p>{lesson.plannedContent || t("Aula sem conteúdo registrado")}</p>
            <ResolutionBox lessonId={lesson.id} divergent={divergent} resolution={lesson.resolution} t={t} onMessage={setNotice} />
            <span className="lesson-meta">{formatDate(lesson.date, { weekday: "short", day: "numeric", month: "short" }, locale)} · {lesson.startsAt.slice(0, 5)}–{lesson.endsAt.slice(0, 5)} · {lesson.status === "cancelled" ? `${t("Cancelada")}${lesson.cancellationReason ? ` (${lesson.cancellationReason})` : ""}` : t(studentReport[lesson.studentAttendance])}</span></div>
          {lesson.status === "planned" ? <label className="status-select"><span className="sr-only">{t("Minha presença em")} {lesson.subject}</span>
            <select aria-label={`${t("Minha presença em")} ${lesson.subject}`} value={lesson.teacherAttendance ?? ""} disabled={busy} onChange={(event) => { const value = event.target.value; void run(() => recordTeacherAttendance(lesson.id, value === "" ? null : value), "Registro salvo."); }}>
              <option value="">{t("Ainda não registrada")}</option><option value="present">{t("Compareci")}</option><option value="absent">{t("Não compareci")}</option><option value="excused">{t("Falta justificada")}</option>
            </select></label> : null}
        </article>;
      })}</div> : <p className="empty-note">{t("Nenhuma aula compartilhada neste período.")}</p>}
    </section>
  </main>;
}
