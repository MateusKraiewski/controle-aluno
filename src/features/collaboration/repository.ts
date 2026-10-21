import "server-only";
import { and, asc, eq, gt, gte, inArray, lte, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { lessons, subjects, user } from "@/db/schema";
import { auditEvents, lessonResolutions, participantRecords, teacherLinks, teacherLinkSubjects } from "@/db/schema/collaboration";
import { reportsDiffer } from "./divergence";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

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
    // One accepted link per teacher and student: a second code only widens the existing scope.
    const [existing] = await tx.select({ id: teacherLinks.id }).from(teacherLinks)
      .where(and(eq(teacherLinks.teacherId, link.teacherId), eq(teacherLinks.studentId, studentId), eq(teacherLinks.status, "accepted"))).limit(1).for("update");
    if (existing) {
      await tx.update(teacherLinks).set({ status: "revoked", studentId, revokedAt: new Date(), revokedBy: studentId }).where(eq(teacherLinks.id, link.id));
      await tx.insert(teacherLinkSubjects).values(subjectIds.map((subjectId) => ({ linkId: existing.id, studentId, subjectId }))).onConflictDoNothing();
      await tx.insert(auditEvents).values({ actorId: studentId, action: "invite_merged", linkId: existing.id });
      return existing.id;
    }
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
    teacherAttendance: participantRecords.attendance,
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
  return getDb().select({ lessonId: participantRecords.lessonId, linkId: participantRecords.linkId, teacherName: teacherUser.name, attendance: participantRecords.attendance, linkStatus: teacherLinks.status })
    .from(participantRecords).innerJoin(lessons, eq(lessons.id, participantRecords.lessonId)).innerJoin(teacherUser, eq(teacherUser.id, participantRecords.authorId))
    .innerJoin(teacherLinks, eq(teacherLinks.id, participantRecords.linkId))
    .where(eq(lessons.studentId, studentId)).orderBy(asc(lessons.lessonDate)).limit(2000);
}

export async function listOwnSubjects(studentId: string) {
  return getDb().select({ id: subjects.id, name: subjects.name }).from(subjects).where(eq(subjects.studentId, studentId)).orderBy(asc(subjects.name)).limit(200);
}

export type ResolutionOutcome = "held" | "student_absent" | "teacher_absent" | "not_held";

/** Every accepted link through which the actor takes part in the lesson, with both reports, in a stable order. */
async function participations(tx: Tx, actorId: string, lessonId: string) {
  return tx.select({
    linkId: teacherLinks.id, teacherId: teacherLinks.teacherId, studentId: lessons.studentId,
    studentAttendance: lessons.attendance, teacherAttendance: participantRecords.attendance,
  }).from(lessons)
    .innerJoin(teacherLinkSubjects, and(eq(teacherLinkSubjects.subjectId, lessons.subjectId), eq(teacherLinkSubjects.studentId, lessons.studentId)))
    .innerJoin(teacherLinks, and(eq(teacherLinks.id, teacherLinkSubjects.linkId), eq(teacherLinks.studentId, lessons.studentId), eq(teacherLinks.status, "accepted")))
    .innerJoin(participantRecords, and(eq(participantRecords.lessonId, lessons.id), eq(participantRecords.authorId, teacherLinks.teacherId)))
    .where(and(eq(lessons.id, lessonId), or(eq(lessons.studentId, actorId), eq(teacherLinks.teacherId, actorId))))
    .orderBy(asc(teacherLinks.id));
}

/**
 * A proposal belongs to one student–teacher pair (one link): the teacher proposes on their own link,
 * the student on the first link whose report differs from theirs. Reports stay untouched.
 */
export async function proposeResolution(actorId: string, lessonId: string, outcome: ResolutionOutcome) {
  return getDb().transaction(async (tx) => {
    const rows = await participations(tx, actorId, lessonId);
    if (rows.length === 0) return "not_found" as const;
    const pair = rows.find((row) => (row.teacherId === actorId || row.studentId === actorId) && reportsDiffer(row.studentAttendance, row.teacherAttendance));
    if (!pair) return "no_divergence" as const;
    const [agreed] = await tx.select({ id: lessonResolutions.id }).from(lessonResolutions)
      .where(and(eq(lessonResolutions.lessonId, lessonId), eq(lessonResolutions.linkId, pair.linkId), eq(lessonResolutions.status, "agreed"))).limit(1);
    if (agreed) return "already_agreed" as const;
    const inserted = await tx.insert(lessonResolutions).values({ lessonId, linkId: pair.linkId, outcome, proposedBy: actorId })
      .onConflictDoNothing().returning({ id: lessonResolutions.id });
    return inserted.length ? "proposed" as const : "already_open" as const;
  });
}

/** Only the other side of the same link answers, while the link is accepted and the reports still differ. */
export async function respondResolution(actorId: string, resolutionId: string, accept: boolean) {
  return getDb().transaction(async (tx) => {
    const [proposal] = await tx.select({ lessonId: lessonResolutions.lessonId, linkId: lessonResolutions.linkId, proposedBy: lessonResolutions.proposedBy })
      .from(lessonResolutions).where(and(eq(lessonResolutions.id, resolutionId), eq(lessonResolutions.status, "proposed"))).limit(1).for("update");
    if (!proposal || proposal.proposedBy === actorId) return "not_found" as const;
    const pair = (await participations(tx, actorId, proposal.lessonId)).find((row) => row.linkId === proposal.linkId);
    if (!pair || (pair.studentId !== actorId && pair.teacherId !== actorId)) return "not_found" as const;
    if (accept && !reportsDiffer(pair.studentAttendance, pair.teacherAttendance)) return "no_divergence" as const;
    await tx.update(lessonResolutions).set({ status: accept ? "agreed" : "declined", respondedBy: actorId, respondedAt: new Date() })
      .where(eq(lessonResolutions.id, resolutionId));
    return "saved" as const;
  });
}

/** Latest proposal per lesson and link; callers pick the link they are part of. */
export async function latestResolutions(lessonIds: string[]) {
  if (lessonIds.length === 0) return new Map<string, ResolutionView>();
  const rows = await getDb().select({
    id: lessonResolutions.id, lessonId: lessonResolutions.lessonId, linkId: lessonResolutions.linkId, outcome: lessonResolutions.outcome,
    status: lessonResolutions.status, proposedBy: lessonResolutions.proposedBy,
  }).from(lessonResolutions).where(inArray(lessonResolutions.lessonId, lessonIds)).orderBy(asc(lessonResolutions.proposedAt));
  return new Map(rows.map((row) => [resolutionKey(row.lessonId, row.linkId), row]));
}
export const resolutionKey = (lessonId: string, linkId: string) => `${lessonId}:${linkId}`;
export type ResolutionView = { id: string; lessonId: string; linkId: string; outcome: ResolutionOutcome; status: "proposed" | "agreed" | "declined"; proposedBy: string };
