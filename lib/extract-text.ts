import { existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";

function getTempDir(): string {
  const envDir = process.env.REMEMBER_BETTER_TEMP;
  if (envDir) return envDir;

  const dDrive = "D:\\temp\\remember-better";
  if (!existsSync(dDrive)) {
    try { mkdirSync(dDrive, { recursive: true }); } catch { /* fallback */ }
  }
  if (existsSync(dDrive)) return dDrive;

  return tmpdir();
}

import JSZip from "jszip";
import { PDFParse } from "pdf-parse";

// ---------------------------------------------------------------------------
// Text cleaning – turn raw extracted text into clean, AI‑ready prose
// ---------------------------------------------------------------------------

function cleanExtractedText(raw: string): string {
  let text = raw;

  // 1. Normalize line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. Remove common PDF header/footer noise (page numbers, repeated titles)
  text = text.replace(/^\s*\d+\s*$/gm, ""); // standalone numbers (page numbers)
  text = text.replace(/^\s*Page\s+\d+\s*(of\s+\d+)?\s*$/gim, ""); // "Page 1 of 5"

  // 3. Collapse 3+ blank lines into exactly 2 (preserve intentional paragraph gaps)
  text = text.replace(/\n{4,}/g, "\n\n\n");

  // 4. Merge single line breaks that are mid-sentence (PDF artifact)
  //    A line that doesn't end with sentence-ending punctuation likely continues.
  //    But preserve lines that are clearly headings (short, all caps, or numbered).
  const lines = text.split("\n");
  const merged: string[] = [];
  let buffer = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip truly empty lines – they are paragraph breaks
    if (!trimmed) {
      if (buffer) {
        merged.push(buffer.trim());
        buffer = "";
      }
      merged.push("");
      continue;
    }

    // Detect heading-like lines: short, or numbered, or starts with ##
    const isHeading =
      trimmed.length <= 60 &&
      /^(#{1,3}\s|\d+[\.\)、]\s*|[A-Z][A-Z\s]{10,}$|[一二三四五六七八九十]+[\.、)]|第[一二三四五六七八九十百千]+[章节]|Chapter\s+\d+|Part\s+\d+|Slide\s*\d+)/i.test(
        trimmed
      );

    // Detect if this line likely ends a sentence/paragraph
    const endsComplete = /[。！？.!?：:\-—]$/.test(trimmed);
    const nextIsHeading = false; // we don't know yet, handled in merging

    if (isHeading) {
      // Flush buffer, then add heading as its own block
      if (buffer) {
        merged.push(buffer.trim());
        buffer = "";
      }
      merged.push(trimmed);
    } else if (buffer && !endsComplete && !isHeading) {
      // Mid-paragraph line: append to buffer
      buffer += trimmed;
    } else {
      // New paragraph or end of one
      if (buffer) {
        merged.push(buffer.trim());
        buffer = "";
      }
      buffer = trimmed;
    }
  }

  if (buffer) {
    merged.push(buffer.trim());
  }

  text = merged.join("\n");

  // 5. Collapse any resulting 3+ blank lines again
  text = text.replace(/\n{4,}/g, "\n\n\n");
  // All double-blank-lines → single blank line (paragraph separator)
  text = text.replace(/\n{3,}/g, "\n\n");

  // 6. Remove excessive spaces within lines
  text = text
    .split("\n")
    .map((l) => l.replace(/[ \t]{2,}/g, " ").trim())
    .join("\n");

  // 7. Remove leading/trailing whitespace from entire text
  text = text.trim();

  // 8. If text is too short, return as-is
  if (text.length < 10) return text;

  return text;
}

// ---------------------------------------------------------------------------
// Command runner
// ---------------------------------------------------------------------------

async function runCommand(
  command: string,
  args: string[],
  cwd?: string
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "ignore"
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(command + " exited with code " + (code ?? "unknown")));
    });
  });
}

// ---------------------------------------------------------------------------
// XML text extraction (PPTX)
// ---------------------------------------------------------------------------

function extractXmlText(xml: string): string[] {
  return Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g))
    .map((match) => match[1])
    .map((text) =>
      text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim()
    )
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    // pdf-parse returns all pages concatenated; clean it up
    return cleanExtractedText(result.text);
  } finally {
    await parser.destroy();
  }
}

// ---------------------------------------------------------------------------
// PPTX
// ---------------------------------------------------------------------------

async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  // Build slide list sorted numerically
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const slides: string[] = [];

  for (const slideFile of slideFiles) {
    const slideXml = await zip.file(slideFile)?.async("text");
    if (!slideXml) continue;

    // Try to get title from slide layout relations
    const slideNum = basename(slideFile, ".xml").replace("slide", "");
    let titleTexts: string[] = [];

    // Extract from slide XML itself: look for title placeholder
    const titleMatch = slideXml.match(
      /<p:ph\s+type="(?:title|ctrTitle|subTitle)"[^>]*\/>([\s\S]*?)<\/p:sp>/i
    );
    if (titleMatch) {
      titleTexts = extractXmlText(titleMatch[1]);
    }

    // If no title placeholder found, try to find the first text block as title
    if (!titleTexts.length) {
      const firstTextBlock = slideXml.match(
        /<p:sp[^>]*>([\s\S]*?)<\/p:sp>/
      );
      if (firstTextBlock) {
        const texts = extractXmlText(firstTextBlock[1]);
        if (texts.length) {
          titleTexts = [texts[0]];
        }
      }
    }

    // Extract all text from this slide
    const allTexts = extractXmlText(slideXml);

    // Build slide block
    const slideParts: string[] = [];

    if (titleTexts.length) {
      slideParts.push("Slide " + slideNum + ": " + titleTexts.join(" "));
    } else {
      slideParts.push("Slide " + slideNum);
    }

    // Body text (everything that's not the title)
    const bodyTexts = allTexts.filter((t) => !titleTexts.includes(t));
    if (bodyTexts.length) {
      slideParts.push(bodyTexts.join("\n"));
    }

    if (slideParts.length > 1) {
      slides.push(slideParts.join("\n"));
    }
  }

  if (!slides.length) {
    return "";
  }

  return cleanExtractedText(slides.join("\n\n"));
}

// ---------------------------------------------------------------------------
// Legacy PPT conversion
// ---------------------------------------------------------------------------

async function convertLegacyPptToPptx(
  buffer: Buffer,
  originalName: string
): Promise<Buffer> {
  const tempRoot = await mkdtemp(join(getTempDir(), "remember-better-"));

  try {
    const inputName = originalName.toLowerCase().endsWith(".ppt")
      ? originalName
      : originalName + ".ppt";
    const inputPath = join(tempRoot, inputName);
    await writeFile(inputPath, buffer);

    try {
      await runCommand(
        "soffice",
        ["--headless", "--convert-to", "pptx", "--outdir", tempRoot, inputPath],
        tempRoot
      );
    } catch {
      throw new Error(
        "检测到老式 .ppt 文件，但当前服务器没有可用的 LibreOffice/soffice 转换器。请先安装 LibreOffice，或先把 .ppt 手动另存为 .pptx。"
      );
    }

    const convertedPath = join(
      tempRoot,
      basename(inputName, extname(inputName)) + ".pptx"
    );
    return await readFile(convertedPath);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function extractTextFromUploadedFile(file: File): Promise<{
  text: string;
  detectedType: "pdf" | "pptx" | "ppt";
}> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = extname(file.name).toLowerCase();

  if (extension === ".pdf") {
    const text = await extractPdfText(buffer);
    return { text, detectedType: "pdf" };
  }

  if (extension === ".pptx") {
    const text = await extractPptxText(buffer);
    return { text, detectedType: "pptx" };
  }

  if (extension === ".ppt") {
    const convertedBuffer = await convertLegacyPptToPptx(buffer, file.name);
    const text = await extractPptxText(convertedBuffer);
    return { text, detectedType: "ppt" };
  }

  throw new Error("暂不支持该文件类型。请上传 PDF、PPTX 或 PPT。");
}
