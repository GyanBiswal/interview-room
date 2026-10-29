import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "success" | "warning";

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
}

const tones: Record<Tone, string> = {
  neutral: "bg-white/5 text-zinc-400 border-white/10",
  accent: "bg-accent-500/10 text-accent-300 border-accent-500/30",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-300 border-amber-500/30",
};

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}