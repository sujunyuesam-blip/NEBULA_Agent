// identify.js - 领域识别 + 适配预检（章节建议 / 难度建议）

import { callWithRetry } from "./deepseek.js";
import { identifyPrompt, DIFF_PROFILES } from "./prompts.js";
import { extractJson, tryParseJson } from "./util.js";

export async function identifyDomain(env, { topic, lang }) {
  const fallback = {
    domain: String(topic || "General").slice(0, 16) || "General",
    chapters: 3,
    difficultyNote: "",
  };
  if (env.MOCK === "1") {
    return { domain: "应用数学", chapters: 4, difficultyNote: "主题中等复杂度，建议进阶级。" };
  }
  try {
    const { system, user } = identifyPrompt({ topic, lang });
    const res = await callWithRetry(env, "flash", [
      { role: "system", content: system },
      { role: "user", content: user },
    ], { maxTokens: 300, temperature: 0.1 });
    const parsed = tryParseJson(extractJson(res.content) || res.content);
    if (parsed && typeof parsed === "object") {
      const chapters = Math.min(5, Math.max(3, parseInt(parsed.chapters, 10) || 3));
      const domain = String(parsed.domain || "").trim().slice(0, 16);
      return {
        domain: domain || fallback.domain,
        chapters,
        difficultyNote: String(parsed.difficultyNote || "").slice(0, 60),
      };
    }
    return { ...fallback, domain: String(res.content || "").trim().slice(0, 16) || fallback.domain };
  } catch (e) {
    console.warn("identify failed:", e?.message);
    return fallback;
  }
}

// 章节数决策：优先用户显式选择，其次 AI 建议，最后按难度模板默认值
export function resolveChapterCount(userChapters, aiChapters, difficulty) {
  const n = parseInt(userChapters, 10);
  if (n >= 3 && n <= 5) return n;
  if (aiChapters >= 3 && aiChapters <= 5) return aiChapters;
  const p = DIFF_PROFILES[difficulty] || DIFF_PROFILES.beginner;
  return p.chapters;
}
