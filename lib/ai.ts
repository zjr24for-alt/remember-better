import { buildMemoryMapPrompt } from "@/lib/prompt";
import { generateMockResult } from "@/lib/mock-result";
import type { GenerateRequest, GenerationResult } from "@/lib/types";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

function extractJsonBlock(text: string): string {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) return fencedMatch[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) return text.slice(firstBrace, lastBrace + 1);
  return text.trim();
}

function validateResult(data: unknown): GenerationResult {
  if (!data || typeof data !== "object") throw new Error("AI returned an invalid payload.");
  const c = data as Partial<GenerationResult>;
  if (
    typeof c.title !== "string" || typeof c.summary !== "string" ||
    typeof c.spatialMapMarkdown !== "string" || typeof c.narrativeRoute !== "string" ||
    !Array.isArray(c.keyConcepts)
  ) throw new Error("AI payload is missing required fields.");
  return {
    title: c.title, summary: c.summary,
    spatialMapMarkdown: c.spatialMapMarkdown, narrativeRoute: c.narrativeRoute,
    keyConcepts: c.keyConcepts.map((item) => ({
      name: typeof item?.name === "string" ? item.name : "",
      description: typeof item?.description === "string" ? item.description : "",
      relation: typeof item?.relation === "string" ? item.relation : ""
    }))
  };
}

export async function generateMemoryMap(
  input: GenerateRequest
): Promise<{ result: GenerationResult; mode: "mock" | "live" }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return { result: generateMockResult(input.sourceText, input.focusGoal, input.profileType), mode: "mock" };
  }

  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const prompt = buildMemoryMapPrompt(input.sourceText, input.focusGoal, input.profileType);

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      model, temperature: 0.7,
      messages: [
        { role: "system", content: "Return only valid JSON. No prose outside the JSON object." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error("AI request failed: " + response.status + " " + err);
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI response did not include content.");

  const parsed = JSON.parse(extractJsonBlock(content));
  return { result: validateResult(parsed), mode: "live" };
}
