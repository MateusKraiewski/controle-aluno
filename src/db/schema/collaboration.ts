import { sql } from "drizzle-orm";
import { check, foreignKey, index, pgEnum, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { lessons, subjects } from "./index";

export const linkStatus = pgEnum("teacher_link_status", ["pending", "accepted", "revoked"]);
export const participantAttendance = pgEnum("participant_attendance", ["present", "absent", "excused"]);

/**
 * Teacher ↔ student link. The teacher creates an opaque, single-use code (only its SHA-256 is
 * stored); the student redeems it, chooses which subjects to share and accepts. Either side revokes.
 */
export const teacherLinks = pgTable(
  "teacher_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teacherId: text("teacher_id").notNull().references(() => user.id),
    studentId: text("student_id").references(() => user.id),
    status: linkStatus("status").notNull().default("pending"),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: text("revoked_by").references(() => user.id),
  },
  (table) => [
    uniqueIndex("teacher_links_token_hash_unique").on(table.tokenHash),
    index("teacher_links_teacher_idx").on(table.teacherId, table.status),
    index("teacher_links_student_idx").on(table.studentId, table.status),
    unique("teacher_links_id_student_unique").on(table.id, table.studentId),
    check("teacher_links_not_self", sql`${table.studentId} IS NULL OR ${table.studentId} <> ${table.teacherId}`),
    check("teacher_links_accepted_has_student", sql`${table.status} = 'pending' OR ${table.studentId} IS NOT NULL OR ${table.revokedAt} IS NOT NULL`),
  ],
);

/** Consented scope: the subjects of the student that this link may read. */
export const teacherLinkSubjects = pgTable(
  "teacher_link_subjects",
  {
    linkId: uuid("link_id").notNull(),
    studentId: text("student_id").notNull(),
    subjectId: uuid("subject_id").notNull(),
  },
  (table) => [
    primaryKey({ name: "teacher_link_subjects_pk", columns: [table.linkId, table.subjectId] }),
    foreignKey({ name: "teacher_link_subjects_link_fk", columns: [table.linkId, table.studentId], foreignColumns: [teacherLinks.id, teacherLinks.studentId] }).onDelete("cascade"),
    foreignKey({ name: "teacher_link_subjects_subject_fk", columns: [table.subjectId, table.studentId], foreignColumns: [subjects.id, subjects.studentId] }).onDelete("cascade"),
    index("teacher_link_subjects_subject_idx").on(table.subjectId),
  ],
);

/** A participant's own report about a lesson. Only the author writes it; nobody reports for someone else. */
export const participantRecords = pgTable(
  "participant_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull().references(() => user.id),
    linkId: uuid("link_id").notNull().references(() => teacherLinks.id),
    attendance: participantAttendance("attendance").notNull(),
    note: text("note"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("participant_records_lesson_author_unique").on(table.lessonId, table.authorId),
    index("participant_records_author_idx").on(table.authorId),
    index("participant_records_link_idx").on(table.linkId),
  ],
);

/** Sensitive link events without school content: actor, action, link and time. */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id").notNull().references(() => user.id),
    action: text("action").notNull(),
    linkId: uuid("link_id").references(() => teacherLinks.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_events_link_idx").on(table.linkId, table.createdAt), index("audit_events_actor_idx").on(table.actorId)],
);
