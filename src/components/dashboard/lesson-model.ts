import type { ResolutionState } from "@/features/collaboration/resolution-view";
import type { Locale } from "@/lib/locales";

export type View = "overview" | "calendar" | "history" | "subjects";
export type Status = "upcoming" | "attended" | "student-absent" | "teacher-absent" | "cancelled";
export type DashboardLesson = {
  id: string; subject: string; date: Date | string; time: string; endTime: string;
  plannedContent: string; studiedContent: string | null; privateNote: string | null; nextStep: string | null; teacher: string; status: Status;
  isSeries: boolean; isException: boolean; cancellationReason: string | null;
  /** Make-up links by civil date (YYYY-MM-DD); the history keeps both lessons. */
  replaces: LessonLink | null; replacedBy: LessonLink | null;
  /** Each linked teacher’s own attendance report; never written by the student. */
  teacherRecords: TeacherRecord[];
  /** The reports disagree and an agreed outcome can be proposed; see features/collaboration/divergence. */
  divergent: boolean; resolution: ResolutionState;
  attachments: LessonAttachment[];
};
export type LessonAttachment = { id: string; fileName: string; sizeBytes: number };
export type TeacherRecord = { teacherName: string; attendance: "present" | "absent" | "excused"; linkId: string; active: boolean; divergent: boolean };
export type LessonLink = { id: string; date: string };
export type Lesson = Omit<DashboardLesson, "date"> & { date: Date };
export type AttendanceStatus = Exclude<Status, "cancelled">;

export const statusLabels: Record<Status, string> = {
  upcoming: "Agendada", attended: "Presença", "student-absent": "Faltei",
  "teacher-absent": "Relatei falta do professor", cancelled: "Cancelada",
};

export function dateAt(offset: number, time: string) {
  const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + offset);
  const [hours, minutes] = time.split(":").map(Number); date.setHours(hours ?? 9, minutes ?? 0); return date;
}

function demoLesson(id: string, subject: string, offset: number, time: string, endTime: string, plannedContent: string, teacher: string, status: Status): Lesson {
  return { id, subject, date: dateAt(offset, time), time, endTime, plannedContent, studiedContent: null, privateNote: null, nextStep: null, teacher, status, isSeries: false, isException: false, cancellationReason: null, replaces: null, replacedBy: null, teacherRecords: [], divergent: false, resolution: null, attachments: [] };
}

export function demoLessons(): Lesson[] {
  return [
    demoLesson("demo-1", "Inglês", -2, "10:00", "11:00", "Conversação: viagens", "Carolina Martins", "attended"),
    demoLesson("demo-2", "Matemática", -5, "14:30", "15:30", "Funções do 2º grau", "Rafael Costa", "teacher-absent"),
    demoLesson("demo-3", "Biologia", 1, "09:00", "10:00", "Ecossistemas", "Marina Alves", "upcoming"),
    demoLesson("demo-4", "Inglês", 2, "16:00", "17:00", "Simple past", "Carolina Martins", "upcoming"),
    demoLesson("demo-5", "Matemática", 4, "14:30", "15:30", "Geometria plana", "Rafael Costa", "upcoming"),
    demoLesson("demo-6", "Redação", 6, "11:00", "12:00", "Texto argumentativo", "Joana Lima", "upcoming"),
  ];
}

export function asLocalDate(value: Date | string) {
  if (value instanceof Date) return value;
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart!.split("-").map(Number); const [hours, minutes] = timePart.split(":").map(Number);
  return new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0);
}

export function fromDateKey(key: string, time: string) {
  return asLocalDate(`${key}T${time}`);
}

export function formatDate(date: Date | string, options: Intl.DateTimeFormatOptions, locale: Locale) {
  return new Intl.DateTimeFormat(locale, options).format(asLocalDate(date));
}

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** What the student studied wins over what was planned when showing a one-line summary. */
export function lessonSummary(lesson: Pick<Lesson, "studiedContent" | "plannedContent">) {
  return lesson.studiedContent || lesson.plannedContent;
}

export function toLessons(initial: DashboardLesson[]) {
  return initial.map((lesson) => ({ ...lesson, date: asLocalDate(lesson.date) }));
}
