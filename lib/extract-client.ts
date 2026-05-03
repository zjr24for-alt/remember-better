// Client-side file extraction — runs in the browser, no server needed
// Uses lightweight approaches that work everywhere (including Vercel)

async function extractPdfInBrowser(file: File): Promise<string> {
  // Use the server API for PDF — it works locally with pdf-parse
  // On Vercel, falls back to reading raw text from the PDF bytes
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/extract", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json() as { sourceText?: string };
      if (data.sourceText) return data.sourceText;
    }
  } catch { /* server not available */ }

  // Ultimate fallback: try to read raw bytes for basic text extraction
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Extract readable ASCII and UTF-8 sequences from raw bytes
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let text = decoder.decode(bytes);

  // Clean up: remove non-printable sequences, keep only meaningful text
  text = text
    .replace(/[^\x20-\x7E一-鿿　-〿＀-￯\n\r\t]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (text.length < 50) {
    throw new Error("无法从 PDF 提取文本，请尝试粘贴内容到输入框。");
  }

  return text;
}

function extractXmlText(xml: string): string[] {
  return Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g))
    .map((m) => m[1])
    .map((t) =>
      t
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim()
    )
    .filter(Boolean);
}

async function extractPptxInBrowser(file: File): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const slides: string[] = [];
  for (const file of slideFiles) {
    const xml = await zip.file(file)?.async("text");
    if (!xml) continue;
    const texts = extractXmlText(xml);
    if (texts.length) slides.push(texts.join("\n"));
  }

  return slides.join("\n\n").trim();
}

export async function extractFileInBrowser(file: File): Promise<{
  text: string;
  detectedType: "pdf" | "pptx" | "ppt";
}> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    const text = await extractPdfInBrowser(file);
    return { text, detectedType: "pdf" };
  }

  if (ext === "pptx") {
    const text = await extractPptxInBrowser(file);
    return { text, detectedType: "pptx" };
  }

  if (ext === "ppt") {
    // Legacy PPT: try server conversion, fallback to message
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/extract", { method: "POST", body: formData });
    if (res.ok) {
      const data = (await res.json()) as { sourceText?: string };
      return { text: data.sourceText || "", detectedType: "ppt" };
    }
    throw new Error("老式 .ppt 文件需要服务器端 LibreOffice 转换，线上环境暂不支持。请先另存为 .pptx。");
  }

  throw new Error("暂不支持该文件类型。请上传 PDF、PPTX 或 PPT。");
}
