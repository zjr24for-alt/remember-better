"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { graphlib, layout } from "@dagrejs/dagre";

type Props = {
  spatialMapMarkdown: string;
  title: string;
  keyConcepts: Array<{ name: string; description: string; relation: string }>;
};

type ZoneData = {
  title: string;
  items: string[];
};

function stripLatex(text: string): string {
  return text
    .replace(/\$\$[^$]+\$\$/g, "")
    .replace(/\$[^$]+\$/g, "")
    .replace(/\\mathrm\{([^}]+)\}/g, "$1")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1/$2")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\times/g, "×").replace(/\\cdot/g, "·").replace(/\\rightarrow/g, "→")
    .replace(/\\alpha/g, "α").replace(/\\beta/g, "β").replace(/\\gamma/g, "γ")
    .replace(/\\delta/g, "Δ").replace(/\\pi/g, "π").replace(/\\sigma/g, "σ")
    .replace(/\\theta/g, "θ").replace(/\\omega/g, "ω").replace(/\\infty/g, "∞")
    .replace(/\\sum_/g, "Σ").replace(/\\prod_/g, "Π")
    .replace(/\^\{([^}]+)\}/g, "^$1").replace(/\_\{([^}]+)\}/g, "_$1")
    .replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
}

function smartTruncate(text: string, max: number): string {
  const t = stripLatex(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastPeriod = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("，"), cut.lastIndexOf("、"), cut.lastIndexOf("；"), cut.lastIndexOf(" "));
  if (lastPeriod > max * 0.5) return t.slice(0, lastPeriod + 1) + "…";
  return cut + "…";
}

function parseZones(markdown: string): ZoneData[] {
  const zones: ZoneData[] = [];
  const lines = markdown.split(/\r?\n/);
  let current: ZoneData | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("##")) {
      current = { title: smartTruncate(line.replace(/^##+\s*/, ""), 48), items: [] };
      zones.push(current);
    } else if (current) {
      const item = smartTruncate(line.replace(/^[-+*]\s*/, "").trim(), 48);
      if (item) current.items.push(item);
    }
  }
  return zones;
}

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 });

  for (const node of nodes) {
    g.setNode(node.id, { width: 180, height: 50 });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - 90, y: pos.y - 25 }
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function SpatialFlow({ spatialMapMarkdown, title, keyConcepts }: Props) {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const rawElements = useMemo(() => {
    const zones = parseZones(spatialMapMarkdown);
    const rawNodes: Node[] = [];
    const rawEdges: Edge[] = [];

    const rootId = "root";
    rawNodes.push({
      id: rootId,
      position: { x: 0, y: 0 },
      data: { label: title.length > 24 ? title.slice(0, 22) + "…" : title },
      style: {
        background: "#b66031",
        color: "#fff",
        border: "2px solid #1d2733",
        borderRadius: "14px",
        padding: "12px 20px",
        fontWeight: 700,
        fontSize: "15px"
      },
      type: "default"
    });

    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      const zid = "zone-" + i;

      rawNodes.push({
        id: zid,
        position: { x: 0, y: 0 },
        data: { label: z.title },
        style: {
          background: "#f4efe6",
          border: "2px solid #b66031",
          borderRadius: "10px",
          padding: "8px 16px",
          fontSize: "13px",
          fontWeight: 600,
          color: "#1d2733"
        },
        type: "default"
      });

      rawEdges.push({
        id: "e-root-" + zid,
        source: rootId,
        target: zid,
        animated: true,
        style: { stroke: "#b66031", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#b66031" }
      });

      for (let j = 0; j < Math.min(z.items.length, 5); j++) {
        const iid = zid + "-item-" + j;
        rawNodes.push({
          id: iid,
          position: { x: 0, y: 0 },
          data: { label: z.items[j] },
          style: {
            background: "#fdfbf7",
            border: "1.5px dashed #708d6d",
            borderRadius: "8px",
            padding: "5px 12px",
            fontSize: "11px",
            color: "#1d2733"
          },
          type: "default"
        });

        rawEdges.push({
          id: "e-" + zid + "-" + iid,
          source: zid,
          target: iid,
          style: { stroke: "#708d6d", strokeWidth: 1, strokeDasharray: "4 2" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#708d6d" }
        });
      }
    }

    return { rawNodes, rawEdges };
  }, [spatialMapMarkdown, title]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => getLayoutedElements(rawElements.rawNodes, rawElements.rawEdges),
    [rawElements]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes/edges when content changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setExpandedNode((prev) => (prev === node.id ? null : node.id));
  }, []);

  const expandedConcept = expandedNode
    ? keyConcepts.find((c) => {
        const node = nodes.find((n) => n.id === expandedNode);
        return node && (c.name.includes(node.data.label as string) || node.data.label === "root");
      }) || null
    : null;

  const flowContent = (
    <div style={{ width: "100%", height: isFullscreen ? "100%" : 480 }} className="rounded-[1rem] border border-fog/60 bg-white/90">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background color="#d8e0db" gap={20} />
        <Controls className="rounded-lg border border-fog/60 bg-white/90 shadow-sm" />
        <MiniMap
          style={{ borderRadius: "10px", border: "1px solid #d8e0db" }}
          nodeColor={(n) => {
            if (n.id === "root") return "#b66031";
            if (n.id.startsWith("zone")) return "#f4efe6";
            return "#fdfbf7";
          }}
          maskColor="rgba(248,243,234,0.6)"
        />
      </ReactFlow>
    </div>
  );

  return (
    <div className="relative">
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
          <div className="flex max-h-[90vh] w-full max-w-[95vw] flex-col overflow-hidden rounded-[1rem] border border-fog/40 bg-white/90 shadow-2xl" style={{ height: "90vh" }}>
            <div className="flex shrink-0 items-center justify-between rounded-t-[1rem] border-b border-fog/40 px-5 py-3">
              <span className="text-sm font-semibold text-ink/60">交互式空间地图</span>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="rounded-full border border-fog bg-white px-4 py-1.5 text-xs font-semibold text-ink/50 transition hover:border-accent hover:text-accent"
              >
                ✕ 关闭
              </button>
            </div>
            <div className="flex-1">
              {flowContent}
            </div>
          </div>
        </div>
      ) : (
        flowContent
      )}

      {expandedConcept && (
        <div className="mt-3 rounded-[1rem] border border-fog/60 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h5 className="font-semibold text-ink">{expandedConcept.name}</h5>
            <button type="button" onClick={() => setExpandedNode(null)} className="text-xs text-ink/40 hover:text-accent">✕</button>
          </div>
          <p className="mt-2 text-sm leading-7 text-ink/72">{expandedConcept.description}</p>
          <span className="mt-2 inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">{expandedConcept.relation}</span>
        </div>
      )}
    </div>
  );
}
