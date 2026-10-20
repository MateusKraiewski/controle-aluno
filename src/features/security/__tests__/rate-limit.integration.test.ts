import { randomUUID } from "node:crypto";
import { like } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDatabase, getDb } from "@/db";
import { rateLimit } from "@/db/schema";
import { consumeRateLimit } from "../rate-limit";

function isLocalDatabase(url: string | undefined) {
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url ?? "").hostname); } catch { return false; }
}
const describeDb = process.env.RUN_DB_TESTS === "1" && isLocalDatabase(process.env.DATABASE_URL) ? describe : describe.skip;

describeDb("app rate limit (PostgreSQL)", () => {
  const prefix = `test-${randomUUID()}`;
  afterAll(async () => {
    await getDb().delete(rateLimit).where(like(rateLimit.key, `app:${prefix}%`));
    await closeDatabase();
  });

  it("allows up to max attempts per window and keys are independent", async () => {
    const results = [];
    for (let attempt = 0; attempt < 4; attempt += 1) results.push(await consumeRateLimit(`${prefix}:a`, 3, 60));
    expect(results).toEqual([true, true, true, false]);
    expect(await consumeRateLimit(`${prefix}:b`, 3, 60)).toBe(true);
  });

  it("starts a new window once the previous one has passed", async () => {
    expect(await consumeRateLimit(`${prefix}:c`, 1, 0)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await consumeRateLimit(`${prefix}:c`, 1, 0)).toBe(true);
  });
});
