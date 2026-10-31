// Types for the companion "match rules" file that sits next to a question bank.
// It maps each rubric criterion (by id) to concepts the evaluator looks for.

export interface MatchConcept {
  id: string;
  label: string;
  // Phrases matched on normalized text. A trailing * means "word starts with".
  terms?: string[];
  // Regular expressions tested on normalized text (lowercase letters, digits, spaces).
  patterns?: string[];
}

export interface CriterionMatch {
  // How many concepts give full credit. Default: all concepts.
  needed?: number;
  concepts: MatchConcept[];
}

export type FollowUpCondition =
  | { kind: "coverageBelow"; value: number } // 0..1
  | { kind: "coverageAtLeast"; value: number } // 0..1
  | { kind: "conceptMissed"; conceptId: string }
  | { kind: "conceptCovered"; conceptId: string }
  | { kind: "answerEmpty" };

export const CONDITION_KINDS = [
  "coverageBelow",
  "coverageAtLeast",
  "conceptMissed",
  "conceptCovered",
  "answerEmpty",
] as const;

export interface FollowUpMatch {
  criteria: Record<string, CriterionMatch>;
  // Ask only if ALL of these hold. Missing = no extra requirement.
  ask_when?: FollowUpCondition[];
  // Skip if ANY of these holds.
  skip_when?: FollowUpCondition[];
}

export interface QuestionMatch {
  criteria: Record<string, CriterionMatch>;
  // Concepts that earn no points but feed follow-up decisions.
  signal_concepts?: MatchConcept[];
  follow_ups?: Record<string, FollowUpMatch>;
}

export interface MatchBank {
  schema_version: string;
  bank_id: string;
  questions: Record<string, QuestionMatch>;
}
