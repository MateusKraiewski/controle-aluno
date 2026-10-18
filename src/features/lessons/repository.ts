import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { lessonSeries, lessons, subjects } from "@/db/schema";

export async function listLessonsForStudent(studentId: string) {
  return getDb().select({
    id: lessons.id, subject: subjects.name, date: lessons.lessonDate, startsAt: lessons.startsAt,
    plannedContent: lessons.plannedContent, studiedContent: lessons.studiedContent,
    attendance: lessons.attendance, attendanceNote: lessons.attendanceNote,
  }).from(lessons).innerJoin(subjects, and(eq(lessons.subjectId, subjects.id), eq(lessons.studentId, subjects.studentId)))
    .where(eq(lessons.studentId, studentId)).orderBy(asc(lessons.lessonDate), asc(lessons.startsAt));
}

export async function insertLesson(studentId: string, lesson: { subject: string; topic: string; date: string; startsAt: string; endsAt: string }) {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.insert(subjects).values({ studentId, name: lesson.subject }).onConflictDoNothing();
    const [subject] = await tx.select({ id: subjects.id }).from(subjects)
      .where(and(eq(subjects.studentId, studentId), eq(subjects.name, lesson.subject))).limit(1);
    if (!subject) throw new Error("subject_not_found");
    const [created] = await tx.insert(lessons).values({
      studentId, subjectId: subject.id, lessonDate: lesson.date,
      startsAt: `${lesson.startsAt}:00`, endsAt: `${lesson.endsAt}:00`, plannedContent: lesson.topic,
    }).returning({ id: lessons.id });
    return created!.id;
  });
}

export async function insertWeeklySeries(studentId: string, input: {
  subject: string; topic: string; startDate: string; endDate: string; startsAt: string; endsAt: string;
  timeZone: string; weekdays: number[]; intervalWeeks: number; dates: string[];
}) {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.insert(subjects).values({ studentId, name: input.subject }).onConflictDoNothing();
    const [subject] = await tx.select({ id: subjects.id }).from(subjects)
      .where(and(eq(subjects.studentId, studentId), eq(subjects.name, input.subject))).limit(1);
    if (!subject) throw new Error("subject_not_found");
    const [series] = await tx.insert(lessonSeries).values({
      studentId, subjectId: subject.id, startsOn: input.startDate, endsOn: input.endDate,
      startsAt: `${input.startsAt}:00`, endsAt: `${input.endsAt}:00`, timeZone: input.timeZone,
      weekdays: input.weekdays, intervalWeeks: input.intervalWeeks, plannedContent: input.topic,
    }).returning({ id: lessonSeries.id });
    const occurrences = await tx.insert(lessons).values(input.dates.map((lessonDate) => ({
      studentId, subjectId: subject.id, seriesId: series!.id, lessonDate,
      startsAt: `${input.startsAt}:00`, endsAt: `${input.endsAt}:00`, plannedContent: input.topic,
    }))).returning({ id: lessons.id, date: lessons.lessonDate });
    return occurrences.map((occurrence) => ({ id: occurrence.id, date: occurrence.date, time: input.startsAt }));
  });
}

export async function setLessonAttendance(studentId: string, lessonId: string, attendance: "unrecorded" | "attended" | "student_absent" | "teacher_absent", note: string | null) {
  const now = new Date();
  await getDb().update(lessons).set({
    attendance, attendanceNote: note,
    attendanceRecordedBy: attendance === "unrecorded" ? null : studentId,
    attendanceRecordedAt: attendance === "unrecorded" ? null : now,
    updatedAt: now,
  })
    .where(and(eq(lessons.id, lessonId), eq(lessons.studentId, studentId)));
}

export async function setStudiedContent(studentId: string, lessonId: string, studiedContent: string | null) {
  await getDb().update(lessons).set({ studiedContent, updatedAt: new Date() })
    .where(and(eq(lessons.id, lessonId), eq(lessons.studentId, studentId)));
}
