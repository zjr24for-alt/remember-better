"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

type Props = { text: string; className?: string };

export function RenderMath({ text, className }: Props) {
  if (!text.includes("$")) {
    return <span className={className}>{text}</span>;
  }

  // Split text by LaTeX delimiters $$...$$ and $...$
  const parts: Array<{ type: "text" | "display" | "inline"; content: string }> = [];
  let remaining = text;

  // First handle display math $$...$$
  while (remaining.includes("$$")) {
    const start = remaining.indexOf("$$");
    if (start > 0) parts.push({ type: "text", content: remaining.slice(0, start) });
    remaining = remaining.slice(start + 2);
    const end = remaining.indexOf("$$");
    if (end === -1) {
      parts.push({ type: "text", content: remaining });
      remaining = "";
      break;
    }
    parts.push({ type: "display", content: remaining.slice(0, end) });
    remaining = remaining.slice(end + 2);
  }

  // Then handle inline math $...$
  if (remaining) {
    const inlineParts = remaining.split("$");
    for (let i = 0; i < inlineParts.length; i++) {
      if (i % 2 === 0) {
        if (inlineParts[i]) parts.push({ type: "text", content: inlineParts[i] });
      } else {
        parts.push({ type: "inline", content: inlineParts[i] });
      }
    }
  }

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === "text") return <span key={i}>{part.content}</span>;
        try {
          const html = katex.renderToString(part.content, {
            throwOnError: false,
            displayMode: part.type === "display"
          });
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{ __html: html }}
              className={part.type === "display" ? "my-2 block text-center" : ""}
            />
          );
        } catch {
          return <span key={i} className="text-red-500">${part.content}$</span>;
        }
      })}
    </span>
  );
}
