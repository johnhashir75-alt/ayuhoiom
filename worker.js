export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Cache-Control": "no-store"
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "Crown AI" }, { headers: cors });
    }
    if (url.pathname !== "/api/chat" || request.method !== "POST") {
      return new Response("Not found", { status: 404, headers: cors });
    }
    if (!env.OPENROUTER_API_KEY) {
      return Response.json({ error: "Server API key is not configured." }, { status: 500, headers: cors });
    }

    let body;
    try { body = await request.json(); }
    catch { return Response.json({ error: "Invalid JSON." }, { status: 400, headers: cors }); }

    const model = typeof body.model === "string" ? body.model : "openai/gpt-4o-mini";
    const messages = Array.isArray(body.messages) ? body.messages.slice(-60) : [];
    if (!messages.length) {
      return Response.json({ error: "No messages supplied." }, { status: 400, headers: cors });
    }

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.SITE_URL || "https://example.com",
        "X-Title": "Crown AI"
      },
      body: JSON.stringify({ model, messages, stream: true })
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...cors,
        "Content-Type": upstream.headers.get("Content-Type") || "text/event-stream; charset=utf-8"
      }
    });
  }
};
