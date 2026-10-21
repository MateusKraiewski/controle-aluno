import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabase, getDb } from "@/db";
import { lessons, subjects, user } from "@/db/schema";
import { learningObjectives } from "@/db/schema/learning";
import { listOwnSubjects } from "@/features/collaboration/repository";
import { insertLesson, setStudyRecord } from "@/features/lessons/repository";
import { createObjective, deleteObjective, linkObjectiveToLesson, listHistoryForExport, listObjectives, updateObjective } from "../repository";

function isLocalDatabase(url: string | undefined) {
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url ?? "").hostname); } catch { return false; }
}
const describeDb = process.env.RUN_DB_TESTS === "1" && isLocalDatabase(process.env.DATABASE_URL) ? describe : describe.skip;

describeDb("learning objectives (PostgreSQL)", () => {
  const owner = `test-${randomUUID()}`;
  const other = `test-${randomUUID()}`;

  beforeAll(async () => {
    await getDb().insert(user).values([owner, other].map((id) => ({ id, name: id, email: `${id}@example.test` })));
  });
  afterAll(async () => {
    const db = getDb();
    await db.delete(learningObjectives).where(inArray(learningObjectives.studentId, [owner, other]));
    await db.delete(lessons).where(inArray(lessons.studentId, [owner, other]));
    await db.delete(subjects).where(inArray(subjects.studentId, [owner, other]));
    await db.delete(user).where(inArray(user.id, [owner, other]));
    await closeDatabase();
  });

  it("keeps objectives per student and only links lessons of the same student and subject", async () => {
    const first = await insertLesson(owner, { subject: "Física", topic: "Ondas", date: "2026-09-01", startsAt: "09:00", endsAt: "10:00" });
    const later = await insertLesson(owner, { subject: "Física", topic: "Ondas II", date: "2026-09-15", startsAt: "09:00", endsAt: "10:00" });
    const otherSubject = await insertLesson(owner, { subject: "Química", topic: "pH", date: "2026-09-02", startsAt: "09:00", endsAt: "10:00" });
    const foreign = await insertLesson(other, { subject: "Física", topic: "Alheia", date: "2026-09-03", startsAt: "09:00", endsAt: "10:00" });
    const physics = (await listOwnSubjects(owner)).find((subject) => subject.name === "Física")!;
    const foreignPhysics = (await listOwnSubjects(other)).find((subject) => subject.name === "Física")!;

    expect(await createObjective(owner, foreignPhysics.id, "Invasão")).toBeNull();
    const id = (await createObjective(owner, physics.id, "Interferência"))!;
    expect(await linkObjectiveToLesson(other, id, foreign)).toBe(false);
    expect(await linkObjectiveToLesson(owner, id, foreign)).toBe(false);
    expect(await linkObjectiveToLesson(owner, id, otherSubject)).toBe(false);
    expect(await linkObjectiveToLesson(owner, id, first)).toBe(true);
    expect(await linkObjectiveToLesson(owner, id, later)).toBe(true);
    expect(await linkObjectiveToLesson(owner, id, later)).toBe(true);

    expect(await listObjectives(other)).toEqual([]);
    expect((await listObjectives(owner))[0]).toMatchObject({ title: "Interferência", subject: "Física", status: "open", lastWorkedOn: "2026-09-15" });
    expect(await updateObjective(other, id, { status: "done" })).toBe(false);
    expect(await updateObjective(owner, id, { status: "practising", snoozedUntil: "2026-11-01" })).toBe(true);
    expect((await listObjectives(owner))[0]).toMatchObject({ status: "practising", snoozedUntil: "2026-11-01" });
    expect(await deleteObjective(other, id)).toBe(false);
    expect(await deleteObjective(owner, id)).toBe(true);
  });

  it("exports only the student's own history", async () => {
    const lesson = await insertLesson(owner, { subject: "Arte", topic: "Cor", date: "2026-10-01", startsAt: "08:00", endsAt: "09:00" });
    await setStudyRecord(owner, lesson, { studiedContent: "Círculo cromático", privateNote: "Só minha", nextStep: null });
    const rows = await listHistoryForExport(owner);
    expect(rows.find((row) => row.subject === "Arte")).toMatchObject({ studiedContent: "Círculo cromático", privateNote: "Só minha" });
    expect(rows.some((row) => row.plannedContent === "Alheia")).toBe(false);
  });
});
