import { describe, expect, it } from "vitest";
import { reviewSuggestions, type ObjectiveForReview } from "../suggestions";

const base: ObjectiveForReview = { id: "1", title: "Frações", subject: "Matemática", status: "open", createdOn: "2026-09-01", lastWorkedOn: null, snoozedUntil: null };

describe("review suggestions", () => {
  it("nudge after three weeks, explaining the date they are based on", () => {
    expect(reviewSuggestions([{ ...base, lastWorkedOn: "2026-09-29" }], "2026-10-20")).toEqual([
      { objectiveId: "1", title: "Frações", subject: "Matemática", weeks: 3, since: "2026-09-29", basis: "last_lesson" },
    ]);
    expect(reviewSuggestions([{ ...base, lastWorkedOn: "2026-09-30" }], "2026-10-20")).toEqual([]);
  });

  it("fall back to the creation date when no lesson worked on the objective", () => {
    expect(reviewSuggestions([base], "2026-10-20")[0]).toMatchObject({ basis: "created", since: "2026-09-01", weeks: 7 });
  });

  it("stay quiet for finished or snoozed objectives and order the oldest first", () => {
    const list = [
      { ...base, id: "done", status: "done" as const },
      { ...base, id: "snoozed", snoozedUntil: "2026-10-25" },
      { ...base, id: "recent", lastWorkedOn: "2026-09-25" },
      { ...base, id: "old", lastWorkedOn: "2026-08-01" },
    ];
    expect(reviewSuggestions(list, "2026-10-20").map((item) => item.objectiveId)).toEqual(["old", "recent"]);
    expect(reviewSuggestions([{ ...base, snoozedUntil: "2026-10-20" }], "2026-10-20")).toHaveLength(1);
  });
});
