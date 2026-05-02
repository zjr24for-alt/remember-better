export type MemoryProfileType = "spatial" | "visual" | "logical";

export type MemoryProfile = {
  type: MemoryProfileType;
  label: string;
  icon: string;
  description: string;
  lens: string[];
  promptDirectives: string[];
  spatialMapStyle: string;
  narrativeStyle: string;
};

export const memoryProfiles: Record<MemoryProfileType, MemoryProfile> = {
  spatial: {
    type: "spatial",
    label: "空间叙事型",
    icon: "🏰",
    description: "你通过穿行空间来记忆。抽象概念在你脑中自动变成房间、走廊和地标，你沿路径移动来回忆。",
    lens: [
      "先从整体空间布局入手，再按顺序穿行细节。",
      "将抽象概念锚定到房间、地标、门槛和转弯处。",
      "通过第一人称移动和叙事推进来回忆知识。"
    ],
    promptDirectives: [
      "把知识变成学习者可以走进的场景，而不是扁平清单。",
      "每个概念都应映射到一个地点、一个动作或一个观察到的物体。",
      "优先刻画空间关系、行进顺序和令人难忘的视觉钩子。",
      "使用建筑隐喻：房间、走廊、塔楼、花园、桥梁。"
    ],
    spatialMapStyle: "多房间记忆宫殿，带编号区域和连接通道",
    narrativeStyle: "第一人称步行导览，描述每一步看到和触碰到的知识"
  },
  visual: {
    type: "visual",
    label: "视觉全景型",
    icon: "🎨",
    description: "你用图像和色彩来记忆。脑海中浮现的是生动的画面、对比强烈的场景和富有美感的视觉布局。",
    lens: [
      "从一个强烈的中心图像或场景开始，再围绕它添加细节。",
      "用色彩、对比、大小和视觉层次来编码重要性。",
      "通过在大脑中对视觉全景的不同区域进行缩放来回忆。"
    ],
    promptDirectives: [
      "构建一幅丰富的视觉全景——一个包含所有关键元素的宏大画面。",
      "使用生动的感官细节：色彩、质感、光影、氛围。",
      "按视觉层次排列概念：前景放核心，背景放上下文。",
      "制造戏剧性对比：明与暗、大与小、鲜艳与柔和。"
    ],
    spatialMapStyle: "单一全景画面，按重要性和色彩分区排列",
    narrativeStyle: "电影镜头式描述，横摇全景再推近特写"
  },
  logical: {
    type: "logical",
    label: "逻辑关系型",
    icon: "🧩",
    description: "你通过逻辑关系来记忆。概念之间的因果、层级和类比是你最强的记忆锚点。",
    lens: [
      "从核心原理或论点出发，再向外分支到支撑观点。",
      "借助逻辑连接词：原因→结果、前提→结论、问题→方案。",
      "通过跟随推理链条和心智模型来回忆。"
    ],
    promptDirectives: [
      "构建一个心智模型或框架——一个每个部分都有明确功能的系统。",
      "用熟悉系统做类比：机器、生态系统、组织架构、网络拓扑。",
      "展示层级和关系：父→子、输入→输出、一般→具体。",
      "每个概念至少连接两个其他概念，并有清晰的逻辑关系说明。"
    ],
    spatialMapStyle: "网络关系图，中心论点通过带标签的连线连接支撑节点",
    narrativeStyle: "逻辑推演流程，从基础逐步建构到结论"
  }
};

export const defaultMemoryProfile = memoryProfiles.spatial;

// Assessment questions
export const assessmentQuestions = [
  {
    id: "q1",
    question: "回忆一本书的内容时，你最先想起的是什么？",
    options: [
      { label: "某段话在页面上的位置——左上角还是右下角", profile: "spatial" as MemoryProfileType },
      { label: "书中描绘的画面、场景或颜色", profile: "visual" as MemoryProfileType },
      { label: "核心论点之间的逻辑关系和论证结构", profile: "logical" as MemoryProfileType }
    ]
  },
  {
    id: "q2",
    question: "要记住一串信息（如购物清单），你会怎么做？",
    options: [
      { label: "把每样东西放在熟悉的路线沿途（如从家门口到超市的路径）", profile: "spatial" as MemoryProfileType },
      { label: "在脑中画一幅生动的图，把所有物品放进画面里", profile: "visual" as MemoryProfileType },
      { label: "按类别分组（蔬菜、日用品、饮料）并按逻辑关系记忆", profile: "logical" as MemoryProfileType }
    ]
  },
  {
    id: "q3",
    question: "学习一个新主题时，哪种方式让你最容易理解？",
    options: [
      { label: "一张标注了地点和路径的地图或空间布局图", profile: "spatial" as MemoryProfileType },
      { label: "色彩丰富的信息图、插画或视频演示", profile: "visual" as MemoryProfileType },
      { label: "结构清晰的思维导图、大纲或逻辑树", profile: "logical" as MemoryProfileType }
    ]
  },
  {
    id: "q4",
    question: "跟朋友描述一个你去过的地方，你会怎么讲？",
    options: [
      { label: "按行走路线：从门口进去，左手边是什么，往前走又看到什么", profile: "spatial" as MemoryProfileType },
      { label: "先描述整体氛围和视觉印象，再挑几个最漂亮的细节细说", profile: "visual" as MemoryProfileType },
      { label: "先说这个地方是干什么的，有什么特点，跟别的地方有什么不同", profile: "logical" as MemoryProfileType }
    ]
  }
];

export function determineProfile(answers: MemoryProfileType[]): MemoryProfileType {
  const counts: Record<MemoryProfileType, number> = { spatial: 0, visual: 0, logical: 0 };
  for (const a of answers) counts[a]++;
  if (counts.spatial >= counts.visual && counts.spatial >= counts.logical) return "spatial";
  if (counts.visual >= counts.spatial && counts.visual >= counts.logical) return "visual";
  return "logical";
}
