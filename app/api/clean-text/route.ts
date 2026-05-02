import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sourceText?: string };
    if (!body.sourceText?.trim()) {
      return NextResponse.json({ error: "缺少 sourceText" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      // No API key — return original text
      return NextResponse.json({ cleanedText: body.sourceText, mode: "passthrough" });
    }

    const prompt = `
你是文本修复专家。下面这段文字是从 PDF 或 PPT 中提取的，可能存在以下问题：
- 公式乱码（如数学符号变成乱码字符）
- 奇怪的换行或断句
- 多余的空白字符
- 表格或列表格式混乱

请修复这些问题，输出一份干净、通顺、可读的文本。规则：
- 保留原文的全部内容和知识点，不要删减
- 修复乱码字符，恢复公式的可读形式（用文字描述或 LaTeX 格式均可）
- 合并被错误打断的句子
- 去除无意义的空行和多余空格
- 保持段落结构
- 只返回修复后的纯文本，不要加任何解释

原始文本：
${body.sourceText.trim()}
`.trim();

    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error("DeepSeek error: " + response.status + " " + err.slice(0, 300));
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const cleanedText = payload.choices?.[0]?.message?.content?.trim();
    if (!cleanedText) throw new Error("No content returned");

    return NextResponse.json({ cleanedText, mode: "live" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "文本修复失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
