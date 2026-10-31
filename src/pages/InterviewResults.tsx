import { Check, Clock, X } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import type { EvaluationResult } from "../engine/evaluationTypes";
import type {
  FollowUp,
  Question,
  QuestionBank,
  ReferenceAnswer,
} from "../engine/questionTypes";
import type {
  AnswerRecord,
  InterviewSession,
  SessionStatus,
} from "../engine/session";

interface InterviewResultsProps {
  session: InterviewSession;
  bank: QuestionBank;
  onHome: () => void;
  onNew: () => void;
}

const STATUS_LABEL: Record<SessionStatus, string> = {
  "in-progress": "In progress",
  completed: "Completed",
  "ended-early": "Ended early",
  "time-up": "Time ran out",
};

function formatDuration(start: string, end: string | null) {
  if (!end) return "unknown";
  const seconds = Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000)
  );
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function scoreTone(score10: number): "success" | "warning" | "neutral" {
  return score10 >= 7 ? "success" : score10 >= 4 ? "warning" : "neutral";
}

function EvaluationDetails({ evaluation }: { evaluation: EvaluationResult }) {
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-zinc-400">{evaluation.summary}</p>
      {evaluation.warnings.map((w) => (
        <p key={w} className="text-xs text-amber-300">
          {w}
        </p>
      ))}
      <ul className="space-y-3">
        {evaluation.criteria.map((c) => (
          <li
            key={c.id}
            className="rounded-lg border border-white/5 bg-ink-950 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-zinc-300">{c.description}</p>
              <Badge
                tone={
                  c.level === "full"
                    ? "success"
                    : c.level === "partial"
                      ? "warning"
                      : "neutral"
                }
              >
                {c.awardedPoints} / {c.maxPoints}
              </Badge>
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {c.concepts.map((k) => (
                <li
                  key={k.id}
                  title={k.matched ? `Matched: ${k.matched}` : "Not detected"}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                    k.covered
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-white/5 text-zinc-500"
                  }`}
                >
                  {k.covered ? <Check size={11} /> : <X size={11} />}
                  {k.label}
                </li>
              ))}
            </ul>
            {c.level !== "full" && (
              <p className="mt-2 text-xs text-zinc-500">Expected: {c.expected}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReferenceBlock({
  reference,
  criticalErrors,
}: {
  reference: ReferenceAnswer;
  criticalErrors?: string[];
}) {
  return (
    <details className="mt-3 text-sm text-zinc-400">
      <summary className="cursor-pointer text-xs text-zinc-500">
        Reference answer and common mistakes
      </summary>
      <div className="mt-2 space-y-2 rounded-lg bg-ink-950 p-3 text-xs leading-relaxed">
        <p className="text-zinc-300">{reference.summary}</p>
        <ul className="list-disc space-y-1 pl-5">
          {reference.key_points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        {criticalErrors && criticalErrors.length > 0 && (
          <div>
            <p className="font-medium text-amber-300">
              Avoid (not checked automatically):
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {criticalErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

function PromptReview({
  label,
  text,
  record,
  reference,
  criticalErrors,
}: {
  label: string;
  text: string;
  record: AnswerRecord | undefined;
  reference: ReferenceAnswer;
  criticalErrors?: string[];
}) {
  const state = !record ? "not-reached" : record.skipped ? "skipped" : "answered";
  const evaluation = record?.evaluation ?? null;
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-zinc-200">
          <span className="mr-2 text-zinc-500">{label}</span>
          {text.split("\n")[0]}
        </p>
        {state === "answered" && evaluation ? (
          <Badge tone={scoreTone(evaluation.score10)}>
            {evaluation.score10.toFixed(1)} / 10
          </Badge>
        ) : (
          <Badge tone={state === "skipped" ? "warning" : "neutral"}>
            {state === "skipped" ? "Skipped" : "Not reached"}
          </Badge>
        )}
      </div>
      {state !== "not-reached" && (
        <>
          {record && record.text && (
            <details className="mt-2 text-sm text-zinc-400">
              <summary className="cursor-pointer text-xs text-zinc-500">
                Show my answer
              </summary>
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-ink-950 p-3">
                {record.text}
              </p>
            </details>
          )}
          {evaluation && state === "answered" && (
            <details className="mt-2 text-sm text-zinc-400">
              <summary className="cursor-pointer text-xs text-zinc-500">
                Score breakdown and missed ideas
              </summary>
              <EvaluationDetails evaluation={evaluation} />
            </details>
          )}
          <ReferenceBlock reference={reference} criticalErrors={criticalErrors} />
        </>
      )}
    </div>
  );
}

export function InterviewResults({
  session,
  bank,
  onHome,
  onNew,
}: InterviewResultsProps) {
  const rows = session.plan.map((id) => {
    const question = bank.questions.find((q) => q.id === id) as Question;
    const main = session.answers.find(
      (a) => a.questionId === id && a.followUpId === null
    );
    const followUpRecord = session.answers.find(
      (a) => a.questionId === id && a.followUpId !== null
    );
    const followUp: FollowUp | undefined = followUpRecord
      ? question.follow_ups?.find((f) => f.id === followUpRecord.followUpId)
      : undefined;
    return { id, question, main, followUp, followUpRecord };
  });

  const evaluated = session.answers
    .map((a) => a.evaluation)
    .filter((e): e is EvaluationResult => e !== null);
  const earned = evaluated.reduce((sum, e) => sum + e.awardedPoints, 0);
  const available = evaluated.reduce((sum, e) => sum + e.maxPoints, 0);
  const overall = available > 0 ? Math.round((earned / available) * 100) / 10 : 0;

  const answered = rows.filter((r) => r.main && !r.main.skipped).length;
  const skipped = rows.filter((r) => r.main && r.main.skipped).length;
  const notReached = rows.filter((r) => !r.main).length;
  const followUpCount = rows.filter((r) => r.followUpRecord).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Badge tone={session.status === "completed" ? "success" : "warning"}>
          {STATUS_LABEL[session.status]}
        </Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Interview finished
        </h1>
        <p className="mt-2 text-zinc-400">
          Scores come from a transparent keyword-based rule set. They show
          whether key ideas were mentioned, not whether your explanation was
          correct. Use them as a revision guide, not a verdict.
        </p>
      </div>

      <Card>
        <p className="text-xs text-zinc-500">Overall score</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-5xl font-semibold text-white">
            {available > 0 ? overall.toFixed(1) : "–"}
          </span>
          <span className="text-zinc-500">/ 10</span>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {earned} of {available} points across the questions you were asked.
          Questions you did not reach are not counted.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="!p-4">
          <p className="text-xs text-zinc-500">Answered</p>
          <p className="mt-1 text-2xl font-semibold text-white">{answered}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-zinc-500">Skipped</p>
          <p className="mt-1 text-2xl font-semibold text-white">{skipped}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-zinc-500">Follow-ups</p>
          <p className="mt-1 text-2xl font-semibold text-white">{followUpCount}</p>
        </Card>
        <Card className="!p-4">
          <p className="flex items-center gap-1 text-xs text-zinc-500">
            <Clock size={12} /> Duration
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {formatDuration(session.startedAt, session.endedAt)}
          </p>
        </Card>
      </div>
      {notReached > 0 && (
        <p className="-mt-3 text-xs text-zinc-500">
          {notReached} planned question(s) were not reached.
        </p>
      )}

      <Card>
        <h2 className="text-sm font-medium text-zinc-400">
          Question-by-question feedback
        </h2>
        <ol className="mt-4 divide-y divide-white/5">
          {rows.map((r, i) => (
            <li key={r.id} className="space-y-4 py-4">
              <PromptReview
                label={`${i + 1}.`}
                text={r.question.question}
                record={r.main}
                reference={r.question.reference_answer}
                criticalErrors={r.question.evaluation.critical_errors}
              />
              {r.followUp && (
                <div className="ml-4 border-l border-white/10 pl-4">
                  <PromptReview
                    label="Follow-up"
                    text={r.followUp.question}
                    record={r.followUpRecord}
                    reference={r.followUp.reference_answer}
                  />
                </div>
              )}
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onNew}>Start another interview</Button>
        <Button variant="secondary" onClick={onHome}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
