import "server-only";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { lessonAttachments, lessons } from "@/db/schema";

export async function listAttachmentsForStudent(studentId: string) {
  return getDb().select({ id: lessonAttachments.id, lessonId: lessonAttachments.lessonId, fileName: lessonAttachments.fileName, sizeBytes: lessonAttachments.sizeBytes })
    .from(lessonAttachments).where(eq(lessonAttachments.studentId, studentId)).orderBy(asc(lessonAttachments.createdAt)).limit(5000);
}

/** Records the file only for the student's own lesson and below the per-lesson cap. */
export async function insertAttachment(studentId: string, lessonId: string, file: { storageKey: string; fileName: string; contentType: string; sizeBytes: number }, maxPerLesson: number) {
  return getDb().transaction(async (tx) => {
    const [lesson] = await tx.select({ id: lessons.id }).from(lessons).where(and(eq(lessons.id, lessonId), eq(lessons.studentId, studentId))).limit(1).for("update");
    if (!lesson) return "not_found" as const;
    const [current] = await tx.select({ total: count() }).from(lessonAttachments).where(and(eq(lessonAttachments.lessonId, lessonId), eq(lessonAttachments.studentId, studentId)));
    if ((current?.total ?? 0) >= maxPerLesson) return "too_many" as const;
    const [row] = await tx.insert(lessonAttachments).values({ studentId, lessonId, ...file }).returning({ id: lessonAttachments.id });
    return { id: row!.id };
  });
}

export async function getOwnedAttachment(studentId: string, attachmentId: string) {
  const [row] = await getDb().select({ storageKey: lessonAttachments.storageKey, fileName: lessonAttachments.fileName, contentType: lessonAttachments.contentType })
    .from(lessonAttachments).where(and(eq(lessonAttachments.id, attachmentId), eq(lessonAttachments.studentId, studentId))).limit(1);
  return row ?? null;
}

export async function deleteOwnedAttachment(studentId: string, attachmentId: string) {
  const [row] = await getDb().delete(lessonAttachments).where(and(eq(lessonAttachments.id, attachmentId), eq(lessonAttachments.studentId, studentId)))
    .returning({ storageKey: lessonAttachments.storageKey });
  return row?.storageKey ?? null;
}

/** Storage keys of the files on these lessons, read before the lessons are deleted (rows cascade, bytes do not). */
export async function attachmentKeysForLessons(studentId: string, lessonIds: string[]) {
  if (lessonIds.length === 0) return [];
  const rows = await getDb().select({ storageKey: lessonAttachments.storageKey }).from(lessonAttachments)
    .where(and(eq(lessonAttachments.studentId, studentId), inArray(lessonAttachments.lessonId, lessonIds)));
  return rows.map((row) => row.storageKey);
}

/** Keys whose rows are gone (e.g. their lesson was deleted); the store can then drop the bytes. */
export async function existingAttachmentKeys(keys: string[]) {
  if (keys.length === 0) return new Set<string>();
  const rows = await getDb().select({ storageKey: lessonAttachments.storageKey }).from(lessonAttachments).where(inArray(lessonAttachments.storageKey, keys));
  return new Set(rows.map((row) => row.storageKey));
}
