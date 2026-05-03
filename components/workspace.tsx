"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { FloorPlan } from "@/components/floor-plan";

// Load pdf.js from CDN to avoid bundler issues
let pdfjsPromise: Promise<unknown> | null = null;
function loadPdfJsFromCDN() {
  if (!pdfjsPromise) {
    pdfjsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        const lib = (window as unknown as Record<string, unknown>).pdfjsLib as Record<string, unknown>;
        (lib as Record<string, string>).GlobalWorkerOptions = {
          workerSrc: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
        } as unknown as string;
        resolve(lib);
      };
      script.onerror = () => reject(new Error("PDF.js 加载失败"));
      document.head.appendChild(script);
    });
  }
  return pdfjsPromise;
}
import { MemoryAssessment } from "@/components/memory-assessment";
import { SpatialDiagram } from "@/components/spatial-diagram";
import { SpatialFlow } from "@/components/spatial-flow";
import { memoryProfiles, type MemoryProfileType } from "@/lib/memory-profile";
import type { GenerationResult, SavedGeneration } from "@/lib/types";

type ApiResponse = {
  result: GenerationResult;
  mode: "mock" | "live";
};

type SpatialSection = {
  title: string;
  items: string[];
};

type ExtractResponse = {
  sourceText: string;
  detectedType: "pdf" | "pptx" | "ppt";
  fileName: string;
  error?: string;
};

const HISTORY_STORAGE_KEY = "remember-better.history";

const uiText = {
  title: "\u8bb0\u5fc6\u7ffb\u8bd1\u5de5\u4f5c\u53f0",
  intro:
    "\u73b0\u5728\u652f\u6301\u5bfc\u5165 PDF\u3001PPTX\uff0c\u4ee5\u53ca\u8001\u5f0f PPT\u3002\u8001\u5f0f PPT \u4f1a\u5148\u5c1d\u8bd5\u901a\u8fc7 LibreOffice \u8f6c\u6362\uff0c\u518d\u63d0\u53d6\u6b63\u6587\u3002",
  importTitle: "\u6587\u4ef6\u5bfc\u5165",
  importBody:
    "\u652f\u6301 .pdf\u3001.pptx\u3001.ppt\u3002\u5bfc\u5165\u540e\u4f1a\u81ea\u52a8\u628a\u63d0\u53d6\u5230\u7684\u6587\u672c\u586b\u8fdb\u4e0b\u65b9\u8f93\u5165\u6846\u3002",
  chooseFile: "\u9009\u62e9\u6587\u4ef6",
  parsing: "\u89e3\u6790\u4e2d...",
  pptHint:
    "\u5982\u679c\u670d\u52a1\u5668\u672a\u5b89\u88c5 LibreOffice\uff0c\u8001\u5f0f .ppt \u4f1a\u63d0\u793a\u4f60\u5148\u5b89\u88c5\u8f6c\u6362\u5668\u3002",
  studyGoal: "\u5b66\u4e60\u76ee\u6807",
  studyGoalPlaceholder:
    "\u4f8b\u5982\uff1a\u51c6\u5907\u8003\u8bd5\u3001\u6574\u7406\u6f14\u8bb2\u3001\u8bb0\u4f4f\u4e00\u7ae0\u5185\u5bb9",
  sourceMaterial: "\u539f\u59cb\u5b66\u4e60\u6750\u6599",
  sourcePlaceholder:
    "\u7c98\u8d34 Markdown \u6216\u7eaf\u6587\u672c\uff0c\u4e5f\u53ef\u4ee5\u5148\u5bfc\u5165 PDF / PPT",
  generate: "\u751f\u6210\u8bb0\u5fc6\u7248\u672c",
  generating: "\u751f\u6210\u4e2d...",
  saveEdits: "\u672c\u5730\u4fdd\u5b58\u4fee\u6539",
  apiFallback:
    "\u672a\u914d\u7f6e API Key \u65f6\uff0c\u4f1a\u81ea\u52a8\u4f7f\u7528\u5185\u7f6e\u793a\u4f8b\u7ed3\u679c\u3002",
  preview: "\u8bb0\u5fc6\u9884\u89c8",
  waiting: "\u7b49\u5f85\u751f\u6210",
  liveAi: "\u5b9e\u65f6 AI",
  mockMode: "\u793a\u4f8b\u6a21\u5f0f",
  currentVersion: "\u5f53\u524d\u7248\u672c",
  spatialPreview: "\u7a7a\u95f4\u5730\u56fe\u9884\u89c8",
  narrativePreview: "\u53d9\u4e8b\u8def\u7ebf\u9884\u89c8",
  keyConcepts: "\u5173\u952e\u6982\u5ff5",
  routePreviewEmpty:
    "\u751f\u6210\u540e\uff0c\u8fd9\u91cc\u4f1a\u663e\u793a\u7a7a\u95f4\u5730\u56fe\u3001\u53d9\u4e8b\u8def\u7ebf\u548c\u5173\u952e\u6982\u5ff5\u9884\u89c8\u3002",
  editor: "\u8f93\u51fa\u7f16\u8f91\u5668",
  editorHint:
    "\u8fd9\u91cc\u662f\u53ef\u4fee\u6539\u7248\u672c\u3002\u4f60\u53ef\u4ee5\u76f4\u63a5\u91cd\u5199 AI \u8f93\u51fa\uff0c\u518d\u4fdd\u5b58\u5230\u672c\u5730\u5386\u53f2\u3002",
  titleField: "\u6807\u9898",
  summaryField: "\u6458\u8981",
  spatialMapField: "\u7a7a\u95f4\u5730\u56fe Markdown",
  narrativeField: "\u53d9\u4e8b\u8def\u7ebf",
  keyConceptsEditor: "\u5173\u952e\u6982\u5ff5\u7f16\u8f91",
  conceptName: "\u6982\u5ff5\u540d\u79f0",
  conceptDescription: "\u6982\u5ff5\u8bf4\u660e",
  conceptRelation: "\u5173\u7cfb",
  editorEmpty: "\u5148\u751f\u6210\u4e00\u6b21\u8bb0\u5fc6\u7248\u672c\uff0c\u518d\u5728\u8fd9\u91cc\u7f16\u8f91\u8f93\u51fa\u3002",
  history: "\u672c\u5730\u5386\u53f2",
  historyHint:
    "\u6700\u8fd1\u7684\u751f\u6210\u7ed3\u679c\u4f1a\u4fdd\u5b58\u5728\u6d4f\u89c8\u5668\u672c\u5730\uff0c\u65b9\u4fbf\u4f60\u91cd\u65b0\u6253\u5f00\u5e76\u7ee7\u7eed\u4fee\u6539\u3002",
  clearHistory: "\u6e05\u7a7a\u5386\u53f2",
  historyEmpty:
    "\u8fd8\u6ca1\u6709\u672c\u5730\u8bb0\u5f55\u3002\u5148\u751f\u6210\u4e00\u6b21\u8bb0\u5fc6\u7248\u672c\uff0c\u8fd9\u91cc\u5c31\u4f1a\u51fa\u73b0\u7b2c\u4e00\u6761\u5386\u53f2\u8bb0\u5f55\u3002",
  updatedAt: "\u6700\u8fd1\u66f4\u65b0\uff1a",
  relationPrefix: "\u5173\u7cfb\uff1a",
  loadedHistory: "\u5df2\u4ece\u672c\u5730\u5386\u53f2\u8f7d\u5165\u3002",
  savedLocal: "\u4fee\u6539\u5df2\u4fdd\u5b58\u5230\u672c\u5730\u3002",
  generatedLocal: "\u5df2\u751f\u6210\uff0c\u5e76\u4fdd\u5b58\u5230\u672c\u5730\u5386\u53f2\u3002",
  historyCleared: "\u672c\u5730\u5386\u53f2\u5df2\u6e05\u7a7a\u3002",
  historyLoadFailed: "\u672c\u5730\u5386\u53f2\u8bfb\u53d6\u5931\u8d25\u3002",
  generateFailed: "\u751f\u6210\u5931\u8d25\u3002",
  extractFailed: "\u6587\u4ef6\u89e3\u6790\u5931\u8d25\u3002",
  imported: "\u5df2\u5bfc\u5165",
  pdf: "PDF",
  pptx: "PPTX",
  pptConverted: "PPT\uff08\u5df2\u8f6c\u6362\uff09",
  parsingFile: "\u6b63\u5728\u89e3\u6790",
  startArea: "\u8d77\u70b9\u533a\u57df",
  step: "Step",
  station: "\u7ad9\u70b9"
} as const;

const starterText =
  "\u725b\u987f\u7b2c\u4e00\u5b9a\u5f8b\u6307\u51fa\uff1a\u5982\u679c\u4e00\u4e2a\u7269\u4f53\u4e0d\u53d7\u5916\u529b\u4f5c\u7528\uff0c\u5b83\u5c06\u4fdd\u6301\u9759\u6b62\u72b6\u6001\u6216\u5300\u901f\u76f4\u7ebf\u8fd0\u52a8\u72b6\u6001\u3002\u8fd9\u4e2a\u5b9a\u5f8b\u63ed\u793a\u4e86\u60ef\u6027\u7684\u6982\u5ff5\uff0c\u5e76\u8bf4\u660e\u529b\u4e0d\u662f\u7ef4\u6301\u8fd0\u52a8\u7684\u539f\u56e0\uff0c\u800c\u662f\u6539\u53d8\u8fd0\u52a8\u72b6\u6001\u7684\u539f\u56e0\u3002";

function buildSavedGeneration(input: {
  sourceText: string;
  focusGoal: string;
  mode: "mock" | "live";
  result: GenerationResult;
}): SavedGeneration {
  const now = new Date().toISOString();

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    sourceText: input.sourceText,
    focusGoal: input.focusGoal,
    mode: input.mode,
    result: input.result
  };
}

function parseSpatialMap(markdown: string): SpatialSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: SpatialSection[] = [];
  let current: SpatialSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.startsWith("##")) {
      current = {
        title: line.replace(/^##+\s*/, ""),
        items: []
      };
      sections.push(current);
      continue;
    }

    const itemText = line.replace(/^[-+*]\s*/, "");
    if (!current) {
      current = { title: uiText.startArea, items: [] };
      sections.push(current);
    }
    current.items.push(itemText);
  }

  return sections;
}

function splitNarrative(text: string): string[] {
  return text
    .split(/(?<=[。！？!?])/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function Workspace() {
  const [sourceText, setSourceText] = useState(starterText);
  const [focusGoal, setFocusGoal] = useState(
    "\u51c6\u5907\u8003\u8bd5\uff0c\u5e76\u5c3d\u5feb\u8bb0\u4f4f\u6838\u5fc3\u7269\u7406\u6982\u5ff5\u3002"
  );
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [draft, setDraft] = useState<GenerationResult | null>(null);
  const [history, setHistory] = useState<SavedGeneration[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageProvider, setImageProvider] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [previewFull, setPreviewFull] = useState(false);
  const [imageFull, setImageFull] = useState(false);
  const [profileType, setProfileType] = useState<MemoryProfileType>("spatial");
  const [showAssessment, setShowAssessment] = useState(false);
  const [isCleaningText, setIsCleaningText] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as SavedGeneration[];
      if (Array.isArray(parsed)) {
        setHistory(parsed);
      }
    } catch {
      setError(uiText.historyLoadFailed);
    }

    const savedProfile = window.localStorage.getItem("remember-better.profile");
    if (savedProfile === "spatial" || savedProfile === "visual" || savedProfile === "logical") {
      setProfileType(savedProfile);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("remember-better.profile", profileType);
  }, [profileType]);

  useEffect(() => {
    if (!history.length) {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const onGenerate = () => {
    setError(null);
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ sourceText, focusGoal, profileType })
        });

        const data = (await response.json()) as ApiResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || uiText.generateFailed);
        }

        const saved = buildSavedGeneration({
          sourceText,
          focusGoal,
          mode: data.mode,
          result: data.result
        });

        setResult({ result: data.result, mode: data.mode });
        setDraft(data.result);
        setActiveHistoryId(saved.id);
        setImageUrl(null);
        setImageError(null);
        setHistory((current) => [saved, ...current].slice(0, 8));
        setStatusMessage(uiText.generatedLocal);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : uiText.generateFailed;
        setError(message);
      }
    });
  };

  const onUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setStatusMessage(null);
    setUploadingFileName(file.name);

    try {
      let text = "";

      // 1) Try local PaddleOCR server first (best quality)
      try {
        setStatusMessage("正在用 PaddleOCR 识别...");
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        const ocrRes = await fetch("http://localhost:8787/ocr", {
          method: "POST",
          body: file,
          headers: { "Content-Type": file.type || "application/pdf" },
          signal: ctrl.signal
        });
        clearTimeout(t);
        if (ocrRes.ok) {
          const d = await ocrRes.json() as { text?: string };
          if (d.text) text = d.text;
        }
      } catch { /* PaddleOCR not available */ }

      // 2) Tesseract.js browser OCR — works everywhere
      if (!text) {
        setStatusMessage("正在用浏览器 OCR 识别...");
        const Tesseract = (await import("tesseract.js")).default;
        const imageUrls: string[] = [];

        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          // Render PDF pages to images in browser (pdf.js from CDN)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pdfjsLib = await loadPdfJsFromCDN() as any;
          const buf = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

          const totalPages = Math.min(pdf.numPages, 10);
          for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const vp = page.getViewport({ scale: 2 });
            const c = document.createElement("canvas");
            c.width = vp.width;
            c.height = vp.height;
            const ctx = c.getContext("2d");
            if (!ctx) continue;
            await page.render({ canvasContext: ctx, viewport: vp }).promise;
            imageUrls.push(c.toDataURL("image/png"));
            setStatusMessage(`PDF 渲染中... ${i}/${totalPages}`);
          }
        } else if (file.type.startsWith("image/") || file.name.match(/\.(png|jpg|jpeg|bmp|webp)$/i)) {
          imageUrls.push(URL.createObjectURL(file));
        } else {
          // PPTX etc — try server
          const fd = new FormData();
          fd.append("file", file);
          const sr = await fetch("/api/extract", { method: "POST", body: fd });
          if (sr.ok) {
            const d = await sr.json() as { sourceText?: string };
            if (d.sourceText) text = d.sourceText;
          }
        }

        // OCR each rendered image
        if (imageUrls.length > 0) {
          const ocrTexts: string[] = [];
          for (let i = 0; i < imageUrls.length; i++) {
            const result = await Tesseract.recognize(imageUrls[i], "chi_sim+eng");
            if (result.data.text?.trim()) ocrTexts.push(result.data.text.trim());
            setStatusMessage(`OCR 识别中... ${i + 1}/${imageUrls.length}`);
          }
          text = ocrTexts.join("\n\n").trim();
          for (const u of imageUrls) {
            if (u.startsWith("blob:")) URL.revokeObjectURL(u);
          }
        }
      }

      if (!text) throw new Error("未识别到文字内容");

      setSourceText(text);
      setStatusMessage(`已识别 ${file.name}，正在 AI 清洗...`);

      // Auto-clean
      fetch("/api/clean-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: text })
      })
        .then(async (res) => {
          if (res.ok) {
            const r = await res.text();
            if (r) {
              const d = JSON.parse(r) as { cleanedText?: string; mode?: string };
              if (d.cleanedText && d.mode !== "passthrough") setSourceText(d.cleanedText);
            }
          }
          setStatusMessage(`已识别 ${file.name}，AI 已修复乱码。`);
        })
        .catch(() => setStatusMessage(`已识别 ${file.name}。`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "识别失败");
    } finally {
      setUploadingFileName(null);
      event.target.value = "";
    }
  };

  const onCleanText = () => {
    if (!sourceText.trim()) return;
    setError(null);
    setIsCleaningText(true);

    fetch("/api/clean-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceText })
    })
      .then(async (res) => {
        const data = await res.json() as { cleanedText?: string; error?: string };
        if (!res.ok) throw new Error(data.error || "文本修复失败");
        if (data.cleanedText) setSourceText(data.cleanedText);
        setStatusMessage("文本已修复，公式乱码已清理。");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "修复失败"))
      .finally(() => setIsCleaningText(false));
  };

  const onSaveEdits = () => {
    if (!draft) {
      return;
    }

    const now = new Date().toISOString();
    const targetId = activeHistoryId;

    setHistory((current) => {
      if (!targetId) {
        const saved = buildSavedGeneration({
          sourceText,
          focusGoal,
          mode: result?.mode || "mock",
          result: draft
        });
        setActiveHistoryId(saved.id);
        return [saved, ...current].slice(0, 8);
      }

      return current.map((entry) =>
        entry.id === targetId
          ? {
              ...entry,
              sourceText,
              focusGoal,
              updatedAt: now,
              mode: result?.mode || entry.mode,
              result: draft
            }
          : entry
      );
    });

    setResult((current) =>
      current
        ? {
            ...current,
            result: draft
          }
        : current
    );
    setStatusMessage(uiText.savedLocal);
  };

  const onGenerateImage = () => {
    if (!draft) return;
    setImageError(null);
    setImageUrl(null);
    setIsGeneratingImage(true);

    fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spatialMapMarkdown: draft.spatialMapMarkdown,
        title: draft.title,
        narrativeRoute: draft.narrativeRoute
      })
    })
      .then(async (res) => {
        const data = await res.json() as { imageUrl?: string; provider?: string; error?: string };
        if (!res.ok) throw new Error(data.error || "Image generation failed");
        setImageUrl(data.imageUrl || null);
        setImageProvider(data.provider || null);
      })
      .catch((err) => setImageError(err instanceof Error ? err.message : "生成失败"))
      .finally(() => setIsGeneratingImage(false));
  };

  const loadHistoryItem = (entry: SavedGeneration) => {
    setSourceText(entry.sourceText);
    setFocusGoal(entry.focusGoal);
    setResult({ result: entry.result, mode: entry.mode });
    setDraft(entry.result);
    setActiveHistoryId(entry.id);
    setImageUrl(null);
    setImageError(null);
    setStatusMessage(uiText.loadedHistory);
    setError(null);
  };

  const clearHistory = () => {
    setHistory([]);
    setActiveHistoryId(null);
    setStatusMessage(uiText.historyCleared);
  };

  const updateDraftField = <K extends keyof GenerationResult>(
    key: K,
    value: GenerationResult[K]
  ) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateConcept = (
    index: number,
    key: keyof GenerationResult["keyConcepts"][number],
    value: string
  ) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        keyConcepts: current.keyConcepts.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [key]: value } : item
        )
      };
    });
  };

  const spatialSections = draft ? parseSpatialMap(draft.spatialMapMarkdown) : [];
  const narrativeSteps = draft ? splitNarrative(draft.narrativeRoute) : [];

  return (
    <>
    <section className="space-y-8" id="workspace">
      <div className="grid gap-6 rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-lg shadow-ink/5 backdrop-blur-sm md:grid-cols-2 md:p-8">
        <div className="min-w-0 space-y-5">
          <div className="border-b border-fog/50 pb-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3.5 py-1.5 text-xs font-semibold text-accent ring-1 ring-accent/10">
                <span>⚡</span>记忆翻译引擎
              </span>
              <button
                type="button"
                onClick={() => setShowAssessment(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-fog/60 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink/55 shadow-sm transition-all hover:border-accent/40 hover:text-accent hover:shadow-md"
              >
                <span>{memoryProfiles[profileType].icon}</span>
                {memoryProfiles[profileType].label}
                <span className="text-ink/25">▾</span>
              </button>
            </div>
            <h2 className="mt-4 font-display text-3xl tracking-tight text-ink md:text-4xl">{uiText.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-ink/55">{uiText.intro}</p>
          </div>

          {draft && (
            <div className="rounded-[1.5rem] border border-fog/60 bg-gradient-to-br from-white to-paper/80 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-base">📖</span>
                <span className="text-sm font-semibold text-ink">原始材料</span>
              </div>
              <div className="mt-3 max-h-[160px] overflow-y-auto rounded-[1rem] border border-fog/40 bg-white/70 px-4 py-3 text-xs leading-6 text-ink/50">
                {sourceText.slice(0, 800)}
                {sourceText.length > 800 && "…"}
              </div>
            </div>
          )}

          <div className="rounded-[1.5rem] border border-fog/50 bg-gradient-to-br from-white via-white to-paper/60 p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm">📂</span>
              <span className="text-sm font-semibold text-ink">PaddleOCR 课件识别</span>
            </div>
            <p className="mt-2 text-sm leading-7 text-ink/50">
              上传 PDF / PPTX / 图片，本地 PaddleOCR 高精度识别后自动填入。需先启动 OCR 服务。
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                ref={uploadInputRef}
                type="file"
                accept=".pdf,.pptx,.ppt,.png,.jpg,.jpeg"
                className="hidden"
                onChange={onUploadFile}
              />
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={!!uploadingFileName}
                className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-5 py-2.5 text-sm font-semibold text-accent transition-all hover:bg-accent hover:text-white hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50"
              >
                <span>{uploadingFileName ? "⏳" : "📎"}</span>
                {uploadingFileName ? "识别中..." : "选择课件文件"}
              </button>
              {!uploadingFileName && (
                <span className="text-xs text-ink/35">
                  浏览器自动识别，无需额外操作
                </span>
              )}
            </div>
          </div>

          <label className="block space-y-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/70">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs">🎯</span>
              {uiText.studyGoal}
            </span>
            <input
              value={focusGoal}
              onChange={(event) => setFocusGoal(event.target.value)}
              className="w-full rounded-2xl border border-fog/60 bg-white px-4 py-3 text-sm outline-none ring-0 transition-all placeholder:text-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/10"
              placeholder={uiText.studyGoalPlaceholder}
            />
          </label>

          <label className="block space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/70">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs">📝</span>
                {uiText.sourceMaterial}
              </span>
              {sourceText.trim() && (
                <button
                  type="button"
                  onClick={onCleanText}
                  disabled={isCleaningText}
                  className="inline-flex items-center gap-1 rounded-full border border-fog/60 bg-white px-3 py-1 text-xs font-semibold text-ink/45 shadow-sm transition-all hover:border-accent/40 hover:text-accent disabled:opacity-50"
                >
                  {isCleaningText ? (
                    <><span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ink/20 border-t-ink" /> 修复中…</>
                  ) : (
                    <>🪄 AI 修正乱码</>
                  )}
                </button>
              )}
            </div>
            <textarea
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              className="min-h-[300px] w-full max-w-full resize-y overflow-auto rounded-[1.5rem] border border-fog/60 bg-white px-5 py-4 text-sm leading-7 outline-none ring-0 transition-all placeholder:text-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/10"
              placeholder={uiText.sourcePlaceholder}
            />
          </label>

          {sourceText.trim() && (
            <div className="rounded-[1.5rem] border border-fog/50 bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8] p-5 shadow-sm ring-1 ring-ink/5">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-sm">📓</span>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">NotebookLM 笔记视图</span>
              </div>
              <div className="max-h-[240px] overflow-y-auto rounded-[1rem] border border-fog/30 bg-white/80 px-5 py-4 font-serif text-sm leading-8 text-ink/75">
                {sourceText.split(/\n\s*\n/).filter(p => p.trim()).map((para, i) => {
                  const trimmed = para.trim();
                  const isHeading = /^#{1,3}\s|^[一二三四五六七八九十]+[\.、)]|^第[一二三四五六七八九十百千]+[章节]|^[A-Z][^.]{1,50}$/m.test(trimmed) && trimmed.length < 80;
                  return isHeading ? (
                    <h4 key={i} className="mt-4 mb-2 font-bold text-ink first:mt-0">{trimmed.replace(/^#{1,3}\s*/, "")}</h4>
                  ) : (
                    <p key={i} className="my-2 first:mt-0">{trimmed}</p>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onGenerate}
              disabled={isPending || !sourceText.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-ink/15 transition-all hover:bg-ink/90 hover:shadow-xl hover:shadow-ink/20 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {isPending ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {uiText.generating}
                </>
              ) : (
                <>
                  <span>⚡</span>
                  {uiText.generate}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onSaveEdits}
              disabled={!draft}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-5 py-3 text-sm font-semibold text-ink/70 shadow-sm transition-all hover:border-accent/30 hover:text-accent hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              <span>💾</span>
              {uiText.saveEdits}
            </button>
            <span className="text-xs text-ink/35">{uiText.apiFallback}</span>
          </div>

          {statusMessage ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700 shadow-sm">
              <span>✅</span>
              {statusMessage}
            </div>
          ) : null}

          {error ? (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200/60 bg-red-50/80 px-4 py-3 text-sm text-red-700 shadow-sm">
              <span>⚠️</span>
              {error}
            </div>
          ) : null}
        </div>

        <div className="space-y-4 overflow-hidden rounded-[1.75rem] border border-white/80 bg-gradient-to-b from-[#fdfbf7] to-[#f6f2e6] p-5 shadow-lg shadow-ink/5 md:p-6">
          <div className="flex items-center justify-between border-b border-fog/40 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-lg">✨</span>
              <h3 className="font-display text-2xl text-ink">{uiText.preview}</h3>
            </div>
            <div className="flex items-center gap-2">
              {draft && (
                <button
                  type="button"
                  onClick={() => setPreviewFull(true)}
                  className="rounded-full border border-fog/60 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-ink/45 shadow-sm transition-all hover:border-accent/40 hover:text-accent hover:shadow-md"
                >
                  ⛶ 全屏
                </button>
              )}
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${
                  result
                    ? result.mode === "live"
                      ? "bg-accent/10 text-accent ring-1 ring-accent/20"
                      : "bg-moss/10 text-moss ring-1 ring-moss/20"
                    : "bg-fog/50 text-ink/40"
                }`}
              >
                {result ? (result.mode === "live" ? uiText.liveAi : uiText.mockMode) : uiText.waiting}
              </span>
            </div>
          </div>

          {draft ? (
            <div className="space-y-5">
              <section className="overflow-hidden rounded-[1.5rem] border border-accent/15 bg-gradient-to-br from-white via-white to-accent/5 p-5 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-sm">🧠</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    {uiText.currentVersion}
                  </span>
                </div>
                <h4 className="mt-1 min-w-0 break-words font-display text-2xl leading-tight text-ink">{draft.title}</h4>
                <p className="mt-3 min-w-0 break-words text-sm leading-7 text-ink/72">{draft.summary}</p>
              </section>

              <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-ink/5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-sm">🧭</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    交互式空间地图
                  </span>
                </div>
                <p className="mb-4 mt-1 text-xs leading-relaxed text-ink/40">
                  可拖拽、缩放、点击探索的知识关系图。拖拽节点调整布局，滚轮缩放。
                </p>
                <SpatialFlow
                  spatialMapMarkdown={draft.spatialMapMarkdown}
                  title={draft.title}
                  keyConcepts={draft.keyConcepts}
                />
              </section>

              <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-ink/5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-sm">🗺️</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    {uiText.spatialPreview}
                  </span>
                </div>
                <p className="mb-5 mt-1 text-xs leading-relaxed text-ink/40">
                  将抽象概念映射为可穿行的空间区域，每个区域是一个记忆锚点。
                </p>
                <div className="relative ml-2.5 space-y-0 border-l-2 border-accent/20 pl-7">
                  {spatialSections.map((section, index) => (
                    <div key={`${section.title}-${index}`} className="relative pb-5 last:pb-0">
                      <span className="absolute -left-[35px] flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-white shadow-sm shadow-accent/25">
                        {index + 1}
                      </span>
                      <article className="min-w-0 rounded-[1rem] border border-fog/80 bg-gradient-to-br from-white to-paper px-5 py-4 shadow-sm transition hover:shadow-md">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 shrink-0 rounded-full bg-accent/70" />
                          <h5 className="min-w-0 break-words font-semibold text-ink">{section.title}</h5>
                        </div>
                        <div className="mt-3 space-y-2.5">
                          {section.items.map((item, i) => (
                            <div key={i} className="flex gap-3 rounded-lg bg-paper/70 px-3 py-2 text-sm leading-7 text-ink/78">
                              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-moss/60" />
                              <span className="min-w-0 break-words">{item}</span>
                            </div>
                          ))}
                        </div>
                      </article>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-ink/5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-moss/10 text-sm">🚶</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    {uiText.narrativePreview}
                  </span>
                </div>
                <p className="mb-5 mt-1 text-xs leading-relaxed text-ink/45">
                  以第一人称视角穿行记忆空间，每一步都是一个记忆节点。
                </p>
                <div className="relative ml-2.5 space-y-0 border-l-2 border-moss/25 pl-7">
                  {narrativeSteps.map((step, index) => (
                    <div key={`${step}-${index}`} className="relative pb-4 last:pb-0">
                      <span className="absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-moss bg-white text-[10px] font-bold text-moss shadow-sm">
                        {index + 1}
                      </span>
                      <div className="min-w-0 rounded-[1rem] border border-fog/60 bg-gradient-to-br from-white to-paper/80 px-4 py-3.5 shadow-sm transition hover:shadow-md">
                        <p className="break-words text-sm leading-7 text-ink/78">
                          {step}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-ink/5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-sm">🔗</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    {uiText.keyConcepts}
                  </span>
                </div>
                <p className="mb-5 mt-1 text-xs leading-relaxed text-ink/45">
                  核心概念通过关系线索相互连接，形成可追溯的记忆网络。
                </p>
                <div className="grid gap-3">
                  {draft.keyConcepts.map((item, index) => {
                    const accentBar = [
                      "bg-accent",
                      "bg-moss",
                      "bg-amber-600"
                    ];
                    const tagStyle = [
                      "bg-accent/10 text-accent",
                      "bg-moss/10 text-moss",
                      "bg-amber-100 text-amber-700"
                    ];
                    const ci = index % accentBar.length;
                    return (
                      <article
                        key={`${item.name}-${index}`}
                        className="overflow-hidden rounded-[1rem] border border-fog/60 bg-gradient-to-b from-white to-paper/60 shadow-sm transition hover:shadow-md"
                      >
                        <div className={"h-0.5 w-full " + accentBar[ci]} />
                        <div className="px-5 py-4">
                          <h5 className="min-w-0 break-words font-semibold text-ink">{item.name}</h5>
                          <span className={"mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold " + tagStyle[ci]}>
                            {item.relation}
                          </span>
                          <p className="mt-2.5 min-w-0 break-words text-sm leading-7 text-ink/72">{item.description}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-ink/5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm">🗂️</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    空间结构图
                  </span>
                </div>
                <p className="mb-4 mt-1 text-xs leading-relaxed text-ink/45">
                  自动生成的房间与知识点层级结构，直观展示记忆路径。
                </p>
                <SpatialDiagram
                  spatialMapMarkdown={draft.spatialMapMarkdown}
                  title={draft.title}
                />
              </section>

              <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-ink/5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-moss/10 text-sm">🏛️</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    空间平面图
                  </span>
                </div>
                <p className="mb-4 mt-1 text-xs leading-relaxed text-ink/45">
                  自动生成的记忆房间布局，每个色块是一个知识区域，虚线表示记忆路径。
                </p>
                <FloorPlan
                  spatialMapMarkdown={draft.spatialMapMarkdown}
                  title={draft.title}
                />
              </section>

              <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-ink/5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-sm">🎨</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    AI 建筑草图
                  </span>
                </div>
                <p className="mb-5 mt-1 text-xs leading-relaxed text-ink/45">
                  可选：用 AI 把空间地图渲染成手绘风格建筑图。
                </p>

                {!imageUrl ? (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={onGenerateImage}
                      disabled={isGeneratingImage}
                      className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isGeneratingImage ? (
                        <>
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <span>🎨</span>
                          生成AI草图
                        </>
                      )}
                    </button>

                    {imageError && (
                      <div className="flex items-center gap-2 rounded-2xl border border-red-200/60 bg-red-50/80 px-4 py-3 text-sm text-red-700">
                        <span>⚠️</span>
                        {imageError}
                      </div>
                    )}

                    {!isGeneratingImage && !imageError && (
                      <div className="flex min-h-[80px] items-center justify-center rounded-[1rem] border border-dashed border-fog bg-gradient-to-b from-white/70 to-paper/40 text-sm text-ink/35">
                        可选增强，点击生成手绘风格图
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="group relative overflow-hidden rounded-[1rem] border border-fog/60 shadow-md">
                      <img src={imageUrl} alt="建筑草图" className="h-auto w-full" />
                      <button
                        type="button"
                        onClick={() => setImageFull(true)}
                        className="absolute right-3 top-3 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white opacity-0 transition hover:bg-black/60 group-hover:opacity-100"
                      >
                        ⛶ 全屏
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-ink/40">{imageProvider || "AI 生成"}</span>
                      <button
                        type="button"
                        onClick={onGenerateImage}
                        disabled={isGeneratingImage}
                        className="text-xs font-semibold text-accent transition hover:text-accent/70 disabled:opacity-50"
                      >
                        重新生成
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-dashed border-fog bg-gradient-to-b from-white/80 to-paper/40 px-6 text-center">
              <div className="text-4xl opacity-40">🏰</div>
              <p className="max-w-xs text-sm leading-7 text-ink/45">
                {uiText.routePreviewEmpty}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-lg shadow-ink/5 backdrop-blur-sm md:p-8">
          <div className="flex items-center justify-between gap-3 border-b border-fog/40 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 text-lg">✏️</span>
                <h3 className="font-display text-2xl text-ink">{uiText.editor}</h3>
              </div>
              <p className="mt-1 text-sm leading-7 text-ink/55">{uiText.editorHint}</p>
            </div>
          </div>

          {draft ? (
            <div className="mt-5 space-y-5 text-sm leading-7 text-ink/80">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {uiText.titleField}
                </span>
                <input
                  value={draft.title}
                  onChange={(event) => updateDraftField("title", event.target.value)}
                  className="w-full rounded-2xl border border-fog/70 bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {uiText.summaryField}
                </span>
                <textarea
                  value={draft.summary}
                  onChange={(event) => updateDraftField("summary", event.target.value)}
                  className="min-h-[110px] w-full rounded-2xl border border-fog/70 bg-white/90 px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {uiText.spatialMapField}
                </span>
                <textarea
                  value={draft.spatialMapMarkdown}
                  onChange={(event) =>
                    updateDraftField("spatialMapMarkdown", event.target.value)
                  }
                  className="min-h-[220px] w-full rounded-2xl border border-fog/70 bg-white/90 px-4 py-3 font-mono text-sm leading-7 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {uiText.narrativeField}
                </span>
                <textarea
                  value={draft.narrativeRoute}
                  onChange={(event) =>
                    updateDraftField("narrativeRoute", event.target.value)
                  }
                  className="min-h-[180px] w-full rounded-2xl border border-fog/70 bg-white/90 px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
                />
              </label>

              <section>
                <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {uiText.keyConceptsEditor}
                </h4>
                <div className="mt-3 space-y-3">
                  {draft.keyConcepts.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="rounded-2xl bg-paper p-4">
                      <div className="grid gap-3">
                        <input
                          value={item.name}
                          onChange={(event) =>
                            updateConcept(index, "name", event.target.value)
                          }
                          className="w-full rounded-2xl border border-fog/70 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
                          placeholder={uiText.conceptName}
                        />
                        <textarea
                          value={item.description}
                          onChange={(event) =>
                            updateConcept(index, "description", event.target.value)
                          }
                          className="min-h-[92px] w-full rounded-2xl border border-fog/70 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
                          placeholder={uiText.conceptDescription}
                        />
                        <input
                          value={item.relation}
                          onChange={(event) =>
                            updateConcept(index, "relation", event.target.value)
                          }
                          className="w-full rounded-2xl border border-fog/70 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
                          placeholder={uiText.conceptRelation}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center gap-3 rounded-[1.5rem] border border-dashed border-fog bg-gradient-to-b from-white/70 to-paper/40 px-5 py-10 text-center">
              <span className="text-3xl opacity-40">📄</span>
              <p className="max-w-xs text-sm leading-7 text-ink/45">{uiText.editorEmpty}</p>
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-lg shadow-ink/5 backdrop-blur-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fog/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 text-lg">📋</span>
                <h3 className="font-display text-2xl text-ink">{uiText.history}</h3>
              </div>
              <p className="mt-1 text-sm leading-7 text-ink/55">{uiText.historyHint}</p>
            </div>
            <button
              type="button"
              onClick={clearHistory}
              disabled={!history.length}
              className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50 hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uiText.clearHistory}
            </button>
          </div>

          {history.length ? (
            <div className="mt-5 space-y-4">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => loadHistoryItem(entry)}
                  className={`w-full rounded-[1.25rem] border px-5 py-4 text-left transition-all ${
                    entry.id === activeHistoryId
                      ? "border-accent/40 bg-accent/5 shadow-sm"
                      : "border-fog/60 bg-white/80 hover:border-accent/25 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 break-words font-display text-lg leading-snug text-ink">{entry.result.title}</div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      entry.mode === "live" ? "bg-accent/10 text-accent" : "bg-moss/10 text-moss"
                    }`}>
                      {entry.mode === "live" ? uiText.liveAi : uiText.mockMode}
                    </span>
                  </div>
                  <div className="mt-2 break-words text-sm leading-7 text-ink/60 line-clamp-2">{entry.focusGoal}</div>
                  <div className="mt-3 text-xs text-ink/35">
                    {uiText.updatedAt}
                    {new Date(entry.updatedAt).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center gap-3 rounded-[1.5rem] border border-dashed border-fog bg-gradient-to-b from-white/70 to-paper/40 px-5 py-10 text-center">
              <span className="text-3xl opacity-40">📭</span>
              <p className="max-w-xs text-sm leading-7 text-ink/45">{uiText.historyEmpty}</p>
            </div>
          )}
        </section>
      </div>
    </section>

      {/* Preview fullscreen modal */}
      {previewFull && draft && (
        <div
          className="fixed inset-0 z-50 flex flex-col overflow-auto bg-[#f8f3ea]/98 p-6 backdrop-blur-sm"
          onClick={() => setPreviewFull(false)}
        >
          <button
            type="button"
            onClick={() => setPreviewFull(false)}
            className="sticky top-0 z-10 mb-6 self-end rounded-full border border-fog bg-white/90 px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:border-accent hover:text-accent"
          >
            ✕ 关闭全屏
          </button>

          <div className="mx-auto w-full max-w-4xl space-y-6">
            <section className="overflow-hidden rounded-[1.5rem] border border-accent/15 bg-gradient-to-br from-white via-white to-accent/5 p-6 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">🧠</span>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{uiText.currentVersion}</span>
              </div>
              <h4 className="mt-1 font-display text-3xl leading-tight text-ink">{draft.title}</h4>
              <p className="mt-4 text-base leading-8 text-ink/72">{draft.summary}</p>
            </section>

            <section className="rounded-[1.5rem] bg-white p-6">
              <h3 className="mb-1 flex items-center gap-2 font-display text-xl text-ink">
                <span>🗺️</span> {uiText.spatialPreview}
              </h3>
              <div className="relative ml-3 space-y-0 border-l-2 border-accent/20 pl-8">
                {spatialSections.map((section, index) => (
                  <div key={`full-${section.title}-${index}`} className="relative pb-5 last:pb-0">
                    <span className="absolute -left-[43px] flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white shadow-sm shadow-accent/25">
                      {index + 1}
                    </span>
                    <article className="rounded-[1rem] border border-fog/80 bg-gradient-to-br from-white to-paper px-6 py-5 shadow-sm">
                      <h5 className="font-semibold text-ink text-lg">{section.title}</h5>
                      <div className="mt-3 space-y-3">
                        {section.items.map((item, i) => (
                          <div key={i} className="flex gap-3 rounded-lg bg-paper/70 px-4 py-3 text-base leading-8 text-ink/78">
                            <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-moss/60" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.5rem] bg-white p-6">
              <h3 className="mb-1 flex items-center gap-2 font-display text-xl text-ink">
                <span>🚶</span> {uiText.narrativePreview}
              </h3>
              <div className="relative ml-3 space-y-0 border-l-2 border-moss/25 pl-8">
                {narrativeSteps.map((step, index) => (
                  <div key={`full-${step}-${index}`} className="relative pb-4 last:pb-0">
                    <span className="absolute -left-[39px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-moss bg-white text-xs font-bold text-moss shadow-sm">
                      {index + 1}
                    </span>
                    <div className="rounded-[1rem] border border-fog/60 bg-gradient-to-br from-white to-paper/80 px-5 py-4 shadow-sm">
                      <p className="text-base leading-8 text-ink/78">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.5rem] bg-white p-6">
              <h3 className="mb-4 flex items-center gap-2 font-display text-xl text-ink">
                <span>🔗</span> {uiText.keyConcepts}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {draft.keyConcepts.map((item, index) => {
                  const accentBar = ["bg-accent", "bg-moss", "bg-amber-600"];
                  const tagStyle = ["bg-accent/10 text-accent", "bg-moss/10 text-moss", "bg-amber-100 text-amber-700"];
                  const ci = index % accentBar.length;
                  return (
                    <article key={`full-${item.name}-${index}`} className="overflow-hidden rounded-[1rem] border border-fog/60 bg-gradient-to-b from-white to-paper/60 shadow-sm">
                      <div className={"h-0.5 w-full " + accentBar[ci]} />
                      <div className="px-5 py-4">
                        <h5 className="font-semibold text-ink text-lg">{item.name}</h5>
                        <span className={"mt-1.5 inline-block rounded-full px-3 py-0.5 text-xs font-semibold " + tagStyle[ci]}>
                          {item.relation}
                        </span>
                        <p className="mt-3 text-base leading-8 text-ink/72">{item.description}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Image fullscreen modal */}
      {imageFull && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
          onClick={() => setImageFull(false)}
        >
          <button
            type="button"
            onClick={() => setImageFull(false)}
            className="absolute right-6 top-6 z-10 rounded-full bg-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/40"
          >
            ✕ 关闭
          </button>
          <img
            src={imageUrl}
            alt="建筑草图全屏"
            className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {imageProvider && (
            <span className="mt-4 text-sm text-white/50">{imageProvider}</span>
          )}
        </div>
      )}

      {showAssessment && (
        <MemoryAssessment
          currentType={profileType}
          onSelect={setProfileType}
          onClose={() => setShowAssessment(false)}
        />
      )}
    </>
  );
}
