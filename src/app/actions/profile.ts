"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { auth } from "@/lib/auth";
import { saveProfileTimeZone } from "@/features/profile/repository";
import { isValidTimeZone } from "@/features/profile/time-zone";

export async function updateTimeZone(value: unknown) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false as const, error: "Entre na sua conta para alterar o perfil." };
  if (typeof value !== "string" || !isValidTimeZone(value)) return { ok: false as const, error: "Escolha um fuso horário válido." };
  try {
    await saveProfileTimeZone(session.user.id, value);
    refresh();
    return { ok: true as const };
  } catch { return { ok: false as const, error: "Não foi possível salvar o perfil. Tente novamente." }; }
}
