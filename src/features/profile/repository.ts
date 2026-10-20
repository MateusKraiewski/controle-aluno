import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";

export async function getProfileTimeZone(userId: string) {
  const [row] = await getDb().select({ timeZone: profiles.timeZone }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return row?.timeZone ?? null;
}

export async function saveProfileTimeZone(userId: string, timeZone: string) {
  await getDb().insert(profiles).values({ userId, timeZone })
    .onConflictDoUpdate({ target: profiles.userId, set: { timeZone, updatedAt: new Date() } });
}
