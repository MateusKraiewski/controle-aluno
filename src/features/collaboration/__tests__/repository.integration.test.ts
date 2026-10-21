import { randomUUID } from "node:crypto";
import { eq, inArray, or } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabase, getDb } from "@/db";
import { lessonSeries, lessons, subjects, user } from "@/db/schema";
import { auditEvents, lessonResolutions, participantRecords, teacherLinks } from "@/db/schema/collaboration";
import { cancelLessons, insertLesson, setLessonAttendance } from "@/features/lessons/repository";
import { generateInviteCode, hashInviteCode, normalizeInviteCode } from "../invite-code";
import {
  acceptInvite, createInvite, listOwnSubjects, listStudentLinks, listTeacherLessons, listTeacherLinks,
  latestResolutions, listTeacherRecordsForStudent, previewInvite, proposeResolution, respondResolution, revokeLink, setTeacherAttendance,
} from "../repository";

function isLocalDatabase(url: string | undefined) {
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url ?? "").hostname); } catch { return false; }
}
const describeDb = process.env.RUN_DB_TESTS === "1" && isLocalDatabase(process.env.DATABASE_URL) ? describe : describe.skip;

describeDb("teacher links (PostgreSQL)", () => {
  const teacher = `test-${randomUUID()}`;
  const student = `test-${randomUUID()}`;
  const stranger = `test-${randomUUID()}`;
  const people = [teacher, student, stranger];
  const inWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const range = ["2000-01-01", "2100-01-01"] as const;
  const newCode = () => hashInviteCode(normalizeInviteCode(generateInviteCode())!);

  beforeAll(async () => {
    await getDb().insert(user).values(people.map((id) => ({ id, name: id.slice(0, 13), email: `${id}@example.test` })));
  });

  afterAll(async () => {
    const db = getDb();
    const links = (await db.select({ id: teacherLinks.id }).from(teacherLinks).where(or(inArray(teacherLinks.teacherId, people), inArray(teacherLinks.studentId, people)))).map((row) => row.id);
    await db.delete(lessonResolutions).where(inArray(lessonResolutions.proposedBy, people));
    await db.delete(participantRecords).where(inArray(participantRecords.authorId, people));
    if (links.length) await db.delete(auditEvents).where(inArray(auditEvents.linkId, links));
    await db.delete(auditEvents).where(inArray(auditEvents.actorId, people));
    if (links.length) await db.delete(teacherLinks).where(inArray(teacherLinks.id, links));
    await db.delete(lessons).where(inArray(lessons.studentId, people));
    await db.delete(lessonSeries).where(inArray(lessonSeries.studentId, people));
    await db.delete(subjects).where(inArray(subjects.studentId, people));
    await db.delete(user).where(inArray(user.id, people));
    await closeDatabase();
  });

  it("shares only consented subjects, keeps attendance per author and cuts access on revocation", async () => {
    const shared = await insertLesson(student, { subject: "Piano", topic: "Escalas", date: "2030-09-02", startsAt: "17:00", endsAt: "18:00" });
    const privateLesson = await insertLesson(student, { subject: "Terapia", topic: "Privado", date: "2030-09-03", startsAt: "17:00", endsAt: "18:00" });
    const strangerLesson = await insertLesson(stranger, { subject: "Piano", topic: "Outro aluno", date: "2030-09-02", startsAt: "17:00", endsAt: "18:00" });
    const piano = (await listOwnSubjects(student)).find((subject) => subject.name === "Piano")!;
    const strangerPiano = (await listOwnSubjects(stranger)).find((subject) => subject.name === "Piano")!;

    const token = newCode();
    const linkId = await createInvite(teacher, token, inWeek);
    expect(await previewInvite(teacher, token)).toBeNull();
    expect(await previewInvite(student, token)).toEqual({ teacherName: teacher.slice(0, 13) });
    expect(await acceptInvite(teacher, token, [])).toBeNull();
    expect(await acceptInvite(student, token, [strangerPiano.id])).toBeNull();
    expect(await acceptInvite(student, token, [piano.id])).toBe(linkId);
    expect(await acceptInvite(stranger, token, [strangerPiano.id])).toBeNull();
    const second = newCode();
    await createInvite(teacher, second, inWeek);
    expect(await acceptInvite(student, second, [piano.id])).toBe(linkId);
    expect((await listTeacherLinks(teacher)).filter((link) => link.status === "accepted")).toHaveLength(1);
    expect(await previewInvite(stranger, token)).toBeNull();

    const visible = await listTeacherLessons(teacher, ...range);
    expect(visible.map((lesson) => lesson.id)).toEqual([shared]);
    expect(visible[0]).not.toHaveProperty("studiedContent");
    expect(visible[0]).not.toHaveProperty("privateNote");
    expect(visible[0]).not.toHaveProperty("nextStep");
    expect(await listTeacherLessons(stranger, ...range)).toEqual([]);
    expect((await listStudentLinks(student)).map((link) => link.subjects)).toEqual([["Piano"]]);
    expect((await listTeacherLinks(teacher)).find((link) => link.id === linkId)).toMatchObject({ status: "accepted", subjects: ["Piano"] });

    expect(await setTeacherAttendance(teacher, privateLesson, "present", null)).toBe("not_found");
    expect(await setTeacherAttendance(teacher, strangerLesson, "present", null)).toBe("not_found");
    expect(await setTeacherAttendance(stranger, shared, "present", null)).toBe("not_found");
    expect(await setTeacherAttendance(teacher, shared, "present", null)).toBe("saved");
    expect(await setTeacherAttendance(teacher, shared, "excused", "Avisou")).toBe("saved");
    expect(await listTeacherRecordsForStudent(student)).toEqual([{ lessonId: shared, teacherName: teacher.slice(0, 13), attendance: "excused" }]);
    const [studentRow] = await getDb().select({ attendance: lessons.attendance }).from(lessons).where(eq(lessons.id, shared));
    expect(studentRow?.attendance).toBe("unrecorded");

    await cancelLessons(student, shared, null, "this");
    expect(await setTeacherAttendance(teacher, shared, "present", null)).toBe("cancelled");

    expect(await revokeLink(stranger, linkId)).toBe(false);
    expect(await revokeLink(student, linkId)).toBe(true);
    expect(await listTeacherLessons(teacher, ...range)).toEqual([]);
    expect(await setTeacherAttendance(teacher, shared, null, null)).toBe("not_found");
    expect(await revokeLink(teacher, linkId)).toBe(false);
  });

  it("rejects expired codes and lets the teacher cancel a pending invite", async () => {
    const expired = newCode();
    await createInvite(teacher, expired, new Date(Date.now() - 1000));
    expect(await previewInvite(student, expired)).toBeNull();
    const pending = newCode();
    const pendingId = await createInvite(teacher, pending, inWeek);
    expect(await revokeLink(teacher, pendingId)).toBe(true);
    expect(await previewInvite(student, pending)).toBeNull();
    const audit = await getDb().select({ action: auditEvents.action }).from(auditEvents).where(eq(auditEvents.linkId, pendingId));
    expect(audit.map((row) => row.action).toSorted()).toEqual(["invite_created", "link_revoked"]);
  });

  it("resolves differing reports by proposal and acceptance, keeping both reports", async () => {
    const lesson = await insertLesson(student, { subject: "Canto", topic: "Respiração", date: "2030-10-07", startsAt: "18:00", endsAt: "19:00" });
    const canto = (await listOwnSubjects(student)).find((subject) => subject.name === "Canto")!;
    const token = newCode();
    await createInvite(teacher, token, inWeek);
    expect(await acceptInvite(student, token, [canto.id])).toBeTruthy();
    await setLessonAttendance(student, lesson, "teacher_absent", null);
    expect(await proposeResolution(student, lesson, "held", null)).toBe("not_found");
    await setTeacherAttendance(teacher, lesson, "present", null);
    expect(await proposeResolution(stranger, lesson, "held", null)).toBe("not_found");
    expect(await proposeResolution(student, lesson, "teacher_absent", "Esperei 30 min")).toBe("proposed");
    expect(await proposeResolution(teacher, lesson, "held", null)).toBe("already_open");
    const open = (await latestResolutions([lesson])).get(lesson)!;
    expect(await respondResolution(student, open.id, true)).toBe(false);
    expect(await respondResolution(stranger, open.id, true)).toBe(false);
    expect(await respondResolution(teacher, open.id, false)).toBe(true);
    expect(await proposeResolution(teacher, lesson, "not_held", null)).toBe("proposed");
    const second = (await latestResolutions([lesson])).get(lesson)!;
    expect(await respondResolution(student, second.id, true)).toBe(true);
    expect((await latestResolutions([lesson])).get(lesson)).toMatchObject({ outcome: "not_held", status: "agreed" });
    const [row] = await getDb().select({ attendance: lessons.attendance }).from(lessons).where(eq(lessons.id, lesson));
    expect(row?.attendance).toBe("teacher_absent");
    expect(await listTeacherRecordsForStudent(student)).toContainEqual({ lessonId: lesson, teacherName: teacher.slice(0, 13), attendance: "present" });
    await setLessonAttendance(student, lesson, "attended", null);
    await setTeacherAttendance(teacher, lesson, "present", null);
    expect(await proposeResolution(student, lesson, "held", null)).toBe("no_divergence");
  });
});
