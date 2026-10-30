import { Clock } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import type { QuestionBank } from "../engine/questionTypes";
import type { InterviewSession, SessionStatus } from "../engine/session";

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

export function InterviewResults({
  session,
  bank,
  onHome,
  onNew,
}: InterviewResultsProps) {
  const rows = session.plan.map((id) => {
    const question = bank.questions.find((q) => q.id === id);
    const record = session.answers.find(
      (a) => a.questionId === id && a.followUpId === null
    );
    const state: "answered" | "skipped" | "not-reached" = !record
      ? "not-reached"
      : record.skipped
        ? "skipped"
        : "answered";
    return { id, question, record, state };
  });

  const answered = rows.filter((r) => r.state === "answered").length;
  const skipped = rows.filter((r) => r.state === "skipped").length;
  const notReached = rows.filter((r) => r.state === "not-reached").length;

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
          Scoring and detailed feedback are added in the next phases. For now
          this is a record of what you submitted.
        </p>
      </div>

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
          <p className="text-xs text-zinc-500">Not reached</p>
          <p className="mt-1 text-2xl font-semibold text-white">{notReached}</p>
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

      <Card>
        <h2 className="text-sm font-medium text-zinc-400">Your submissions</h2>
        <ol className="mt-4 divide-y divide-white/5">
          {rows.map((r, i) => (
            <li key={r.id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-zinc-200">
                  <span className="mr-2 text-zinc-500">{i + 1}.</span>
                  {r.question?.question.split("\n")[0] ?? r.id}
                </p>
                <Badge
                  tone={
                    r.state === "answered"
                      ? "success"
                      : r.state === "skipped"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {r.state === "answered"
                    ? "Answered"
                    : r.state === "skipped"
                      ? "Skipped"
                      : "Not reached"}
                </Badge>
              </div>
              {r.state === "answered" && r.record && (
                <details className="mt-2 text-sm text-zinc-400">
                  <summary className="cursor-pointer text-xs text-zinc-500">
                    Show my answer
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap rounded-lg bg-ink-950 p-3">
                    {r.record.text}
                  </p>
                </details>
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
