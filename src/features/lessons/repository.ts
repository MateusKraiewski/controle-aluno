import "server-only";
import { and, asc, eq, gt, gte, inArray, lt, ne, notInArray, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { lessonSeries, lessons, subjects } from "@/db/schema";

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type Attendance = "unrecorded" | "attended" | "student_absent" | "teacher_absent";
export type SeriesScope = "this" | "following" | "all";

export async function listLessonsForStudent(studentId: string) {
  return getDb().select({
    id: lessons.id, subject: subjects.name, date: lessons.lessonDate, startsAt: lessons.startsAt, endsAt: lessons.endsAt,
    seriesId: lessons.seriesId, isException: lessons.isException, status: lessons.status, cancellationReason: lessons.cancellationReason,
    plannedContent: lessons.plannedContent, studiedContent: lessons.studiedContent,
    attendance: lessons.attendance, attendanceNote: lessons.attendanceNote,
  }).from(lessons).innerJoin(subjects, and(eq(lessons.subjectId, subjects.id), eq(lessons.studentId, subjects.studentId)))
    .where(eq(lessons.studentId, studentId)).orderBy(asc(lessons.lessonDate), asc(lessons.startsAt));
}

async function resolveSubjectId(tx: Tx, studentId: string, name: string) {
  await tx.insert(subjects).values({ studentId, name }).onConflictDoNothing();
  const [subject] = await tx.select({ id: subjects.id }).from(subjects)
    .where(and(eq(subjects.studentId, studentId), eq(subjects.name, name))).limit(1);
  if (!subject) throw new Error("subject_not_found");
  return subject.id;
}

/** Planned lessons of this student that overlap [startsAt, endsAt) on any of the given dates. */
export async function findConflicts(studentId: string, input: { dates: string[]; startsAt: string; endsAt: string; excludeIds?: string[] }) {
  if (input.dates.length === 0) return [];
  const filters: SQL[] = [
    eq(lessons.studentId, studentId), eq(lessons.status, "planned"), inArray(lessons.lessonDate, input.dates),
    lt(lessons.startsAt, `${input.endsAt}:00`), gt(lessons.endsAt, `${input.startsAt}:00`),
  ];
  if (input.excludeIds?.length) filters.push(notInArray(lessons.id, input.excludeIds));
  return getDb().select({ id: lessons.id, subject: subjects.name, date: lessons.lessonDate, startsAt: lessons.startsAt, endsAt: lessons.endsAt })
    .from(lessons).innerJoin(subjects, and(eq(lessons.subjectId, subjects.id), eq(lessons.studentId, subjects.studentId)))
    .where(and(...filters)).orderBy(asc(lessons.lessonDate), asc(lessons.startsAt)).limit(20);
}

export async function insertLesson(studentId: string, lesson: { subject: string; topic: string; date: string; startsAt: string; endsAt: string }) {
  return getDb().transaction(async (tx) => {
    const subjectId = await resolveSubjectId(tx, studentId, lesson.subject);
    const [created] = await tx.insert(lessons).values({
      studentId, subjectId, lessonDate: lesson.date,
      startsAt: `${lesson.startsAt}:00`, endsAt: `${lesson.endsAt}:00`, plannedContent: lesson.topic,
    }).returning({ id: lessons.id });
    return created!.id;
  });
}

export async function insertWeeklySeries(studentId: string, input: {
  subject: string; topic: string; startDate: string; endDate: string; startsAt: string; endsAt: string;
  timeZone: string; weekdays: number[]; intervalWeeks: number; dates: string[];
}) {
  return getDb().transaction(async (tx) => {
    const subjectId = await resolveSubjectId(tx, studentId, input.subject);
    const [series] = await tx.insert(lessonSeries).values({
      studentId, subjectId, startsOn: input.startDate, endsOn: input.endDate,
      startsAt: `${input.startsAt}:00`, endsAt: `${input.endsAt}:00`, timeZone: input.timeZone,
      weekdays: input.weekdays, intervalWeeks: input.intervalWeeks, plannedContent: input.topic,
    }).returning({ id: lessonSeries.id });
    const occurrences = await tx.insert(lessons).values(input.dates.map((lessonDate) => ({
      studentId, subjectId, seriesId: series!.id, lessonDate, originalLessonDate: lessonDate,
      startsAt: `${input.startsAt}:00`, endsAt: `${input.endsAt}:00`, plannedContent: input.topic,
    }))).returning({ id: lessons.id, date: lessons.lessonDate });
    return occurrences.map((occurrence) => ({ id: occurrence.id, date: occurrence.date, time: input.startsAt }));
  });
}

type Target = { id: string; seriesId: string | null; date: string; isException: boolean; timeZone: string | null };

function civilToday(timeZone: string | null) {
  // en-CA formats as YYYY-MM-DD; the series zone decides which classes are already in the past.
  return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone ?? "UTC" }).format(new Date());
}

async function lockTarget(tx: Tx, studentId: string, lessonId: string): Promise<Target | null> {
  const [target] = await tx.select({ id: lessons.id, seriesId: lessons.seriesId, date: lessons.lessonDate, isException: lessons.isException, timeZone: lessonSeries.timeZone })
    .from(lessons).leftJoin(lessonSeries, and(eq(lessons.seriesId, lessonSeries.id), eq(lessons.studentId, lessonSeries.studentId)))
    .where(and(eq(lessons.id, lessonId), eq(lessons.studentId, studentId))).limit(1).for("update", { of: lessons });
  return target ?? null;
}

/**
 * Other occurrences reached by a series scope. Only untouched future ones are included: lessons in
 * the past, with attendance, cancelled or edited individually keep their own history.
 */
function siblingFilter(studentId: string, target: Target, scope: SeriesScope) {
  if (scope === "this" || !target.seriesId) return null;
  const today = civilToday(target.timeZone);
  const from = scope === "following" && target.date > today ? target.date : today;
  return and(
    eq(lessons.studentId, studentId), eq(lessons.seriesId, target.seriesId), ne(lessons.id, target.id), gte(lessons.lessonDate, from),
    eq(lessons.status, "planned"), eq(lessons.attendance, "unrecorded"), eq(lessons.isException, false),
  )!;
}

/** Lessons a scoped change would touch (target first), used to check conflicts before writing. */
export async function listScopeTargets(studentId: string, lessonId: string, scope: SeriesScope) {
  return getDb().transaction(async (tx) => {
    const target = await lockTarget(tx, studentId, lessonId);
    if (!target) return null;
    const siblings = siblingFilter(studentId, target, scope);
    const rows = siblings ? await tx.select({ id: lessons.id, date: lessons.lessonDate }).from(lessons).where(siblings) : [];
    return [{ id: target.id, date: target.date }, ...rows];
  });
}

export type LessonChanges = { subject: string; topic: string; date: string; startsAt: string; endsAt: string };

export async function updateLessons(studentId: string, lessonId: string, changes: LessonChanges, scope: SeriesScope) {
  return getDb().transaction(async (tx) => {
    const target = await lockTarget(tx, studentId, lessonId);
    if (!target) return null;
    const subjectId = await resolveSubjectId(tx, studentId, changes.subject);
    const shared = { subjectId, plannedContent: changes.topic, startsAt: `${changes.startsAt}:00`, endsAt: `${changes.endsAt}:00`, updatedAt: new Date() };
    // Only a single-occurrence edit may move the date; it becomes an exception that later series edits skip.
    const single = scope === "this" || !target.seriesId;
    await tx.update(lessons).set(single ? { ...shared, lessonDate: changes.date, isException: target.seriesId !== null } : shared)
      .where(and(eq(lessons.id, target.id), eq(lessons.studentId, studentId)));
    const siblings = siblingFilter(studentId, target, scope);
    let updated = 1;
    if (siblings) {
      const rows = await tx.update(lessons).set(shared).where(siblings).returning({ id: lessons.id });
      updated += rows.length;
      if (scope === "all") {
        await tx.update(lessonSeries).set(shared).where(and(eq(lessonSeries.id, target.seriesId!), eq(lessonSeries.studentId, studentId)));
      }
    }
    return { updated };
  });
}

export async function cancelLessons(studentId: string, lessonId: string, reason: string | null, scope: SeriesScope) {
  return getDb().transaction(async (tx) => {
    const target = await lockTarget(tx, studentId, lessonId);
    if (!target) return null;
    const now = new Date();
    const values = { status: "cancelled" as const, cancellationReason: reason, cancelledAt: now, updatedAt: now };
    await tx.update(lessons).set(values).where(and(eq(lessons.id, target.id), eq(lessons.studentId, studentId)));
    const siblings = siblingFilter(studentId, target, scope);
    const rows = siblings ? await tx.update(lessons).set(values).where(siblings).returning({ id: lessons.id }) : [];
    return { updated: rows.length + 1 };
  });
}

export async function getLessonSlot(studentId: string, lessonId: string) {
  const [lesson] = await getDb().select({ id: lessons.id, date: lessons.lessonDate, startsAt: lessons.startsAt, endsAt: lessons.endsAt, status: lessons.status })
    .from(lessons).where(and(eq(lessons.id, lessonId), eq(lessons.studentId, studentId))).limit(1);
  return lesson ?? null;
}

export async function restoreLesson(studentId: string, lessonId: string) {
  const rows = await getDb().update(lessons)
    .set({ status: "planned", cancellationReason: null, cancelledAt: null, updatedAt: new Date() })
    .where(and(eq(lessons.id, lessonId), eq(lessons.studentId, studentId), eq(lessons.status, "cancelled"))).returning({ id: lessons.id });
  return rows.length > 0;
}

export async function deleteLessons(studentId: string, lessonId: string, scope: SeriesScope) {
  return getDb().transaction(async (tx) => {
    const target = await lockTarget(tx, studentId, lessonId);
    if (!target) return null;
    const siblings = siblingFilter(studentId, target, scope);
    const removed = siblings ? await tx.delete(lessons).where(siblings).returning({ id: lessons.id }) : [];
    await tx.delete(lessons).where(and(eq(lessons.id, target.id), eq(lessons.studentId, studentId)));
    if (target.seriesId) {
      const [remaining] = await tx.select({ id: lessons.id }).from(lessons)
        .where(and(eq(lessons.seriesId, target.seriesId), eq(lessons.studentId, studentId))).limit(1);
      if (!remaining) await tx.delete(lessonSeries).where(and(eq(lessonSeries.id, target.seriesId), eq(lessonSeries.studentId, studentId)));
    }
    return { deleted: removed.length + 1 };
  });
}

/** Attendance only applies to planned lessons of this student. */
export async function setLessonAttendance(studentId: string, lessonId: string, attendance: Attendance, note: string | null): Promise<"saved" | "cancelled" | "not_found"> {
  const now = new Date();
  const rows = await getDb().update(lessons).set({
    attendance, attendanceNote: note,
    attendanceRecordedBy: attendance === "unrecorded" ? null : studentId,
    attendanceRecordedAt: attendance === "unrecorded" ? null : now,
    updatedAt: now,
  })
    .where(and(eq(lessons.id, lessonId), eq(lessons.studentId, studentId), eq(lessons.status, "planned")))
    .returning({ id: lessons.id });
  if (rows.length > 0) return "saved";
  const lesson = await getLessonSlot(studentId, lessonId);
  return lesson ? "cancelled" : "not_found";
}

export async function setStudiedContent(studentId: string, lessonId: string, studiedContent: string | null) {
  const rows = await getDb().update(lessons).set({ studiedContent, updatedAt: new Date() })
    .where(and(eq(lessons.id, lessonId), eq(lessons.studentId, studentId))).returning({ id: lessons.id });
  return rows.length > 0;
}
