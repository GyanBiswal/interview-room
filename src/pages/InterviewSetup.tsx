import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Keyboard, Play, Volume2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { DURATIONS } from "../data/options";
import { loadBank } from "../engine/loadBank";
import type { Difficulty, InterviewMode, SetupConfig } from "../types";

interface InterviewSetupProps {
  onBack: () => void;
  onStart: (config: SetupConfig) => void;
}

function detectSpeechSupport() {
  const synthesis = "speechSynthesis" in window;
  const recognition =
    "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
  return { synthesis, recognition };
}

export function InterviewSetup({ onBack, onStart }: InterviewSetupProps) {
  const bankResult = useMemo(() => loadBank("backend-fresher"), []);
  const competencies = bankResult.ok ? bankResult.bank.competencies : [];
  const bankErrors = "errors" in bankResult ? bankResult.errors : [];

  const [difficulty, setDifficulty] = useState<Difficulty>("target");
  const [durationMin, setDurationMin] = useState<number>(30);
  const [focusAreas, setFocusAreas] = useState<string[]>(() =>
    competencies.map((c) => c.id)
  );
  const [mode, setMode] = useState<InterviewMode>("voice");

  const support = detectSpeechSupport();
  const voiceLimited = mode === "voice" && !support.recognition;
  const noAreas = focusAreas.length === 0;

  function toggleArea(id: string) {
    setFocusAreas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleStart() {
    if (noAreas || !bankResult.ok) return;
    onStart({
      role: "backend",
      experience: "fresher",
      difficulty,
      durationMin,
      focusAreas,
      mode,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={onBack} icon={<ArrowLeft size={16} />}>
          Back
        </Button>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Set up your interview
        </h1>
        <p className="mt-2 text-zinc-400">
          Choose what to practise. You can change these every session.
        </p>
      </div>

      {bankErrors.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <p className="flex items-center gap-2 font-medium">
            <AlertCircle size={16} /> The question bank failed validation, so
            interviews cannot start.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            {bankErrors.slice(0, 8).map((e, i) => (
              <li key={i}>
                {e.path}: {e.message}
              </li>
            ))}
          </ul>
          {bankErrors.length > 8 && (
            <p className="mt-2 text-xs">
              ...and {bankErrors.length - 8} more. Run npm run validate:bank
              for the full list.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-1 text-sm font-medium text-white">Role</h2>
            <p className="mb-3 text-xs text-zinc-500">
              More roles will be added later through separate question banks.
            </p>
            <SegmentedControl
              label="Role"
              value="backend"
              onChange={() => {}}
              options={[
                { value: "backend", label: "Backend Developer" },
                {
                  value: "frontend",
                  label: "Frontend Developer",
                  hint: "Coming later",
                  disabled: true,
                },
              ]}
            />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-medium text-white">Experience</h2>
            <SegmentedControl
              label="Experience level"
              value="fresher"
              onChange={() => {}}
              options={[
                { value: "fresher", label: "Fresher", hint: "0–1 year" },
                {
                  value: "mid",
                  label: "1–3 years",
                  hint: "Coming later",
                  disabled: true,
                },
              ]}
            />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-medium text-white">Difficulty</h2>
            <SegmentedControl<Difficulty>
              label="Difficulty"
              value={difficulty}
              onChange={setDifficulty}
              options={[
                { value: "target", label: "Target", hint: "Around 7/10" },
                {
                  value: "stretch",
                  label: "Stretch mix",
                  hint: "Includes some 8/10 questions",
                },
              ]}
            />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-medium text-white">Duration</h2>
            <SegmentedControl<number>
              label="Interview duration"
              value={durationMin}
              onChange={setDurationMin}
              options={DURATIONS.map((d) => ({
                value: d,
                label: `${d} min`,
              }))}
            />
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-white">Focus areas</h2>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  className="!px-2 !py-1 text-xs"
                  onClick={() => setFocusAreas(competencies.map((c) => c.id))}
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  className="!px-2 !py-1 text-xs"
                  onClick={() => setFocusAreas([])}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {competencies.map((c) => {
                const selected = focusAreas.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleArea(c.id)}
                    className={`rounded-full border px-4 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "border-accent-500 bg-accent-500/10 text-white"
                        : "border-white/10 bg-ink-800 text-zinc-400 hover:bg-ink-700"
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
            {noAreas && competencies.length > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-300">
                <AlertCircle size={14} /> Select at least one focus area to
                continue.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-medium text-white">Answer mode</h2>
            <SegmentedControl<InterviewMode>
              label="Answer mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: "voice", label: "Voice", hint: "Spoken questions and answers" },
                { value: "text", label: "Text", hint: "Type your answers" },
              ]}
            />
            {voiceLimited && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-300">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>
                  This browser does not appear to support speech recognition.
                  You can still hear questions read aloud if speech synthesis
                  is available, and answer by typing.
                </span>
              </p>
            )}
            <p className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <Volume2 size={13} /> Read aloud:{" "}
                {support.synthesis ? "detected" : "not detected"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Keyboard size={13} /> Speech input:{" "}
                {support.recognition ? "detected" : "not detected"}
              </span>
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              Note: in some browsers, speech recognition sends audio to an
              external service and may not work offline.
            </p>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-20">
            <Card>
              <h2 className="text-sm font-medium text-zinc-400">Summary</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Role</dt>
                  <dd className="text-zinc-200">Backend Developer</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Experience</dt>
                  <dd className="text-zinc-200">Fresher</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Difficulty</dt>
                  <dd className="text-zinc-200">
                    {difficulty === "target" ? "Target (7/10)" : "Stretch mix"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Duration</dt>
                  <dd className="text-zinc-200">{durationMin} min</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Focus areas</dt>
                  <dd className="text-right text-zinc-200">
                    {focusAreas.length} of {competencies.length}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Mode</dt>
                  <dd className="text-zinc-200">
                    {mode === "voice" ? "Voice" : "Text"}
                  </dd>
                </div>
              </dl>
              <Button
                className="mt-6 w-full"
                onClick={handleStart}
                disabled={noAreas || !bankResult.ok}
                icon={<Play size={16} />}
              >
                Start interview
              </Button>
              <p className="mt-3 text-xs text-zinc-600">
                The interview room itself is built in a later phase.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
