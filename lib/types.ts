export type GenerationResult = {
  title: string;
  summary: string;
  spatialMapMarkdown: string;
  narrativeRoute: string;
  keyConcepts: Array<{
    name: string;
    description: string;
    relation: string;
  }>;
};

export type MemoryProfileType = "spatial" | "visual" | "logical";

export type GenerateRequest = {
  learnerName?: string;
  sourceText: string;
  focusGoal?: string;
  profileType?: MemoryProfileType;
};

export type SavedGeneration = {
  id: string;
  createdAt: string;
  updatedAt: string;
  sourceText: string;
  focusGoal: string;
  mode: "mock" | "live";
  result: GenerationResult;
};
