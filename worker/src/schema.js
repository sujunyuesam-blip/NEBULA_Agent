// schema.js - 课程结构校验与修复（生成管线的最后一道防线）

import { DIFF_PROFILES } from "./prompts.js";

const QUIZ_TYPES = ["single", "multi", "judge", "match", "order", "case"];

function str(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function num(v, fallback = 0, min = 0, max = Infinity) {
  const n = typeof v === "number" ? v : parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// ---------- 大纲 ----------
export function validateOutline(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object") return { ok: false, outline: null, errors: ["大纲不是对象"] };
  const title = str(raw.title);
  const chapters = Array.isArray(raw.chapters) ? raw.chapters : [];
  if (!title) errors.push("缺少课程标题");
  if (chapters.length === 0) errors.push("缺少章节列表");
  chapters.forEach((c, i) => {
    if (!str(c?.title)) errors.push(`第 ${i + 1} 章缺少标题`);
    if (!Array.isArray(c?.quizMix) || c.quizMix.length === 0)
      errors.push(`第 ${i + 1} 章缺少题型列表 quizMix`);
  });
  return {
    ok: errors.length === 0,
    outline: {
      title,
      subtitle: str(raw.subtitle),
      coverTagline: str(raw.coverTagline),
      intro: str(raw.intro),
      chapters: chapters.slice(0, 10).map((c, i) => ({
        id: str(c?.id, `c${i + 1}`),
        title: str(c?.title, `第 ${i + 1} 章`),
        story: str(c?.story),
        quizMix: (Array.isArray(c?.quizMix) ? c.quizMix : []).filter((t) => QUIZ_TYPES.includes(t)),
      })),
      finaleTitle: str(raw.finaleTitle),
      finalePrompt: str(raw.finalePrompt),
      glossary: (Array.isArray(raw.glossary) ? raw.glossary : [])
        .map((g) => ({ term: str(g?.term), definition: str(g?.definition) }))
        .filter((g) => g.term)
        .slice(0, 12),
    },
    errors,
  };
}

// ---------- 单章 ----------
export function validateQuizItem(q, errors, prefix) {
  const type = QUIZ_TYPES.includes(q?.type) ? q.type : null;
  if (!type) {
    errors.push(`${prefix} 题型非法或缺失`);
    return { ok: false, item: null };
  }
  const question = str(q.question);
  if (!question) errors.push(`${prefix} 缺少题干`);
  // 拒绝"占位模板题"：未引用任何具体概念，说明模型没有基于本章内容出题
  if (/本章核心概念|本章核心要点|本知识点|上述内容|本章内容|该知识点/.test(question)) {
    errors.push(`${prefix} 题干为占位模板（未结合章节具体内容）`);
    return { ok: false, item: null };
  }

  let item = { type, question };
  if (type === "single" || type === "multi") {
    const options = (Array.isArray(q.options) ? q.options : []).map((o) => str(o)).filter(Boolean);
    if (options.length < 2) errors.push(`${prefix} 选项少于 2 个`);
    const correct = Array.isArray(q.correct)
      ? q.correct
      : typeof q.correct === "number"
        ? [q.correct]
        : [];
    const cleanCorrect = correct
      .map((i) => num(i, -1))
      .filter((i) => i >= 0 && i < options.length);
    if (cleanCorrect.length === 0) {
      errors.push(`${prefix} 缺少正确答案下标`);
      cleanCorrect.push(0);
    }
    if (type === "single" && cleanCorrect.length > 1) cleanCorrect.length = 1;
    const optionHints = (Array.isArray(q.optionHints) ? q.optionHints : []).map((h) => str(h));
    if (optionHints.length < options.length) errors.push(`${prefix} optionHints 与选项数量不一致`);
    item = {
      ...item,
      options: options.slice(0, 6),
      correct: cleanCorrect,
      optionHints: optionHints.slice(0, 6),
    };
  } else if (type === "judge") {
    if (!str(q.judgeStatement)) errors.push(`${prefix} 缺少判断陈述`);
    item = {
      ...item,
      judgeStatement: str(q.judgeStatement),
      correct: typeof q.correct === "boolean" ? q.correct : true,
      optionHints: (Array.isArray(q.optionHints) ? q.optionHints : []).map((h) => str(h)).slice(0, 2),
    };
  } else if (type === "match") {
    const pairs = (Array.isArray(q.pairs) ? q.pairs : [])
      .map((p) => (Array.isArray(p) ? [str(p[0]), str(p[1])] : null))
      .filter((p) => p && p[0] && p[1])
      .slice(0, 4);
    if (pairs.length < 3) errors.push(`${prefix} 连线题配对少于 3 组`);
    item = { ...item, pairs };
  } else if (type === "order") {
    const sequence = (Array.isArray(q.sequence) ? q.sequence : []).map((s) => str(s)).filter(Boolean).slice(0, 4);
    if (sequence.length < 3) errors.push(`${prefix} 排序题步骤少于 3 个`);
    item = { ...item, sequence };
  } else if (type === "case") {
    if (!str(q.casePrompt)) errors.push(`${prefix} 缺少开放题提示`);
    item = { ...item, casePrompt: str(q.casePrompt) };
  }
  item.explainRight = str(q.explainRight, "参考答案：请对照讲解内容回顾本知识点。");
  return { ok: true, item };
}

export function validateChapter(raw, expectedMix) {
  const errors = [];
  if (!raw || typeof raw !== "object") return { ok: false, chapter: null, errors: ["章节不是对象"] };
  const title = str(raw.title);
  if (!title) errors.push("章节缺少标题");
  const content = (Array.isArray(raw.content) ? raw.content : []).map((c) => str(c)).filter(Boolean);
  if (content.length === 0) errors.push("章节缺少讲解内容");
  const quizRaw = Array.isArray(raw.quiz) ? raw.quiz : [];
  const quiz = [];
  quizRaw.forEach((q, i) => {
    const r = validateQuizItem(q, errors, `第 ${i + 1} 题`);
    if (r.item) quiz.push(r.item);
  });
  if (quiz.length === 0) errors.push("章节没有可用题目");
  return {
    ok: errors.length === 0,
    chapter: {
      id: str(raw.id, "c1"),
      title,
      story: str(raw.story),
      warmup: {
        question: str(raw.warmup?.question),
        hint: str(raw.warmup?.hint),
      },
      content: content.slice(0, 6),
      keyPoints: (Array.isArray(raw.keyPoints) ? raw.keyPoints : []).map((k) => str(k)).filter(Boolean).slice(0, 6),
      reward: str(raw.reward, title).slice(0, 20),
      quiz: quiz.slice(0, 8),
    },
    errors,
  };
}

// ---------- 课程组装 ----------
export function assembleCourse(outline, chapters, { topic, role, difficulty, domain, lang, fallback = false, level = "", style = "", scenario = "", duration = "", chaptersHint = 0, model = "flash" }) {
  const p = DIFF_PROFILES[difficulty] || DIFF_PROFILES.beginner;
  // 双模板：专家级 = 专注学术排版（focus），其余 = 剧情探索排版（story）
  const mode = difficulty === "expert" ? "focus" : "story";
  return {
    schema: "nebula-course/v2",
    meta: {
      title: outline.title,
      subtitle: outline.subtitle,
      coverTagline: outline.coverTagline,
      intro: outline.intro,
      topic,
      role: role || "通用学习者",
      domain: domain || "通用",
      difficulty,
      difficultyLabel: p.label,
      lang: lang || "zh",
      mode,
      level, style, scenario, duration,
      chaptersHint: chaptersHint || chapters.length,
      model,
      chapters: chapters.length,
      totalQuestions: chapters.reduce((n, c) => n + (c.quiz?.length || 0), 0),
      fallback,
      generatedAt: Date.now(),
    },
    chapters,
    finale: {
      title: outline.finaleTitle || "最终发现",
      prompt: outline.finalePrompt || "写下你的学习发现，提交给 AI 教授评估。",
    },
    glossary: outline.glossary || [],
  };
}

// ---------- 兜底题卡（题卡级生成失败时按题型给出合法结构，尽量贴合主题） ----------
export function fallbackQuizCard(type, lang, topic) {
  const zh = lang === "zh";
  const t = topic || (zh ? "本章核心概念" : "this chapter's core concept");
  const cards = {
    single: {
      type: "single",
      question: zh ? `下列哪项最接近「${t}」的核心要点？` : `Which best captures "${t}"?`,
      options: zh
        ? ["理解它解决的问题与核心逻辑", "记住所有术语", "跳过练习直接看结论", "与已有知识完全割裂"]
        : ["Understand the problem and core logic", "Memorize every term", "Skip practice, read conclusions", "Keep it isolated from prior knowledge"],
      correct: [0],
      optionHints: [
        zh ? "正确思路：抓住“问题”与“核心逻辑”两个关键词。" : "Correct: focus on problem and core logic.",
        zh ? "术语要在语境中理解，孤立记忆会遗忘——请重新思考。" : "Terms need context; isolated memorization fades.",
        zh ? "没有练习的知识难以迁移，请重新判断。" : "Knowledge without practice doesn't transfer.",
        zh ? "新旧知识相连才是理解的关键。" : "Connecting old and new knowledge is key.",
      ],
      explainRight: zh ? "学习的关键是把知识锚定到它解决的问题上。" : "Anchor knowledge to the problem it solves.",
    },
    judge: {
      type: "judge",
      question: zh ? "判断下列说法。" : "Judge the statement.",
      judgeStatement: zh ? `理解「${t}」的最好方式是主动回忆并举例验证。` : `Active recall with examples is the best way to understand "${t}".`,
      correct: true,
      optionHints: [
        zh ? "主动回忆是最高效用的学习策略，这个说法成立。" : "Active recall is a high-utility strategy - true.",
        zh ? "被动阅读的留存远低于主动回忆，请重新判断。" : "Passive reading retains far less - reconsider.",
      ],
      explainRight: zh ? "提取练习是学习科学公认的最高效用技巧之一。" : "Retrieval practice is one of the most effective techniques.",
    },
    multi: {
      type: "multi",
      question: zh ? `学习「${t}」时，哪些做法有效？（多选）` : `Which practices help when learning "${t}"? (multi)`,
      options: zh
        ? ["用自己的话复述", "寻找反例检验", "只看不练", "讲给别人听"]
        : ["Restate in your own words", "Test with counterexamples", "Watch without practice", "Explain to someone else"],
      correct: [0, 1, 3],
      optionHints: [
        zh ? "复述是主动加工，有效！继续勾选其他做法。" : "Restating is active processing - keep going.",
        zh ? "反例检验理解的边界，有效！继续勾选其他做法。" : "Counterexamples test understanding - keep going.",
        zh ? "只看不练是被动输入，留存最低，不要选它。" : "Watching without practice retains least.",
        zh ? "费曼技巧：能教别人才是真学会，有效！" : "Feynman technique: teaching proves understanding.",
      ],
      explainRight: zh ? "复述、反例检验与教授他人都是高留存的学习方式。" : "Restating, counterexamples and teaching all boost retention.",
    },
    match: {
      type: "match",
      question: zh ? "将概念与含义配对。" : "Match concepts with meanings.",
      pairs: zh
        ? [["输入", "问题与信息"], ["处理", "理解与建构"], ["输出", "复述与运用"]]
        : [["Input", "Problem & info"], ["Processing", "Understanding"], ["Output", "Restating & applying"]],
      explainRight: zh ? "输入—处理—输出构成完整的学习闭环。" : "Input-processing-output form the learning loop.",
    },
    order: {
      type: "order",
      question: zh ? "按正确顺序排列学习步骤。" : "Order the learning steps.",
      sequence: zh
        ? ["明确要解决的问题", "学习核心概念", "主动练习与提取", "复盘并讲给别人听"]
        : ["Clarify the problem", "Learn core concepts", "Practice with retrieval", "Review and teach others"],
      explainRight: zh ? "从问题出发、以输出收尾，是最扎实的学习路径。" : "Start from the problem, end with output.",
    },
    case: {
      type: "case",
      question: zh ? `结合你的实际情况，谈谈如何把「${t}」用起来？` : `How would you apply "${t}" in your own situation?`,
      casePrompt: zh ? "请写下你的应用场景与第一步行动（30 字以上）。" : "Write your scenario and first step (30+ words).",
      explainRight: zh
        ? "参考要点：找到最痛、最高频的场景切入；先小范围验证，再逐步放大。"
        : "Key points: start with the most painful, frequent scenario; validate small, then scale.",
    },
  };
  return cards[type] || cards.single;
}
export function fallbackOutline(topic, lang) {
  const zh = lang === "zh";
  return {
    title: str(topic, zh ? "学习主题" : "Topic"),
    subtitle: zh ? "快速入门课程" : "Quick-start course",
    coverTagline: zh ? "开始你的探索之旅" : "Begin your journey",
    intro: zh
      ? `欢迎来到「${str(topic)}」速览课。本课程用最短路径带你建立核心概念与直觉。`
      : `Welcome to the quick-start course on "${str(topic)}".`,
    chapters: [1, 2, 3].map((i) => ({
      id: `c${i}`,
      title: zh ? `核心概念 ${i}` : `Core Concept ${i}`,
      story: zh ? "逐步建立理解" : "Build understanding step by step",
      quizMix: ["single", "judge"],
    })),
    finaleTitle: zh ? "你的发现" : "Your Discovery",
    finalePrompt: zh ? "写下你此刻对主题的理解。" : "Write down your understanding now.",
    glossary: [],
  };
}

export function fallbackChapter(topic, lang, index) {
  const zh = lang === "zh";
  const t = str(topic, zh ? "本主题" : "this topic");
  return {
    id: `c${index + 1}`,
    title: zh ? `核心概念 ${index + 1}` : `Core Concept ${index + 1}`,
    story: zh ? "我们从最基本的问题出发。" : "We start from the basics.",
    warmup: {
      question: zh ? `在学习之前先想一想：你认为「${t}」最可能解决什么问题？` : `Before learning: what problem do you think "${t}" most likely solves?`,
      hint: zh ? "提示：想想它出现在什么场景、被谁需要。" : "Hint: think about where it appears and who needs it.",
    },
    content: [
      zh
        ? `围绕「${t}」，先明确它要解决的问题是什么，再理解关键概念之间的关系。`
        : `For "${t}", clarify the problem it solves, then understand how key concepts relate.`,
      zh
        ? "尝试用自己的话复述核心概念，并用一个身边的例子验证你的理解。"
        : "Try restating the core concept in your own words and verify with an everyday example.",
    ],
    keyPoints: [
      zh ? "先定义问题，再学习方法" : "Define the problem before learning the method",
      zh ? "用自己的话复述 + 举例验证" : "Restate in your own words and verify with examples",
    ],
    reward: zh ? "概念奠基者" : "Concept Builder",
    quiz: [
      {
        type: "single",
        question: zh ? `下列哪项最接近「${t}」的核心目标？` : `Which best captures the core goal of "${t}"?`,
        options: zh
          ? ["解决问题并建立可复用的认知框架", "背下所有术语", "只看不练", "忽略概念之间的联系"]
          : ["Solve problems and build a reusable framework", "Memorize every term", "Watch without practice", "Ignore connections between concepts"],
        correct: [0],
        optionHints: [
          zh ? "正确思路：抓住“解决问题”与“可复用框架”这两个关键词。" : "Correct: focus on solving and reusable frameworks.",
          zh ? "死记术语只能应付一时，无法迁移应用——请重新思考学习的目的。" : "Memorizing terms alone cannot transfer to practice.",
          zh ? "只看不练会停留在表面，试着动手验证一次。" : "Watching without practice stays superficial.",
          zh ? "概念之间的联系正是理解的关键，忽略它们会支离破碎。" : "Connections are key; ignoring them fragments understanding.",
        ],
        explainRight: zh
          ? "学习的本质是把知识变成能解决问题的工具，而不是囤积术语。"
          : "Learning means turning knowledge into tools that solve problems.",
      },
      {
        type: "judge",
        question: zh ? "理解一个概念后，用自己的话复述并举例，有助于巩固。" : "Restating a concept in your own words with an example helps consolidate it.",
        judgeStatement: zh
          ? "用自己的话复述并举例，能显著提升理解深度。"
          : "Restating with examples significantly deepens understanding.",
        correct: true,
        optionHints: [
          zh ? "复述不是背诵，而是把知识纳入自己的语言系统，这个过程确实有效。" : "Restating internalizes knowledge - it works.",
          zh ? "主动加工（复述+举例）比被动阅读的留存率高得多，请重新判断。" : "Active processing beats passive reading.",
        ],
        explainRight: zh
          ? "主动加工是理解的关键：能讲清楚，才是真学会。"
          : "Active processing is key: if you can explain it, you know it.",
      },
    ],
  };
}
