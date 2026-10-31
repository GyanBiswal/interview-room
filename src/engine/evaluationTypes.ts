export interface ConceptResult {
  id: string;
  label: string;
  covered: boolean;
  // The phrase or pattern that matched, so the score can be explained.
  matched: string | null;
}

export type CreditLevel = "full" | "partial" | "none";

export interface CriterionResult {
  id: string;
  description: string;
  maxPoints: number;
  awardedPoints: number;
  credit: number; // 0..1
  level: CreditLevel;
  concepts: ConceptResult[];
  // What the question bank expects for full credit.
  expected: string;
}

export interface EvaluationResult {
  questionId: string;
  followUpId: string | null;
  maxPoints: number;
  awardedPoints: number;
  score10: number; // normalized to 10, one decimal
  coverage: number; // awardedPoints / maxPoints
  answerEmpty: boolean;
  wordCount: number;
  criteria: CriterionResult[];
  coveredConceptIds: string[]; // includes signal concepts
  missedConceptIds: string[]; // includes signal concepts
  missedConcepts: { id: string; label: string }[]; // for revision (rubric concepts only)
  summary: string;
  warnings: string[];
  reliability: "ok" | "low";
}
