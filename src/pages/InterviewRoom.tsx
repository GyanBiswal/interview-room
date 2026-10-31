import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Clock,
  Mic,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { InterviewerAvatar } from "../components/interview/InterviewerAvatar";
import type { AvatarState } from "../components/interview/InterviewerAvatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { evaluateForPrompt, signalsFromEvaluation } from "../engine/evaluate";
import { chooseFollowUp } from "../engine/followUps";
import type { MatchBank } from "../engine/matchTypes";
import type { QuestionBank } from "../engine/questionTypes";
import {
  advance,
  endInterview,
  getAskedFollowUpIds,
  getCurrentPrompt,
  getSpareSeconds,
  recordAnswer,
} from "../engine/session";
import type { InterviewSession } from "../engine/session";
import { useCountdown } from "../hooks/useCountdown";
import type { RecognitionProblem } from "../hooks/useSpeechRecognition";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";

interface InterviewRoomProps {
  bank: QuestionBank;
  matchBank: MatchBank;
  initialSession: InterviewSession;
  onFinish: (session: InterviewSession) => void;
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function joinText(base: string, addition: string) {
  const extra = addition.trim();
  if (!extra) return base;
  return base.trim() ? `${base.trimEnd()} ${extra}` : extra;
}

const PROBLEM_TEXT: Record<RecognitionProblem, string> = {
  "permission-denied":
    "Microphone access was blocked. Click the lock icon in the address bar, allow the microphone, then press Start speaking again. You can also type your answer.",
  "no-microphone":
    "No microphone was found. Check that one is connected and selected, or type your answer instead.",
  network:
    "Speech recognition could not reach its online service. In Chrome it needs an internet connection. You can type your answer instead.",
  unknown:
    "Speech recognition stopped unexpectedly. Press Start speaking to try again, or type your answer.",
};

export function InterviewRoom({
  bank,
  matchBank,
  initialSession,
  onFinish,
}: InterviewRoomProps) {
  const [session, setSession] = useState<InterviewSession>(initialSession);
  const [answer, setAnswer] = useState("");
  const answerRef = useRef("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const busyRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const voiceMode = session.config.mode === "voice";

  const updateAnswer = useCallback((next: string) => {
    answerRef.current = next;
    setAnswer(next);
  }, []);

  const tts = useSpeechSynthesis();
  const { speak, cancel: cancelSpeech, supported: ttsSupported } = tts;
  const recognition = useSpeechRecognition({
    onFinalText: (text) => updateAnswer(joinText(answerRef.current, text)),
  });

  const prompt = getCurrentPrompt(session, bank);
  const isFollowUp = prompt?.kind === "followUp";
  const promptId = prompt
    ? prompt.kind === "main"
      ? prompt.question.id
      : prompt.followUp.id
    : null;
  const promptText = prompt
    ? prompt.kind === "main"
      ? prompt.question.question
      : prompt.followUp.question
    : "";
  const competencyId = prompt
    ? prompt.kind === "main"
      ? prompt.question.competency_id
      : prompt.followUp.competency_id
    : null;

  // Stops speech and the microphone, waits for last words, returns the answer.
  async function captureAnswer(): Promise<string> {
    cancelSpeech();
    await recognition.stopAndWait();
    return answerRef.current.trim();
  }

  async function finishSession(reason: "ended-early" | "time-up") {
    if (busyRef.current) return;
    busyRef.current = true;
    const text = await captureAnswer();
    const when = new Date();
    const evaluation =
      prompt && text ? evaluateForPrompt(matchBank, prompt, text) : undefined;
    setSession((prev) => {
      const withAnswer = text ? recordAnswer(prev, text, when, evaluation) : prev;
      return endInterview(withAnswer, when, reason);
    });
  }

  function handleTimeUp() {
    void finishSession("time-up");
  }

  const countdown = useCountdown(session.config.durationMin * 60, handleTimeUp);

  // Scores the answer silently (nothing is shown now) and decides whether a
  // follow-up is worth asking.
  async function submitAnswer(skip: boolean) {
    if (busyRef.current || !prompt) return;
    busyRef.current = true;
    const captured = await captureAnswer();
    const text = skip ? "" : captured;
    const when = new Date();

    const evaluation = evaluateForPrompt(matchBank, prompt, text);
    let nextFollowUpId: string | null = null;
    if (prompt.kind === "main") {
      const decision = chooseFollowUp(
        prompt.question,
        signalsFromEvaluation(evaluation),
        {
          spareSeconds: getSpareSeconds(session, bank, when),
          askedFollowUpIds: getAskedFollowUpIds(session, prompt.question.id),
        },
        matchBank.questions[prompt.question.id]?.follow_ups
      );
      nextFollowUpId = decision.followUp?.id ?? null;
    }

    setSession((prev) =>
      advance(recordAnswer(prev, text, when, evaluation), nextFollowUpId, when)
    );
    updateAnswer("");
    busyRef.current = false;
  }

  function handlePause() {
    cancelSpeech();
    recognition.stop();
    countdown.pause();
  }

  function handleStartSpeaking() {
    cancelSpeech();
    recognition.start();
  }

  function handleRepeat() {
    if (!promptText) return;
    recognition.stop();
    speak(promptText);
  }

  // Read each new question aloud in voice mode.
  useEffect(() => {
    if (promptId && voiceMode && ttsSupported) speak(promptText);
    return () => cancelSpeech();
  }, [promptId, promptText, voiceMode, ttsSupported, speak, cancelSpeech]);

  // Text mode: put the cursor in the answer box for each question.
  useEffect(() => {
    if (!voiceMode) textareaRef.current?.focus();
  }, [promptId, voiceMode]);

  // Tell the parent when the interview is over.
  useEffect(() => {
    if (session.status !== "in-progress") onFinish(session);
  }, [session, onFinish]);

  // Warn before closing the tab mid-interview.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  if (session.status !== "in-progress" || !prompt) return null;

  const total = session.plan.length;
  const index = session.currentIndex;
  const competency = bank.competencies.find((c) => c.id === competencyId);
  const lowTime = countdown.remaining <= 120;
  const micUsable = voiceMode && recognition.supported;

  const avatarState: AvatarState = tts.speaking
    ? "speaking"
    : recognition.listening
      ? "listening"
      : "idle";
  const statusText = tts.speaking
    ? "The interviewer is speaking…"
    : recognition.listening
      ? "Listening. Speak naturally; pauses are fine."
      : voiceMode
        ? "Your turn. Press Start speaking, or type below."
        : "Take your time and type your answer.";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Progress, timer and controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[12rem] flex-1">
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
            <span>
              Question {index + 1} of {total}
              {isFollowUp ? " · follow-up" : ""}
            </span>
            <span
              role="timer"
              aria-label="Time remaining"
              className={`inline-flex items-center gap-1.5 font-medium ${
                lowTime ? "text-amber-300" : "text-zinc-300"
              }`}
            >
              <Clock size={14} /> {formatTime(countdown.remaining)}
            </span>
          </div>
          <ProgressBar
            value={(index / total) * 100}
            label="Interview progress"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handlePause}
            icon={<Pause size={16} />}
          >
            Pause
          </Button>
          <Button
            variant="ghost"
            onClick={() => setConfirmEnd(true)}
            icon={<X size={16} />}
          >
            End
          </Button>
        </div>
      </div>

      {/* Question */}
      <Card key={promptId} className="fade-in">
        <div className="flex items-start gap-4">
          <InterviewerAvatar state={avatarState} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-zinc-400">
                Interviewer
              </span>
              {isFollowUp && <Badge tone="accent">Follow-up</Badge>}
              {competency && <Badge>{competency.name}</Badge>}
            </div>
            <p
              className="mt-3 whitespace-pre-wrap text-lg leading-relaxed text-white"
              aria-live="polite"
            >
              {promptText}
            </p>
            <p className="mt-3 text-xs text-zinc-500" aria-live="polite">
              {statusText}
            </p>
          </div>
        </div>
      </Card>

      {/* Answer */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="answer" className="text-sm font-medium text-white">
            {micUsable ? "Your answer (transcript, you can edit it)" : "Your answer"}
          </label>
          {micUsable &&
            (recognition.listening ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 text-xs text-emerald-300">
                  <span className="avatar-pulse h-2 w-2 rounded-full bg-emerald-400" />
                  Listening
                </span>
                <Button
                  variant="secondary"
                  onClick={recognition.stop}
                  icon={<Square size={14} />}
                >
                  Stop recording
                </Button>
              </div>
            ) : (
              <Button onClick={handleStartSpeaking} icon={<Mic size={16} />}>
                Start speaking
              </Button>
            ))}
        </div>

        <textarea
          id="answer"
          ref={textareaRef}
          value={answer}
          onChange={(e) => updateAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              if (answer.trim()) void submitAnswer(false);
            }
          }}
          rows={7}
          placeholder={
            micUsable
              ? "Your spoken words appear here. You can also type or edit."
              : "Type your answer here. Press Cmd/Ctrl + Enter to finish."
          }
          className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-ink-950 p-4 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600"
        />
        {recognition.interim && (
          <p className="mt-2 text-xs italic text-zinc-500">
            {recognition.interim}
          </p>
        )}

        {voiceMode && !recognition.supported && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-300">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            Speech recognition is not supported in this browser, so please type
            your answer. Chrome or Edge usually support it.
          </p>
        )}
        {voiceMode && !ttsSupported && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-300">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            Reading questions aloud is not available in this browser.
          </p>
        )}
        {recognition.problem && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-300">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {PROBLEM_TEXT[recognition.problem]}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {ttsSupported && (
              <Button
                variant="ghost"
                onClick={handleRepeat}
                icon={voiceMode ? <RotateCcw size={16} /> : <Volume2 size={16} />}
              >
                {voiceMode ? "Repeat question" : "Read aloud"}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => void submitAnswer(true)}
              icon={<SkipForward size={16} />}
            >
              Skip question
            </Button>
          </div>
          <Button
            onClick={() => void submitAnswer(false)}
            disabled={answer.trim() === ""}
          >
            Finish answer
          </Button>
        </div>
      </Card>

      {/* Paused overlay */}
      {countdown.paused && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Interview paused"
          className="fixed inset-0 z-20 flex items-center justify-center bg-ink-950/90 p-4"
        >
          <Card className="w-full max-w-sm text-center">
            <h2 className="text-lg font-semibold text-white">
              Interview paused
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              The timer is stopped and your answer so far is kept.
            </p>
            <Button
              className="mt-5 w-full"
              onClick={countdown.resume}
              icon={<Play size={16} />}
              autoFocus
            >
              Resume
            </Button>
          </Card>
        </div>
      )}

      {/* End confirmation */}
      {confirmEnd && !countdown.paused && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="End the interview"
          className="fixed inset-0 z-20 flex items-center justify-center bg-ink-950/90 p-4"
        >
          <Card className="w-full max-w-sm text-center">
            <h2 className="text-lg font-semibold text-white">
              End the interview now?
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Questions you have not reached will be marked as not reached. Any
              text in the answer box is saved.
            </p>
            <div className="mt-5 flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmEnd(false)}
                autoFocus
              >
                Keep going
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setConfirmEnd(false);
                  void finishSession("ended-early");
                }}
              >
                End interview
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
