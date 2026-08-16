// pipeline.js - 生成管线编排：
// 大纲（小 JSON）→ 逐章并行生成（每章独立校验/重试，杜绝长输出截断）→ 组装 → 五维审计
// 全程通过 emit(event, data) 向 SSE 推送进度；任何失败路径都有兜底交付。

import { callWithRetry, callFunction } from "./deepseek.js";
import {
  SYSTEM_PROMPT, CARD_SYSTEM_PROMPT, outlinePrompt, prosePrompt, quizCardPrompt, resolveProfile,
  OUTLINE_TOOLS, PROSE_TOOLS, QUIZ_CARD_TOOLS,
  outlineFormatHint, proseFormatHint, quizCardFormatHint,
} from "./prompts.js";
import {
  validateOutline, validateChapter, validateQuizItem, assembleCourse,
  fallbackOutline, fallbackChapter, fallbackQuizCard,
} from "./schema.js";
import { auditCourse } from "./audit.js";
import { extractJson, tryParseJson, sleep, uid, nowSec } from "./util.js";
import { mockOutline, mockChapter } from "./mock.js";

const CHAPTER_CONCURRENCY = 3;

const LEVELS = ["zero", "novice", "intermediate", "expert"];
const DURATIONS = ["quick", "standard", "deep"];
const STYLES = ["story", "academic", "case", "fun"];
const SCENARIOS = ["exam", "work", "interest", "teaching"];

function normInput(body) {
  const topic = String(body?.topic || "").trim().slice(0, 120);
  if (!topic) throw new Error("学习主题不能为空");
  const model = ["flash", "pro", "custom"].includes(body?.model) ? body.model : "flash";
  const custom = model === "custom"
    ? {
        baseUrl: String(body?.custom?.baseUrl || "").trim().slice(0, 200),
        apiKey: String(body?.custom?.apiKey || "").trim().slice(0, 200),
        model: String(body?.custom?.model || "").trim().slice(0, 100),
      }
    : null;
  if (model === "custom" && (!custom.baseUrl || !custom.model)) {
    throw new Error("自定义模型缺少 Base URL 或模型名");
  }
  return {
    topic,
    role: String(body?.role || "").trim().slice(0, 120),
    difficulty: ["beginner", "advanced", "expert"].includes(body?.difficulty) ? body.difficulty : "beginner",
    model,
    custom,
    lang: /^[a-z]{2,8}(-[A-Za-z]{2,8})?$/.test(String(body?.lang || "")) ? String(body.lang) : "zh",
    domain: String(body?.domain || "").trim().slice(0, 24),
    chaptersHint: body?.chapters,
    level: LEVELS.includes(body?.level) ? body.level : "novice",
    duration: DURATIONS.includes(body?.duration) ? body.duration : "standard",
    style: STYLES.includes(body?.style) ? body.style : "story",
    scenario: SCENARIOS.includes(body?.scenario) ? body.scenario : "interest",
    wrongItems: (Array.isArray(body?.wrongItems) ? body.wrongItems : [])
      .map((w) => ({ question: String(w?.question || "").slice(0, 200), answer: String(w?.answer || "").slice(0, 200) }))
      .filter((w) => w.question)
      .slice(0, 10),
    feedback: String(body?.feedback || "").trim().slice(0, 2000),
  };
}

// 自定义模型时使用的调用参数
function llmOpts(input) {
  if (input.custom) {
    return {
      baseUrl: input.custom.baseUrl,
      apiKey: input.custom.apiKey,
      customModel: input.custom.model,
    };
  }
  return {};
}

// 解析 Function Calling 返回（arguments JSON 字符串或降级文本）
function parseCall(raw) {
  return tryParseJson(extractJson(raw) || raw);
}

async function generateOutlineAi(env, input, emit) {
  const { topic, role, difficulty, domain, lang, model, level, style, scenario, duration, wrongItems } = input;
  emit("stage", { stage: "outline", text: "教育专家团队正在规划课程大纲…" });
  const userPrompt = outlinePrompt({ topic, role, difficulty, domain, lang, level, style, scenario, duration, wrongItems, feedback: input.feedback });
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const messages = [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }];
    if (attempt > 0) {
      messages.push({ role: "user", content: `上一次输出未通过校验：${lastError}。请重新调用函数输出完整大纲。` });
    }
    try {
      const raw = await callFunction(env, model, {
        messages,
        tools: OUTLINE_TOOLS,
        toolName: "emit_outline",
        maxTokens: 2000,
        formatHint: outlineFormatHint(),
        ...llmOpts(input),
      });
      const parsed = parseCall(raw);
      const { ok, outline, errors } = validateOutline(parsed || {});
      if (ok && outline) return outline;
      lastError = (errors.length ? errors.join("；") : "输出不是合法 JSON").slice(0, 400);
    } catch (e) {
      lastError = String(e?.message || e).slice(0, 400);
    }
  }
  return null; // 三次失败 → 兜底大纲
}

// ---- 1. 讲解 prose（独立生成，失败 → 兜底讲解）----
async function generateProseAi(env, input, outline, chapter, index, count) {
  const { topic, role, difficulty, domain, lang, model, level, style, scenario, duration, wrongItems, feedback } = input;
  const messages = () => [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prosePrompt({ topic, role, difficulty, domain, lang, outline, chapter, chapterIndex: index + 1, chapterCount: count, level, style, scenario, duration, wrongItems, feedback }) },
  ];
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await callFunction(env, model, {
        messages: messages(),
        tools: PROSE_TOOLS,
        toolName: "emit_prose",
        maxTokens: 2000,
        formatHint: proseFormatHint(),
        ...llmOpts(input),
      });
      const parsed = parseCall(raw);
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.content) && parsed.content.length > 0) {
        return { prose: parsed, fallback: false };
      }
    } catch (e) {
      console.warn(`chapter ${index + 1} prose attempt ${attempt + 1} failed:`, e?.message);
      await sleep(800 * (attempt + 1));
    }
  }
  const fb = fallbackChapter(topic, lang, index);
  return { prose: { title: fb.title, story: fb.story, warmup: fb.warmup, content: fb.content, keyPoints: fb.keyPoints, reward: fb.reward }, fallback: true };
}

// ---- 2. 题卡级分解：每张卡独立生成/校验/重试/兜底（间隔重复关联前章要点）----
async function generateCardsForChapter(env, input, outline, chapter, chapterProse, index, count, prevKeyPoints, onCardDone) {
  const { topic, role, difficulty, domain, lang, model, level, style, scenario, duration, wrongItems, feedback } = input;
  const quizMix = (chapter.quizMix || ["single", "judge"]).slice(0, 6);
  const cardTasks = quizMix.map((type, i) => async () => {
    const messages = () => [
      { role: "system", content: CARD_SYSTEM_PROMPT },
      { role: "user", content: quizCardPrompt({ topic, role, difficulty, domain, lang, outline, chapter, chapterProse, chapterIndex: index + 1, chapterCount: count, type, cardIndex: i + 1, cardTotal: quizMix.length, prevKeyPoints, level, style, scenario, duration, wrongItems, feedback }) },
    ];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await callFunction(env, model, {
          messages: messages(),
          tools: [QUIZ_CARD_TOOLS[type] || QUIZ_CARD_TOOLS.single],
          toolName: "emit_quiz_card",
          maxTokens: 1600,
          formatHint: quizCardFormatHint(type),
          ...llmOpts(input),
        });
        const parsed = parseCall(raw);
        if (parsed && typeof parsed === "object" && !parsed.type) parsed.type = type; // 模型漏写 type 时用请求题型补齐
        const { item } = validateQuizItem(parsed || {}, [], `第 ${i + 1} 题`);
        if (item) {
          const card = { ...item, type };
          try { onCardDone && onCardDone(); } catch {}
          return card;
        }
      } catch (e) {
        console.warn(`chapter ${index + 1} card ${i + 1} (${type}) attempt ${attempt + 1} failed:`, e?.message);
      }
    }
    try { onCardDone && onCardDone(); } catch {}
    return fallbackQuizCard(type, lang, topic);
  });
  return pool(cardTasks, 6);
}

async function pool(tasks, limit) {
  const results = new Array(tasks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

export async function runGenerationPipeline(env, rawBody, emit) {
  const input = normInput(rawBody);
  const { topic, role, difficulty, lang, domain, model } = input;

  let outline;
  let chapters = [];
  const fallbackChapters = [];
  let usedFallback = false;

  if (env.MOCK === "1") {
    outline = mockOutline(topic, role, lang);
    for (let i = 0; i < outline.chapters.length; i++) {
      emit("stage", { stage: "chapters", progress: `${i + 1}/${outline.chapters.length}`, text: `正在撰写第 ${i + 1} 章：${outline.chapters[i].title}` });
      await sleep(280);
      chapters.push(mockChapter(topic, lang, i));
    }
  } else {
    // ---- 阶段 1：大纲 ----
    outline = await generateOutlineAi(env, input, emit);
    if (!outline) {
      usedFallback = true;
      outline = fallbackOutline(topic, lang);
    }
    // 章节数收敛到「难度 × 时长」档案（用户手动选择优先）
    const p = resolveProfile(difficulty, input.duration);
    const target = input.chaptersHint >= 2 && input.chaptersHint <= 10 ? input.chaptersHint : p.chapters;
    if (outline.chapters.length > target) outline.chapters = outline.chapters.slice(0, target);
    while (outline.chapters.length < target) {
      const i = outline.chapters.length + 1;
      outline.chapters.push({ id: `c${i}`, title: `${lang === "zh" ? "补充章节" : "Extra Chapter"} ${i}`, story: "", quizMix: ["single", "judge"] });
    }
    outline.chapters.forEach((c) => {
      if (!c.quizMix || c.quizMix.length < 2) {
        c.quizMix = ["single", "judge", "multi"].slice(0, Math.max(2, Math.min(p.quizPerChapter, 3)));
      }
    });

    // ---- 阶段 2：逐章流水线（章 i 的题卡与章 i+1 的讲解并行；进度真实上报）----
    const count = outline.chapters.length;
    const totalItems = count + outline.chapters.reduce((n, c) => n + (c.quizMix || []).slice(0, 6).length, 0);
    let doneItems = 0;
    const emitProgress = (label) => {
      emit("stage", { stage: "chapters", progress: `${Math.min(doneItems, totalItems)}/${totalItems}`, text: label });
    };
    let prevKeyPoints = [];
    let nextProsePromise = (async () => {
      const res = await generateProseAi(env, input, outline, outline.chapters[0], 0, count);
      doneItems++;
      emitProgress(`第 1 章讲解已就绪`);
      return res;
    })();
    for (let i = 0; i < count; i++) {
      const proseRes = await nextProsePromise;
      const prose = proseRes.prose;
      if (proseRes.fallback) {
        fallbackChapters.push(i + 1);
        usedFallback = true;
      }
      // 并行启动下一章讲解（与本章题卡重叠）
      nextProsePromise = i + 1 < count
        ? (async () => {
            const r = await generateProseAi(env, input, outline, outline.chapters[i + 1], i + 1, count);
            doneItems++;
            emitProgress(`第 ${i + 2} 章讲解已就绪`);
            return r;
          })()
        : null;
      // 本章题卡（与下一章讲解并行）
      let cards = [];
      try {
        cards = await generateCardsForChapter(env, input, outline, outline.chapters[i], prose, i, count, prevKeyPoints, () => {
          doneItems++;
          emitProgress(`正在生成测验题…`);
        });
      } catch (e) {
        console.warn(`chapter ${i + 1} cards fatal:`, e?.message);
        cards = (outline.chapters[i].quizMix || ["single", "judge"]).map((t) => fallbackQuizCard(t, lang));
        usedFallback = true;
      }
      prevKeyPoints = (prose.keyPoints || []);
      const ch = { id: outline.chapters[i].id, ...prose, quiz: cards };
      const { chapter: validated } = validateChapter(ch, outline.chapters[i].quizMix);
      chapters.push(validated || { ...fallbackChapter(topic, lang, i), id: outline.chapters[i].id });
      emitProgress(`第 ${i + 1} 章已就绪：${outline.chapters[i].title}`);
    }
  }

  // ---- 阶段 3：组装 ----
  const course = assembleCourse(outline, chapters, { ...input, fallback: usedFallback });

  // ---- 阶段 4：五维审计（失败不阻塞）----
  emit("stage", { stage: "audit", text: "AI 质量审计：五维评估中…" });
  let audit = null;
  try {
    audit = await auditCourse(env, { topic, domain, difficulty, courseJson: JSON.stringify(course).slice(0, 5000) });
  } catch (e) {
    console.warn("audit pipeline error:", e?.message);
  }
  emit("audit", { audit });

  return { course, audit, fallback: usedFallback, fallbackChapters, model };
}
