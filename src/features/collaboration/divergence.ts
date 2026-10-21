export type StudentReport = "unrecorded" | "attended" | "student_absent" | "teacher_absent";
export type TeacherReport = "present" | "absent" | "excused" | null;

/**
 * The two reports disagree about the teacher's presence: the student says the teacher was absent
 * while the teacher reports being present, or the student attended while the teacher reports absence.
 */
export function reportsDiffer(student: StudentReport, teacher: TeacherReport) {
  return (student === "teacher_absent" && teacher === "present") || (student === "attended" && (teacher === "absent" || teacher === "excused"));
}
