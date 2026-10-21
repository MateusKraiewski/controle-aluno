import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { detectKind, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_LESSON, safeFileName } from "@/features/attachments/file-policy";
import { insertAttachment } from "@/features/attachments/repository";
import { getAttachmentStore } from "@/features/attachments/store";
import { consumeRateLimit } from "@/features/security/rate-limit";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status });

/** Uploads one file to the student's own lesson (multipart: lessonId, file). */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return fail(401, "Entre na sua conta para anexar arquivos.");
  // Reject oversized bodies before reading them (form overhead allowed).
  if (Number(request.headers.get("content-length") ?? 0) > MAX_ATTACHMENT_BYTES + 64 * 1024) return fail(413, "O arquivo precisa ter até 5 MB.");
  if (!await consumeRateLimit(`attachment-upload:${session.user.id}`, 30, 60 * 60)) return fail(429, "Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  let form: FormData;
  try { form = await request.formData(); } catch { return fail(400, "Envie um arquivo."); }
  const lessonId = z.uuid().safeParse(form.get("lessonId"));
  const file = form.get("file");
  if (!lessonId.success || !(file instanceof File)) return fail(400, "Envie um arquivo.");
  if (file.size === 0 || file.size > MAX_ATTACHMENT_BYTES) return fail(413, "O arquivo precisa ter até 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectKind(bytes);
  if (!kind) return fail(415, "Use PDF, PNG, JPEG, WebP ou texto simples.");
  const storageKey = randomUUID();
  const store = getAttachmentStore();
  try {
    await store.put(storageKey, bytes);
    const result = await insertAttachment(session.user.id, lessonId.data, { storageKey, fileName: safeFileName(file.name, kind.extension), contentType: kind.contentType, sizeBytes: bytes.length }, MAX_ATTACHMENTS_PER_LESSON);
    if (result === "not_found") { await store.delete(storageKey); return fail(404, "Aula não encontrada."); }
    if (result === "too_many") { await store.delete(storageKey); return fail(409, "Cada aula aceita até 10 anexos."); }
    return Response.json({ ok: true, id: result.id });
  } catch {
    await store.delete(storageKey).catch(() => undefined);
    return fail(500, "Não foi possível salvar o anexo. Tente novamente.");
  }
}
