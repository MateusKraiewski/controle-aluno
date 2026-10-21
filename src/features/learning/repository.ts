import "server-only";
import { and, asc, desc, eq, lte, max } from "drizzle-orm";
import { getDb } from "@/db";
import { lessons, subjects } from "@/db/schema";
import { learningObjectives, lessonObjectives } from "@/db/schema/learning";

export type ObjectiveStatus = "open" | "practising" | "done";

export async function listObjectives(studentId: string) {
  return getDb().select({
    id: learningObjectives.id, title: learningObjectives.title, status: learningObjectives.status, subjectId: learningObjectives.subjectId,
    subject: subjects.name, createdAt: learningObjectives.createdAt, snoozedUntil: learningObjectives.snoozedUntil,
    lastWorkedOn: max(lessons.lessonDate),
  }).from(learningObjectives)
    .innerJoin(subjects, and(eq(subjects.id, learningObjectives.subjectId), eq(subjects.studentId, learningObjectives.studentId)))
    .leftJoin(lessonObjectives, and(eq(lessonObjectives.objectiveId, learningObjectives.id), eq(lessonObjectives.studentId, learningObjectives.studentId)))
    // Cancelled lessons did not happen, so they never count as having reviewed the goal.
    .leftJoin(lessons, and(eq(lessons.id, lessonObjectives.lessonId), eq(lessons.studentId, lessonObjectives.studentId), eq(lessons.status, "planned")))
    .where(eq(learningObjectives.studentId, studentId))
    .groupBy(learningObjectives.id, subjects.name).orderBy(asc(subjects.name), asc(learningObjectives.createdAt)).limit(500);
}

/** Recent lessons per subject, for linking an objective to the lesson where it was worked on. */
export async function listLinkableLessons(studentId: string, today: string) {
  return getDb().select({ id: lessons.id, subjectId: lessons.subjectId, date: lessons.lessonDate, startsAt: lessons.startsAt })
    .from(lessons).where(and(eq(lessons.studentId, studentId), eq(lessons.status, "planned"), lte(lessons.lessonDate, today)))
    .orderBy(desc(lessons.lessonDate)).limit(300);
}

export async function createObjective(studentId: string, subjectId: string, title: string) {
  const [subject] = await getDb().select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.studentId, studentId))).limit(1);
  if (!subject) return null;
  const [row] = await getDb().insert(learningObjectives).values({ studentId, subjectId, title }).returning({ id: learningObjectives.id });
  return row!.id;
}

export async function updateObjective(studentId: string, objectiveId: string, changes: { status?: ObjectiveStatus; snoozedUntil?: string | null }) {
  const rows = await getDb().update(learningObjectives).set({ ...changes, updatedAt: new Date() })
    .where(and(eq(learningObjectives.id, objectiveId), eq(learningObjectives.studentId, studentId))).returning({ id: learningObjectives.id });
  return rows.length > 0;
}

export async function deleteObjective(studentId: string, objectiveId: string) {
  const rows = await getDb().delete(learningObjectives)
    .where(and(eq(learningObjectives.id, objectiveId), eq(learningObjectives.studentId, studentId))).returning({ id: learningObjectives.id });
  return rows.length > 0;
}

/** Links only a past, not cancelled lesson of the same student and subject as the goal. */
export async function linkObjectiveToLesson(studentId: string, objectiveId: string, lessonId: string, today: string) {
  return getDb().transaction(async (tx) => {
    const [objective] = await tx.select({ subjectId: learningObjectives.subjectId }).from(learningObjectives)
      .where(and(eq(learningObjectives.id, objectiveId), eq(learningObjectives.studentId, studentId))).limit(1);
    const [lesson] = await tx.select({ subjectId: lessons.subjectId }).from(lessons)
      .where(and(eq(lessons.id, lessonId), eq(lessons.studentId, studentId), eq(lessons.status, "planned"), lte(lessons.lessonDate, today))).limit(1);
    if (!objective || !lesson || objective.subjectId !== lesson.subjectId) return false;
    await tx.insert(lessonObjectives).values({ lessonId, objectiveId, studentId }).onConflictDoNothing();
    await tx.update(learningObjectives).set({ updatedAt: new Date() }).where(eq(learningObjectives.id, objectiveId));
    return true;
  });
}

export const EXPORT_LIMIT = 50_000;

/** The student's own history for export; one extra row tells the caller the limit was exceeded. */
export async function listHistoryForExport(studentId: string) {
  return getDb().select({
    date: lessons.lessonDate, startsAt: lessons.startsAt, endsAt: lessons.endsAt, subject: subjects.name, status: lessons.status,
    attendance: lessons.attendance, plannedContent: lessons.plannedContent, studiedContent: lessons.studiedContent,
    nextStep: lessons.nextStep, privateNote: lessons.privateNote, cancellationReason: lessons.cancellationReason,
  }).from(lessons).innerJoin(subjects, and(eq(subjects.id, lessons.subjectId), eq(subjects.studentId, lessons.studentId)))
    .where(eq(lessons.studentId, studentId)).orderBy(asc(lessons.lessonDate), asc(lessons.startsAt)).limit(EXPORT_LIMIT + 1);
}
