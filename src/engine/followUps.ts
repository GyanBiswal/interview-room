import type { FollowUp, Question } from "./questionTypes";

// Facts about an answer. Phase 4 (evaluation) will produce these.
export interface AnswerSignals {
  answerEmpty: boolean;
  coverage: number; // 0..1, share of key points covered
}

export interface FollowUpContext {
  // Time left beyond what the remaining planned main questions need.
  spareSeconds: number;
  askedFollowUpIds: string[];
  maxFollowUpsPerQuestion?: number; // default 1
  strongAnswerThreshold?: number; // default 0.6
}

export interface FollowUpDecision {
  ask: boolean;
  followUp: FollowUp | null;
  reason: string;
}

export const DEFAULT_STRONG_THRESHOLD = 0.6;

// Default policy. The bank's trigger_conditions and skip_conditions are
// sentences that a rule-based engine cannot evaluate, so we use these rules:
// - Never ask after an empty answer.
// - Skip if there is not enough spare time, or the follow-up limit is reached.
// - A follow-up harder than its question is a stretch: ask it only after a
//   strong answer.
// - A follow-up at the same or lower difficulty is a probe: ask it only after
//   a weak answer.
export function chooseFollowUp(
  question: Question,
  signals: AnswerSignals,
  context: FollowUpContext
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
    const isStretch = followUp.difficulty > question.difficulty;
    if (isStretch && !strong) {
      lastReason = `Skipped ${followUp.id}: stretch follow-up needs a strong answer.`;
      continue;
    }
    if (!isStretch && strong) {
      lastReason = `Skipped ${followUp.id}: probing follow-up is not needed after a strong answer.`;
      continue;
    }
    return { ask: true, followUp, reason: `Asking ${followUp.id}.` };
  }
  return { ask: false, followUp: null, reason: lastReason };
}
