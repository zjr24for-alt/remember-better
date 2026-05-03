import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { writeFile, mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const runtime = "nodejs";

async function runPython(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python", ["scripts/ocr.py", ...args], {
      cwd: process.cwd(),
      timeout: 300000 // 5 min
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", (code: number | null) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr || "OCR exited with code " + code));
    });

    proc.on("error", reject);
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    // Save to temp dir
    const tempDir = await mkdtemp(join(
      process.env.REMEMBER_BETTER_TEMP || tmpdir(),
      "remember-ocr-"
    ));

    try {
      const filePath = join(tempDir, file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      const output = await runPython([filePath]);
      const result = JSON.parse(output) as { text?: string; error?: string };

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        sourceText: result.text || "",
        detectedType: file.name.endsWith(".pdf") ? "pdf" :
                      file.name.endsWith(".pptx") ? "pptx" : "ppt",
        fileName: file.name
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR 识别失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
