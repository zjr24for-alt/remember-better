import type { GenerationResult } from "@/lib/types";

function extractKeyTerms(text: string): Array<{ name: string; description: string; relation: string }> {
  const candidates: string[] = [];

  function addCandidate(t: string) {
    if (t && !candidates.includes(t)) {
      candidates.push(t);
    }
  }

  // English: extract longer words, filtering common stop words
  const enWords = text.match(/[A-Z][a-z]{3,14}|[a-z]{4,16}/g) || [];
  const enStop = /^(this|that|with|from|which|their|there|about|would|could|should|process|because|through|between)$/i;
  for (const w of enWords) {
    if (!enStop.test(w) && !candidates.includes(w)) {
      candidates.push(w);
    }
  }

  // Chinese: split on punctuation, extract meaningful substrings
  const sentences = text.split(/(?<=[。！？.!?\n])/).filter((s) => s.trim());
  const zhStopFirst = /^[的了吗呢啊吧呀着过是和在有无被把让到对从向用因为所以可以能够应该需要会要就但也而或且与当于之其这那哪怎如何什么多少非常很太更最不都只才就已再又还便好来去说道看想像知道觉得认为一二三四五六七八九十使]/u;

  for (const sentence of sentences.slice(0, 6)) {
    const segments = sentence.split(/[，,、；;：:＋\-—\s]+/).map((p) => p.trim()).filter((p) => p.length >= 2);

    for (const seg of segments) {
      // Split Chinese long phrases by common particles
      if (/[一-鿿]/.test(seg) && seg.length >= 2) {
        const subParts = seg.split(/[的之所得与和地]/);
        for (const sp of subParts) {
          const t = sp.trim();
          if (t.length >= 2 && t.length <= 14 && /[一-鿿]/.test(t) && !zhStopFirst.test(t)) {
            addCandidate(t);
          }
        }
        // If seg is already short enough, also add it whole
        if (seg.length <= 14 && !zhStopFirst.test(seg)) {
          addCandidate(seg);
        }
      }
    }
  }

  if (candidates.length === 0) {
    candidates.push("核心概念", "关键知识点", "记忆锚点");
  }

  const relationTemplates = [
    "这是理解整个主题的基础。",
    "与前后内容形成逻辑链条。",
    "是记忆空间中的一个关键锚点。",
    "帮助串联其他相关概念。",
    "在整体结构中起连接作用。"
  ];

  return candidates.slice(0, 5).map((name, i) => ({
    name,
    description: "关于“" + name + "”的核心要点，来自你提供的学习材料。",
    relation: relationTemplates[i % relationTemplates.length]
  }));
}

export function generateMockResult(
  sourceText: string,
  focusGoal?: string,
  _profileType?: string
): GenerationResult {
  const trimmed = sourceText.trim();
  const paragraphs = trimmed.split(/\n\s*\n/).filter((p) => p.trim());
  const sentences = trimmed.split(/(?<=[。！？.!?])/).filter((s) => s.trim());

  const firstLine = paragraphs[0]?.split(/\r?\n/)[0]?.trim() || sentences[0] || trimmed;
  const title = (firstLine.length > 50 ? firstLine.slice(0, 48) + "…" : firstLine) + " 的空间记忆版";

  const summary = sentences.slice(0, 3).join("").trim() || trimmed.slice(0, 200);

  const spatialZones: string[] = [];
  const zoneLabels = ["入口大厅", "核心展厅", "连接走廊", "深层房间", "顶层展望台"];
  const rawParagraphs = paragraphs.length >= 2 ? paragraphs : sentences.reduce<string[]>((acc, s, i) => {
    const chunkIndex = Math.floor(i / 3);
    if (!acc[chunkIndex]) acc[chunkIndex] = "";
    acc[chunkIndex] += s;
    return acc;
  }, []);

  for (let i = 0; i < Math.min(rawParagraphs.length, 5); i++) {
    const zoneTitle = zoneLabels[i];
    const paraSentences = rawParagraphs[i].split(/(?<=[。！？.!?])/).filter((s) => s.trim()).slice(0, 3);
    if (paraSentences.length === 0) continue;
    const items = paraSentences.map((s) => "+ " + s.trim());
    spatialZones.push("## " + zoneTitle + "\n" + items.join("\n"));
  }

  if (spatialZones.length === 0) {
    spatialZones.push("## " + zoneLabels[0] + "\n+ " + trimmed.slice(0, 120));
  }

  const spatialMapMarkdown = spatialZones.join("\n\n");

  const narrativeSentences = sentences.slice(0, 6);
  const connectors = [
    "我首先走进",
    "然后我来到",
    "接着我穿过",
    "之后我进入",
    "最后我登上",
    "我回到起点重新思考"
  ];
  const narrativeParts = narrativeSentences.map((s, i) => {
    const connector = connectors[i] || "接着";
    return connector + "，" + s.trim();
  });
  const narrativeRoute = narrativeParts.length > 0
    ? narrativeParts.join("。") + "。"
    : "我开始探索这个知识空间，慢慢建立起属于自己的记忆路线。";

  const keyConcepts = extractKeyTerms(trimmed);

  return { title, summary, spatialMapMarkdown, narrativeRoute, keyConcepts };
}
