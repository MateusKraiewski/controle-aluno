"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LessonAttachment } from "./lesson-model";

const accept = "application/pdf,image/png,image/jpeg,image/webp,text/plain";
const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** The student's own files for one lesson; stored server-side, never shared with teachers. */
export function AttachmentsSection({ lessonId, attachments, t, onMessage }: { lessonId: string; attachments: LessonAttachment[]; t: (text: string) => string; onMessage: (text: string) => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const body = new FormData(); body.set("lessonId", lessonId); body.set("file", file);
      const response = await fetch("/api/anexos", { method: "POST", body });
      const result = await response.json().catch(() => ({ ok: false })) as { ok: boolean; error?: string };
      onMessage(t(result.ok ? "Anexo salvo." : result.error ?? "Não foi possível salvar o anexo. Tente novamente."));
      if (result.ok) router.refresh();
    } catch { onMessage(t("Não foi possível salvar o anexo. Tente novamente.")); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/anexos/${id}`, { method: "DELETE" });
      onMessage(t(response.ok ? "Anexo excluído." : "Não foi possível excluir o anexo."));
      if (response.ok) router.refresh();
    } catch { onMessage(t("Não foi possível excluir o anexo.")); }
    finally { setBusy(false); }
  }

  return <div className="attachments">
    {attachments.length ? <ul>{attachments.map((file) => <li key={file.id}><a href={`/api/anexos/${file.id}`}>{file.fileName}</a> <small>{formatSize(file.sizeBytes)}</small>
      <button type="button" className="text-button" disabled={busy} onClick={() => { void remove(file.id); }} aria-label={`${t("Excluir anexo")} ${file.fileName}`}>×</button></li>)}</ul> : null}
    <label className="text-button attach-button">{t("Anexar arquivo")}<input ref={input} type="file" accept={accept} disabled={busy} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label>
    <small>{t("PDF, imagem ou texto, até 5 MB. Só você vê os anexos.")}</small>
  </div>;
}
