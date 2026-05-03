import { memoryProfiles, type MemoryProfileType } from "@/lib/memory-profile";

export function buildMemoryMapPrompt(
  sourceText: string,
  focusGoal: string | undefined,
  profileType?: MemoryProfileType
) {
  const profile = memoryProfiles[profileType || "spatial"];

  const spatialInstructions: Record<MemoryProfileType, string> = {
    spatial: "spatialMapMarkdown：用 Markdown 描述一个可穿行的记忆宫殿。每个 ## 标题是一个房间，用 + 列出该位置的记忆锚点。至少 3 个房间。\nnarrativeRoute：第一人称步行路线，从入口开始穿过每个房间，描述看到和触碰到的知识。",
    visual: "spatialMapMarkdown：用 Markdown 描述一幅视觉全景图。每个 ## 标题是一个视觉区域（前景、中景、远景），用 + 列出该区域的视觉元素。\nnarrativeRoute：电影镜头式描述，从全景推近到特写。",
    logical: "spatialMapMarkdown：用 Markdown 描述一个知识网络。每个 ## 标题是一个逻辑节点（核心原理、推论、案例），用 + 列出论据和关系。\nnarrativeRoute：逻辑推理路径，从核心逐步展开推论链。"
  };

  return `
你是 Remember Better 的${profile.label}翻译引擎。把学习材料翻译成最适合${profile.label}学习者的记忆形式。

${profile.description}

画像特征：
${profile.lens.map((item) => "- " + item).join("\n")}

转换原则：
${profile.promptDirectives.map((item) => "- " + item).join("\n")}

空间风格：${profile.spatialMapStyle}
叙事风格：${profile.narrativeStyle}

输出 JSON，字段：title, summary, spatialMapMarkdown, narrativeRoute, keyConcepts
- title：${profile.label}风格的标题
- summary：用形象比喻概括，保留公式的完整性和美观
${spatialInstructions[profileType || "spatial"]}
- keyConcepts：数组，每项含 name, description, relation。按材料关键主题数量
- 公式和符号用美观的 LaTeX 书写（如 $E = mc^{2}$、$\frac{a}{b}$、$\sqrt{x}$、$\sum_{i=1}^{n}$），加适当空格
- 化学式用 LaTeX（如 $\mathrm{H_2O}$、$\mathrm{CO_2}$）
- 重要公式单独成行，用 $$ ... $$ 展示，类似手写板书风格
- 所有内容保持完整，不要截断或省略

学习目标：${focusGoal?.trim() || "建立可回忆的知识结构"}

材料：
${sourceText.trim()}
`.trim();
}
