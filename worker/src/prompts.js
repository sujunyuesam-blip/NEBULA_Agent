// prompts.js - NEBULA 生成引擎 v3
// 稳定性策略：Function Calling（API 级 JSON Schema 硬约束）+ 题卡级分解（小输出）
// 提示词只负责「内容质量与教学法」，不再负责「结构格式」。

// ============================================================================
// 教学法引擎（基于学习科学的实证证据）
//  - Dunlosky et al. (2013) 元分析：提取练习/间隔练习为最高效用学习技巧
//  - Weinstein, Madan & Sumeracki (2018) The Science of Learning 六大策略
//  - Vygotsky 最近发展区(ZPD)；Bloom 认知目标分类学；Sweller 认知负荷
//  - Dweck 成长型思维；Keller ARCS；Csikszentmihalyi 心流
// ============================================================================
export const PEDAGOGY_ENGINE = `【教学法要求（基于学习科学实证，逐条落实）】
1. 最近发展区：内容难度=学习者当前水平+1，从已知出发搭脚手架。
2. 提取练习：warmup 预热问题让学习者先想后学；测验本身即提取练习。
3. 间隔重复：从第 2 章起，每章至少 1 题关联前章核心概念。
4. 精细加工与自我解释：explainRight 解释"为什么对"；optionHints 解释"为什么这个思路错"，引导先自问再作答。
5. 生成效应：case 开放题让学习者先产出答案再对照。
6. 双重编码：每个抽象概念至少配一个可画面化的类比或场景。
7. 认知负荷：每段讲解只承载一个核心概念；术语首次出现必须解释。
8. 成长型思维：错误引导必须传递"错误是学习路标"，严禁贬低学习者。
9. 动机与心流：章节结尾留钩子引出下一章；题目难度渐进。
10. 布鲁姆层级：题目覆盖 记忆→理解→应用→分析 至少四层；专家级增加 评价与创造。`;

export const SYSTEM_PROMPT = `你是 NEBULA 教育内容引擎——由教育专家、领域专家与课程架构师组成的团队。
你通过函数调用输出结构化内容。所有内容必须：
1. 使用【内容语言】撰写；专业术语首次出现时可附原文。
2. 紧扣【学习者身份/目标】，案例、情境、侧重点为该身份量身定制。
3. 遵循【个性化画像】与【教学法要求】。

${PEDAGOGY_ENGINE}`;

// ---- 难度/时长/画像档案 ----
export const DIFF_PROFILES = {
  beginner: {
    label: "入门级",
    chapters: 3,
    quizPerChapter: 3,
    style: "语言极其通俗易懂，多用生活类比与剧情；避免公式堆砌；选项不超过 4 个；题型以单选与判断为主，穿插 1 个趣味多选题。",
  },
  advanced: {
    label: "进阶级",
    chapters: 4,
    quizPerChapter: 4,
    style: "理论讲解与应用结合，给出关键公式或框架并解释其含义；题型均衡（单选、多选、判断、连线）；引导解析要指出思维误区。",
  },
  expert: {
    label: "专家级",
    chapters: 5,
    quizPerChapter: 5,
    style: "包含公式推导或底层逻辑分析，可涉及领域内争议与前沿研究；题型覆盖排序与案例分析；解析要体现深度与批判性思维。",
  },
};

export const QUIZ_TYPES = ["single", "multi", "judge", "match", "order", "case"];

export const LEVEL_PROFILES = {
  zero: "学习者为零基础：一切概念从直觉出发，避免术语黑话，多用生活类比；",
  novice: "学习者有入门了解：快速回顾基础后进入核心，术语首次出现时给出解释；",
  intermediate: "学习者已进阶掌握：跳过基础铺垫，直接深入原理与推导；",
  expert: "学习者接近专家：内容聚焦底层逻辑、前沿争议与研究视角；",
};

export const STYLE_PROFILES = {
  story: "叙事风格：用剧情故事串联知识点，章节间保持角色与情节连续性；",
  academic: "叙事风格：严谨学术，按“定义→原理→推导→应用”组织，语言克制；",
  case: "叙事风格：案例实战，每个概念配真实案例与可操作步骤；",
  fun: "叙事风格：轻松幽默，多用俏皮比喻，但知识点必须准确；",
};

export const SCENARIO_PROFILES = {
  exam: "应用场景：备考。内容紧扣考点、题型与答题技巧，附易错点提醒；",
  work: "应用场景：工作应用。提供可直接落地的清单、模板与实操建议；",
  interest: "应用场景：兴趣拓展。强调知识图谱与跨领域的趣味联系；",
  teaching: "应用场景：教学备课。内容结构化、便于讲解与出题，附教学提示；",
};

const DURATION_PROFILES = {
  quick: { chaptersAdj: -1, quiz: 3 },
  standard: { chaptersAdj: 0, quiz: 0 },
  deep: { chaptersAdj: 1, quiz: 1 },
};

export function resolveProfile(difficulty, duration) {
  const base = DIFF_PROFILES[difficulty] || DIFF_PROFILES.beginner;
  const d = DURATION_PROFILES[duration] || DURATION_PROFILES.standard;
  const chapters = Math.min(5, Math.max(3, base.chapters + d.chaptersAdj));
  const quiz = d.quiz ? d.quiz : Math.min(6, Math.max(3, base.quizPerChapter));
  return {
    label: base.label,
    chapters,
    quizPerChapter: quiz,
    styleText: base.style,
    durationNote:
      duration === "quick"
        ? "课程为 10 分钟快餐式：章节与题目少而精，只保留最核心的内容。"
        : duration === "deep"
          ? "课程为 1 小时深度式：内容完整展开，可加入延伸思考题。"
          : "",
  };
}

function personalizationText({ level, style, scenario }) {
  const parts = [];
  if (LEVEL_PROFILES[level]) parts.push(LEVEL_PROFILES[level]);
  if (STYLE_PROFILES[style]) parts.push(STYLE_PROFILES[style]);
  if (SCENARIO_PROFILES[scenario]) parts.push(SCENARIO_PROFILES[scenario]);
  return parts.join("\n");
}

function wrongItemsText(wrongItems) {
  if (!Array.isArray(wrongItems) || wrongItems.length === 0) return "";
  const list = wrongItems
    .slice(0, 10)
    .map((w, i) => `${i + 1}. ${w.question}${w.answer ? `（正确答案：${w.answer}）` : ""}`)
    .join("\n");
  return `【错题强化模式】课程必须围绕以下错题涉及的知识点设计针对性讲解与变式练习：\n${list}\n`;
}

function feedbackText(feedback) {
  if (!feedback) return "";
  return `【上一版课程的用户反馈】（修改意见必须逐条落实，重写不满足的章节与题目）：
${String(feedback).slice(0, 2000)}
`;
}

export function langName(iso) {
  const map = {
    zh: "中文", en: "English", fr: "Français", ru: "Русский", es: "Español", ar: "العربية",
    ja: "日本語", de: "Deutsch", pt: "Português", it: "Italiano", ko: "한국어", hi: "हिन्दी",
    tr: "Türkçe", vi: "Tiếng Việt", id: "Bahasa Indonesia", nl: "Nederlands", pl: "Polski",
    th: "ไทย", uk: "Українська", fa: "فارسی", he: "עברית", sv: "Svenska", cs: "Čeština",
    el: "Ελληνικά", ro: "Română", hu: "Magyar", fi: "Suomi", da: "Dansk", no: "Norsk",
    ms: "Bahasa Melayu", bn: "বাংলা", ur: "اردو",
  };
  return map[iso] || iso || "中文";
}

// ============================================================================
// JSON Schemas（Function Calling 硬约束）
// ============================================================================
export const OUTLINE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "课程标题，<=20 字" },
    subtitle: { type: "string", description: "副标题一句话，<=40 字" },
    coverTagline: { type: "string", description: "封面引导一句话，<=30 字" },
    intro: { type: "string", description: "封面剧情引言，80~150 字，建立情境" },
    chapters: {
      type: "array",
      description: "章节列表",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "章节 id，如 c1" },
          title: { type: "string", description: "章节标题，<=16 字" },
          story: { type: "string", description: "本章剧情描述一句话，<=40 字" },
          quizMix: {
            type: "array",
            description: "本章题型列表（从 single/multi/judge/match/order/case 中选）",
            items: { type: "string", enum: ["single", "multi", "judge", "match", "order", "case"] },
          },
        },
        required: ["id", "title", "story", "quizMix"],
      },
    },
    finaleTitle: { type: "string", description: "终章标题，<=16 字" },
    finalePrompt: { type: "string", description: "引导学习者写下学习发现的提示，<=60 字" },
    glossary: {
      type: "array",
      description: "3~6 个核心术语",
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          definition: { type: "string", description: "一句话定义" },
        },
        required: ["term", "definition"],
      },
    },
  },
  required: ["title", "subtitle", "coverTagline", "intro", "chapters", "finaleTitle", "finalePrompt", "glossary"],
};

export const PROSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "章节标题，<=16 字" },
    story: { type: "string", description: "本章剧情展开，60~120 字" },
    warmup: {
      type: "object",
      description: "预热问题（提取练习：先想后学）",
      properties: {
        question: { type: "string", description: "预热问题，<=50 字，激活旧知识或好奇心" },
        hint: { type: "string", description: "思考提示，<=40 字，不直接给答案" },
      },
      required: ["question", "hint"],
    },
    content: {
      type: "array",
      description: "讲解段落，2~4 段，每段 40~120 字",
      items: { type: "string" },
    },
    keyPoints: {
      type: "array",
      description: "本章核心要点，2~4 条",
      items: { type: "string" },
    },
    reward: { type: "string", description: "本章徽章名，<=10 字" },
  },
  required: ["title", "story", "warmup", "content", "keyPoints", "reward"],
};

// 按题型构建题卡 Schema（一次调用一张卡，输出极小 → 失败率极低）
export function quizCardSchema(type) {
  const base = {
    question: { type: "string", description: "题干，<=60 字" },
    explainRight: { type: "string", description: "答对后的完整解析，解释为什么对，<=120 字" },
  };
  const byType = {
    single: {
      options: { type: "array", description: "3~4 个选项", items: { type: "string" } },
      correct: { type: "array", description: "正确选项下标数组（一个元素）", items: { type: "integer" } },
      optionHints: { type: "array", description: "与选项一一对应的错误引导（为什么错+如何重想）", items: { type: "string" } },
    },
    multi: {
      options: { type: "array", description: "3~4 个选项", items: { type: "string" } },
      correct: { type: "array", description: "正确选项下标数组（至少一个）", items: { type: "integer" } },
      optionHints: { type: "array", description: "与选项一一对应的错误引导", items: { type: "string" } },
    },
    judge: {
      judgeStatement: { type: "string", description: "一句判断陈述，<=60 字" },
      correct: { type: "boolean", description: "该陈述是否正确" },
      optionHints: { type: "array", description: "两条错误引导：分别对应“认为正确”与“认为错误”的错误思路", items: { type: "string" } },
    },
    match: {
      pairs: { type: "array", description: "3~4 组 [左项, 右项] 配对", items: { type: "array", items: { type: "string" } } },
    },
    order: {
      sequence: { type: "array", description: "3~4 个步骤，按正确顺序排列", items: { type: "string" } },
    },
    case: {
      casePrompt: { type: "string", description: "开放问题，<=80 字" },
    },
  };
  const props = { ...base, ...(byType[type] || byType.single) };
  const required = Object.keys(props);
  return {
    type: "object",
    properties: props,
    required,
  };
}

export const QUIZ_CARD_TOOLS = {
  single: { type: "function", function: { name: "emit_quiz_card", description: "输出一道单选题", parameters: quizCardSchema("single") } },
  multi: { type: "function", function: { name: "emit_quiz_card", description: "输出一道多选题", parameters: quizCardSchema("multi") } },
  judge: { type: "function", function: { name: "emit_quiz_card", description: "输出一道判断题", parameters: quizCardSchema("judge") } },
  match: { type: "function", function: { name: "emit_quiz_card", description: "输出一道连线配对题", parameters: quizCardSchema("match") } },
  order: { type: "function", function: { name: "emit_quiz_card", description: "输出一道排序题", parameters: quizCardSchema("order") } },
  case: { type: "function", function: { name: "emit_quiz_card", description: "输出一道案例分析开放题", parameters: quizCardSchema("case") } },
};

export const OUTLINE_TOOLS = [
  { type: "function", function: { name: "emit_outline", description: "输出课程大纲", parameters: OUTLINE_SCHEMA } },
];
export const PROSE_TOOLS = [
  { type: "function", function: { name: "emit_prose", description: "输出章节讲解内容", parameters: PROSE_SCHEMA } },
];

// 题卡专用精简系统提示（输入更短 → 首 token 更快；教学法要点浓缩）
export const CARD_SYSTEM_PROMPT = `你是 NEBULA 教育内容引擎的出题专家。通过函数调用输出一道结构化测验题。
要求：内容用【内容语言】；必须基于提供的【本章讲解内容】出题，题干引用本章的具体概念/公式/案例，禁止「本章核心概念」「本知识点」等占位表述；紧扣学习者身份与本章主题；optionHints 必须解释"为什么这个思路错并引导重想"；explainRight 解释"为什么对"；错误引导不得贬低学习者（成长型思维）。`;

// ============================================================================
// 降级格式说明（自定义模型不支持 Function Calling / json_object 时使用）
// ============================================================================
export function outlineFormatHint() {
  return `输出严格 JSON 对象（不要任何其他文字），结构如下：
{"title":"课程标题","subtitle":"副标题","coverTagline":"封面引导","intro":"封面引言","chapters":[{"id":"c1","title":"章节标题","story":"剧情一句话","quizMix":["single","judge"]}],"finaleTitle":"终章标题","finalePrompt":"发现提示","glossary":[{"term":"术语","definition":"定义"}]}`;
}

export function proseFormatHint() {
  return `输出严格 JSON 对象（不要任何其他文字），结构如下：
{"title":"章节标题","story":"剧情","warmup":{"question":"预热问题","hint":"提示"},"content":["段落1","段落2"],"keyPoints":["要点1","要点2"],"reward":"徽章名"}`;
}

export function quizCardFormatHint(type) {
  const tpl = {
    single: '{"type":"single","question":"题干","options":["A","B","C","D"],"correct":[0],"optionHints":["引导1","引导2","引导3","引导4"],"explainRight":"解析"}',
    multi: '{"type":"multi","question":"题干","options":["A","B","C","D"],"correct":[0,2],"optionHints":["引导1","引导2","引导3","引导4"],"explainRight":"解析"}',
    judge: '{"type":"judge","question":"题干","judgeStatement":"陈述","correct":true,"optionHints":["认为正确时的错误引导","认为错误时的错误引导"],"explainRight":"解析"}',
    match: '{"type":"match","question":"题干","pairs":[["左1","右1"],["左2","右2"],["左3","右3"]],"explainRight":"解析"}',
    order: '{"type":"order","question":"题干","sequence":["步骤1","步骤2","步骤3"],"explainRight":"解析"}',
    case: '{"type":"case","question":"题干","casePrompt":"开放问题","explainRight":"参考要点"}',
  }[type] || '{"type":"single","question":"题干","options":["A","B","C","D"],"correct":[0],"optionHints":["引导"],"explainRight":"解析"}';
  return `输出严格 JSON 对象（不要任何其他文字），结构如下：\n${tpl}`;
}

// ============================================================================
// 内容要求提示词（不含结构格式说明）
// ============================================================================
export function outlinePrompt({ topic, role, difficulty, domain, lang, level, style, scenario, duration, wrongItems, feedback }) {
  const p = resolveProfile(difficulty, duration);
  return `【学习主题】：${topic}
【学习者身份/目标】：${role || "通用学习者"}
【专业领域】：${domain || "待定"}
【难度阶梯】：${p.label}
【内容语言】：${langName(lang)}
【个性化画像】（必须严格遵循）：
${personalizationText({ level, style, scenario })}
${feedbackText(feedback)}${p.durationNote}${wrongItemsText(wrongItems)}
要求：
- 恰好 ${p.chapters} 个章节，id 依次为 c1..c${p.chapters}，难度递进、剧情连贯、章章留钩子。
- 每章 quizMix 恰好 ${p.quizPerChapter} 个题型（从 ${JSON.stringify(QUIZ_TYPES)} 中选择，难度越高题型越多样）。
- ${p.styleText}`;
}

export function prosePrompt({ topic, role, difficulty, domain, lang, outline, chapter, chapterIndex, chapterCount, level, style, scenario, duration, wrongItems, feedback }) {
  const p = resolveProfile(difficulty, duration);
  return `【学习主题】：${topic}
【学习者身份/目标】：${role || "通用学习者"}
【专业领域】：${domain || "待定"}
【难度阶梯】：${p.label}
【内容语言】：${langName(lang)}
【个性化画像】：
${personalizationText({ level, style, scenario })}
${feedbackText(feedback)}${wrongItemsText(wrongItems)}
【课程大纲】：${JSON.stringify({ title: outline.title, chapters: outline.chapters.map((c) => c.title) })}

撰写第 ${chapterIndex} 章（共 ${chapterCount} 章）「${chapter.title}」的讲解内容。
剧情线索：${chapter.story}
要求：
- ${p.styleText}
- 预热问题（warmup）必须能激活学习者已有知识或好奇心，与本章核心概念直接相关。
- content 每段只承载一个核心概念；术语首次出现必须解释；抽象概念配可画面化的类比。
- keyPoints 提炼可迁移的要点（将用于后续章节的间隔复习）。`;
}

export function quizCardPrompt({ topic, role, difficulty, domain, lang, outline, chapter, chapterProse, chapterIndex, chapterCount, type, cardIndex, cardTotal, prevKeyPoints, level, style, scenario, duration, wrongItems, feedback }) {
  const p = resolveProfile(difficulty, duration);
  const typeHint = {
    single: "单选题：3~4 个选项，仅一个正确。",
    multi: "多选题：3~4 个选项，至少一个正确。",
    judge: "判断题：给出一句陈述并判定真假。",
    match: "连线题：3~4 组概念与含义配对。",
    order: "排序题：3~4 个步骤按正确顺序排列。",
    case: "案例分析开放题：给出真实场景问题与参考答案要点。",
  }[type] || "";
  const spacingNote = chapterIndex > 1 && prevKeyPoints?.length
    ? `【间隔重复】本题需关联前面章节的核心概念之一：${prevKeyPoints.join("；")}`
    : "";
  const contentDigest = chapterProse
    ? `【本章讲解内容】（题目必须基于以下内容出题，不得脱离）：
本章标题：${chapterProse.title || chapter.title}
核心要点：${(chapterProse.keyPoints || []).join("；")}
正文摘要：${(chapterProse.content || []).slice(0, 4).map((s) => String(s).slice(0, 120)).join(" / ")}
预热问题：${String(chapterProse.warmup?.question || "").slice(0, 80)}`
    : "";
  return `【学习主题】：${topic}
【学习者身份/目标】：${role || "通用学习者"}
【专业领域】：${domain || "待定"}
【难度阶梯】：${p.label}
【内容语言】：${langName(lang)}
【个性化画像】：
${personalizationText({ level, style, scenario })}
${feedbackText(feedback)}${wrongItemsText(wrongItems)}
【所在章节】：第 ${chapterIndex} 章「${chapter.title}」（共 ${chapterCount} 章）
${contentDigest}
【本题信息】：本章第 ${cardIndex} 题（共 ${cardTotal} 题），题型：${typeHint}
${spacingNote}
要求：
- ${p.styleText}
- 题干必须引用本章的具体概念、公式、原理或案例（如「开普勒第一定律」「椭圆轨道」），禁止使用「本章核心概念」「本知识点」「上述内容」等占位表述，否则视为不合格。
- 选项必须与主题相关且有干扰性，不能出现明显无关的凑数项。
- 全题务必精炼：选项 <=20 字、optionHints 每条 <=30 字、explainRight <=80 字，避免输出被截断。
- optionHints 与选项一一对应、各不相同，解释该错误思路的原因并引导重新思考。
- 题目需体现「理解/应用/分析」等布鲁姆认知层级，避免纯记忆题。`;
}

// ============================================================================
// 审计 / 反思 / 识别（保持 JSON 输出 + 容错解析）
// ============================================================================
export function auditPrompt({ topic, domain, difficulty, courseJson }) {
  return `你是一个严格的课程质量审计员。请基于以下【五维量表】对课程打分（每维 0-100 整数）。

【课程主题】：${topic}
【专业领域】：${domain || "通用"}
【难度】：${difficulty}
【课程内容摘要】：${courseJson}

六维量表：
1. accuracy 学术准确性：内容有无事实/公式/概念错误。
2. fit 教学适配度：内容与学习者身份/目标/难度的匹配程度。
3. depth 交互深度：引导质量、题型多样性、反馈颗粒度。
4. fun 趣味性：剧情吸引力与游戏化设计。
5. personalization 个性化指数：案例/情境与学习者的相关程度。
6. compliance 需求一致性：章节数、题目数量与题型分布、内容范围是否与要求一致（缺章节/缺题/偏离主题大幅扣分）。

输出 JSON（严格 JSON，无其他文字）：
{"accuracy": 85, "fit": 80, "depth": 75, "fun": 70, "personalization": 82, "compliance": 80, "comment": "一句话总评（<=60 字）"}`;
}

export function reflectPrompt({ domain, topic, content }) {
  return {
    system:
      "你是一个极其毒舌但学术要求极高的教授。评价用户的课程学习感悟，指出认知盲区。输出严格 JSON：{\"score\": 0-100 整数, \"comment\": \"点评与改进建议（<=120 字）\", \"nextStep\": \"建议的下一步学习主题（<=40 字，可直接用于生成新课程）\"}，无其他文字。",
    user: `【课程主题】：${topic}\n【领域】：${domain || "通用"}\n【学习者感悟】：${content}`,
  };
}

export function identifyPrompt({ topic, lang }) {
  return {
    system:
      "你是学科分类引擎。输出严格 JSON：{\"domain\": \"标准学科名（<=16 字）\", \"chapters\": 建议章节数(3-5 整数), \"difficultyNote\": \"一句话难度建议（<=40 字）\"}，无其他文字。",
    user: `请识别主题「${topic}」的学术/行业领域。domain 用【${langName(lang)}】输出，chapters 依据主题复杂度给 3~5。`,
  };
}
