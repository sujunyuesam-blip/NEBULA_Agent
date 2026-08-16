// util.js - 通用工具：JSON 响应 / CORS / 请求体解析

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

export function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  const list = (env.ALLOWED_ORIGINS || "https://www.nebulavessel.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(origin) ? origin : null;
}

export function withCors(response, request, env) {
  const origin = allowedOrigin(request, env);
  const headers = new Headers(response.headers);
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(response.body, { status: response.status, headers });
}

export function handleCorsPreflight(request, env) {
  const origin = allowedOrigin(request, env);
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function uid() {
  return crypto.randomUUID();
}

export function nowSec() {
  return Math.floor(Date.now() / 1000);
}

// 从模型输出中提取 JSON：剥离 markdown 围栏 / 前后杂文 / 截断修复
export function extractJson(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  let text = raw.trim();
  // 剥离 ```json ... ``` 或 ``` ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // 找第一个 { 与最后一个 }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  text = text.slice(start, end + 1);
  return text;
}

export function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
