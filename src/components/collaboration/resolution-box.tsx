"use client";

import { useState } from "react";
import { answerLessonResolution, proposeLessonResolution } from "@/app/actions/collaboration";

export type ResolutionState = { id: string; outcome: Outcome; status: "proposed" | "agreed" | "declined"; mine: boolean } | null;
type Outcome = "held" | "student_absent" | "teacher_absent" | "not_held";
const outcomeLabels: Record<Outcome, string> = { held: "A aula aconteceu", student_absent: "O aluno faltou", teacher_absent: "O professor faltou", not_held: "A aula não aconteceu" };

/** Jornada D: both reports stay; the participants agree on an outcome shown beside them. */
export function ResolutionBox({ lessonId, divergent, resolution, t, onMessage }: {
  lessonId: string; divergent: boolean; resolution: ResolutionState; t: (text: string) => string; onMessage: (text: string) => void;
}) {
  const [outcome, setOutcome] = useState<Outcome>("held");
  const [busy, setBusy] = useState(false);
  if (!divergent && !resolution) return null;
  async function run(work: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setBusy(true);
    try { const result = await work(); onMessage(t(result.ok ? success : result.error ?? "Não foi possível concluir. Tente novamente.")); }
    finally { setBusy(false); }
  }
  if (resolution?.status === "agreed") return <p className="studied-line resolution-line"><span>{t("Resultado combinado:")}</span> {t(outcomeLabels[resolution.outcome])}</p>;
  if (resolution?.status === "proposed") {
    return <div className="resolution-box"><span>{t(resolution.mine ? "Você propôs:" : "Proposta recebida:")} <strong>{t(outcomeLabels[resolution.outcome])}</strong></span>
      {resolution.mine ? <small>{t("Aguardando a resposta da outra parte.")}</small> : <div className="dialog-actions">
        <button type="button" className="secondary-button" disabled={busy} onClick={() => { void run(() => answerLessonResolution(resolution.id, false), "Proposta recusada; os registros continuam diferentes."); }}>{t("Recusar")}</button>
        <button type="button" className="primary-button" disabled={busy} onClick={() => { void run(() => answerLessonResolution(resolution.id, true), "Resultado combinado registrado."); }}>{t("Aceitar")}</button></div>}
    </div>;
  }
  return <div className="resolution-box"><span>{t("Os registros desta aula são diferentes. Proponha o resultado combinado; os registros originais ficam guardados.")}</span>
    {resolution?.status === "declined" ? <small>{t("A última proposta foi recusada.")}</small> : null}
    <div className="dialog-actions"><label><span className="sr-only">{t("Resultado proposto")}</span><select value={outcome} onChange={(event) => setOutcome(event.target.value as Outcome)}>
      {(Object.keys(outcomeLabels) as Outcome[]).map((value) => <option key={value} value={value}>{t(outcomeLabels[value])}</option>)}</select></label>
      <button type="button" className="primary-button" disabled={busy} onClick={() => { void run(() => proposeLessonResolution(lessonId, outcome), "Proposta enviada."); }}>{t("Propor")}</button></div>
  </div>;
}
