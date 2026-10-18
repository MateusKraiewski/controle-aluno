"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { generateWeeklyDates } from "@/features/calendar/domain";
import { insertLesson, insertWeeklySeries, setLessonAttendance, setStudiedContent } from "@/features/lessons/repository";

const lessonInput = z.object({
  subject: z.string().trim().min(1).max(48),
  topic: z.string().trim().min(1).max(500),
  date: z.iso.date(),
  startsAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endsAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  repeat: z.enum(["none", "weekly", "biweekly"]).default("none"),
  weekdays: z.array(z.number().int().min(1).max(7)).max(7).default([]),
  endsOn: z.preprocess((value) => value === "" ? undefined : value, z.iso.date().optional()),
  timeZone: z.string().min(1).max(80).default("UTC"),
}).refine((value) => value.endsAt > value.startsAt, { path: ["endsAt"], message: "O horário final precisa ser depois do inicial." });

const attendanceSchema = z.enum(["unrecorded", "attended", "student_absent", "teacher_absent"]);

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function createLesson(input: unknown) {
  const studentId = await currentUserId();
  if (!studentId) return { ok: false as const, error: "Entre na sua conta para salvar aulas." };
  const parsed = lessonInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Confira os dados da aula." };
  if (parsed.data.repeat !== "none") {
    if (!parsed.data.endsOn || parsed.data.weekdays.length === 0) return { ok: false as const, error: "Escolha até quando repetir e os dias da semana." };
    try { new Intl.DateTimeFormat("en", { timeZone: parsed.data.timeZone }); }
    catch { return { ok: false as const, error: "Escolha um fuso horário válido." }; }
    const intervalWeeks = parsed.data.repeat === "weekly" ? 1 : 2;
    let dates: string[];
    try { dates = generateWeeklyDates({ startDate: parsed.data.date, endDate: parsed.data.endsOn, weekdays: parsed.data.weekdays, everyWeeks: intervalWeeks }); }
    catch { return { ok: false as const, error: "Confira as datas e os dias da recorrência." }; }
    if (dates.length === 0 || dates.length > 300) return { ok: false as const, error: "A série precisa gerar entre 1 e 300 aulas." };
    try {
      const occurrences = await insertWeeklySeries(studentId, {
        subject: parsed.data.subject, topic: parsed.data.topic, startDate: parsed.data.date,
        endDate: parsed.data.endsOn, startsAt: parsed.data.startsAt, endsAt: parsed.data.endsAt,
        timeZone: parsed.data.timeZone, weekdays: parsed.data.weekdays, intervalWeeks, dates,
      });
      return { ok: true as const, occurrences };
    } catch { return { ok: false as const, error: "Não foi possível salvar a série de aulas. Tente novamente." }; }
  }
  try {
    const id = await insertLesson(studentId, parsed.data);
    return { ok: true as const, occurrences: [{ id, date: parsed.data.date, time: parsed.data.startsAt }] };
  }
  catch { return { ok: false as const, error: "Não foi possível salvar a aula. Tente novamente." }; }
}

export async function updateAttendance(lessonId: string, status: unknown, note?: string) {
  const studentId = await currentUserId();
  if (!studentId) return { ok: false as const, error: "Entre na sua conta para atualizar o histórico." };
  const id = z.uuid().safeParse(lessonId);
  const attendance = attendanceSchema.safeParse(status);
  const attendanceNote = z.string().trim().max(500).optional().safeParse(note);
  if (!id.success || !attendance.success || !attendanceNote.success) return { ok: false as const, error: "Confira os dados do registro." };
  try { await setLessonAttendance(studentId, id.data, attendance.data, attendanceNote.data ?? null); return { ok: true as const }; }
  catch { return { ok: false as const, error: "Não foi possível atualizar a presença. Tente novamente." }; }
}

export async function updateStudyRecord(lessonId: string, content: unknown) {
  const studentId = await currentUserId();
  if (!studentId) return { ok: false as const, error: "Entre na sua conta para editar o histórico." };
  const id = z.uuid().safeParse(lessonId);
  const studiedContent = z.string().trim().max(2000).safeParse(content);
  if (!id.success || !studiedContent.success) return { ok: false as const, error: "O conteúdo precisa ter até 2.000 caracteres." };
  try { await setStudiedContent(studentId, id.data, studiedContent.data || null); return { ok: true as const }; }
  catch { return { ok: false as const, error: "Não foi possível salvar o conteúdo. Tente novamente." }; }
}
