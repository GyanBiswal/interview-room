import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

const styles: Record<Variant, string> = {
  primary:
    "bg-accent-500 text-white hover:bg-accent-600 shadow-sm shadow-accent-500/20",
  secondary:
    "border border-white/10 bg-ink-800 text-zinc-200 hover:bg-ink-700",
  ghost: "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
};

export function Button({
  variant = "primary",
  icon,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}