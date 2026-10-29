import { useState } from "react";
import { Header } from "./components/layout/Header";
import { Dashboard } from "./pages/Dashboard";
import { InterviewSetup } from "./pages/InterviewSetup";
import { StartPlaceholder } from "./pages/StartPlaceholder";
import type { SetupConfig, View } from "./types";

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [config, setConfig] = useState<SetupConfig | null>(null);

  function handleStart(next: SetupConfig) {
    setConfig(next);
    setView("pending");
  }

  return (
    <div className="min-h-screen">
      <Header view={view} onNavigate={setView} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {view === "dashboard" && <Dashboard onStart={() => setView("setup")} />}
        {view === "setup" && (
          <InterviewSetup
            onBack={() => setView("dashboard")}
            onStart={handleStart}
          />
        )}
        {view === "pending" && (
          <StartPlaceholder config={config} onBack={() => setView("setup")} />
        )}
      </main>
    </div>
  );
}

export default App;