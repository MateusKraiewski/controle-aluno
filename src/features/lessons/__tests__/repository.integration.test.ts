import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabase, getDb } from "@/db";
import { lessonSeries, lessons, subjects, user } from "@/db/schema";
import {
  cancelLessons, cancelLessonsInRange, countBreakLessons, deleteLessons, findConflicts, insertLesson, insertMakeup, insertWeeklySeries, listLessonsForStudent, listScopeTargets,
  restoreLesson, setLessonAttendance, setStudyRecord, updateLessons,
} from "../repository";

// Only `npm run test:db` runs these, and only against a database on this machine: they write rows.
function isLocalDatabase(url: string | undefined) {
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url ?? "").hostname); } catch { return false; }
}
const describeDb = process.env.RUN_DB_TESTS === "1" && isLocalDatabase(process.env.DATABASE_URL) ? describe : describe.skip;

describeDb("lessons repository (PostgreSQL)", () => {
  const alice = `test-${randomUUID()}`;
  const bob = `test-${randomUUID()}`;
  const owners = [alice, bob];

  beforeAll(async () => {
    await getDb().insert(user).values(owners.map((id) => ({ id, name: id, email: `${id}@example.test` })));
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(lessons).where(inArray(lessons.studentId, owners));
    await db.delete(lessonSeries).where(inArray(lessonSeries.studentId, owners));
    await db.delete(subjects).where(inArray(subjects.studentId, owners));
    await db.delete(user).where(inArray(user.id, owners));
    await closeDatabase();
  });

  function series(studentId: string, dates: string[]) {
    return insertWeeklySeries(studentId, {
      subject: "Física", topic: "Cinemática", startDate: dates[0]!, endDate: dates.at(-1)!, startsAt: "09:00", endsAt: "10:00",
      timeZone: "Europe/Lisbon", weekdays: [1], intervalWeeks: 1, dates,
    });
  }

  it("keeps each student's lessons invisible and immutable to other accounts", async () => {
    const id = await insertLesson(alice, { subject: "Química", topic: "Ligações", date: "2030-01-07", startsAt: "14:00", endsAt: "15:00" });
    expect((await listLessonsForStudent(bob)).map((row) => row.id)).not.toContain(id);
    expect(await setLessonAttendance(bob, id, "attended", null)).toBe("not_found");
    expect(await setStudyRecord(bob, id, { studiedContent: "invasão", privateNote: null, nextStep: null })).toBe(false);
    expect(await updateLessons(bob, id, { subject: "X", topic: "Y", date: "2030-01-08", startsAt: "08:00", endsAt: "09:00" }, "this")).toBeNull();
    expect(await cancelLessons(bob, id, null, "all")).toBeNull();
    expect(await restoreLesson(bob, id)).toBe("not_found");
    expect(await deleteLessons(bob, id, "all")).toBeNull();
    const [row] = await listLessonsForStudent(alice).then((rows) => rows.filter((item) => item.id === id));
    expect(row).toMatchObject({ subject: "Química", status: "planned", attendance: "unrecorded", studiedContent: null, date: "2030-01-07" });
  });

  it("detects overlaps only among the student's own planned lessons", async () => {
    await insertLesson(alice, { subject: "Inglês", topic: "Verbos", date: "2030-02-04", startsAt: "10:00", endsAt: "11:00" });
    expect(await findConflicts(alice, { dates: ["2030-02-04"], startsAt: "10:30", endsAt: "11:30" })).toHaveLength(1);
    expect(await findConflicts(alice, { dates: ["2030-02-04"], startsAt: "11:00", endsAt: "12:00" })).toHaveLength(0);
    expect(await findConflicts(bob, { dates: ["2030-02-04"], startsAt: "10:30", endsAt: "11:30" })).toHaveLength(0);
  });

  it("applies series scopes without touching recorded or individually edited occurrences", async () => {
    const created = await series(alice, ["2030-03-04", "2030-03-11", "2030-03-18", "2030-03-25"]);
    const [first, second, third, fourth] = created.map((item) => item.id);
    expect(await setLessonAttendance(alice, third!, "attended", null)).toBe("saved");
    await updateLessons(alice, fourth!, { subject: "Física", topic: "Movida", date: "2030-03-26", startsAt: "09:00", endsAt: "10:00" }, "this");

    const result = await updateLessons(alice, second!, { subject: "Física", topic: "Dinâmica", date: "2030-03-11", startsAt: "11:00", endsAt: "12:00" }, "following");
    expect(result).toEqual({ updated: 1 });

    const rows = await getDb().select({ id: lessons.id, startsAt: lessons.startsAt, plannedContent: lessons.plannedContent, isException: lessons.isException, lessonDate: lessons.lessonDate, originalLessonDate: lessons.originalLessonDate })
      .from(lessons).where(and(eq(lessons.studentId, alice), inArray(lessons.id, [first!, second!, third!, fourth!])));
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(byId.get(first!)?.startsAt).toBe("09:00:00");
    expect(byId.get(second!)).toMatchObject({ startsAt: "11:00:00", plannedContent: "Dinâmica" });
    expect(byId.get(third!)?.startsAt).toBe("09:00:00");
    expect(byId.get(fourth!)).toMatchObject({ isException: true, lessonDate: "2030-03-26", originalLessonDate: "2030-03-25", plannedContent: "Movida" });
  });

  it("cancels without counting an absence and refuses attendance on cancelled lessons", async () => {
    const created = await series(alice, ["2030-04-01", "2030-04-08", "2030-04-15"]);
    expect(await cancelLessons(alice, created[1]!.id, "Feriado", "following")).toEqual({ updated: 2 });
    const rows = await listLessonsForStudent(alice).then((all) => all.filter((row) => created.some((item) => item.id === row.id)));
    expect(rows.map((row) => row.status)).toEqual(["planned", "cancelled", "cancelled"]);
    expect(rows.every((row) => row.attendance === "unrecorded")).toBe(true);
    expect(await setLessonAttendance(alice, created[1]!.id, "student_absent", null)).toBe("cancelled");
    expect(await restoreLesson(alice, created[1]!.id)).toBe("restored");
    expect(await setLessonAttendance(alice, created[1]!.id, "attended", null)).toBe("saved");
  });

  it("leaves past occurrences, the target date and its exception flag alone on series-wide edits", async () => {
    const created = await series(alice, ["2020-06-01", "2030-06-03", "2030-06-10"]);
    const [past, moved, later] = created.map((item) => item.id);
    await updateLessons(alice, moved!, { subject: "Física", topic: "Movida", date: "2030-06-04", startsAt: "09:00", endsAt: "10:00" }, "this");
    expect((await listScopeTargets(alice, later!, "all"))?.map((item) => item.id)).toEqual([later]);
    await updateLessons(alice, moved!, { subject: "Física", topic: "Ótica", date: "2031-01-01", startsAt: "15:00", endsAt: "16:00" }, "all");
    const rows = await getDb().select({ id: lessons.id, startsAt: lessons.startsAt, lessonDate: lessons.lessonDate, isException: lessons.isException })
      .from(lessons).where(and(eq(lessons.studentId, alice), inArray(lessons.id, [past!, moved!, later!])));
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(byId.get(past!)?.startsAt).toBe("09:00:00");
    expect(byId.get(moved!)).toMatchObject({ startsAt: "15:00:00", lessonDate: "2030-06-04", isException: true });
    expect(byId.get(later!)?.startsAt).toBe("15:00:00");
  });

  it("splits the rule when editing this and the following occurrences", async () => {
    const created = await series(alice, ["2030-08-05", "2030-08-12", "2030-08-19", "2030-08-26"]);
    const ids = created.map((item) => item.id);
    await updateLessons(alice, ids[2]!, { subject: "Física", topic: "Nova fase", date: "2030-08-19", startsAt: "14:00", endsAt: "15:00" }, "following");
    const rows = await getDb().select({ id: lessons.id, seriesId: lessons.seriesId, startsAt: lessons.startsAt }).from(lessons).where(and(eq(lessons.studentId, alice), inArray(lessons.id, ids)));
    const byId = new Map(rows.map((row) => [row.id, row]));
    const oldSeries = byId.get(ids[0]!)!.seriesId!;
    const newSeries = byId.get(ids[2]!)!.seriesId!;
    expect(newSeries).not.toBe(oldSeries);
    expect(byId.get(ids[1]!)).toMatchObject({ seriesId: oldSeries, startsAt: "09:00:00" });
    expect(byId.get(ids[3]!)).toMatchObject({ seriesId: newSeries, startsAt: "14:00:00" });
    const rules = await getDb().select({ id: lessonSeries.id, startsOn: lessonSeries.startsOn, endsOn: lessonSeries.endsOn, startsAt: lessonSeries.startsAt })
      .from(lessonSeries).where(inArray(lessonSeries.id, [oldSeries, newSeries]));
    expect(rules.find((rule) => rule.id === oldSeries)).toMatchObject({ startsOn: "2030-08-05", endsOn: "2030-08-18", startsAt: "09:00:00" });
    expect(rules.find((rule) => rule.id === newSeries)).toMatchObject({ startsOn: "2030-08-19", endsOn: "2030-08-26", startsAt: "14:00:00" });
  });

  it("deletes a whole series but keeps occurrences that already have records", async () => {
    const created = await series(alice, ["2030-05-06", "2030-05-13", "2030-05-20"]);
    await setLessonAttendance(alice, created[2]!.id, "attended", null);
    expect(await deleteLessons(alice, created[0]!.id, "all")).toEqual({ deleted: 2 });
    const remaining = await getDb().select({ id: lessons.id }).from(lessons).where(and(eq(lessons.studentId, alice), inArray(lessons.id, created.map((item) => item.id))));
    expect(remaining.map((row) => row.id)).toEqual([created[2]!.id]);
    expect(await deleteLessons(alice, created[2]!.id, "this")).toEqual({ deleted: 1 });
  });
  it("links a make-up to its original, cancels only unrecorded originals and survives deleting the original", async () => {
    const original = await insertLesson(alice, { subject: "Artes", topic: "Cor", date: "2030-07-01", startsAt: "08:00", endsAt: "09:00" });
    expect(await insertMakeup(bob, original, { date: "2030-07-08", startsAt: "08:00", endsAt: "09:00", reason: null })).toEqual({ outcome: "not_found" });
    const made = await insertMakeup(alice, original, { date: "2030-07-08", startsAt: "08:00", endsAt: "09:00", reason: "Doente" });
    expect(made.outcome).toBe("created");
    expect(await insertMakeup(alice, original, { date: "2030-07-09", startsAt: "08:00", endsAt: "09:00", reason: null })).toEqual({ outcome: "already_replaced" });
    const rows = await listLessonsForStudent(alice);
    expect(rows.find((row) => row.id === original)).toMatchObject({ status: "cancelled", cancellationReason: "Doente" });
    const makeupId = made.outcome === "created" ? made.id : "";
    expect(rows.find((row) => row.id === makeupId)).toMatchObject({ replacesLessonId: original, subject: "Artes", plannedContent: "Cor", status: "planned" });

    const absent = await insertLesson(alice, { subject: "Artes", topic: "Forma", date: "2030-07-02", startsAt: "08:00", endsAt: "09:00" });
    await setLessonAttendance(alice, absent, "student_absent", null);
    await insertMakeup(alice, absent, { date: "2030-07-10", startsAt: "08:00", endsAt: "09:00", reason: null });
    expect((await listLessonsForStudent(alice)).find((row) => row.id === absent)).toMatchObject({ status: "planned", attendance: "student_absent" });

    expect(await restoreLesson(alice, original)).toBe("replaced");
    await cancelLessons(alice, makeupId, null, "this");
    expect(await restoreLesson(alice, original)).toBe("restored");
    await cancelLessons(alice, original, null, "this");
    expect(await deleteLessons(alice, original, "this")).toEqual({ deleted: 1 });
    expect((await listLessonsForStudent(alice)).find((row) => row.id === makeupId)?.replacesLessonId).toBeNull();
  });

  it("cancels only untouched lessons of the student inside a break period", async () => {
    const inside = await insertLesson(alice, { subject: "Música", topic: "Ritmo", date: "2031-12-22", startsAt: "10:00", endsAt: "11:00" });
    const recorded = await insertLesson(alice, { subject: "Música", topic: "Ritmo", date: "2031-12-23", startsAt: "10:00", endsAt: "11:00" });
    const outside = await insertLesson(alice, { subject: "Música", topic: "Ritmo", date: "2032-01-05", startsAt: "10:00", endsAt: "11:00" });
    const other = await insertLesson(bob, { subject: "Música", topic: "Ritmo", date: "2031-12-22", startsAt: "10:00", endsAt: "11:00" });
    await setLessonAttendance(alice, recorded, "attended", null);
    expect(await countBreakLessons(alice, "2031-12-20", "2032-01-02")).toBe(1);
    expect(await cancelLessonsInRange(alice, "2031-12-20", "2032-01-02", "Férias")).toBe(1);
    const rows = await listLessonsForStudent(alice);
    expect(rows.find((row) => row.id === inside)).toMatchObject({ status: "cancelled", cancellationReason: "Férias", attendance: "unrecorded" });
    expect(rows.find((row) => row.id === recorded)?.status).toBe("planned");
    expect(rows.find((row) => row.id === outside)?.status).toBe("planned");
    expect((await listLessonsForStudent(bob)).find((row) => row.id === other)?.status).toBe("planned");
  });

  it("stores the private note and next step separately from planned and studied content", async () => {
    const id = await insertLesson(alice, { subject: "Latim", topic: "Declinações", date: "2031-02-03", startsAt: "10:00", endsAt: "11:00" });
    expect(await setStudyRecord(alice, id, { studiedContent: "1ª declinação", privateNote: "Rever com calma", nextStep: "Exercícios 1–5" })).toBe(true);
    expect((await listLessonsForStudent(alice)).find((row) => row.id === id)).toMatchObject({ plannedContent: "Declinações", studiedContent: "1ª declinação", privateNote: "Rever com calma", nextStep: "Exercícios 1–5" });
  });
});
