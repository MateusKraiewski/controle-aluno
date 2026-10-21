import "server-only";
import { and, asc, eq, gt, gte, inArray, lt, lte, ne, notInArray, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { lessonSeries, lessons, subjects } from "@/db/schema";
import { learningObjectives, lessonObjectives } from "@/db/schema/learning";

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type Attendance = "unrecorded" | "attended" | "student_absent" | "teacher_absent";
export type SeriesScope = "this" | "following" | "all";

export async function listLessonsForStudent(studentId: string) {
  return getDb().select({
    id: lessons.id, subject: subjects.name, date: lessons.lessonDate, startsAt: lessons.startsAt, endsAt: lessons.endsAt,
    seriesId: lessons.seriesId, isException: lessons.isException, status: lessons.status, cancellationReason: lessons.cancellationReason,
    plannedContent: lessons.plannedContent, studiedContent: lessons.studiedContent, privateNote: lessons.privateNote, nextStep: lessons.nextStep,
    attendance: lessons.attendance, attendanceNote: lessons.attendanceNote, replacesLessonId: lessons.replacesLessonId,
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

function previousDay(date: string) {
  return new Date(Date.parse(`${date}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}

/**
 * "This and following" splits the rule: the original series now ends the day before the edited
 * occurrence and a new series carries the new times from there on. Past, recorded or individually
 * edited occurrences keep the series they were generated by.
 */
async function splitSeries(tx: Tx, studentId: string, seriesId: string, from: string,
  shared: { subjectId: string; plannedContent: string; startsAt: string; endsAt: string }, moved: string[]) {
  const [series] = await tx.select({ startsOn: lessonSeries.startsOn, endsOn: lessonSeries.endsOn, timeZone: lessonSeries.timeZone, weekdays: lessonSeries.weekdays, intervalWeeks: lessonSeries.intervalWeeks })
    .from(lessonSeries).where(and(eq(lessonSeries.id, seriesId), eq(lessonSeries.studentId, studentId))).limit(1).for("update");
  if (!series) return;
  if (from <= series.startsOn) {
    // Editing from the first occurrence on is the same as changing the whole rule.
    await tx.update(lessonSeries).set({ ...shared, updatedAt: new Date() }).where(and(eq(lessonSeries.id, seriesId), eq(lessonSeries.studentId, studentId)));
    return;
  }
  const [created] = await tx.insert(lessonSeries).values({
    studentId, subjectId: shared.subjectId, startsOn: from, endsOn: series.endsOn < from ? from : series.endsOn, startsAt: shared.startsAt, endsAt: shared.endsAt,
    timeZone: series.timeZone, weekdays: series.weekdays, intervalWeeks: series.intervalWeeks, plannedContent: shared.plannedContent,
  }).returning({ id: lessonSeries.id });
  await tx.update(lessonSeries).set({ endsOn: previousDay(from), updatedAt: new Date() }).where(and(eq(lessonSeries.id, seriesId), eq(lessonSeries.studentId, studentId)));
  await tx.update(lessons).set({ seriesId: created!.id }).where(and(eq(lessons.studentId, studentId), inArray(lessons.id, moved)));
}

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
    const changed = [target.id];
    if (siblings) {
      const rows = await tx.update(lessons).set(shared).where(siblings).returning({ id: lessons.id });
      changed.push(...rows.map((row) => row.id));
      if (scope === "all") {
        await tx.update(lessonSeries).set(shared).where(and(eq(lessonSeries.id, target.seriesId!), eq(lessonSeries.studentId, studentId)));
      }
      // Split only from an untouched, current or future occurrence; otherwise the rule's dates would not line up.
      if (scope === "following" && !target.isException && target.date >= civilToday(target.timeZone)) {
        await splitSeries(tx, studentId, target.seriesId!, target.date, shared, changed);
      }
    }
    // Goal links must stay within one subject; a lesson moved to another subject drops them.
    await tx.delete(lessonObjectives).where(and(eq(lessonObjectives.studentId, studentId), inArray(lessonObjectives.lessonId, changed),
      notInArray(lessonObjectives.objectiveId, tx.select({ id: learningObjectives.id }).from(learningObjectives)
        .where(and(eq(learningObjectives.studentId, studentId), eq(learningObjectives.subjectId, subjectId))))));
    return { updated: changed.length };
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
  const [lesson] = await getDb().select({ id: lessons.id, date: lessons.lessonDate, startsAt: lessons.startsAt, endsAt: lessons.endsAt, status: lessons.status, attendance: lessons.attendance })
    .from(lessons).where(and(eq(lessons.id, lessonId), eq(lessons.studentId, studentId))).limit(1);
  return lesson ?? null;
}

/** Reactivates a cancelled lesson unless a make-up already replaces it (both would be active). */
export async function restoreLesson(studentId: string, lessonId: string): Promise<"restored" | "replaced" | "not_found"> {
  return getDb().transaction(async (tx) => {
    const [makeup] = await tx.select({ id: lessons.id }).from(lessons)
      .where(and(eq(lessons.studentId, studentId), eq(lessons.replacesLessonId, lessonId), eq(lessons.status, "planned"))).limit(1);
    // Only an active make-up blocks the original; a cancelled one no longer replaces it.
    if (makeup) return "replaced";
    const rows = await tx.update(lessons)
      .set({ status: "planned", cancellationReason: null, cancelledAt: null, updatedAt: new Date() })
      .where(and(eq(lessons.id, lessonId), eq(lessons.studentId, studentId), eq(lessons.status, "cancelled"))).returning({ id: lessons.id });
    return rows.length > 0 ? "restored" : "not_found";
  });
}

export async function deleteLessons(studentId: string, lessonId: string, scope: SeriesScope) {
  return getDb().transaction(async (tx) => {
    const target = await lockTarget(tx, studentId, lessonId);
    if (!target) return null;
    const siblings = siblingFilter(studentId, target, scope);
    const siblingIds = siblings ? (await tx.select({ id: lessons.id }).from(lessons).where(siblings).for("update")).map((row) => row.id) : [];
    const ids = [target.id, ...siblingIds];
    // A make-up lesson outlives the deleted original; only the link is dropped.
    await tx.update(lessons).set({ replacesLessonId: null, updatedAt: new Date() })
      .where(and(eq(lessons.studentId, studentId), inArray(lessons.replacesLessonId, ids)));
    const removed = siblingIds.length ? await tx.delete(lessons).where(and(eq(lessons.studentId, studentId), inArray(lessons.id, siblingIds))).returning({ id: lessons.id }) : [];
    await tx.delete(lessons).where(and(eq(lessons.id, target.id), eq(lessons.studentId, studentId)));
    if (target.seriesId) {
      const [remaining] = await tx.select({ id: lessons.id }).from(lessons)
        .where(and(eq(lessons.seriesId, target.seriesId), eq(lessons.studentId, studentId))).limit(1);
      if (!remaining) await tx.delete(lessonSeries).where(and(eq(lessonSeries.id, target.seriesId), eq(lessonSeries.studentId, studentId)));
    }
    return { deleted: removed.length + 1 };
  });
}

/**
 * Schedules a make-up lesson linked to the original. An original without its own record is
 * cancelled with the reason; one already recorded (e.g. an absence) keeps that record.
 */
export async function insertMakeup(studentId: string, originalId: string, slot: { date: string; startsAt: string; endsAt: string; reason: string | null }) {
  return getDb().transaction(async (tx) => {
    const [original] = await tx.select({ id: lessons.id, subjectId: lessons.subjectId, plannedContent: lessons.plannedContent, status: lessons.status, attendance: lessons.attendance })
      .from(lessons).where(and(eq(lessons.id, originalId), eq(lessons.studentId, studentId))).limit(1).for("update");
    if (!original) return { outcome: "not_found" as const };
    const [existing] = await tx.select({ id: lessons.id }).from(lessons)
      .where(and(eq(lessons.studentId, studentId), eq(lessons.replacesLessonId, original.id))).limit(1);
    if (existing) return { outcome: "already_replaced" as const };
    const now = new Date();
    if (original.status === "planned" && original.attendance === "unrecorded") {
      await tx.update(lessons).set({ status: "cancelled", cancellationReason: slot.reason, cancelledAt: now, updatedAt: now })
        .where(and(eq(lessons.id, original.id), eq(lessons.studentId, studentId)));
    }
    const [created] = await tx.insert(lessons).values({
      studentId, subjectId: original.subjectId, lessonDate: slot.date, startsAt: `${slot.startsAt}:00`, endsAt: `${slot.endsAt}:00`,
      plannedContent: original.plannedContent, replacesLessonId: original.id,
    }).returning({ id: lessons.id });
    return { outcome: "created" as const, id: created!.id };
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

export type StudyRecord = { studiedContent: string | null; privateNote: string | null; nextStep: string | null };

/** The student's own post-lesson record: what was studied, a private note and the next step. */
export async function setStudyRecord(studentId: string, lessonId: string, record: StudyRecord) {
  const rows = await getDb().update(lessons).set({ ...record, updatedAt: new Date() })
    .where(and(eq(lessons.id, lessonId), eq(lessons.studentId, studentId))).returning({ id: lessons.id });
  return rows.length > 0;
}

function breakFilter(studentId: string, from: string, to: string) {
  // Only lessons nothing was recorded on; attended, absent or already cancelled ones keep their record.
  return and(eq(lessons.studentId, studentId), gte(lessons.lessonDate, from), lte(lessons.lessonDate, to),
    eq(lessons.status, "planned"), eq(lessons.attendance, "unrecorded"))!;
}

export async function countBreakLessons(studentId: string, from: string, to: string) {
  const [row] = await getDb().select({ total: sql<number>`count(*)::int` }).from(lessons).where(breakFilter(studentId, from, to));
  return row?.total ?? 0;
}

/** Holidays and breaks: cancels every untouched lesson in [from, to]; a cancellation is never an absence. */
export async function cancelLessonsInRange(studentId: string, from: string, to: string, reason: string) {
  const now = new Date();
  const rows = await getDb().update(lessons).set({ status: "cancelled", cancellationReason: reason, cancelledAt: now, updatedAt: now })
    .where(breakFilter(studentId, from, to)).returning({ id: lessons.id });
  return rows.length;
}
