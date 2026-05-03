"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  spatialMapMarkdown: string;
  title: string;
};

type Room = { title: string; items: string[] };

const PALETTE = [
  { fill: "#fef5ee", stroke: "#c97d4a", text: "#7a3d1a" },
  { fill: "#eaf4e8", stroke: "#6d9b5c", text: "#2d5a24" },
  { fill: "#fdf6e3", stroke: "#c9a23c", text: "#6d5312" },
  { fill: "#e8eef6", stroke: "#5c7d9b", text: "#1a3d5a" },
  { fill: "#f3e8f2", stroke: "#9b5c8d", text: "#5a1a4d" },
];

function smartTruncate(text: string, max: number): string {
  // Clean LaTeX markers for canvas display
  let t = text
    .replace(/\$\$([^$]+)\$\$/g, "$1")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\\mathrm\{([^}]+)\}/g, "$1")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1/$2")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, "Σ[$1→$2]")
    .replace(/\\([a-zA-Z]+)/g, "$1");
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastPeriod = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("，"), cut.lastIndexOf("、"), cut.lastIndexOf("；"), cut.lastIndexOf(" "));
  if (lastPeriod > max * 0.4) return t.slice(0, lastPeriod + 1) + "…";
  return cut + "…";
}

function parseRooms(markdown: string): Room[] {
  const rooms: Room[] = [];
  const lines = markdown.split(/\r?\n/);
  let cur: Room | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("##")) {
      cur = { title: smartTruncate(line.replace(/^##+\s*/, ""), 48), items: [] };
      rooms.push(cur);
    } else if (cur) {
      const item = smartTruncate(line.replace(/^[-+*]\s*/, "").trim(), 52);
      if (item && cur.items.length < 5) cur.items.push(item);
    }
  }
  if (rooms.length === 0) {
    rooms.push({ title: "记忆空间", items: markdown.split(/\n/).filter(l => l.trim()).slice(0, 5).map(l => smartTruncate(l.replace(/^[-+*]\s*/, "").trim(), 30)) });
  }
  return rooms;
}

function roomHeight(items: number) {
  const itemCount = Math.max(items, 1);
  return 52 + itemCount * 22; // 52 header + 22 per item line
}

export function FloorPlan({ spatialMapMarkdown, title }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rooms = parseRooms(spatialMapMarkdown);
    if (rooms.length === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const P = 32;
    const RW = 520;
    const GAP_X = 0;
    const GAP_Y = 40;
    const HEADER_H = 90;
    const FOOTER_H = 36;
    const DOOR_W = 34;
    const DOOR_H = 12;

    // Single column
    const COLS = 1;
    const rows: Room[][] = [];
    for (let i = 0; i < rooms.length; i += COLS) {
      rows.push(rooms.slice(i, i + COLS));
    }

    // Compute row heights based on tallest room in each row
    const rowHeights = rows.map(row => {
      const maxItems = Math.max(...row.map(r => r.items.length));
      return roomHeight(maxItems);
    });

    const totalW = COLS * RW + (COLS - 1) * GAP_X + P * 2;
    let totalH = HEADER_H + P;
    for (const rh of rowHeights) totalH += rh + GAP_Y;
    totalH += FOOTER_H - GAP_Y + P;

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

    // Title
    ctx.fillStyle = "#1d2733";
    ctx.font = "700 16px Georgia, serif";
    ctx.textAlign = "center";
    const shortTitle = title.length > 36 ? title.slice(0, 34) + "…" : title;
    ctx.fillText(shortTitle, totalW / 2, P + 20);
    ctx.strokeStyle = "#b66031";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(totalW / 2 - 45, P + 30);
    ctx.lineTo(totalW / 2 + 45, P + 30);
    ctx.stroke();

    // Track door positions for path drawing
    const doorPoints: Array<{ x: number; y: number }> = [];

    // Draw rooms
    let ry = HEADER_H;
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const rh = rowHeights[rowIdx];

      for (let col = 0; col < COLS; col++) {
        if (col >= row.length) continue;
        const room = row[col];
        const rx = P + col * (RW + GAP_X);
        const c = PALETTE[(rowIdx * COLS + col) % PALETTE.length];

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        roundRect(ctx, rx + 2, ry + 2, RW, rh, 10);
        ctx.fill();

        // Body
        ctx.fillStyle = c.fill;
        ctx.strokeStyle = c.stroke;
        ctx.lineWidth = 2;
        roundRect(ctx, rx, ry, RW, rh, 10);
        ctx.fill();
        ctx.stroke();

        // Top accent
        ctx.fillStyle = c.stroke;
        ctx.beginPath();
        ctx.moveTo(rx + 10, ry + 1);
        ctx.lineTo(rx + RW - 10, ry + 1);
        ctx.lineTo(rx + RW - 1, ry + 6);
        ctx.lineTo(rx + 1, ry + 6);
        ctx.closePath();
        ctx.fill();

        // Number badge
        const roomNum = rowIdx * COLS + col + 1;
        ctx.fillStyle = c.stroke;
        ctx.beginPath();
        ctx.arc(rx + 18, ry + 20, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "700 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(roomNum), rx + 18, ry + 24);

        // Room title
        ctx.fillStyle = c.text;
        ctx.font = "600 15px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(room.title, rx + 36, ry + 25);

        // Items
        for (let j = 0; j < room.items.length; j++) {
          const iy = ry + 50 + j * 22;
          ctx.fillStyle = c.stroke;
          ctx.beginPath();
          ctx.arc(rx + 12, iy - 3, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#3a3a3a";
          ctx.font = "13px sans-serif";
          ctx.fillText(room.items[j], rx + 22, iy);
        }

        // Door
        const dx = rx + RW / 2 - DOOR_W / 2;
        const dy = ry + rh;
        ctx.fillStyle = "#fcfaf5";
        ctx.strokeStyle = c.stroke;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx, dy + DOOR_H);
        ctx.lineTo(dx + DOOR_W, dy + DOOR_H);
        ctx.lineTo(dx + DOOR_W, dy);
        ctx.fill();
        ctx.stroke();

        // Entry label
        if (roomNum === 1) {
          ctx.fillStyle = "#b66031";
          ctx.font = "600 10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("▼ 入口", rx + RW / 2, ry - 10);
        }
        if (roomNum === rooms.length && rooms.length > 1) {
          ctx.fillStyle = "#708d6d";
          ctx.font = "600 10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("★ 终点", rx + RW / 2, ry + rh + DOOR_H + 16);
        }

        doorPoints.push({ x: rx + RW / 2, y: ry + rh + DOOR_H });
      }
      ry += rh + GAP_Y;
    }

    // Path between doors
    if (doorPoints.length > 1) {
      ctx.strokeStyle = "#708d6d";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);

      for (let i = 0; i < doorPoints.length - 1; i++) {
        const a = doorPoints[i];
        const b = doorPoints[i + 1];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);

        // Simple path: down to a common y, then across
        const midY = Math.max(a.y, b.y);
        if (Math.abs(a.x - b.x) < 5 && Math.abs(a.y - b.y) < 5) continue;
        ctx.lineTo(a.x, midY + 8);
        ctx.lineTo(b.x, midY + 8);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow
        ctx.fillStyle = "#708d6d";
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - 5, b.y - 4);
        ctx.lineTo(b.x + 5, b.y - 4);
        ctx.closePath();
        ctx.fill();
        ctx.setLineDash([6, 4]);
      }
      ctx.setLineDash([]);
    }

    // Legend
    const lx = P;
    const ly = totalH - FOOTER_H + 10;
    ctx.strokeStyle = "#708d6d";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(lx, ly + 5);
    ctx.lineTo(lx + 20, ly + 5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#708d6d";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("··· 记忆路径", lx + 26, ly + 9);
  }

  // Redraw on data change or fullscreen toggle
  useEffect(() => {
    // Small delay for DOM to settle
    const t = setTimeout(draw, 50);
    return () => clearTimeout(t);
  }, [spatialMapMarkdown, title, isFullscreen]);

  const canvasEl = (
    <canvas
      ref={canvasRef}
      style={{ maxWidth: "100%", display: "block", margin: "0 auto" }}
    />
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
          <div className="flex max-h-[90vh] max-w-[90vw] flex-col overflow-hidden rounded-[1rem] border border-fog/40 bg-white/90 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between rounded-t-[1rem] border-b border-fog/40 px-5 py-3">
              <span className="text-sm font-semibold text-ink/60">空间平面图</span>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="rounded-full border border-fog bg-white px-4 py-1.5 text-xs font-semibold text-ink/50 transition hover:border-accent hover:text-accent"
              >
                ✕ 关闭
              </button>
            </div>
            <div className="overflow-auto p-4">
              {canvasEl}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-auto rounded-[1rem] border border-fog/40 bg-white/80 p-4"
          style={{ maxHeight: "500px" }}>
          <div className="flex items-start justify-center min-w-max">
            {canvasEl}
          </div>
        </div>
      )}
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
