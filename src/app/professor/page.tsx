import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TeacherArea } from "@/components/collaboration/teacher-area";
import { latestResolutions, listTeacherLessons, listTeacherLinks, resolutionKey } from "@/features/collaboration/repository";
import { toResolutionState } from "@/features/collaboration/resolution-view";
import { reportsDiffer } from "@/features/collaboration/divergence";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

function dayKey(offsetDays: number) {
  return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function TeacherPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");
  const [links, lessons] = await Promise.all([
    listTeacherLinks(session.user.id),
    // One extra day each side covers every time zone; the server clock is UTC.
    listTeacherLessons(session.user.id, dayKey(-31), dayKey(31)),
  ]);
  const resolutions = await latestResolutions(lessons.map((lesson) => lesson.id));
  return <TeacherArea
    links={links.map((link) => ({ id: link.id, status: link.status, expiresAt: link.expiresAt.toISOString(), studentName: link.studentName, subjects: link.subjects }))}
    lessons={lessons.map(({ linkId, ...lesson }) => ({
      ...lesson, divergent: reportsDiffer(lesson.studentAttendance, lesson.teacherAttendance),
      // Only proposals on this teacher's own link with the student.
      resolution: toResolutionState(resolutions.get(resolutionKey(lesson.id, linkId)), session.user.id),
    }))} />;
}
