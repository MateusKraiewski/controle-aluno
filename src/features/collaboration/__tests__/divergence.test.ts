import { describe, expect, it } from "vitest";
import { reportsDiffer } from "../divergence";

describe("reportsDiffer", () => {
  it("flags only contradicting reports about the same lesson", () => {
    expect(reportsDiffer("teacher_absent", "present")).toBe(true);
    expect(reportsDiffer("attended", "absent")).toBe(true);
    expect(reportsDiffer("attended", "excused")).toBe(true);
    expect(reportsDiffer("attended", "present")).toBe(false);
    expect(reportsDiffer("teacher_absent", "absent")).toBe(false);
    expect(reportsDiffer("student_absent", "present")).toBe(false);
    expect(reportsDiffer("unrecorded", "present")).toBe(false);
    expect(reportsDiffer("teacher_absent", null)).toBe(false);
  });
});
