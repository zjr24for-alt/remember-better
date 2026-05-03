"use client";

import { useState } from "react";
import { RenderMath } from "@/components/render-math";

type Props = {
  spatialMapMarkdown: string;
  title: string;
};

type Zone = { title: string; items: string[] };

function parseZones(markdown: string): Zone[] {
  const zones: Zone[] = [];
  const lines = markdown.split(/\r?\n/);
  let cur: Zone | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("##")) {
      cur = { title: line.replace(/^##+\s*/, ""), items: [] };
      zones.push(cur);
    } else if (cur) {
      const item = line.replace(/^[-+*]\s*/, "").trim();
      if (item && cur.items.length < 6) cur.items.push(item);
    }
  }
  if (zones.length === 0) {
    zones.push({ title: "记忆空间", items: markdown.split(/\n/).filter(l => l.trim()).slice(0, 6).map(l => l.replace(/^[-+*]\s*/, "").trim()) });
  }
  return zones;
}

const ZONE_COLORS = [
  { bar: "bg-accent", badge: "bg-accent/10 text-accent border-accent/30" },
  { bar: "bg-moss", badge: "bg-moss/10 text-moss border-moss/30" },
  { bar: "bg-amber-600", badge: "bg-amber-100 text-amber-700 border-amber-400" },
  { bar: "bg-blue-600", badge: "bg-blue-50 text-blue-700 border-blue-300" },
  { bar: "bg-purple-600", badge: "bg-purple-50 text-purple-700 border-purple-300" },
];

export function SpatialDiagram({ spatialMapMarkdown, title }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const zones = parseZones(spatialMapMarkdown);

  const content = (
    <div className="flex flex-col items-center gap-0 py-4">
      {/* Root node */}
      <div className="relative z-10 rounded-[1rem] bg-accent px-6 py-3 font-bold text-white shadow-md">
        {title}
      </div>

      {/* Vertical connector */}
      {zones.length > 0 && (
        <div className="flex items-start gap-0">
          {/* Left branch lines column */}
          <div className="flex flex-col items-center">
            <div className="h-6 w-0.5 bg-accent/30" />
            {zones.map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="h-4 w-0.5 bg-accent/20" />
                <div className={"h-3 w-3 rounded-full " + ZONE_COLORS[i % ZONE_COLORS.length].bar} />
                <div className="h-4 w-0.5 bg-accent/20" />
              </div>
            ))}
          </div>

          {/* Zone cards column */}
          <div className="flex flex-col gap-3 pt-2">
            {zones.map((zone, i) => {
              const c = ZONE_COLORS[i % ZONE_COLORS.length];
              return (
                <div key={i} className="flex flex-col">
                  <div className={"rounded-t-[1rem] px-5 py-3 bg-white border border-fog/60 border-b-0 shadow-sm"}>
                    <div className="flex items-center gap-2">
                      <span className={"flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white " + c.bar}>
                        {i + 1}
                      </span>
                      <span className="font-semibold text-ink text-sm"><RenderMath text={zone.title} /></span>
                    </div>
                  </div>
                  {zone.items.length > 0 && (
                    <div className="rounded-b-[1rem] border border-fog/60 border-t border-dashed border-fog/40 bg-[#fdfbf7] px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        {zone.items.map((item, j) => (
                          <span
                            key={j}
                            className={"rounded-full border px-3 py-1 text-xs " + c.badge}
                          >
                            <RenderMath text={item} />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="rounded-full border border-fog bg-white/80 px-3 py-1 text-xs font-semibold text-ink/50 transition hover:border-accent hover:text-accent"
        >
          {isFullscreen ? "✕ 退出全屏" : "⛶ 全屏"}
        </button>
      </div>

      <div
        className="overflow-auto rounded-[1rem] border border-fog/40 bg-white/80 p-4"
        style={{ maxHeight: isFullscreen ? "none" : "420px" }}
      >
        {content}
      </div>

      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#f8f3ea]/98 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setIsFullscreen(false); }}
        >
          <div className="flex max-h-[90vh] max-w-[90vw] flex-col overflow-hidden rounded-[1rem] border border-fog/40 bg-white/90 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between rounded-t-[1rem] border-b border-fog/40 px-5 py-3">
              <span className="text-sm font-semibold text-ink/60">空间结构图</span>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="rounded-full border border-fog bg-white px-4 py-1.5 text-xs font-semibold text-ink/50 transition hover:border-accent hover:text-accent"
              >
                ✕ 关闭
              </button>
            </div>
            <div className="overflow-auto p-4">
              {content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
