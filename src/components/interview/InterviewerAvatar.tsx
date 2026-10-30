import { User } from "lucide-react";

export type AvatarState = "speaking" | "listening" | "idle";

interface InterviewerAvatarProps {
  state: AvatarState;
}

export function InterviewerAvatar({ state }: InterviewerAvatarProps) {
  return (
    <div
      className="relative flex h-16 w-16 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      {state !== "idle" && (
        <span
          className={`avatar-pulse absolute inset-0 rounded-full ${
            state === "speaking" ? "bg-accent-500/25" : "bg-emerald-500/20"
          }`}
        />
      )}
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-ink-700 to-ink-800 text-accent-300">
        <User size={24} />
      </span>
    </div>
  );
}
