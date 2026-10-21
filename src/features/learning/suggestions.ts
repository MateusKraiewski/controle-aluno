export type ObjectiveForReview = {
  id: string; title: string; subject: string; status: "open" | "practising" | "done";
  createdOn: string; lastWorkedOn: string | null; snoozedUntil: string | null;
};
export type ReviewSuggestion = { objectiveId: string; title: string; subject: string; weeks: number; since: string; basis: "last_lesson" | "created" };

export const REVIEW_AFTER_DAYS = 21;

function daysBetween(from: string, to: string) {
  return Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * Explainable nudges only: "N weeks without reviewing X", with the date it is based on.
 * Never a grade, score or guess about performance; finished or snoozed objectives stay quiet.
 */
export function reviewSuggestions(objectives: ObjectiveForReview[], today: string): ReviewSuggestion[] {
  return objectives
    .filter((objective) => objective.status !== "done" && !(objective.snoozedUntil && objective.snoozedUntil > today))
    .map((objective) => {
      const since = objective.lastWorkedOn ?? objective.createdOn;
      return { objective, since, days: daysBetween(since, today) };
    })
    .filter(({ days }) => days >= REVIEW_AFTER_DAYS)
    .toSorted((a, b) => b.days - a.days)
    .map(({ objective, since, days }) => ({
      objectiveId: objective.id, title: objective.title, subject: objective.subject, weeks: Math.floor(days / 7), since,
      basis: objective.lastWorkedOn ? "last_lesson" as const : "created" as const,
    }));
}
