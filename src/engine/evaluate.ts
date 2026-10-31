import type { AnswerSignals } from "./followUps";
import type {
  ConceptResult,
  CreditLevel,
  CriterionResult,
  EvaluationResult,
} from "./evaluationTypes";
import type { CriterionMatch, MatchBank, MatchConcept } from "./matchTypes";
import type { Evaluation } from "./questionTypes";
import type { CurrentPrompt } from "./session";
import { findMatch, normalizeText } from "./textMatch";

// Transparent rule-based scoring:
// 1. Each rubric criterion has concepts. A concept is "covered" if any of its
//    phrases or patterns appears in the answer.
// 2. credit = covered concepts / needed (capped at 1).
// 3. points = credit x criterion points, rounded to the nearest half point.
// This measures whether key ideas were MENTIONED. It cannot judge whether the
// explanation is correct, and it cannot understand meaning.

export const POINT_STEP = 0.5;
export const SHORT_ANSWER_WORDS = 15;

function roundToStep(value: number): number {
  return Math.round(value / POINT_STEP) * POINT_STEP;
}

function buildSummary(score10: number, answerEmpty: boolean): string {
  if (answerEmpty) return "No answer was submitted.";
  if (score10 >= 8) return "Strong coverage: most expected ideas were mentioned.";
  if (score10 >= 5)
    return "Partial coverage: several expected ideas were mentioned, but some were missing.";
  if (score10 > 0)
    return "Limited coverage: only a few expected ideas were detected.";
  return "No expected ideas were detected in this answer.";
}

export interface EvalTarget {
  questionId: string;
  followUpId: string | null;
  evaluation: Evaluation; // the rubric from the question bank
  criteria: Record<string, CriterionMatch>; // match rules for each criterion
  signalConcepts?: MatchConcept[];
}

export function evaluateAnswer(
  target: EvalTarget,
  answerText: string
): EvaluationResult {
  const raw = answerText.trim();
  const normalized = normalizeText(raw);
  const padded = ` ${normalized} `;
  const wordCount = raw === "" ? 0 : raw.split(/\s+/).length;
  const answerEmpty = normalized === "";

  const check = (concept: MatchConcept): ConceptResult => {
    const matched = answerEmpty ? null : findMatch(normalized, padded, concept);
    return {
      id: concept.id,
      label: concept.label,
      covered: matched !== null,
      matched,
    };
  };

  const criteria: CriterionResult[] = target.evaluation.criteria.map(
    (criterion) => {
      const rule = target.criteria[criterion.id];
      const concepts = (rule?.concepts ?? []).map(check);
      const covered = concepts.filter((c) => c.covered).length;
      const needed = Math.max(1, Math.min(rule?.needed ?? concepts.length, concepts.length));
      const credit = concepts.length === 0 ? 0 : Math.min(1, covered / needed);
      const awardedPoints = Math.min(
        criterion.points,
        roundToStep(credit * criterion.points)
      );
      const level: CreditLevel =
        credit >= 1 ? "full" : credit > 0 ? "partial" : "none";
      return {
        id: criterion.id,
        description: criterion.description,
        maxPoints: criterion.points,
        awardedPoints,
        credit,
        level,
        concepts,
        expected: criterion.full_credit_condition,
      };
    }
  );

  const signals = (target.signalConcepts ?? []).map(check);

  const maxPoints = target.evaluation.total_points;
  const awardedPoints = criteria.reduce((sum, c) => sum + c.awardedPoints, 0);
  const score10 =
    maxPoints > 0 ? Math.round((awardedPoints / maxPoints) * 100) / 10 : 0;
  const coverage = maxPoints > 0 ? awardedPoints / maxPoints : 0;

  const allConcepts = [...criteria.flatMap((c) => c.concepts), ...signals];
  const coveredConceptIds = allConcepts.filter((c) => c.covered).map((c) => c.id);
  const missedConceptIds = allConcepts.filter((c) => !c.covered).map((c) => c.id);

  const missedMap = new Map<string, string>();
  criteria
    .filter((c) => c.level !== "full")
    .forEach((c) =>
      c.concepts
        .filter((k) => !k.covered)
        .forEach((k) => missedMap.set(k.id, k.label))
    );
  const missedConcepts = [...missedMap.entries()].map(([id, label]) => ({
    id,
    label,
  }));

  const warnings: string[] = [];
  if (!answerEmpty && wordCount < SHORT_ANSWER_WORDS) {
    warnings.push("Very short answer: the score may be unreliable.");
  }
  if (!answerEmpty && awardedPoints === 0 && wordCount >= 25) {
    warnings.push(
      "No expected ideas were detected. This may be a different wording that the rule-based evaluator does not recognise."
    );
  }

  return {
    questionId: target.questionId,
    followUpId: target.followUpId,
    maxPoints,
    awardedPoints,
    score10,
    coverage,
    answerEmpty,
    wordCount,
    criteria,
    coveredConceptIds,
    missedConceptIds,
    missedConcepts,
    summary: buildSummary(score10, answerEmpty),
    warnings,
    reliability: warnings.length > 0 ? "low" : "ok",
  };
}

// Evaluates an answer to whichever prompt (main question or follow-up) is active.
export function evaluateForPrompt(
  matchBank: MatchBank,
  prompt: CurrentPrompt,
  text: string
): EvaluationResult {
  const questionMatch = matchBank.questions[prompt.question.id];
  if (prompt.kind === "main") {
    return evaluateAnswer(
      {
        questionId: prompt.question.id,
        followUpId: null,
        evaluation: prompt.question.evaluation,
        criteria: questionMatch?.criteria ?? {},
        signalConcepts: questionMatch?.signal_concepts,
      },
      text
    );
  }
  const followUpMatch = questionMatch?.follow_ups?.[prompt.followUp.id];
  return evaluateAnswer(
    {
      questionId: prompt.question.id,
      followUpId: prompt.followUp.id,
      evaluation: prompt.followUp.evaluation,
      criteria: followUpMatch?.criteria ?? {},
    },
    text
  );
}

// The facts the follow-up logic needs.
export function signalsFromEvaluation(result: EvaluationResult): AnswerSignals {
  return {
    answerEmpty: result.answerEmpty,
    coverage: result.coverage,
    coveredConceptIds: result.coveredConceptIds,
    missedConceptIds: result.missedConceptIds,
  };
}
