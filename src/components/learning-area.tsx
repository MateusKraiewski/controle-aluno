"use client";

import { useState } from "react";
import Link from "next/link";
import { addObjective, linkObjective, removeObjective, setObjectiveStatus, snoozeObjective } from "@/app/actions/learning";
import { formatDate } from "@/components/dashboard/lesson-model";
import type { ObjectiveForReview, ReviewSuggestion } from "@/features/learning/suggestions";
import { useUiPreferences } from "./use-ui-preferences";

type Objective = ObjectiveForReview & { subjectId: string };
type Props = { objectives: Objective[]; subjects: { id: string; name: string }[]; suggestions: ReviewSuggestion[]; lessons: { id: string; subjectId: string; date: string; time: string }[] };
const statusLabels = { open: "A estudar", practising: "Praticando", done: "Concluído" } as const;

export function LearningArea({ objectives, subjects, suggestions, lessons }: Props) {
  const { locale, t } = useUiPreferences();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ subjectId: subjects[0]?.id ?? "", title: "" });
  const [withNotes, setWithNotes] = useState(false);
  const day = (value: string) => formatDate(value, { day: "numeric", month: "short" }, locale);

  async function act(work: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setBusy(true); setNotice("");
    try { const result = await work(); setNotice(t(result.ok ? success : result.error ?? "Não foi possível concluir. Tente novamente.")); return result.ok; }
    finally { setBusy(false); }
  }

  return <main className="collab-page" id="conteudo-principal">
    <header className="collab-header"><Link href="/" className="text-button">← {t("Voltar à agenda")}</Link><h1>{t("Aprendizagem")}</h1>
      <p>{t("Objetivos que você escolhe acompanhar em cada matéria. As sugestões só dizem há quanto tempo um tema não aparece nas suas aulas; não são notas nem avaliações.")}</p></header>
    {notice ? <p className="notice" role="status">{notice}</p> : null}
    <section className="panel collab-panel"><h2>{t("Sugestões de revisão")}</h2>
      {suggestions.length ? <ul className="collab-list">{suggestions.map((item) => <li key={item.objectiveId}>
        <span><strong>{item.title}</strong> · {item.subject} — {t("há")} {item.weeks} {t(item.weeks === 1 ? "semana" : "semanas")} {t("sem rever")} ({t(item.basis === "last_lesson" ? "última aula ligada em" : "criado em")} {day(item.since)})</span>
        <button type="button" className="text-button" disabled={busy} onClick={() => { void act(() => snoozeObjective(item.objectiveId), "Sugestão dispensada por 2 semanas."); }}>{t("Dispensar por 2 semanas")}</button></li>)}</ul>
        : <p className="empty-note">{t("Nenhuma sugestão agora.")}</p>}
    </section>
    <section className="panel collab-panel"><h2>{t("Novo objetivo")}</h2>
      {subjects.length ? <form className="collab-form" onSubmit={(event) => { event.preventDefault(); void act(() => addObjective(draft.subjectId, draft.title), "Objetivo salvo.").then((ok) => { if (ok) setDraft((current) => ({ ...current, title: "" })); }); }}>
        <label>{t("Matéria")}<select value={draft.subjectId} onChange={(event) => { const value = event.target.value; setDraft((current) => ({ ...current, subjectId: value })); }}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
        <label>{t("Objetivo ou tema")}<input required maxLength={200} value={draft.title} placeholder={t("Ex.: Resolver equações do 2º grau")} onChange={(event) => { const value = event.target.value; setDraft((current) => ({ ...current, title: value })); }} /></label>
        <button type="submit" className="primary-button" disabled={busy}>{t("Adicionar")}</button></form>
        : <p className="empty-note">{t("Crie uma aula primeiro; os objetivos ficam ligados às suas matérias.")}</p>}
    </section>
    <section className="panel collab-panel"><h2>{t("Meus objetivos")}</h2>
      {objectives.length ? <ul className="collab-list">{objectives.map((objective) => {
        const options = lessons.filter((lesson) => lesson.subjectId === objective.subjectId).slice(0, 30);
        return <li key={objective.id} className="objective-item">
          <span><strong>{objective.title}</strong> · {objective.subject}{objective.lastWorkedOn ? ` · ${t("última aula ligada em")} ${day(objective.lastWorkedOn)}` : ""}</span>
          <div className="objective-actions">
            <label><span className="sr-only">{t("Estado de")} {objective.title}</span><select value={objective.status} disabled={busy} onChange={(event) => { const value = event.target.value; void act(() => setObjectiveStatus(objective.id, value), "Objetivo atualizado."); }}>
              {(["open", "practising", "done"] as const).map((value) => <option key={value} value={value}>{t(statusLabels[value])}</option>)}</select></label>
            {options.length ? <label><span className="sr-only">{t("Ligar a uma aula")}</span><select value="" disabled={busy} onChange={(event) => { const value = event.target.value; if (value) void act(() => linkObjective(objective.id, value), "Aula ligada ao objetivo."); }}>
              <option value="">{t("Trabalhado na aula de…")}</option>{options.map((lesson) => <option key={lesson.id} value={lesson.id}>{day(lesson.date)} · {lesson.time}</option>)}</select></label> : null}
            <button type="button" className="text-button" disabled={busy} onClick={() => { void act(() => removeObjective(objective.id), "Objetivo excluído."); }}>{t("Excluir")}</button>
          </div></li>;
      })}</ul> : <p className="empty-note">{t("Nenhum objetivo ainda.")}</p>}
    </section>
    <section className="panel collab-panel"><h2>{t("Exportar meu histórico")}</h2>
      <p className="history-hint">{t("Arquivo CSV com datas, matérias, estado, conteúdo previsto e estudado e próximo passo. Abre em planilhas.")}</p>
      <label className="export-option"><input type="checkbox" checked={withNotes} onChange={(event) => setWithNotes(event.target.checked)} />{t("Incluir notas privadas")}</label>
      <a className="secondary-button export-link" href={withNotes ? "/api/exportar?notas=1" : "/api/exportar"} download>{t("Baixar CSV")}</a>
    </section>
  </main>;
}
