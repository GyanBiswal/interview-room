import { History, LayoutDashboard, Mic, Play } from "lucide-react";
import type { View } from "../../types";

interface HeaderProps {
  view: View;
  onNavigate: (view: View) => void;
}

export function Header({ view, onNavigate }: HeaderProps) {
  const navBase =
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors";
  const active = "bg-white/5 text-white";
  const idle = "text-zinc-400 hover:bg-white/5 hover:text-zinc-100";

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-ink-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate("dashboard")}
          className="flex items-center gap-2.5 rounded-lg"
          aria-label="Interview Room home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/15 text-accent-300">
            <Mic size={18} />
          </span>
          <span className="text-sm font-semibold tracking-tight text-white">
            Interview Room
          </span>
        </button>

        <nav aria-label="Main" className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            aria-current={view === "dashboard" ? "page" : undefined}
            className={`${navBase} ${view === "dashboard" ? active : idle}`}
          >
            <LayoutDashboard size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("setup")}
            aria-current={view === "setup" ? "page" : undefined}
            className={`${navBase} ${view === "setup" ? active : idle}`}
          >
            <Play size={16} />
            <span className="hidden sm:inline">New interview</span>
          </button>
          <button
            type="button"
            disabled
            title="Available in Phase 5"
            className={`${navBase} cursor-not-allowed text-zinc-600`}
          >
            <History size={16} />
            <span className="hidden sm:inline">History</span>
          </button>
        </nav>
      </div>
    </header>
  );
}