interface ProgressBarProps {
  value: number; // 0-100
  label: string; // accessible label
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
    >
      <div
        className="h-full rounded-full bg-accent-500 transition-all duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}