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
    uniqueIndex("teacher_links_one_accepted_per_pair").on(table.teacherId, table.studentId).where(sql`${table.status} = 'accepted'`),
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

export const resolutionOutcome = pgEnum("resolution_outcome", ["held", "student_absent", "teacher_absent", "not_held"]);
export const resolutionStatus = pgEnum("resolution_status", ["proposed", "agreed", "declined"]);

/**
 * When the two reports differ, one participant proposes an agreed outcome and the other accepts or
 * declines. The original reports are never changed; the agreed outcome is shown beside them.
 */
export const lessonResolutions = pgTable(
  "lesson_resolutions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    linkId: uuid("link_id").notNull().references(() => teacherLinks.id),
    outcome: resolutionOutcome("outcome").notNull(),
    note: text("note"),
    status: resolutionStatus("status").notNull().default("proposed"),
    proposedBy: text("proposed_by").notNull().references(() => user.id),
    proposedAt: timestamp("proposed_at", { withTimezone: true }).notNull().defaultNow(),
    respondedBy: text("responded_by").references(() => user.id),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (table) => [
    index("lesson_resolutions_lesson_idx").on(table.lessonId, table.proposedAt),
    uniqueIndex("lesson_resolutions_one_open_per_pair").on(table.lessonId, table.linkId).where(sql`${table.status} = 'proposed'`),
    check("lesson_resolutions_responder_differs", sql`${table.respondedBy} IS NULL OR ${table.respondedBy} <> ${table.proposedBy}`),
  ],
);
