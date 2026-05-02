import { NextResponse } from "next/server";

import { generateMemoryMap } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      learnerName?: string;
      sourceText?: string;
      focusGoal?: string;
      profileType?: "spatial" | "visual" | "logical";
    };

    if (!body.sourceText?.trim()) {
      return NextResponse.json(
        { error: "sourceText is required." },
        { status: 400 }
      );
    }

    const generated = await generateMemoryMap({
      learnerName: body.learnerName,
      sourceText: body.sourceText,
      focusGoal: body.focusGoal,
      profileType: body.profileType
    });

    return NextResponse.json(generated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate memory map.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
