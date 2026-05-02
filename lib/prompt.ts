import { memoryProfiles, type MemoryProfileType } from "@/lib/memory-profile";

export function buildIdentifyPrompt(sourceText: string, focusGoal?: string) {
  return `
你是 Remember Better 的内容识别引擎。你的任务是快速分析一段学习材料，识别它的主题、类型、关键主题和难度。

学习目标：${focusGoal?.trim() || "未指定"}

原始材料：
${sourceText.trim()}

请返回一个 JSON 对象，包含以下字段：
- topic: 材料的核心主题（一句话概括，不超过 50 字）
- contentType: 材料类型（例如：教科书章节、论文摘要、演讲稿、技术文档、百科条目、考试笔记等）
- keyThemes: 3-5 个关键主题词或短语的数组
- difficulty: 难度估计（入门/中等/进阶/专家）

只返回合法 JSON，不要附加解释文字。
`.trim();
}

export function buildMemoryMapPrompt(
  sourceText: string,
  focusGoal: string | undefined,
  identified: { topic: string; contentType: string; keyThemes: string[]; difficulty: string },
  profileType?: MemoryProfileType
) {
  const profile = memoryProfiles[profileType || "spatial"];
  const themeList = identified.keyThemes.map((t) => "- " + t).join("\n");

  // Profile-specific output instructions
  const spatialInstructions: Record<MemoryProfileType, string> = {
    spatial: [
      "spatialMapMarkdown：用 Markdown 描述一个可穿行的记忆宫殿。每个 ## 标题是一个房间或地标，用 + 列出该位置的记忆锚点。至少 3 个房间，用建筑隐喻连接（走廊、楼梯、大门）。",
      "narrativeRoute：第一人称步行路线，从入口开始，穿过每个房间，描述在每个位置看到和触摸到的知识。"
    ].join("\n"),
    visual: [
      "spatialMapMarkdown：用 Markdown 描述一幅视觉全景图。每个 ## 标题是一个视觉区域（前景、中景、远景、中央焦点、边缘细节），用 + 列出该区域的视觉元素和色彩。",
      "narrativeRoute：电影镜头式的描述，从全景推近到特写，描述光影、色彩和视觉层次。"
    ].join("\n"),
    logical: [
      "spatialMapMarkdown：用 Markdown 描述一个知识网络结构。每个 ## 标题是一个逻辑节点（核心原理、分支推论、应用案例、反例边界），用 + 列出该节点的论据和逻辑关系。",
      "narrativeRoute：逻辑推理路径，从核心公理出发，逐步展开推论链，揭示概念之间的因果关系。"
    ].join("\n")
  };

  return `
你是 Remember Better 的${profile.label}翻译引擎。
你的任务不是教学，而是把学习材料翻译成最适合${profile.label}学习者记忆的形式。

${profile.description}

你已经识别出这份材料：
- 主题：${identified.topic}
- 类型：${identified.contentType}
- 关键主题：${identified.keyThemes.join("、")}
- 难度：${identified.difficulty}

学习者画像：${profile.label}
画像特征：
${profile.lens.map((item) => "- " + item).join("\n")}

转换原则：
${profile.promptDirectives.map((item) => "- " + item).join("\n")}

空间结构风格：${profile.spatialMapStyle}
叙事风格：${profile.narrativeStyle}

输出要求：
- 只返回合法 JSON，不要附加解释文字
- 必须包含这些字段：title, summary, spatialMapMarkdown, narrativeRoute, keyConcepts
- title：体现材料核心的${profile.label}风格标题
- summary：用 2-3 句话概括，使用${profile.label}风格的比喻
${spatialInstructions[profileType || "spatial"]}
- keyConcepts：必须是数组，每项都包含 name, description, relation。数量等于关键主题的数量。每个概念的 description 要准确反映材料内容，relation 描述它与其他概念的关联方式
- 不要返回额外字段

关键主题（必须全部覆盖）：
${themeList}

当前学习目标：${focusGoal?.trim() || "帮助学习者快速建立一个可回忆的知识结构。"}

原始学习材料：
${sourceText.trim()}
`.trim();
}
