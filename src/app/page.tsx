import { headers } from "next/headers";
import StudentDashboard, { type DashboardLesson } from "@/components/student-dashboard";
import { auth } from "@/lib/auth";
import { listLessonsForStudent } from "@/features/lessons/repository";
import { latestResolutions, listTeacherRecordsForStudent, resolutionKey } from "@/features/collaboration/repository";
import { toResolutionState } from "@/features/collaboration/resolution-view";
import { reportsDiffer } from "@/features/collaboration/divergence";

export const dynamic = "force-dynamic";

/** The pair shown on a lesson: the first link whose reports differ, else the latest agreed outcome. */
function lessonResolution(records: DashboardLesson["teacherRecords"], lookup: (linkId: string) => Parameters<typeof toResolutionState>[0], viewerId: string) {
  const divergentRecord = records.find((record) => record.divergent);
  if (divergentRecord) return { divergent: true, resolution: toResolutionState(lookup(divergentRecord.linkId), viewerId) };
  const agreed = records.map((record) => lookup(record.linkId)).find((row) => row?.status === "agreed");
  return { divergent: false, resolution: toResolutionState(agreed, viewerId) };
}

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <StudentDashboard key="demo" />;

  const [rows, teacherRecords] = await Promise.all([listLessonsForStudent(session.user.id), listTeacherRecordsForStudent(session.user.id)]);

  const byId = new Map(rows.map((row) => [row.id, row]));
  const resolutions = await latestResolutions([...new Set(teacherRecords.map((record) => record.lessonId))]);
  const recordsByLesson = new Map<string, DashboardLesson["teacherRecords"]>();
  const rowById = new Map(rows.map((row) => [row.id, row]));
  for (const record of teacherRecords) {
    const lesson = rowById.get(record.lessonId);
    // Only an active link can still resolve a difference; ended links keep their report as history.
    const divergent = record.linkStatus === "accepted" && !!lesson && reportsDiffer(lesson.attendance, record.attendance);
    recordsByLesson.set(record.lessonId, [...(recordsByLesson.get(record.lessonId) ?? []), { teacherName: record.teacherName, attendance: record.attendance, linkId: record.linkId, active: record.linkStatus === "accepted", divergent }]);
  }
  const replacedBy = new Map(rows.filter((row) => row.replacesLessonId).map((row) => [row.replacesLessonId!, { id: row.id, date: row.date }]));
  const initialLessons: DashboardLesson[] = rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    // Keep the calendar's civil date and local wall time intact across a UTC-hosted server.
    date: `${row.date}T${row.startsAt.slice(0, 5)}`,
    time: row.startsAt.slice(0, 5),
    endTime: row.endsAt.slice(0, 5),
    plannedContent: row.plannedContent ?? "",
    studiedContent: row.studiedContent,
    privateNote: row.privateNote,
    nextStep: row.nextStep,
    teacher: "Professor(a) a definir",
    status: row.status === "cancelled" ? "cancelled" : row.attendance === "attended" ? "attended" : row.attendance === "student_absent" ? "student-absent" : row.attendance === "teacher_absent" ? "teacher-absent" : "upcoming",
    isSeries: row.seriesId !== null,
    isException: row.isException,
    cancellationReason: row.cancellationReason,
    replaces: row.replacesLessonId && byId.has(row.replacesLessonId) ? { id: row.replacesLessonId, date: byId.get(row.replacesLessonId)!.date } : null,
    replacedBy: replacedBy.get(row.id) ?? null,
    teacherRecords: recordsByLesson.get(row.id) ?? [],
    ...lessonResolution(recordsByLesson.get(row.id) ?? [], (linkId) => resolutions.get(resolutionKey(row.id, linkId)), session.user.id),
  }));

  return <StudentDashboard key={session.user.id} initialLessons={initialLessons} persisted displayName={session.user.name} />;
}
