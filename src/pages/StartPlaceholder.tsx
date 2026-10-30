import { useMemo, useState } from "react";
import { AlertCircle, Construction, RefreshCw } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { loadBank } from "../engine/loadBank";
import { selectQuestions } from "../engine/selectQuestions";
import type { SetupConfig } from "../types";

interface StartPlaceholderProps {
  config: SetupConfig | null;
  onBack: () => void;
}

export function StartPlaceholder({ config, onBack }: StartPlaceholderProps) {
  const [seed, setSeed] = useState(1);

  const bankResult = useMemo(() => loadBank("backend-fresher"), []);
  const bank = bankResult.ok ? bankResult.bank : null;
  const errors = "errors" in bankResult ? bankResult.errors : [];

  const selection = useMemo(() => {
    if (!config || !bank) return null;
    return selectQuestions(bank, {
      focusAreas: config.focusAreas,
      difficulty: config.difficulty,
      durationMin: config.durationMin,
      seed,
    });
  }, [config, bank, seed]);

  function competencyName(id: string) {
    return bank?.competencies.find((c) => c.id === id)?.name ?? id;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-4">
      <Card>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-accent-300">
            <Construction size={20} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-white">
              Interview plan preview
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Developer view for Phase 2. The real interview room arrives in
              Phase 3. Reference answers are never shown here.
            </p>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            <p className="flex items-center gap-2 font-medium">
              <AlertCircle size={16} /> The question bank failed validation
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
              {errors.slice(0, 8).map((e, i) => (
                <li key={i}>
                  {e.path}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {bank && (
          <p className="mt-4 text-xs text-emerald-300">
            Question bank validated: {bank.questions.length} questions in{" "}
            {bank.competencies.length} competencies.
          </p>
        )}

        {selection && config && (
          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <Badge tone="accent">
                {config.difficulty === "target" ? "Target" : "Stretch mix"}
              </Badge>
              <Badge>{config.durationMin} min</Badge>
              <span>
                {selection.questions.length} questions · ~
                {(selection.plannedSeconds / 60).toFixed(1)} min of{" "}
                {(selection.budgetSeconds / 60).toFixed(1)} min budget
              </span>
            </div>

            {selection.warnings.map((w) => (
              <p
                key={w}
                className="mt-3 flex items-center gap-1.5 text-xs text-amber-300"
              >
                <AlertCircle size={14} /> {w}
              </p>
            ))}

            <ol className="mt-4 divide-y divide-white/5 rounded-xl border border-white/10">
              {selection.questions.map((q, i) => (
                <li key={q.id} className="flex items-start gap-3 p-4">
                  <span className="mt-0.5 text-xs text-zinc-500">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-200">
                      {q.question.split("\n")[0]}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {competencyName(q.competency_id)} · {q.subtopic} · {q.id}
                    </p>
                  </div>
                  <Badge tone={q.difficulty >= 8 ? "warning" : "neutral"}>
                    {q.difficulty}/10
                  </Badge>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => setSeed((s) => s + 1)}
            icon={<RefreshCw size={16} />}
          >
            Reshuffle
          </Button>
          <Button variant="ghost" onClick={onBack}>
            Back to setup
          </Button>
        </div>
      </Card>
    </div>
  );
}
