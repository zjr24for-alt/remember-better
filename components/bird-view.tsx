"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  spatialMapMarkdown: string;
  title: string;
};

type Zone = { title: string; items: string[] };

function parseZones(md: string): Zone[] {
  const zones: Zone[] = [];
  const lines = md.split(/\r?\n/);
  let cur: Zone | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("##")) {
      cur = { title: line.replace(/^##+\s*/, "").slice(0, 14), items: [] };
      zones.push(cur);
    } else if (cur) {
      const item = line.replace(/^[-+*]\s*/, "").trim().slice(0, 16);
      if (item && cur.items.length < 3) cur.items.push(item);
    }
  }
  return zones;
}

const COLORS = [
  "#c97d4a", "#6d9b5c", "#c9a23c", "#5c7d9b", "#9b5c8d",
];

export function BirdView({ spatialMapMarkdown, title }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const zones = parseZones(spatialMapMarkdown);
    if (zones.length === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const P = 40;
    const BOX_W = 180;
    const BOX_H = 90;
    const GAP = 50;
    const COLS = Math.min(zones.length, 4);
    const rows = Math.ceil(zones.length / COLS);
    const totalW = COLS * BOX_W + (COLS - 1) * GAP + P * 2;
    const totalH = rows * BOX_H + (rows - 1) * GAP + P * 2;

    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = totalW + "px";
    canvas.style.height = totalH + "px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#fcfaf5";
    ctx.strokeStyle = "#e8e3d8";
    ctx.lineWidth = 1;
    roundRect(ctx, 0, 0, totalW, totalH, 14);
    ctx.fill();
    roundRect(ctx, 0.5, 0.5, totalW - 1, totalH - 1, 14);
    ctx.stroke();

    const boxes: Array<{ x: number; y: number; w: number; h: number; cx: number; cy: number }> = [];

    for (let i = 0; i < zones.length; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = P + col * (BOX_W + GAP);
      const y = P + row * (BOX_H + GAP);
      const color = COLORS[i % COLORS.length];

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      roundRect(ctx, x + 2, y + 2, BOX_W, BOX_H, 8);
      ctx.fill();

      // Box
      ctx.fillStyle = "#fefbf6";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, BOX_W, BOX_H, 8);
      ctx.fill();
      ctx.stroke();

      // Number badge
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 16, y + 18, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "600 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), x + 16, y + 22);

      // Title
      ctx.fillStyle = "#1d2733";
      ctx.font = "600 13px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(zones[i].title, x + 34, y + 23);

      // Items
      ctx.fillStyle = "#666";
      ctx.font = "10px sans-serif";
      for (let j = 0; j < zones[i].items.length; j++) {
        ctx.fillText(zones[i].items[j], x + 14, y + 46 + j * 16);
      }

      boxes.push({ x, y, w: BOX_W, h: BOX_H, cx: x + BOX_W / 2, cy: y + BOX_H / 2 });
    }

    // Connecting lines
    if (boxes.length > 1) {
      ctx.strokeStyle = "#708d6d";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      for (let i = 0; i < boxes.length - 1; i++) {
        const a = boxes[i];
        const b = boxes[i + 1];
        ctx.beginPath();
        ctx.moveTo(a.cx, a.cy);
        ctx.lineTo(b.cx, b.cy);
        ctx.stroke();

        // Arrow
        ctx.setLineDash([]);
        const angle = Math.atan2(b.cy - a.cy, b.cx - a.cx);
        const mx = (a.cx + b.cx) / 2;
        const my = (a.cy + b.cy) / 2;
        ctx.fillStyle = "#708d6d";
        ctx.beginPath();
        ctx.moveTo(mx + Math.cos(angle) * 5, my + Math.sin(angle) * 5);
        ctx.lineTo(
          mx - Math.cos(angle) * 5 + Math.sin(angle) * 4,
          my - Math.sin(angle) * 5 - Math.cos(angle) * 4
        );
        ctx.lineTo(
          mx - Math.cos(angle) * 5 - Math.sin(angle) * 4,
          my - Math.sin(angle) * 5 + Math.cos(angle) * 4
        );
        ctx.closePath();
        ctx.fill();
        ctx.setLineDash([4, 3]);
      }
      ctx.setLineDash([]);
    }

    // Legend
    ctx.fillStyle = "#708d6d";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("— 空间相对位置", totalW - P, totalH - 12);
  }

  useEffect(() => {
    const t = setTimeout(draw, 50);
    return () => clearTimeout(t);
  }, [spatialMapMarkdown, title, isFullscreen]);

  const canvasEl = (
    <canvas ref={canvasRef} style={{ maxWidth: "100%", display: "block", margin: "0 auto" }} />
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

      {isFullscreen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#f8f3ea]/98 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setIsFullscreen(false); }}
        >
          <div className="flex max-h-[90vh] max-w-[90vw] flex-col overflow-hidden rounded-[1rem] border border-fog/40 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between rounded-t-[1rem] border-b border-fog/40 px-5 py-3">
              <span className="text-sm font-semibold text-ink/60">建筑俯视图</span>
              <button type="button" onClick={() => setIsFullscreen(false)} className="rounded-full border border-fog bg-white px-4 py-1.5 text-xs font-semibold text-ink/50 transition hover:border-accent hover:text-accent">✕ 关闭</button>
            </div>
            <div className="overflow-auto p-4">{canvasEl}</div>
          </div>
        </div>
      ) : (
        <div className="overflow-auto rounded-[1rem] border border-fog/40 bg-white/80 p-4" style={{ maxHeight: 400 }}>{canvasEl}</div>
      )}
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}
