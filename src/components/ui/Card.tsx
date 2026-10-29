import type { ReactNode } from "react";

interface CardProps {
  className?: string;
  children: ReactNode;
}

export function Card({ className = "", children }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-ink-900 p-6 ${className}`}
    >
      {children}
    </div>
  );
}