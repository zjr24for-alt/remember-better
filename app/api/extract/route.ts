import { NextResponse } from "next/server";

import { extractTextFromUploadedFile } from "@/lib/extract-text";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请先选择文件。" }, { status: 400 });
    }

    const extracted = await extractTextFromUploadedFile(file);
    if (!extracted.text.trim()) {
      return NextResponse.json(
        { error: "文件已读取，但没有提取到可用文本。" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      sourceText: extracted.text,
      detectedType: extracted.detectedType,
      fileName: file.name
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "文件解析失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
