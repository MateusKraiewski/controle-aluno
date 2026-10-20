import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { StudentLinks } from "@/components/collaboration/student-links";
import { listOwnSubjects, listStudentLinks } from "@/features/collaboration/repository";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudentLinksPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");
  const [links, subjects] = await Promise.all([listStudentLinks(session.user.id), listOwnSubjects(session.user.id)]);
  return <StudentLinks links={links.map((link) => ({ id: link.id, teacherName: link.teacherName, subjects: link.subjects }))} subjects={subjects} />;
}
