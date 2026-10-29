import { ArrowRight, CheckCircle2, Clock, Play, TrendingUp } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  sampleLastInterview,
  sampleRecentSessions,
  sampleWeakTopics,
} from "../data/sampleData";

interface DashboardProps {
  onStart: () => void;
}

export function Dashboard({ onStart }: DashboardProps) {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-ink-900 to-ink-950 p-8 sm:p-10">
        <Badge tone="accent">Backend Developer · Fresher</Badge>
        <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Ready for your next interview?
        </h1>
        <p className="mt-3 max-w-xl text-zinc-400">
          Practise with a realistic, one-question-at-a-time mock interview.
          Detailed feedback arrives at the end, just like a real interview
          loop.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button onClick={onStart} icon={<Play size={16} />}>
            Start mock interview
          </Button>
          <span className="text-xs text-zinc-500">
            Free · runs entirely in your browser
          </span>
        </div>
      </section>

      <p className="text-xs text-zinc-500">
        The numbers below are <strong className="text-zinc-400">sample data</strong>{" "}
        so you can preview the layout. Real history is added in a later phase.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Previous interview */}
        <Card>
          <h2 className="text-sm font-medium text-zinc-400">
            Previous interview
          </h2>
          <p className="mt-1 text-xs text-zinc-500">{sampleLastInterview.date}</p>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-semibold text-white">
              {sampleLastInterview.score.toFixed(1)}
            </span>
            <span className="text-zinc-500">/ 10</span>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
                <CheckCircle2 size={14} className="text-emerald-400" /> Strong
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sampleLastInterview.strongAreas.map((a) => (
                  <Badge key={a} tone="success">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
                <TrendingUp size={14} className="text-amber-400" /> Needs work
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sampleLastInterview.weakAreas.map((a) => (
                  <Badge key={a} tone="warning">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Weak topics */}
        <Card>
          <h2 className="text-sm font-medium text-zinc-400">
            Weak topics and progress
          </h2>
          <ul className="mt-4 space-y-4">
            {sampleWeakTopics.map((t) => (
              <li key={t.topic}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-zinc-200">{t.topic}</span>
                  <span className="text-xs text-zinc-500">{t.mastery}%</span>
                </div>
                <ProgressBar value={t.mastery} label={`${t.topic} mastery`} />
              </li>
            ))}
          </ul>
        </Card>

        {/* Recent sessions */}
        <Card>
          <h2 className="text-sm font-medium text-zinc-400">Recent sessions</h2>
          <ul className="mt-4 divide-y divide-white/5">
            {sampleRecentSessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-zinc-200">{s.focus}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                    <Clock size={12} /> {s.durationMin} min · {s.status}
                  </p>
                </div>
                <span className="text-sm font-medium text-white">
                  {s.score.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={onStart} icon={<ArrowRight size={16} />}>
          Set up a new interview
        </Button>
      </div>
    </div>
  );
}