import {
  date,
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
export * from "./auth";

export const attendanceStatus = pgEnum("attendance_status", [
  "unrecorded",
  "attended",
  "student_absent",
  "teacher_absent",
]);

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: text("student_id").notNull().references(() => user.id),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("subjects_id_student_id_unique").on(table.id, table.studentId),
    index("subjects_student_name_idx").on(table.studentId, table.name),
  ],
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: text("student_id").notNull().references(() => user.id),
    subjectId: uuid("subject_id").notNull(),
    lessonDate: date("lesson_date").notNull(),
    startsAt: time("starts_at").notNull(),
    endsAt: time("ends_at").notNull(),
    plannedContent: text("planned_content"),
    studiedContent: text("studied_content"),
    attendance: attendanceStatus("attendance").notNull().default("unrecorded"),
    attendanceNote: text("attendance_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("lessons_id_student_id_unique").on(table.id, table.studentId),
    check("lessons_end_after_start", sql`${table.endsAt} > ${table.startsAt}`),
    index("lessons_student_date_idx").on(table.studentId, table.lessonDate),
    index("lessons_subject_student_idx").on(table.subjectId, table.studentId),
    foreignKey({
      name: "lessons_subject_student_fk",
      columns: [table.subjectId, table.studentId],
      foreignColumns: [subjects.id, subjects.studentId],
    }),
  ],
);
