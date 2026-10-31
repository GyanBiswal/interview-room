import type { FollowUpCondition } from "./matchTypes";
import type { FollowUp, Question } from "./questionTypes";

// Facts about an answer, produced by the evaluator.
export interface AnswerSignals {
  answerEmpty: boolean;
  coverage: number; // 0..1
  coveredConceptIds: string[];
  missedConceptIds: string[];
}

export interface FollowUpContext {
  // Time left beyond what the remaining planned main questions need.
  spareSeconds: number;
  askedFollowUpIds: string[];
  maxFollowUpsPerQuestion?: number; // default 1
  strongAnswerThreshold?: number; // default 0.6
}

// Rules from the match file for one follow-up.
export interface FollowUpRule {
  ask_when?: FollowUpCondition[];
  skip_when?: FollowUpCondition[];
}

export interface FollowUpDecision {
  ask: boolean;
  followUp: FollowUp | null;
  reason: string;
}

export const DEFAULT_STRONG_THRESHOLD = 0.6;

export function evaluateCondition(
  condition: FollowUpCondition,
  signals: AnswerSignals
): boolean {
  switch (condition.kind) {
    case "coverageBelow":
      return signals.coverage < condition.value;
    case "coverageAtLeast":
      return signals.coverage >= condition.value;
    case "conceptMissed":
      return signals.missedConceptIds.includes(condition.conceptId);
    case "conceptCovered":
      return signals.coveredConceptIds.includes(condition.conceptId);
    case "answerEmpty":
      return signals.answerEmpty;
  }
}

// Decision order:
// 1. Never after an empty answer, and never beyond the follow-up limit.
// 2. Skip if there is not enough spare time.
// 3. If the match file has rules for this follow-up, use them
//    (skip if ANY skip_when holds; ask only if ALL ask_when hold).
// 4. Otherwise use the default policy: a harder follow-up is asked after a
//    strong answer, an easier one after a weak answer.
export function chooseFollowUp(
  question: Question,
  signals: AnswerSignals,
  context: FollowUpContext,
  rules?: Record<string, FollowUpRule | undefined>
): FollowUpDecision {
  const followUps = question.follow_ups ?? [];
  if (followUps.length === 0) {
    return { ask: false, followUp: null, reason: "This question has no follow-ups." };
  }
  if (signals.answerEmpty) {
    return { ask: false, followUp: null, reason: "The answer was empty." };
  }

  const max = context.maxFollowUpsPerQuestion ?? 1;
  const alreadyAsked = followUps.filter((f) =>
    context.askedFollowUpIds.includes(f.id)
  ).length;
  if (alreadyAsked >= max) {
    return { ask: false, followUp: null, reason: "Follow-up limit reached for this question." };
  }

  const threshold = context.strongAnswerThreshold ?? DEFAULT_STRONG_THRESHOLD;
  const strong = signals.coverage >= threshold;
  let lastReason = "No follow-up matched the answer.";

  for (const followUp of followUps) {
    if (context.askedFollowUpIds.includes(followUp.id)) continue;

    if (followUp.estimated_duration_seconds > context.spareSeconds) {
      lastReason = `Skipped ${followUp.id}: not enough spare time.`;
      continue;
    }

    const rule = rules?.[followUp.id];
    if (rule) {
      if ((rule.skip_when ?? []).some((c) => evaluateCondition(c, signals))) {
        lastReason = `Skipped ${followUp.id}: a skip rule matched.`;
        continue;
      }
      if (!(rule.ask_when ?? []).every((c) => evaluateCondition(c, signals))) {
        lastReason = `Skipped ${followUp.id}: ask rules not met.`;
        continue;
      }
      return { ask: true, followUp, reason: `Asking ${followUp.id} (rules matched).` };
    }

    const isStretch = followUp.difficulty > question.difficulty;
    if (isStretch && !strong) {
      lastReason = `Skipped ${followUp.id}: stretch follow-up needs a strong answer.`;
      continue;
    }
    if (!isStretch && strong) {
      lastReason = `Skipped ${followUp.id}: probing follow-up is not needed after a strong answer.`;
      continue;
    }
    return { ask: true, followUp, reason: `Asking ${followUp.id} (default policy).` };
  }
  return { ask: false, followUp: null, reason: lastReason };
}
