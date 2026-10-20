"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { generateWeeklyDates } from "@/features/calendar/domain";
import {
  cancelLessons, deleteLessons, findConflicts, getLessonSlot, insertLesson, insertMakeup, insertWeeklySeries, listScopeTargets, restoreLesson,
  setLessonAttendance, setStudiedContent, updateLessons,
} from "@/features/lessons/repository";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const endAfterStart = { path: ["endsAt"], message: "O horário final precisa ser depois do inicial." };

const lessonInput = z.object({
  subject: z.string().trim().min(1).max(48),
  topic: z.string().trim().min(1).max(500),
  date: z.iso.date(),
  startsAt: timeSchema,
  endsAt: timeSchema,
  repeat: z.enum(["none", "weekly", "biweekly"]).default("none"),
  weekdays: z.array(z.number().int().min(1).max(7)).max(7).default([]),
  endsOn: z.preprocess((value) => value === "" ? undefined : value, z.iso.date().optional()),
  timeZone: z.string().min(1).max(80).default("UTC"),
  allowConflicts: z.boolean().default(false),
}).refine((value) => value.endsAt > value.startsAt, endAfterStart);

const lessonChangesInput = z.object({
  subject: z.string().trim().min(1).max(48),
  topic: z.string().trim().min(1).max(500),
  date: z.iso.date(),
  startsAt: timeSchema,
  endsAt: timeSchema,
  scope: z.enum(["this", "following", "all"]).default("this"),
  allowConflicts: z.boolean().default(false),
}).refine((value) => value.endsAt > value.startsAt, endAfterStart);

const attendanceSchema = z.enum(["unrecorded", "attended", "student_absent", "teacher_absent"]);
const scopeSchema = z.enum(["this", "following", "all"]);

export type LessonConflict = { id: string; subject: string; date: string; startsAt: string; endsAt: string };
type Failure = { ok: false; error: string; conflicts?: LessonConflict[] };

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

async function conflictFailure(studentId: string, query: Parameters<typeof findConflicts>[1]): Promise<Failure | null> {
  const rows = await findConflicts(studentId, query);
  if (rows.length === 0) return null;
  const conflicts = rows.map((row) => ({ ...row, startsAt: row.startsAt.slice(0, 5), endsAt: row.endsAt.slice(0, 5) }));
  return { ok: false, error: "Este horário coincide com outra aula. Confira e salve mesmo assim se for intencional.", conflicts };
}

export async function createLesson(input: unknown) {
  const studentId = await currentUserId();
  if (!studentId) return { ok: false as const, error: "Entre na sua conta para salvar aulas." };
  const parsed = lessonInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Confira os dados da aula." };
  const data = parsed.data;
  let dates = [data.date];
  let intervalWeeks = 1;
  if (data.repeat !== "none") {
    if (!data.endsOn || data.weekdays.length === 0) return { ok: false as const, error: "Escolha até quando repetir e os dias da semana." };
    try { new Intl.DateTimeFormat("en", { timeZone: data.timeZone }); }
    catch { return { ok: false as const, error: "Escolha um fuso horário válido." }; }
    intervalWeeks = data.repeat === "weekly" ? 1 : 2;
    try { dates = generateWeeklyDates({ startDate: data.date, endDate: data.endsOn, weekdays: data.weekdays, everyWeeks: intervalWeeks }); }
    catch { return { ok: false as const, error: "Confira as datas e os dias da recorrência." }; }
    if (dates.length === 0 || dates.length > 300) return { ok: false as const, error: "A série precisa gerar entre 1 e 300 aulas." };
  }
  try {
    if (!data.allowConflicts) {
      const conflict = await conflictFailure(studentId, { dates, startsAt: data.startsAt, endsAt: data.endsAt });
      if (conflict) return conflict;
    }
    if (data.repeat !== "none") {
      const occurrences = await insertWeeklySeries(studentId, {
        subject: data.subject, topic: data.topic, startDate: data.date, endDate: data.endsOn!,
        startsAt: data.startsAt, endsAt: data.endsAt, timeZone: data.timeZone, weekdays: data.weekdays, intervalWeeks, dates,
      });
      refresh();
      return { ok: true as const, occurrences };
    }
    const id = await insertLesson(studentId, data);
    refresh();
    return { ok: true as const, occurrences: [{ id, date: data.date, time: data.startsAt }] };
  } catch { return { ok: false as const, error: data.repeat === "none" ? "Não foi possível salvar a aula. Tente novamente." : "Não foi possível salvar a série de aulas. Tente novamente." }; }
}

export async function editLesson(lessonId: string, input: unknown) {
  const studentId = await currentUserId();
  if (!studentId) return { ok: false as const, error: "Entre na sua conta para editar aulas." };
  const id = z.uuid().safeParse(lessonId);
  const parsed = lessonChangesInput.safeParse(input);
  if (!id.success || !parsed.success) return { ok: false as const, error: parsed.error?.issues[0]?.message ?? "Confira os dados da aula." };
  const { scope, allowConflicts, ...changes } = parsed.data;
  try {
    if (!allowConflicts) {
      const affected = await listScopeTargets(studentId, id.data, scope);
      if (!affected) return { ok: false as const, error: "Aula não encontrada." };
      // A single edit may move the date; series edits keep each occurrence on its own date.
      const dates = scope === "this" ? [changes.date] : [...new Set(affected.map((lesson) => lesson.date))];
      const conflict = await conflictFailure(studentId, { dates, startsAt: changes.startsAt, endsAt: changes.endsAt, excludeIds: affected.map((lesson) => lesson.id) });
      if (conflict) return conflict;
    }
    const result = await updateLessons(studentId, id.data, changes, scope);
    if (!result) return { ok: false as const, error: "Aula não encontrada." };
    refresh();
    return { ok: true as const, updated: result.updated };
  } catch { return { ok: false as const, error: "Não foi possível salvar as alterações. Tente novamente." }; }
}

export async function cancelLesson(lessonId: string, scope: unknown, reason?: unknown) {
  const studentId = await currentUserId();
  if (!studentId) return { ok: false as const, error: "Entre na sua conta para cancelar aulas." };
  const id = z.uuid().safeParse(lessonId);
  const parsedScope = scopeSchema.safeParse(scope);
  const parsedReason = z.string().trim().max(300).optional().safeParse(reason);
  if (!id.success || !parsedScope.success || !parsedReason.success) return { ok: false as const, error: "Confira os dados do cancelamento." };
  try {
    const result = await cancelLessons(studentId, id.data, parsedReason.data || null, parsedScope.data);
    if (!result) return { ok: false as const, error: "Aula não encontrada." };
    refresh();
    return { ok: true as const, updated: result.updated };
  } catch { return { ok: false as const, error: "Não foi possível cancelar a aula. Tente novamente." }; }
}

export async function restoreCancelledLesson(lessonId: string, allowConflicts = false) {
  const studentId = await currentUserId();
  if (!studentId) return { ok: false as const, error: "Entre na sua conta para alterar aulas." };
  const id = z.uuid().safeParse(lessonId);
  if (!id.success) return { ok: false as const, error: "Aula não encontrada." };
  try {
    const slot = await getLessonSlot(studentId, id.data);
    if (!slot || slot.status !== "cancelled") return { ok: false as const, error: "Aula não encontrada." };
    if (allowConflicts !== true) {
      const conflict = await conflictFailure(studentId, { dates: [slot.date], startsAt: slot.startsAt.slice(0, 5), endsAt: slot.endsAt.slice(0, 5), excludeIds: [slot.id] });
      if (conflict) return conflict;
    }
    if (!await restoreLesson(studentId, id.data)) return { ok: false as const, error: "Aula não encontrada." };
    refresh();
    return { ok: true as const };
  } catch { return { ok: false as const, error: "Não foi possível reativar a aula. Tente novamente." }; }
}

export async function removeLesson(lessonId: string, scope: unknown) {
  const studentId = await currentUserId();
  if (!studentId) return { ok: false as const, error: "Entre na sua conta para excluir aulas." };
  const id = z.uuid().safeParse(lessonId);
  const parsedScope = scopeSchema.safeParse(scope);
  if (!id.success || !parsedScope.success) return { ok: false as const, error: "Confira os dados da exclusão." };
  try {
    const result = await deleteLessons(studentId, id.data, parsedScope.data);
    if (!result) return { ok: false as const, error: "Aula não encontrada." };
    refresh();
    return { ok: true as const, deleted: result.deleted };
  } catch { return { ok: false as const, error: "Não foi possível excluir a aula. Tente novamente." }; }
}

const makeupInput = z.object({
  date: z.iso.date(),
  startsAt: timeSchema,
  endsAt: timeSchema,
  reason: z.string().trim().max(300).optional(),
  allowConflicts: z.boolean().default(false),
}).refine((value) => value.endsAt > value.startsAt, endAfterStart);

export async function scheduleMakeup(lessonId: string, input: unknown) {
  const studentId = await currentUserId();
  if (!studentId) return { ok: false as const, error: "Entre na sua conta para repor aulas." };
  const id = z.uuid().safeParse(lessonId);
  const parsed = makeupInput.safeParse(input);
  if (!id.success || !parsed.success) return { ok: false as const, error: parsed.error?.issues[0]?.message ?? "Confira os dados da reposição." };
  const { allowConflicts, reason, ...slot } = parsed.data;
  try {
    if (!allowConflicts) {
      const conflict = await conflictFailure(studentId, { ...slot, dates: [slot.date], excludeIds: [id.data] });
      if (conflict) return conflict;
    }
    const result = await insertMakeup(studentId, id.data, { ...slot, reason: reason || null });
    if (result.outcome === "not_found") return { ok: false as const, error: "Aula não encontrada." };
    if (result.outcome === "already_replaced") return { ok: false as const, error: "Esta aula já tem uma reposição marcada." };
    refresh();
    return { ok: true as const, id: result.id };
  } catch { return { ok: false as const, error: "Não foi possível marcar a reposição. Tente novamente." }; }
}

export async function updateAttendance(lessonId: string, status: unknown, note?: string) {
  const studentId = await currentUserId();
  if (!studentId) return { ok: false as const, error: "Entre na sua conta para atualizar o histórico." };
  const id = z.uuid().safeParse(lessonId);
  const attendance = attendanceSchema.safeParse(status);
  const attendanceNote = z.string().trim().max(500).optional().safeParse(note);
  if (!id.success || !attendance.success || !attendanceNote.success) return { ok: false as const, error: "Confira os dados do registro." };
  try {
    const outcome = await setLessonAttendance(studentId, id.data, attendance.data, attendanceNote.data ?? null);
    if (outcome === "cancelled") return { ok: false as const, error: "Aulas canceladas não recebem registro de presença." };
    if (outcome === "not_found") return { ok: false as const, error: "Aula não encontrada." };
    return { ok: true as const };
  } catch { return { ok: false as const, error: "Não foi possível atualizar a presença. Tente novamente." }; }
}

export async function updateStudyRecord(lessonId: string, content: unknown) {
  const studentId = await currentUserId();
  if (!studentId) return { ok: false as const, error: "Entre na sua conta para editar o histórico." };
  const id = z.uuid().safeParse(lessonId);
  const studiedContent = z.string().trim().max(2000).safeParse(content);
  if (!id.success || !studiedContent.success) return { ok: false as const, error: "O conteúdo precisa ter até 2.000 caracteres." };
  try {
    if (!await setStudiedContent(studentId, id.data, studiedContent.data || null)) return { ok: false as const, error: "Aula não encontrada." };
    return { ok: true as const };
  } catch { return { ok: false as const, error: "Não foi possível salvar o conteúdo. Tente novamente." }; }
}
