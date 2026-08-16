// plan.js - AI 学习路径：大目标 → 课程序列

import { callWithRetry } from "./deepseek.js";
import { extractJson, tryParseJson } from "./util.js";

const MOCK_PLAN = {
  title: "30 天学会外贸获客",
  description: "从 0 到 1 建立外贸获客能力（示例路径）",
  courses: [
    { topic: "外贸获客渠道全景", title: "渠道地图：从展会到社媒", reason: "先建立全局认知" },
    { topic: "Google 搜索开发客户", title: "谷歌指令与关键词开发", reason: "最常用的免费获客手段" },
    { topic: "LinkedIn 外贸获客", title: "领英人脉经营与转化", reason: "B2B 社媒获客核心" },
    { topic: "外贸开发信写作", title: "高回复率开发信公式", reason: "触达后的关键转化环节" },
    { topic: "外贸询盘跟进与成交", title: "询盘跟进与谈判", reason: "把线索变成订单" },
  ],
};

export async function createPlan(env, { goal, level, scenario, lang }) {
  if (env.MOCK === "1") return MOCK_PLAN;
  try {
    const res = await callWithRetry(
      env,
      "flash",
      [
        {
          role: "system",
          content:
            "你是学习路径规划师。把用户的大目标拆解为 4~6 门循序渐进的课程。每门课用「topic」概括其学习主题（20 字内，供生成课程用）。只输出 JSON：{\"title\":\"路径名\",\"description\":\"一句话\",\"courses\":[{\"topic\":\"学习主题\",\"title\":\"课程名\",\"reason\":\"为什么学这门\"}]}",
        },
        {
          role: "user",
          content: `目标：${goal}\n学习者水平：${level}\n场景：${scenario}\n请输出 JSON。`,
        },
      ],
      { maxTokens: 1500, temperature: 0.3 }
    );
    const parsed = tryParseJson(extractJson(res.content) || res.content);
    if (parsed && Array.isArray(parsed.courses) && parsed.courses.length >= 2) {
      return {
        title: String(parsed.title || goal).slice(0, 60),
        description: String(parsed.description || "").slice(0, 120),
        courses: parsed.courses.slice(0, 6).map((c) => ({
          topic: String(c.topic || "").slice(0, 60),
          title: String(c.title || c.topic || "").slice(0, 60),
          reason: String(c.reason || "").slice(0, 80),
        })),
      };
    }
    return MOCK_PLAN;
  } catch (e) {
    console.warn("plan failed:", e?.message);
    return MOCK_PLAN;
  }
}
