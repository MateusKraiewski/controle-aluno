import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabase, getDb } from "@/db";
import { lessons, subjects, user } from "@/db/schema";
import { deleteLessons, insertLesson } from "@/features/lessons/repository";
import { attachmentKeysForLessons, deleteOwnedAttachment, existingAttachmentKeys, getOwnedAttachment, insertAttachment, listAttachmentsForStudent } from "../repository";
import { localDiskStore } from "../store";

function isLocalDatabase(url: string | undefined) {
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url ?? "").hostname); } catch { return false; }
}
const describeDb = process.env.RUN_DB_TESTS === "1" && isLocalDatabase(process.env.DATABASE_URL) ? describe : describe.skip;

describeDb("lesson attachments (PostgreSQL + disk store)", () => {
  const owner = `test-${randomUUID()}`;
  const other = `test-${randomUUID()}`;
  let root = "";

  beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), "aula-attachments-"));
    await getDb().insert(user).values([owner, other].map((id) => ({ id, name: id, email: `${id}@example.test` })));
  });
  afterAll(async () => {
    const db = getDb();
    await db.delete(lessons).where(inArray(lessons.studentId, [owner, other]));
    await db.delete(subjects).where(inArray(subjects.studentId, [owner, other]));
    await db.delete(user).where(inArray(user.id, [owner, other]));
    await rm(root, { recursive: true, force: true });
    await closeDatabase();
  });

  const file = (storageKey = randomUUID()) => ({ storageKey, fileName: "lista.pdf", contentType: "application/pdf", sizeBytes: 10 });

  it("stores files only on the owner's lessons, caps them and keeps them private", async () => {
    const lesson = await insertLesson(owner, { subject: "Geo", topic: "Mapas", date: "2030-11-04", startsAt: "09:00", endsAt: "10:00" });
    expect(await insertAttachment(other, lesson, file(), 10)).toBe("not_found");
    const first = await insertAttachment(owner, lesson, file(), 2);
    await insertAttachment(owner, lesson, file(), 2);
    expect(await insertAttachment(owner, lesson, file(), 2)).toBe("too_many");
    const id = typeof first === "object" ? first.id : "";
    expect(await getOwnedAttachment(other, id)).toBeNull();
    expect(await listAttachmentsForStudent(other)).toEqual([]);
    expect(await deleteOwnedAttachment(other, id)).toBeNull();
    expect(await deleteOwnedAttachment(owner, id)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("lets the caller drop bytes whose lesson was deleted", async () => {
    const lesson = await insertLesson(owner, { subject: "Geo", topic: "Relevo", date: "2030-11-05", startsAt: "09:00", endsAt: "10:00" });
    const key = randomUUID();
    await insertAttachment(owner, lesson, file(key), 10);
    expect(await attachmentKeysForLessons(owner, [lesson])).toEqual([key]);
    await deleteLessons(owner, lesson, "this");
    expect((await existingAttachmentKeys([key])).has(key)).toBe(false);
  });

  it("disk store writes, reads, refuses overwrite and rejects non-UUID keys", async () => {
    const store = localDiskStore(root);
    const key = randomUUID();
    await store.put(key, new TextEncoder().encode("ok"));
    expect(new TextDecoder().decode((await store.get(key))!)).toBe("ok");
    await expect(store.put(key, new Uint8Array([1]))).rejects.toThrow();
    await expect(store.get("../../etc/passwd")).rejects.toThrow("invalid_attachment_key");
    await store.delete(key);
    expect(await store.get(key)).toBeNull();
  });
});
