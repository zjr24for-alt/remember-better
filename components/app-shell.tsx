import type { PropsWithChildren } from "react";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(182,96,49,0.14),_transparent_35%),linear-gradient(180deg,_#f8f3ea_0%,_#eef1eb_100%)] text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 md:px-10">
        {children}
      </div>
    </div>
  );
}
