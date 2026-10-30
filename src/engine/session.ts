import type { FollowUp, Question, QuestionBank } from "./questionTypes";
import type { DifficultyMode } from "./selectQuestions";

// Pure session state: no React, no timers, no storage. Every function takes
// the current session and returns a NEW session. Persistence and refresh
// recovery are added in later phases.

export interface SessionConfig {
  durationMin: number;
  difficulty: DifficultyMode;
  focusAreas: string[];
  mode: "voice" | "text";
}

export type SessionStatus = "in-progress" | "completed" | "ended-early";

export interface AnswerRecord {
  questionId: string;
  followUpId: string | null;
  text: string;
  skipped: boolean;
  submittedAt: string; // ISO timestamp
}

export interface InterviewSession {
  id: string;
  bankId: string;
  config: SessionConfig;
  plan: string[]; // main question ids, in order
  currentIndex: number;
  pendingFollowUpId: string | null;
  answers: AnswerRecord[];
  startedAt: string;
  endedAt: string | null;
  status: SessionStatus;
}

export type CurrentPrompt =
  | { kind: "main"; question: Question }
  | { kind: "followUp"; question: Question; followUp: FollowUp };

export function createSession(args: {
  id: string;
  bankId: string;
  config: SessionConfig;
  questions: Question[];
  now: Date;
}): InterviewSession {
  return {
    id: args.id,
    bankId: args.bankId,
    config: args.config,
    plan: args.questions.map((q) => q.id),
    currentIndex: 0,
    pendingFollowUpId: null,
    answers: [],
    startedAt: args.now.toISOString(),
    endedAt: null,
    status: args.questions.length > 0 ? "in-progress" : "completed",
  };
}

export function getCurrentPrompt(
  session: InterviewSession,
  bank: QuestionBank
): CurrentPrompt | null {
  if (session.status !== "in-progress") return null;
  const questionId = session.plan[session.currentIndex];
  if (!questionId) return null;
  const question = bank.questions.find((q) => q.id === questionId);
  if (!question) return null;

  if (session.pendingFollowUpId) {
    const followUp = question.follow_ups?.find(
      (f) => f.id === session.pendingFollowUpId
    );
    if (!followUp) return null;
    return { kind: "followUp", question, followUp };
  }
  return { kind: "main", question };
}

// Records the answer to the current prompt. Empty text counts as skipped.
export function recordAnswer(
  session: InterviewSession,
  text: string,
  now: Date
): InterviewSession {
  if (session.status !== "in-progress") return session;
  const questionId = session.plan[session.currentIndex];
  if (!questionId) return session;
  const record: AnswerRecord = {
    questionId,
    followUpId: session.pendingFollowUpId,
    text: text.trim(),
    skipped: text.trim() === "",
    submittedAt: now.toISOString(),
  };
  return { ...session, answers: [...session.answers, record] };
}

// Moves on. Pass a follow-up id to ask it next, or null to go to the next
// main question (or finish the interview).
export function advance(
  session: InterviewSession,
  nextFollowUpId: string | null,
  now: Date
): InterviewSession {
  if (session.status !== "in-progress") return session;
  if (nextFollowUpId) {
    return { ...session, pendingFollowUpId: nextFollowUpId };
  }
  const nextIndex = session.currentIndex + 1;
  if (nextIndex >= session.plan.length) {
    return {
      ...session,
      currentIndex: nextIndex,
      pendingFollowUpId: null,
      status: "completed",
      endedAt: now.toISOString(),
    };
  }
  return { ...session, currentIndex: nextIndex, pendingFollowUpId: null };
}

export function endInterview(
  session: InterviewSession,
  now: Date
): InterviewSession {
  if (session.status !== "in-progress") return session;
  return {
    ...session,
    pendingFollowUpId: null,
    status: "ended-early",
    endedAt: now.toISOString(),
  };
}

export function getRemainingSeconds(
  session: InterviewSession,
  now: Date
): number {
  const elapsed =
    (now.getTime() - new Date(session.startedAt).getTime()) / 1000;
  return Math.max(0, session.config.durationMin * 60 - elapsed);
}

// Time left beyond what the remaining planned questions still need.
// Used to decide whether a follow-up fits.
export function getSpareSeconds(
  session: InterviewSession,
  bank: QuestionBank,
  now: Date
): number {
  const needed = session.plan
    .slice(session.currentIndex + 1)
    .reduce((sum, id) => {
      const q = bank.questions.find((x) => x.id === id);
      return sum + (q ? q.estimated_duration_seconds : 0);
    }, 0);
  return getRemainingSeconds(session, now) - needed;
}
