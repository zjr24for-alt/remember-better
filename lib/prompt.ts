import { memoryProfiles, type MemoryProfileType } from "@/lib/memory-profile";

export function buildMemoryMapPrompt(
  sourceText: string,
  focusGoal: string | undefined,
  profileType?: MemoryProfileType
) {
  const profile = memoryProfiles[profileType || "spatial"];

  const spatialInstructions: Record<MemoryProfileType, string> = {
    spatial: [
      "spatialMapMarkdown：用 Markdown 描述一个可穿行的记忆宫殿。每个 ## 标题是一个房间（标题不超过 15 字），用 + 列出该位置 3-5 个记忆锚点。至少 3 个房间。",
      "每个锚点用纯文本短句描述（每句不超过 25 字），如「一张木桌上刻着牛顿第一定律的表述」，禁止在 + 条目中使用公式。",
      "narrativeRoute：第一人称步行路线，从入口开始穿过每个房间，描述看到和触碰到的知识。"
    ].join("\n"),
    visual: [
      "spatialMapMarkdown：用 Markdown 描述一幅视觉全景图。每个 ## 标题是一个视觉区域（标题不超过 15 字），用 + 列出该区域 3-5 个视觉锚点。",
      "每个锚点用纯文本短句描述（每句不超过 25 字），如「前景中央有一团金色火焰代表核聚变」，禁止在 + 条目中使用公式。",
      "narrativeRoute：电影镜头式描述，从全景推近到特写。"
    ].join("\n"),
    logical: [
      "spatialMapMarkdown：用 Markdown 描述一个知识网络。每个 ## 标题是一个逻辑节点（标题不超过 15 字），用 + 列出该节点 3-5 个论据或要点。",
      "每个要点用纯文本短句描述（每句不超过 25 字），如「因为力是改变运动状态的原因而非维持原因」，禁止在 + 条目中使用公式。",
      "narrativeRoute：逻辑推理路径，从核心逐步展开推论链。"
    ].join("\n")
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
- spatialMapMarkdown 的 + 条目（锚点）必须全部用纯文本短句，禁止包含任何 $ 公式。公式只在 keyConcepts 和 narrativeRoute 中用 LaTeX
- 锚点句式：场景化、动作化描述，让读者在脑中看到画面而非抽象符号
- 所有内容保持完整，不要截断或省略

学习目标：${focusGoal?.trim() || "建立可回忆的知识结构"}

材料：
${sourceText.trim()}
`.trim();
}
