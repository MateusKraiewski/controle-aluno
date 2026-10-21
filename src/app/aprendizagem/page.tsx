import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LearningArea } from "@/components/learning-area";
import { listOwnSubjects } from "@/features/collaboration/repository";
import { listLinkableLessons, listObjectives } from "@/features/learning/repository";
import { reviewSuggestions } from "@/features/learning/suggestions";
import { getProfileTimeZone } from "@/features/profile/repository";
import { civilToday } from "@/features/profile/time-zone";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");
  const studentId = session.user.id;
  const [objectives, subjects, lessons, timeZone] = await Promise.all([
    listObjectives(studentId), listOwnSubjects(studentId), listLinkableLessons(studentId), getProfileTimeZone(studentId),
  ]);
  const today = civilToday(timeZone);
  const views = objectives.map((objective) => ({
    id: objective.id, title: objective.title, status: objective.status, subjectId: objective.subjectId, subject: objective.subject,
    createdOn: civilToday(timeZone, objective.createdAt), lastWorkedOn: objective.lastWorkedOn, snoozedUntil: objective.snoozedUntil,
  }));
  return <LearningArea objectives={views} subjects={subjects} suggestions={reviewSuggestions(views, today)}
    lessons={lessons.filter((lesson) => lesson.date <= today).map((lesson) => ({ id: lesson.id, subjectId: lesson.subjectId, date: lesson.date, time: lesson.startsAt.slice(0, 5) }))} />;
}
