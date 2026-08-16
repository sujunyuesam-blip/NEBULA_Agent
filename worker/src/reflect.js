// reflect.js - 学习感悟反思评估（毒舌教授），结构化 JSON 输出 + 容错

import { callWithRetry } from "./deepseek.js";
import { reflectPrompt } from "./prompts.js";
import { extractJson, tryParseJson } from "./util.js";
import { clampScore } from "./audit.js";

export async function reflectOnLearning(env, { domain, topic, content }) {
  if (env.MOCK === "1") {
    return {
      score: 76,
      comment: "MOCK 点评：观点基本到位，但还停留在复述层面，缺少与自身场景的连接。（本地开发模式）",
      nextStep: topic ? `继续深入「${topic}」的进阶应用` : "选择一个新主题继续探索",
    };
  }
  try {
    const { system, user } = reflectPrompt({ domain, topic, content });
    const res = await callWithRetry(env, "flash", [
      { role: "system", content: system },
      { role: "user", content: user },
    ], { maxTokens: 800, temperature: 0.1 });
    let parsed = tryParseJson(extractJson(res.content) || res.content);
    if (!parsed) {
      const nums = (res.content.match(/\d+/g) || []).map(Number).filter((n) => n >= 0 && n <= 100);
      parsed = { score: nums[0] ?? 70, comment: res.content.slice(0, 200) };
    }
    return {
      score: clampScore(parsed.score) ?? 70,
      comment: String(parsed.comment || "").slice(0, 300),
      nextStep: String(parsed.nextStep || "").slice(0, 120) || topic
        ? `继续深入「${topic}」的进阶应用`
        : "选择一个新主题继续探索",
    };
  } catch (e) {
    console.warn("reflect failed:", e?.message);
    return { score: 70, comment: "评估服务暂时不可用，请稍后再试。", nextStep: "稍后再试一次" };
  }
}
