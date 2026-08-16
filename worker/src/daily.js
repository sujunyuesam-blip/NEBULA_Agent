// daily.js - 每日一题：按用户画像生成当日趣味题（D1 按天缓存），答对加 XP（每天一次）

import { callWithRetry } from "./deepseek.js";
import { extractJson, tryParseJson } from "./util.js";
import { addXp } from "./gamify.js";

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

export const DAILY_MAX_SEEDS = 3; // 每天最多生成 3 道新题（刷新换题上限）

const MOCK_QUESTION = {
  topic: "学习科学",
  question: "根据艾宾浩斯遗忘曲线，哪种复习时机最有效？",
  options: ["在快要遗忘时主动回忆", "考前一天通宵背诵", "学完再也不看", "只听课不做任何练习"],
  correct: 0,
  explain: "在遗忘临界点主动回忆（提取练习）能显著强化记忆痕迹，这是间隔重复的核心原理。",
  funFact: "💡 提取练习的效果比重复阅读高出 50% 以上，所以 NEBULA 的测验本身就是高效学习的一部分。",
};

async function generateQuestion(env, topicHint) {
  const res = await callWithRetry(
    env,
    "flash",
    [
      {
        role: "system",
        content:
          "你是趣味学习出题官。出一道有启发性的单选题，语言用【语言】。只输出 JSON：{\"topic\":\"主题\",\"question\":\"题干(<=60字)\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correct\":0,\"explain\":\"解析(<=80字)\",\"funFact\":\"一个有趣冷知识(<=60字)\"}",
      },
      {
        role: "user",
        content: `围绕主题「${topicHint || "学习方法与思维技巧"}」出一道趣味挑战题。`,
      },
    ],
    { maxTokens: 600, temperature: 0.7 }
  );
  const parsed = tryParseJson(extractJson(res.content) || res.content);
  if (parsed && parsed.question && Array.isArray(parsed.options) && parsed.options.length >= 2) {
    return {
      topic: String(parsed.topic || topicHint || "").slice(0, 40),
      question: String(parsed.question).slice(0, 120),
      options: parsed.options.slice(0, 4).map((o) => String(o).slice(0, 60)),
      correct: Math.min(parsed.options.length - 1, Math.max(0, parseInt(parsed.correct, 10) || 0)),
      explain: String(parsed.explain || "").slice(0, 160),
      funFact: String(parsed.funFact || "").slice(0, 120),
    };
  }
  return null;
}

export async function getDailyQuestion(env, topicHint, seed = 1) {
  const day = dayKey();
  const cached = await env.DB.prepare("SELECT * FROM daily WHERE day = ? AND seed = ?").bind(day, seed).first();
  if (cached) {
    try { return { ...JSON.parse(cached.question), day, seed }; } catch {}
  }
  let question = null;
  if (env.MOCK === "1") {
    question = MOCK_QUESTION;
  } else {
    try { question = await generateQuestion(env, topicHint); } catch (e) {
      console.warn("daily generate failed:", e?.message);
    }
  }
  if (!question) question = MOCK_QUESTION;
  await env.DB.prepare(
    "INSERT OR REPLACE INTO daily (day, seed, topic, question, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(day, seed, question.topic, JSON.stringify(question), Math.floor(Date.now() / 1000)).run();
  return { ...question, day, seed };
}

export async function answerDaily(env, auth, { correct }) {
  const day = dayKey();
  // 当天是否已答过（以 events 为准）
  const done = await env.DB.prepare(
    "SELECT 1 FROM events WHERE user_id = ? AND type = 'daily' AND ref = ?"
  ).bind(auth.sub, day).first();
  if (done) return { ok: true, already: true, xpGained: 0 };
  let xp = 0;
  if (correct) {
    xp = await addXp(env, auth.sub, "daily", day);
  } else {
    // 答错也记录（防止刷），但不给分
    await env.DB.prepare(
      "INSERT INTO events (user_id, type, xp, ref, created_at) VALUES (?, 'daily', 0, ?, ?)"
    ).bind(auth.sub, day, Math.floor(Date.now() / 1000)).run();
  }
  return { ok: true, already: false, xpGained: xp };
}
