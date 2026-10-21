"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createObjective, deleteObjective, linkObjectiveToLesson, updateObjective } from "@/features/learning/repository";
import { getProfileTimeZone } from "@/features/profile/repository";
import { civilToday } from "@/features/profile/time-zone";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

type Result = { ok: true } | { ok: false; error: string };
async function run(work: (studentId: string) => Promise<boolean>, failure: string): Promise<Result> {
  const studentId = await currentUserId();
  if (!studentId) return { ok: false, error: "Entre na sua conta para acompanhar objetivos." };
  try {
    if (!await work(studentId)) return { ok: false, error: "Objetivo não encontrado." };
    refresh();
    return { ok: true };
  } catch { return { ok: false, error: failure }; }
}

export async function addObjective(subjectId: unknown, title: unknown) {
  const parsed = z.object({ subjectId: z.uuid(), title: z.string().trim().min(1).max(200) }).safeParse({ subjectId, title });
  if (!parsed.success) return { ok: false as const, error: "Escreva o objetivo (até 200 caracteres) e escolha a matéria." };
  return run(async (studentId) => Boolean(await createObjective(studentId, parsed.data.subjectId, parsed.data.title)), "Não foi possível salvar o objetivo.");
}

export async function setObjectiveStatus(objectiveId: unknown, status: unknown) {
  const parsed = z.object({ id: z.uuid(), status: z.enum(["open", "practising", "done"]) }).safeParse({ id: objectiveId, status });
  if (!parsed.success) return { ok: false as const, error: "Confira o objetivo." };
  return run((studentId) => updateObjective(studentId, parsed.data.id, { status: parsed.data.status }), "Não foi possível atualizar o objetivo.");
}

/** Hides a review suggestion for two weeks. */
export async function snoozeObjective(objectiveId: unknown) {
  const id = z.uuid().safeParse(objectiveId);
  if (!id.success) return { ok: false as const, error: "Confira o objetivo." };
  return run(async (studentId) => {
    const today = civilToday(await getProfileTimeZone(studentId));
    const until = new Date(Date.parse(`${today}T00:00:00Z`) + 14 * 86_400_000).toISOString().slice(0, 10);
    return updateObjective(studentId, id.data, { snoozedUntil: until });
  }, "Não foi possível dispensar a sugestão.");
}

export async function removeObjective(objectiveId: unknown) {
  const id = z.uuid().safeParse(objectiveId);
  if (!id.success) return { ok: false as const, error: "Confira o objetivo." };
  return run((studentId) => deleteObjective(studentId, id.data), "Não foi possível excluir o objetivo.");
}

export async function linkObjective(objectiveId: unknown, lessonId: unknown) {
  const parsed = z.object({ objectiveId: z.uuid(), lessonId: z.uuid() }).safeParse({ objectiveId, lessonId });
  if (!parsed.success) return { ok: false as const, error: "Escolha a aula." };
  return run(async (studentId) => linkObjectiveToLesson(studentId, parsed.data.objectiveId, parsed.data.lessonId, civilToday(await getProfileTimeZone(studentId))), "Não foi possível ligar a aula ao objetivo.");
}
