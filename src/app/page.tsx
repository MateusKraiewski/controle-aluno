import { headers } from "next/headers";
import StudentDashboard, { type DashboardLesson } from "@/components/student-dashboard";
import { auth } from "@/lib/auth";
import { listLessonsForStudent } from "@/features/lessons/repository";
import { listTeacherRecordsForStudent } from "@/features/collaboration/repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <StudentDashboard key="demo" />;

  const [rows, teacherRecords] = await Promise.all([listLessonsForStudent(session.user.id), listTeacherRecordsForStudent(session.user.id)]);

  const byId = new Map(rows.map((row) => [row.id, row]));
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
    teacher: "Professor(a) a definir",
    status: row.status === "cancelled" ? "cancelled" : row.attendance === "attended" ? "attended" : row.attendance === "student_absent" ? "student-absent" : row.attendance === "teacher_absent" ? "teacher-absent" : "upcoming",
    isSeries: row.seriesId !== null,
    isException: row.isException,
    cancellationReason: row.cancellationReason,
    replaces: row.replacesLessonId && byId.has(row.replacesLessonId) ? { id: row.replacesLessonId, date: byId.get(row.replacesLessonId)!.date } : null,
    replacedBy: replacedBy.get(row.id) ?? null,
    teacherRecords: teacherRecords.filter((record) => record.lessonId === row.id).map((record) => ({ teacherName: record.teacherName, attendance: record.attendance })),
  }));

  return <StudentDashboard key={session.user.id} initialLessons={initialLessons} persisted displayName={session.user.name} />;
}
