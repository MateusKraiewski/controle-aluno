"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { generateInviteCode, hashInviteCode, INVITE_TTL_DAYS, normalizeInviteCode } from "@/features/collaboration/invite-code";
import { acceptInvite, createInvite, previewInvite, revokeLink, setTeacherAttendance } from "@/features/collaboration/repository";

// One answer for unknown, expired, used or own codes, so a code cannot be probed for its state.
const invalidCode = "Código inválido ou expirado. Peça um novo código ao professor.";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function createTeacherInvite() {
  const teacherId = await currentUserId();
  if (!teacherId) return { ok: false as const, error: "Entre na sua conta para convidar alunos." };
  const code = generateInviteCode();
  try {
    await createInvite(teacherId, hashInviteCode(normalizeInviteCode(code)!), new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000));
    refresh();
    // The code is returned once and never stored in clear.
    return { ok: true as const, code };
  } catch { return { ok: false as const, error: "Não foi possível criar o convite. Tente novamente." }; }
}

export async function previewTeacherInvite(code: unknown) {
  const studentId = await currentUserId();
  if (!studentId) return { ok: false as const, error: "Entre na sua conta para usar um código." };
  const normalized = typeof code === "string" ? normalizeInviteCode(code) : null;
  if (!normalized) return { ok: false as const, error: invalidCode };
  try {
    const preview = await previewInvite(studentId, hashInviteCode(normalized));
    return preview ? { ok: true as const, teacherName: preview.teacherName } : { ok: false as const, error: invalidCode };
  } catch { return { ok: false as const, error: "Não foi possível verificar o código. Tente novamente." }; }
}

export async function acceptTeacherInvite(code: unknown, subjectIds: unknown) {
  const studentId = await currentUserId();
  if (!studentId) return { ok: false as const, error: "Entre na sua conta para aceitar o convite." };
  const normalized = typeof code === "string" ? normalizeInviteCode(code) : null;
  const ids = z.array(z.uuid()).min(1).max(100).safeParse(subjectIds);
  if (!ids.success) return { ok: false as const, error: "Escolha pelo menos uma matéria para compartilhar." };
  if (!normalized) return { ok: false as const, error: invalidCode };
  try {
    const linkId = await acceptInvite(studentId, hashInviteCode(normalized), [...new Set(ids.data)]);
    if (!linkId) return { ok: false as const, error: invalidCode };
    refresh();
    return { ok: true as const };
  } catch { return { ok: false as const, error: "Não foi possível aceitar o convite. Tente novamente." }; }
}

export async function revokeTeacherLink(linkId: unknown) {
  const actorId = await currentUserId();
  if (!actorId) return { ok: false as const, error: "Entre na sua conta para alterar vínculos." };
  const id = z.uuid().safeParse(linkId);
  if (!id.success) return { ok: false as const, error: "Vínculo não encontrado." };
  try {
    if (!await revokeLink(actorId, id.data)) return { ok: false as const, error: "Vínculo não encontrado." };
    refresh();
    return { ok: true as const };
  } catch { return { ok: false as const, error: "Não foi possível encerrar o vínculo. Tente novamente." }; }
}

export async function recordTeacherAttendance(lessonId: unknown, attendance: unknown, note?: unknown) {
  const teacherId = await currentUserId();
  if (!teacherId) return { ok: false as const, error: "Entre na sua conta para registrar presença." };
  const id = z.uuid().safeParse(lessonId);
  const value = z.enum(["present", "absent", "excused"]).nullable().safeParse(attendance);
  const text = z.string().trim().max(500).optional().safeParse(note);
  if (!id.success || !value.success || !text.success) return { ok: false as const, error: "Confira os dados do registro." };
  try {
    const outcome = await setTeacherAttendance(teacherId, id.data, value.data, text.data || null);
    if (outcome === "not_found") return { ok: false as const, error: "Aula não encontrada." };
    if (outcome === "cancelled") return { ok: false as const, error: "Aulas canceladas não recebem registro de presença." };
    refresh();
    return { ok: true as const };
  } catch { return { ok: false as const, error: "Não foi possível salvar o registro. Tente novamente." }; }
}
