// deepseek.js - LLM 调用封装：超时 / 重试 / 模型路由 / 自定义 API 接入 / 结构化输出降级

import { sleep } from "./util.js";

// 前端模型标识 -> 实际模型名（预设可在 wrangler.toml 配置）
export function resolveModelName(env, modelId) {
  if (modelId === "pro") return env.MODEL_PRO || "deepseek-v4-pro0813";
  if (modelId === "custom") return "custom"; // 由请求体提供
  return env.MODEL_FLASH || "deepseek-v4-flash0731"; // flash / 默认
}

// 兼容旧标识
export function resolveModel(modelId) {
  return resolveModelName({}, modelId);
}

function endpoint(baseUrl) {
  const base = (baseUrl || "https://api.deepseek.com").trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/.test(base)) return base;
  return `${base}/chat/completions`;
}

// reasoner 不支持 temperature/top_p/response_format，需要剥离
export function buildRequestBody(model, messages, opts = {}) {
  const body = {
    model,
    messages,
    stream: false,
    max_tokens: opts.maxTokens ?? 8192,
  };
  const isReasoner = model.includes("reasoner");
  if (!isReasoner) {
    body.temperature = opts.temperature ?? 0.2;
    if (opts.topP) body.top_p = opts.topP;
    if (opts.jsonMode !== false) body.response_format = { type: "json_object" };
  }
  return body;
}

export async function chatCompletion(env, { model, messages, maxTokens, temperature, jsonMode, timeoutMs = 90000, baseUrl, apiKey }) {
  const key = apiKey || env.DEEPSEEK_API_KEY;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(buildRequestBody(model, messages, { maxTokens, temperature, jsonMode })),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`LLM ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM empty response");
    return { content, model: data.model || model, usage: data.usage };
  } finally {
    clearTimeout(timer);
  }
}

// 带重试与模型降级：pro 失败自动降级 flash；单模型重试 2 次（指数退避）
export async function callWithRetry(env, modelId, messages, opts = {}) {
  const baseUrl = opts.baseUrl;
  const apiKey = opts.apiKey;
  const candidates = modelId === "pro" ? ["pro", "flash"] : ["flash"];
  let lastErr;
  for (const id of candidates) {
    const model = resolveModelName(env, id);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await chatCompletion(env, { model, messages, ...opts, baseUrl, apiKey });
      } catch (e) {
        lastErr = e;
        if (attempt === 0) await sleep(1000 * (attempt + 1));
      }
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Function Calling：用 API 级 JSON Schema 强制结构化输出
// 降级链（自定义模型兼容性保障）：
//   1) tools + tool_choice（首选，硬约束）
//   2) json_object 模式 + 提示词格式说明
//   3) 纯文本 + 提示词格式说明（extractJson 兜底解析）
// 返回：JSON 字符串（tool arguments）或模型文本
// ---------------------------------------------------------------------------
async function functionCallRaw(env, model, { messages, tools, toolName, maxTokens = 4096, timeoutMs = 90000, baseUrl, apiKey, formatHint }) {
  const key = apiKey || env.DEEPSEEK_API_KEY;
  const isReasoner = model.includes("reasoner");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body = {
      model,
      messages: formatHint
        ? messages.map((m, i) => (i === 0 ? { ...m, content: `${m.content}\n${formatHint}` } : m))
        : messages,
      stream: false,
      max_tokens: maxTokens,
    };
    if (!isReasoner) {
      body.temperature = 0.2;
      if (!formatHint) {
        body.tools = tools;
        body.tool_choice = { type: "function", function: { name: toolName } };
      } else {
        body.response_format = { type: "json_object" };
      }
    }
    const res = await fetch(endpoint(baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`LLM ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = await res.json();
    const msg = data?.choices?.[0]?.message;
    const args = msg?.tool_calls?.[0]?.function?.arguments;
    if (typeof args === "string" && args.trim()) return args;
    return msg?.content || "";
  } finally {
    clearTimeout(timer);
  }
}

export async function callFunction(env, modelId, { messages, tools, toolName, maxTokens, timeoutMs, baseUrl, apiKey, formatHint, customModel }) {
  const model = modelId === "custom" ? (customModel || "gpt-4o-mini") : resolveModelName(env, modelId);
  const isCustom = modelId === "custom";
  // 1) Function Calling（硬约束）
  if (!formatHint) {
    try {
      return await functionCallRaw(env, model, { messages, tools, toolName, maxTokens, timeoutMs, baseUrl, apiKey, formatHint: null });
    } catch (e) {
      if (!isCustom && !(baseUrl || apiKey)) throw e; // 预设模型失败：交给上层重试
      console.warn(`function calling failed for ${model}, falling back to json mode:`, e?.message);
    }
  }
  // 2) json_object 模式（自定义模型兼容）
  try {
    return await functionCallRaw(env, model, { messages, tools, toolName, maxTokens, timeoutMs, baseUrl, apiKey, formatHint });
  } catch (e) {
    console.warn(`json mode failed for ${model}, falling back to plain text:`, e?.message);
  }
  // 3) 纯文本（无 response_format，靠 extractJson 解析）
  const key = apiKey || env.DEEPSEEK_API_KEY;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 90000);
  try {
    const body = {
      model,
      messages: messages.map((m, i) => (i === 0 ? { ...m, content: `${m.content}\n${formatHint}` } : m)),
      stream: false,
      max_tokens: maxTokens ?? 4096,
    };
    const res = await fetch(endpoint(baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`LLM ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timer);
  }
}
