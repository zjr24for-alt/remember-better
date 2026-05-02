import { NextResponse } from "next/server";

export const runtime = "nodejs";

function buildImagePrompt(spatialMapMarkdown: string, title: string, narrativeRoute?: string): string {
  // Parse zones and their items
  const zones = spatialMapMarkdown.split(/\n##\s+/).filter(Boolean);
  const zoneDescriptions: string[] = [];

  for (const zone of zones) {
    const lines = zone.split(/\n/);
    const zoneName = lines[0].replace(/^##\s*/, "").trim();
    const items = lines.slice(1)
      .map((l) => l.replace(/^[+\-*]\s*/, "").trim())
      .filter(Boolean);
    if (zoneName) {
      zoneDescriptions.push(
        "ROOM \"" + zoneName + "\": contains " + (items.length ? items.join("; ") : "a central focal point") + "."
      );
    }
  }

  const zoneList = zoneDescriptions.join(" ");
  const pathDesc = zoneDescriptions.length > 1
    ? "A winding path connects the rooms in sequence, flowing naturally through the space."
    : "The room stands alone as a complete memory vault.";

  const narrativeHint = narrativeRoute
    ? "The journey narrative: " + narrativeRoute.slice(0, 400) + "."
    : "";

  return [
    "A detailed, hand-drawn architectural cutaway sketch of a memory palace titled \"" + title + "\".",
    "Isometric perspective, blueprint style on aged parchment with warm sepia ink and subtle watercolor washes.",
    "The structure contains " + zoneDescriptions.length + " visually distinct chambers connected by corridors and archways:",
    zoneList,
    pathDesc,
    "Each room has its own character and architectural details reflecting its contents.",
    "Labels in elegant calligraphy, compass rose, scale bar.",
    "The overall composition should feel like a explorer's field notebook sketch.",
    "Clean lines, clear spatial hierarchy, dreamy ambient lighting.",
    "No human figures or modern objects.",
    narrativeHint
  ].filter(Boolean).join(" ");
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error("Failed to fetch image: " + response.status);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "image/png";
    return "data:" + contentType + ";base64," + buffer.toString("base64");
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithAPI(
  apiUrl: string,
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: "1024x1024"
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(response.status + " " + errText.slice(0, 400));
    }

    const payload = (await response.json()) as {
      data?: Array<{ url?: string }>;
    };

    const url = payload.data?.[0]?.url;
    if (!url) throw new Error("No image URL in response");
    return url;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      spatialMapMarkdown?: string;
      title?: string;
      narrativeRoute?: string;
    };

    if (!body.spatialMapMarkdown?.trim() || !body.title?.trim()) {
      return NextResponse.json(
        { error: "缺少 spatialMapMarkdown 或 title。" },
        { status: 400 }
      );
    }

    const prompt = buildImagePrompt(body.spatialMapMarkdown.trim(), body.title.trim(), body.narrativeRoute?.trim());

    const sfKey = process.env.SILICONFLOW_API_KEY;
    const oaKey = process.env.OPENAI_API_KEY;

    let rawUrl = "";
    let provider = "";

    // Try paid providers first
    if (sfKey) {
      try {
        const model = process.env.SILICONFLOW_IMAGE_MODEL || "Tongyi-MAI/Z-Image-Turbo";
        rawUrl = await generateWithAPI(
          "https://api.siliconflow.cn/v1/images/generations",
          sfKey,
          model,
          prompt
        );
        provider = "SiliconFlow";
      } catch {
        // Fall through
      }
    }

    if (!rawUrl && oaKey) {
      try {
        const model = process.env.OPENAI_IMAGE_MODEL || "dall-e-3";
        rawUrl = await generateWithAPI(
          "https://api.openai.com/v1/images/generations",
          oaKey,
          model,
          prompt
        );
        provider = "OpenAI";
      } catch {
        // Fall through
      }
    }

    if (!rawUrl) {
      // Free: Pollinations.ai — fetch server-side so browser doesn't need to reach it
      const encoded = encodeURIComponent(prompt);
      rawUrl = "https://image.pollinations.ai/prompt/" + encoded + "?width=1024&height=1024&nologo=true&seed=42";
      provider = "Pollinations.ai";
    }

    // Convert the image to base64 on the server (goes through Clash proxy if configured)
    const base64 = await fetchImageAsBase64(rawUrl);

    return NextResponse.json({ imageUrl: base64, provider });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "建筑草图生成失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
