import type { ResolutionView } from "./repository";

export type ResolutionState = { id: string; outcome: ResolutionView["outcome"]; status: ResolutionView["status"]; mine: boolean } | null;

/** What a participant sees of a proposal on their own link. */
export function toResolutionState(row: ResolutionView | undefined, viewerId: string): ResolutionState {
  return row ? { id: row.id, outcome: row.outcome, status: row.status, mine: row.proposedBy === viewerId } : null;
}
