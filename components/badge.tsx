import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
};

export function Badge({ children }: BadgeProps) {
  return (
    <span className="inline-flex rounded-full border border-accent/30 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
      {children}
    </span>
  );
}
