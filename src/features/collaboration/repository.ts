import "server-only";
import { and, asc, eq, gt, gte, inArray, lte, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { lessons, subjects, user } from "@/db/schema";
import { auditEvents, participantRecords, teacherLinks, teacherLinkSubjects } from "@/db/schema/collaboration";

export type ParticipantAttendance = "present" | "absent" | "excused";
const teacherUser = alias(user, "teacher_user");
const studentUser = alias(user, "student_user");

export async function createInvite(teacherId: string, tokenHash: string, expiresAt: Date) {
  return getDb().transaction(async (tx) => {
    const [link] = await tx.insert(teacherLinks).values({ teacherId, tokenHash, expiresAt }).returning({ id: teacherLinks.id });
    await tx.insert(auditEvents).values({ actorId: teacherId, action: "invite_created", linkId: link!.id });
    return link!.id;
  });
}

/** Pending invites (never their codes) and accepted links of a teacher, with what each student shared. */
export async function listTeacherLinks(teacherId: string) {
  const db = getDb();
  const links = await db.select({ id: teacherLinks.id, status: teacherLinks.status, expiresAt: teacherLinks.expiresAt, createdAt: teacherLinks.createdAt, acceptedAt: teacherLinks.acceptedAt, studentName: studentUser.name })
    .from(teacherLinks).leftJoin(studentUser, eq(teacherLinks.studentId, studentUser.id))
    .where(and(eq(teacherLinks.teacherId, teacherId), or(eq(teacherLinks.status, "accepted"), and(eq(teacherLinks.status, "pending"), gt(teacherLinks.expiresAt, new Date())))))
    .orderBy(asc(teacherLinks.createdAt)).limit(200);
  return attachSubjects(links);
}

async function attachSubjects<T extends { id: string }>(links: T[]) {
  if (links.length === 0) return [];
  const rows = await getDb().select({ linkId: teacherLinkSubjects.linkId, name: subjects.name })
    .from(teacherLinkSubjects).innerJoin(subjects, and(eq(teacherLinkSubjects.subjectId, subjects.id), eq(teacherLinkSubjects.studentId, subjects.studentId)))
    .where(inArray(teacherLinkSubjects.linkId, links.map((link) => link.id))).orderBy(asc(subjects.name));
  return links.map((link) => ({ ...link, subjects: rows.filter((row) => row.linkId === link.id).map((row) => row.name) }));
}

export async function listStudentLinks(studentId: string) {
  const links = await getDb().select({ id: teacherLinks.id, teacherName: teacherUser.name, acceptedAt: teacherLinks.acceptedAt })
    .from(teacherLinks).innerJoin(teacherUser, eq(teacherLinks.teacherId, teacherUser.id))
    .where(and(eq(teacherLinks.studentId, studentId), eq(teacherLinks.status, "accepted"))).orderBy(asc(teacherLinks.acceptedAt)).limit(100);
  return attachSubjects(links);
}

export async function previewInvite(studentId: string, tokenHash: string) {
  const [link] = await getDb().select({ id: teacherLinks.id, teacherId: teacherLinks.teacherId, teacherName: teacherUser.name })
    .from(teacherLinks).innerJoin(teacherUser, eq(teacherLinks.teacherId, teacherUser.id))
    .where(and(eq(teacherLinks.tokenHash, tokenHash), eq(teacherLinks.status, "pending"), gt(teacherLinks.expiresAt, new Date()))).limit(1);
  if (!link || link.teacherId === studentId) return null;
  return { teacherName: link.teacherName };
}

export async function acceptInvite(studentId: string, tokenHash: string, subjectIds: string[]) {
  return getDb().transaction(async (tx) => {
    const [link] = await tx.select({ id: teacherLinks.id, teacherId: teacherLinks.teacherId }).from(teacherLinks)
      .where(and(eq(teacherLinks.tokenHash, tokenHash), eq(teacherLinks.status, "pending"), gt(teacherLinks.expiresAt, new Date()))).limit(1).for("update");
    if (!link || link.teacherId === studentId) return null;
    const owned = await tx.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.studentId, studentId), inArray(subjects.id, subjectIds)));
    if (owned.length !== subjectIds.length) return null;
    await tx.update(teacherLinks).set({ status: "accepted", studentId, acceptedAt: new Date() }).where(eq(teacherLinks.id, link.id));
    await tx.insert(teacherLinkSubjects).values(subjectIds.map((subjectId) => ({ linkId: link.id, studentId, subjectId })));
    await tx.insert(auditEvents).values({ actorId: studentId, action: "invite_accepted", linkId: link.id });
    return link.id;
  });
}

/** Either participant may revoke; the teacher loses access in the same transaction. */
export async function revokeLink(actorId: string, linkId: string) {
  return getDb().transaction(async (tx) => {
    const rows = await tx.update(teacherLinks).set({ status: "revoked", revokedAt: new Date(), revokedBy: actorId })
      .where(and(eq(teacherLinks.id, linkId), inArray(teacherLinks.status, ["pending", "accepted"]), or(eq(teacherLinks.teacherId, actorId), eq(teacherLinks.studentId, actorId))))
      .returning({ id: teacherLinks.id });
    if (rows.length === 0) return false;
    await tx.insert(auditEvents).values({ actorId, action: "link_revoked", linkId });
    return true;
  });
}

/** The only path from a teacher to a student's lessons: accepted link + subject in the consented scope. */
function teacherScope(teacherId: string) {
  return and(eq(teacherLinks.teacherId, teacherId), eq(teacherLinks.status, "accepted"));
}

export async function listTeacherLessons(teacherId: string, from: string, to: string) {
  return getDb().select({
    id: lessons.id, linkId: teacherLinks.id, studentName: studentUser.name, subject: subjects.name, date: lessons.lessonDate,
    startsAt: lessons.startsAt, endsAt: lessons.endsAt, plannedContent: lessons.plannedContent, status: lessons.status,
    cancellationReason: lessons.cancellationReason, studentAttendance: lessons.attendance,
    teacherAttendance: participantRecords.attendance, teacherNote: participantRecords.note,
  }).from(lessons)
    .innerJoin(teacherLinkSubjects, and(eq(teacherLinkSubjects.subjectId, lessons.subjectId), eq(teacherLinkSubjects.studentId, lessons.studentId)))
    .innerJoin(teacherLinks, and(eq(teacherLinks.id, teacherLinkSubjects.linkId), eq(teacherLinks.studentId, lessons.studentId)))
    .innerJoin(subjects, and(eq(subjects.id, lessons.subjectId), eq(subjects.studentId, lessons.studentId)))
    .innerJoin(studentUser, eq(studentUser.id, lessons.studentId))
    .leftJoin(participantRecords, and(eq(participantRecords.lessonId, lessons.id), eq(participantRecords.authorId, teacherId)))
    .where(and(teacherScope(teacherId), gte(lessons.lessonDate, from), lte(lessons.lessonDate, to)))
    .orderBy(asc(lessons.lessonDate), asc(lessons.startsAt)).limit(300);
}

/** Records (or clears, with null) the teacher's own attendance for a lesson they can see. */
export async function setTeacherAttendance(teacherId: string, lessonId: string, attendance: ParticipantAttendance | null, note: string | null) {
  return getDb().transaction(async (tx) => {
    const [visible] = await tx.select({ linkId: teacherLinks.id, status: lessons.status }).from(lessons)
      .innerJoin(teacherLinkSubjects, and(eq(teacherLinkSubjects.subjectId, lessons.subjectId), eq(teacherLinkSubjects.studentId, lessons.studentId)))
      .innerJoin(teacherLinks, and(eq(teacherLinks.id, teacherLinkSubjects.linkId), eq(teacherLinks.studentId, lessons.studentId)))
      .where(and(eq(lessons.id, lessonId), teacherScope(teacherId))).limit(1);
    if (!visible) return "not_found" as const;
    if (visible.status === "cancelled") return "cancelled" as const;
    if (attendance === null) {
      await tx.delete(participantRecords).where(and(eq(participantRecords.lessonId, lessonId), eq(participantRecords.authorId, teacherId)));
      return "saved" as const;
    }
    await tx.insert(participantRecords).values({ lessonId, authorId: teacherId, linkId: visible.linkId, attendance, note })
      .onConflictDoUpdate({ target: [participantRecords.lessonId, participantRecords.authorId], set: { attendance, note, linkId: visible.linkId, recordedAt: new Date() } });
    return "saved" as const;
  });
}

/** Teacher reports about the student's own lessons, shown beside the student's record. */
export async function listTeacherRecordsForStudent(studentId: string) {
  return getDb().select({ lessonId: participantRecords.lessonId, teacherName: teacherUser.name, attendance: participantRecords.attendance, note: participantRecords.note, recordedAt: participantRecords.recordedAt })
    .from(participantRecords).innerJoin(lessons, eq(lessons.id, participantRecords.lessonId)).innerJoin(teacherUser, eq(teacherUser.id, participantRecords.authorId))
    .where(eq(lessons.studentId, studentId)).limit(2000);
}

export async function listOwnSubjects(studentId: string) {
  return getDb().select({ id: subjects.id, name: subjects.name }).from(subjects).where(eq(subjects.studentId, studentId)).orderBy(asc(subjects.name)).limit(200);
}
