import { headers } from "next/headers";
import { z } from "zod";
import { deleteOwnedAttachment, getOwnedAttachment } from "@/features/attachments/repository";
import { getAttachmentStore } from "@/features/attachments/store";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** RFC 8187 attr-chars: encodeURIComponent plus the characters it leaves alone. */
const encodeRfc8187 = (value: string) => encodeURIComponent(value).replace(/['()*!]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

async function owner() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

/** Downloads the student's own file; always as an attachment and never sniffed as HTML. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const studentId = await owner();
  const id = z.uuid().safeParse((await params).id);
  if (!studentId || !id.success) return new Response(null, { status: 404 });
  const attachment = await getOwnedAttachment(studentId, id.data);
  const bytes = attachment ? await getAttachmentStore().get(attachment.storageKey) : null;
  if (!attachment || !bytes) return new Response(null, { status: 404 });
  return new Response(new Blob([bytes as Uint8Array<ArrayBuffer>]), {
    headers: {
      "content-type": attachment.contentType,
      "content-disposition": `attachment; filename*=UTF-8''${encodeRfc8187(attachment.fileName)}`,
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      "cache-control": "private, no-store",
    },
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const studentId = await owner();
  const id = z.uuid().safeParse((await params).id);
  if (!studentId || !id.success) return Response.json({ ok: false }, { status: 404 });
  const storageKey = await deleteOwnedAttachment(studentId, id.data);
  if (!storageKey) return Response.json({ ok: false }, { status: 404 });
  // The row is gone either way; a leftover file has no row pointing to it and is never served.
  try { await getAttachmentStore().delete(storageKey); } catch { logger.warn({ code: "attachment_bytes_not_deleted" }, "Attachment bytes kept after row delete"); }
  return Response.json({ ok: true });
}
