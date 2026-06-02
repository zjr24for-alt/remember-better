// arXiv API Proxy — 解决浏览器 CORS 限制
// 部署在 Vercel，为 dp-learn 论文搜索提供后端代理

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // 构建 arXiv API URL
  const arxivParams = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    arxivParams.set(key, value);
  }

  const arxivUrl = `https://export.arxiv.org/api/query?${arxivParams.toString()}`;

  try {
    const response = await fetch(arxivUrl, {
      headers: {
        "User-Agent": "dp-learn/1.0 (mailto:zjr24for@gmail.com)",
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `arXiv API returned ${response.status}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await response.text();

    return new Response(body, {
      headers: {
        "Content-Type": "application/xml",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}
