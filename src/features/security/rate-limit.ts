import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimit } from "@/db/schema";

/**
 * Fixed-window counter for app actions, sharing Better Auth's rate_limit table under an "app:" key.
 * Returns false once `max` attempts were made within `windowSeconds`.
 */
export async function consumeRateLimit(key: string, max: number, windowSeconds: number) {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const [row] = await getDb().insert(rateLimit).values({ id: randomUUID(), key: `app:${key}`, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`CASE WHEN ${rateLimit.lastRequest} < ${windowStart} THEN 1 ELSE ${rateLimit.count} + 1 END`,
        lastRequest: sql`CASE WHEN ${rateLimit.lastRequest} < ${windowStart} THEN ${now} ELSE ${rateLimit.lastRequest} END`,
      },
    }).returning({ count: rateLimit.count });
  return (row?.count ?? 1) <= max;
}
