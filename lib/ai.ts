import { buildIdentifyPrompt, buildMemoryMapPrompt } from "@/lib/prompt";
import { generateMockResult } from "@/lib/mock-result";
import type { GenerateRequest, GenerationResult } from "@/lib/types";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function extractJsonBlock(text: string): string {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text.trim();
}

function validateResult(data: unknown): GenerationResult {
  if (!data || typeof data !== "object") {
    throw new Error("AI returned an invalid payload.");
  }

  const candidate = data as Partial<GenerationResult>;

  if (
    typeof candidate.title !== "string" ||
    typeof candidate.summary !== "string" ||
    typeof candidate.spatialMapMarkdown !== "string" ||
    typeof candidate.narrativeRoute !== "string" ||
    !Array.isArray(candidate.keyConcepts)
  ) {
    throw new Error("AI payload is missing required fields.");
  }

  return {
    title: candidate.title,
    summary: candidate.summary,
    spatialMapMarkdown: candidate.spatialMapMarkdown,
    narrativeRoute: candidate.narrativeRoute,
    keyConcepts: candidate.keyConcepts.map((item) => ({
      name: typeof item?.name === "string" ? item.name : "",
      description: typeof item?.description === "string" ? item.description : "",
      relation: typeof item?.relation === "string" ? item.relation : ""
    }))
  };
}

async function callAI(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("AI request failed: " + response.status + " " + errorText);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI response did not include content.");
  }

  return content;
}

export async function generateMemoryMap(
  input: GenerateRequest
): Promise<{ result: GenerationResult; mode: "mock" | "live" }> {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Determine which provider to use (DeepSeek preferred)
  let apiKey: string;
  let baseUrl: string;
  let model: string;

  if (deepseekKey) {
    apiKey = deepseekKey;
    baseUrl = DEEPSEEK_API_URL;
    model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  } else if (openaiKey) {
    apiKey = openaiKey;
    baseUrl = OPENAI_API_URL;
    model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  } else {
    return { result: generateMockResult(input.sourceText, input.focusGoal, input.profileType), mode: "mock" };
  }

  // Step 1: Identify and analyze the content
  const identifyPrompt = buildIdentifyPrompt(input.sourceText, input.focusGoal);
  const identification = await callAI(
    apiKey,
    baseUrl,
    model,
    "Return only valid JSON. No prose outside the JSON object.",
    identifyPrompt
  );

  let identified: { topic: string; contentType: string; keyThemes: string[]; difficulty: string };
  try {
    identified = JSON.parse(extractJsonBlock(identification));
    if (!identified.topic || !identified.contentType || !Array.isArray(identified.keyThemes)) {
      throw new Error("Incomplete identification");
    }
  } catch {
    // Fallback: treat the whole response as analysis notes
    identified = {
      topic: input.sourceText.trim().slice(0, 80),
      contentType: "未知类型",
      keyThemes: [],
      difficulty: "中等"
    };
  }

  // Step 2: Generate the memory map based on identification
  const memoryMapPrompt = buildMemoryMapPrompt(
    input.sourceText,
    input.focusGoal,
    identified,
    input.profileType
  );
  const memoryMapContent = await callAI(
    apiKey,
    baseUrl,
    model,
    "Return only valid JSON. No prose outside the JSON object.",
    memoryMapPrompt
  );

  const parsed = JSON.parse(extractJsonBlock(memoryMapContent));
  return { result: validateResult(parsed), mode: "live" };
}
