"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { acceptTeacherInvite, previewTeacherInvite, revokeTeacherLink } from "@/app/actions/collaboration";
import { useUiPreferences } from "@/components/use-ui-preferences";

export type StudentLinkView = { id: string; teacherName: string; subjects: string[] };

export function StudentLinks({ links, subjects }: { links: StudentLinkView[]; subjects: { id: string; name: string }[] }) {
  const { t } = useUiPreferences();
  const [code, setCode] = useState("");
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(""); setTeacherName(null);
    try { const result = await previewTeacherInvite(code); if (result.ok) setTeacherName(result.teacherName); else setNotice(t(result.error)); }
    finally { setBusy(false); }
  }
  async function accept() {
    setBusy(true); setNotice("");
    try {
      const result = await acceptTeacherInvite(code, chosen);
      if (!result.ok) { setNotice(t(result.error)); return; }
      setNotice(t("Vínculo aceito. O professor passa a ver só as matérias escolhidas.")); setCode(""); setTeacherName(null); setChosen([]);
    } finally { setBusy(false); }
  }
  async function revoke(id: string) {
    if (confirmRevoke !== id) { setConfirmRevoke(id); return; }
    setBusy(true);
    try { const result = await revokeTeacherLink(id); setNotice(t(result.ok ? "Vínculo encerrado. O professor deixou de ver suas aulas." : result.error)); setConfirmRevoke(null); }
    finally { setBusy(false); }
  }

  return <main className="collab-page" id="conteudo-principal">
    <header className="collab-header"><Link href="/" className="text-button">← {t("Voltar à agenda")}</Link><h1>{t("Meus professores")}</h1>
      <p>{t("Compartilhe matérias com um professor usando o código que ele gerar. Você pode encerrar o vínculo a qualquer momento.")}</p></header>
    {notice ? <p className="notice" role="status">{notice}</p> : null}
    <section className="panel collab-panel"><h2>{t("Usar código de convite")}</h2>
      <form className="collab-form" onSubmit={(event) => { void check(event); }}><label>{t("Código do convite")}<input value={code} onChange={(event) => { setCode(event.target.value); setTeacherName(null); }} autoComplete="off" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX" maxLength={24} required /></label>
        <button type="submit" className="secondary-button" disabled={busy}>{t("Verificar código")}</button></form>
      {teacherName ? <div className="consent-box"><p><strong>{teacherName}</strong> {t("quer acompanhar suas aulas.")}</p>
        <p className="history-hint">{t("O professor verá, nas matérias escolhidas: datas, horários, conteúdo previsto, cancelamentos e o seu registro de presença. Conteúdo estudado e as outras matérias continuam privados.")}</p>
        {subjects.length ? <fieldset className="weekday-options"><legend>{t("Matérias a compartilhar")}</legend>{subjects.map((subject) => <label key={subject.id}><input type="checkbox" checked={chosen.includes(subject.id)} onChange={(event) => setChosen((current) => event.target.checked ? [...current, subject.id] : current.filter((id) => id !== subject.id))} />{subject.name}</label>)}</fieldset>
          : <p className="empty-note">{t("Crie uma aula primeiro para ter matérias a compartilhar.")}</p>}
        <div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setTeacherName(null)}>{t("Recusar")}</button><button type="button" className="primary-button" disabled={busy || chosen.length === 0} onClick={() => { void accept(); }}>{t("Aceitar e compartilhar")}</button></div>
      </div> : null}
    </section>
    <section className="panel collab-panel"><h2>{t("Vínculos ativos")}</h2>
      {links.length ? <ul className="collab-list">{links.map((link) => <li key={link.id}><span><strong>{link.teacherName}</strong> · {link.subjects.join(", ")}</span>
        <button type="button" className={confirmRevoke === link.id ? "danger-button" : "text-button"} disabled={busy} onClick={() => { void revoke(link.id); }}>{t(confirmRevoke === link.id ? "Confirmar encerramento" : "Encerrar vínculo")}</button></li>)}</ul>
        : <p className="empty-note">{t("Nenhum professor vinculado.")}</p>}
    </section>
  </main>;
}
