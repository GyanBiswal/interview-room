export interface SegmentOption<T> {
  value: T;
  label: string;
  hint?: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string | number> {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={`rounded-xl border px-4 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              selected
                ? "border-accent-500 bg-accent-500/10 text-white"
                : "border-white/10 bg-ink-800 text-zinc-300 hover:bg-ink-700"
            }`}
          >
            <span className="block font-medium">{opt.label}</span>
            {opt.hint && (
              <span className="block text-xs text-zinc-500">{opt.hint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}