import { useState } from "react";
import { AlertCircle, ArrowLeft, Keyboard, Play, Volume2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { DURATIONS, TOPICS } from "../data/options";
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
  const [difficulty, setDifficulty] = useState<Difficulty>("target");
  const [durationMin, setDurationMin] = useState<number>(30);
  const [topics, setTopics] = useState<string[]>(TOPICS);
  const [mode, setMode] = useState<InterviewMode>("voice");

  const support = detectSpeechSupport();
  const voiceLimited = mode === "voice" && !support.recognition;
  const noTopics = topics.length === 0;

  function toggleTopic(topic: string) {
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  function handleStart() {
    if (noTopics) return;
    onStart({
      role: "backend",
      experience: "fresher",
      difficulty,
      durationMin,
      topics,
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
                {
                  value: "target",
                  label: "Target",
                  hint: "Around 7/10",
                },
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
              <h2 className="text-sm font-medium text-white">Focus topics</h2>
              <div className="flex gap-1">
                <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => setTopics(TOPICS)}>
                  Select all
                </Button>
                <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => setTopics([])}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((topic) => {
                const selected = topics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleTopic(topic)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      selected
                        ? "border-accent-500 bg-accent-500/10 text-white"
                        : "border-white/10 bg-ink-800 text-zinc-400 hover:bg-ink-700"
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
            {noTopics && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-300">
                <AlertCircle size={14} /> Select at least one topic to continue.
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

        {/* Summary */}
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
                  <dt className="text-zinc-500">Topics</dt>
                  <dd className="text-right text-zinc-200">
                    {topics.length} of {TOPICS.length}
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
                disabled={noTopics}
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