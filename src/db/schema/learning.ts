import { date, foreignKey, index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { lessons, subjects } from "./index";

export const objectiveStatus = pgEnum("objective_status", ["open", "practising", "done"]);

/** A topic or skill the student wants to track inside one of their subjects. No scores, no inference. */
export const learningObjectives = pgTable(
  "learning_objectives",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: text("student_id").notNull().references(() => user.id),
    subjectId: uuid("subject_id").notNull(),
    title: text("title").notNull(),
    status: objectiveStatus("status").notNull().default("open"),
    // A dismissed review suggestion stays quiet until this date.
    snoozedUntil: date("snoozed_until"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name: "learning_objectives_subject_fk", columns: [table.subjectId, table.studentId], foreignColumns: [subjects.id, subjects.studentId] }).onDelete("cascade"),
    index("learning_objectives_student_idx").on(table.studentId, table.status),
    index("learning_objectives_subject_idx").on(table.subjectId),
  ],
);

/** Which lessons worked on an objective; both rows must belong to the same student. */
export const lessonObjectives = pgTable(
  "lesson_objectives",
  {
    lessonId: uuid("lesson_id").notNull(),
    objectiveId: uuid("objective_id").notNull().references(() => learningObjectives.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull(),
  },
  (table) => [
    primaryKey({ name: "lesson_objectives_pk", columns: [table.lessonId, table.objectiveId] }),
    foreignKey({ name: "lesson_objectives_lesson_fk", columns: [table.lessonId, table.studentId], foreignColumns: [lessons.id, lessons.studentId] }).onDelete("cascade"),
    index("lesson_objectives_objective_idx").on(table.objectiveId),
  ],
);
