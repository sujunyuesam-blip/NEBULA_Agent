// audit.js - 六维质量审计（0-100 雷达图数据），JSON 解析容错，失败返回 null 不阻塞课程交付

import { callWithRetry } from "./deepseek.js";
import { auditPrompt } from "./prompts.js";
import { extractJson, tryParseJson } from "./util.js";

const DIMS = ["accuracy", "fit", "depth", "fun", "personalization", "compliance"];

export function clampScore(v) {
  const n = typeof v === "number" ? Math.round(v) : parseInt(v, 10);
  if (Number.isNaN(n)) return null;
  return Math.min(100, Math.max(0, n));
}

// 兜底解析：从任意文本中按维度顺序抓取数字（容错 AI 输出格式漂移）
export function parseAuditLoose(text) {
  const result = { comment: "" };
  const nums = (text.match(/-?\d+(?:\.\d+)?/g) || []).map((n) => parseInt(n, 10)).filter((n) => n >= 0 && n <= 100);
  DIMS.forEach((d, i) => (result[d] = nums[i] ?? 60));
  const comment = (text.match(/comment["\s:：]+["']?([^"'\n]{5,80})/i) || [])[1];
  result.comment = comment ? comment.trim() : "";
  return result;
}

export async function auditCourse(env, { topic, domain, difficulty, courseJson }) {
  if (env.MOCK === "1") {
    return {
      accuracy: 88,
      fit: 85,
      depth: 80,
      fun: 82,
      personalization: 90,
      compliance: 92,
      comment: "MOCK 审计结果（本地开发模式）",
    };
  }
  try {
    const res = await callWithRetry(
      env,
      "flash",
      [
        { role: "system", content: "你是一个严格的课程质量审计员。只输出 JSON。" },
        { role: "user", content: auditPrompt({ topic, domain, difficulty, courseJson }) },
      ],
      { maxTokens: 800, temperature: 0.1 }
    );
    const text = extractJson(res.content) || res.content;
    let parsed = tryParseJson(text);
    if (!parsed) parsed = parseAuditLoose(res.content);
    const audit = { comment: "" };
    for (const d of DIMS) audit[d] = clampScore(parsed[d]) ?? 60;
    audit.comment = typeof parsed.comment === "string" ? parsed.comment.slice(0, 120) : "";
    return audit;
  } catch (e) {
    console.warn("audit failed:", e?.message);
    return null; // 审计失败不阻塞交付
  }
}
