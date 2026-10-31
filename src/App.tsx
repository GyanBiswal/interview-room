import { useCallback, useState } from "react";
import { Header } from "./components/layout/Header";
import { loadBank, loadMatchBank } from "./engine/loadBank";
import type { MatchBank } from "./engine/matchTypes";
import type { QuestionBank } from "./engine/questionTypes";
import { selectQuestions } from "./engine/selectQuestions";
import { createSession } from "./engine/session";
import type { InterviewSession } from "./engine/session";
import { Dashboard } from "./pages/Dashboard";
import { InterviewResults } from "./pages/InterviewResults";
import { InterviewRoom } from "./pages/InterviewRoom";
import { InterviewSetup } from "./pages/InterviewSetup";
import type { SetupConfig, View } from "./types";

const BANK_ID = "backend-fresher";

function newSessionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now());
}

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [matchBank, setMatchBank] = useState<MatchBank | null>(null);
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(
    null
  );
  const [finished, setFinished] = useState<InterviewSession | null>(null);

  function handleNavigate(next: View) {
    if (
      view === "room" &&
      next !== "room" &&
      !window.confirm("Leave the interview? Your progress will be lost.")
    ) {
      return;
    }
    setView(next);
  }

  function handleStart(config: SetupConfig) {
    const result = loadBank(BANK_ID);
    if (!("bank" in result)) return;

    const matchResult = loadMatchBank(BANK_ID, result.bank);
    if (!("match" in matchResult)) {
      window.alert(
        `The scoring rules failed validation: ${
          matchResult.errors[0]?.message ?? "unknown error"
        } Run npm run validate:match for details.`
      );
      return;
    }

    const selection = selectQuestions(result.bank, {
      focusAreas: config.focusAreas,
      difficulty: config.difficulty,
      durationMin: config.durationMin,
      seed: Date.now(),
    });
    if (selection.questions.length === 0) {
      window.alert(
        selection.warnings[0] ??
          "No questions fit these settings. Try more focus areas or a longer duration."
      );
      return;
    }

    setBank(result.bank);
    setMatchBank(matchResult.match);
    setActiveSession(
      createSession({
        id: newSessionId(),
        bankId: BANK_ID,
        config: {
          durationMin: config.durationMin,
          difficulty: config.difficulty,
          focusAreas: config.focusAreas,
          mode: config.mode,
        },
        questions: selection.questions,
        now: new Date(),
      })
    );
    setFinished(null);
    setView("room");
  }

  const handleFinish = useCallback((session: InterviewSession) => {
    setFinished(session);
    setView("results");
  }, []);

  return (
    <div className="min-h-screen">
      <Header view={view} onNavigate={handleNavigate} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {view === "dashboard" && <Dashboard onStart={() => setView("setup")} />}
        {view === "setup" && (
          <InterviewSetup
            onBack={() => setView("dashboard")}
            onStart={handleStart}
          />
        )}
        {view === "room" && bank && matchBank && activeSession && (
          <InterviewRoom
            key={activeSession.id}
            bank={bank}
            matchBank={matchBank}
            initialSession={activeSession}
            onFinish={handleFinish}
          />
        )}
        {view === "results" && bank && finished && (
          <InterviewResults
            session={finished}
            bank={bank}
            onHome={() => setView("dashboard")}
            onNew={() => setView("setup")}
          />
        )}
      </main>
    </div>
  );
}

export default App;
