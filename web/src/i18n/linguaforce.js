// linguaforce.js - NEBULA 多语言引擎 v2
// UI 语言：仅中文 / 英文（其余语言库已移除；内容语言 = UI 语言）

import { EXTRA_DICT, MODEL_EXTRA, PW_EXTRA, SCHOOL_EXTRA, ADMIN_EXTRA, VERIFY_EXTRA, PROFILE_EXTRA, LEGAL_EXTRA, AUDIT_GUIDE_EXTRA, CHAT_EXTRA, CHAT2_EXTRA, CHAT3_EXTRA, CHAT4_EXTRA, GOOGLE_EXTRA, GOOGLE2_EXTRA, SCHOOL2_EXTRA, NOTIF_EXTRA, EMOJI_EXTRA, REPOST_EXTRA, SEARCH_EXTRA, REJECT_EXTRA, ADMIN2_EXTRA } from "./extra.js";

export const LANGS = [
  { code: "zh", name: "简体中文", flag: "🇨🇳", contentLang: "中文" },
  { code: "en", name: "English", flag: "🇺🇳", contentLang: "English" },
];

const DICT = {
  zh: {
    appTitle: "NEBULA AI Agent",
    brandSub: "个性化教育孵化器",
    topicLabel: "学习主题",
    topicPlace: "例如：贝叶斯定理、外贸获客、拉格朗日乘子法",
    roleLabel: "你的身份 / 学习目标",
    rolePlace: "例如：跨境电商运营，想提升转化率",
    diffLabel: "难度阶梯",
    diffBeginner: "入门", diffBeginnerSub: "科普·趣味·类比",
    diffAdvanced: "进阶", diffAdvancedSub: "理论·推导·深度",
    diffExpert: "专家", diffExpertSub: "建模·底层·前沿",
    chaptersLabel: "章节数量",
    chaptersAuto: "智能建议",
    modelLabel: "模型选择",
    modelV3: "DeepSeek-V3", modelV3Sub: "极速 & 稳定 · 推荐",
    modelR1: "DeepSeek-R1", modelR1Sub: "深度推理 · 较慢",
    domainLabel: "领域识别",
    domainWait: "等待输入主题…",
    domainAnalyzing: "正在分析归类…",
    generateBtn: "⚡ 开始建模生成",
    generating: "生成中…",
    exportBtn: "📤 导出独立文件",
    shareBtn: "🔗 复制分享链接",
    canvasEmptyTitle: "孵化台已就绪",
    canvasEmptyText: "在左侧输入学习主题与你的身份，点击「开始建模生成」，NEBULA 将为你孵化一节专属交互课程。",
    canvasTitle: "NEBULA 交互预览终端",
    tipClear: "单击清空，双击恢复",
    tipFullscreen: "全屏预览",
    tipCollapse: "收起左栏",
    tipNewWin: "新窗口打开",
    missionTabAudit: "六维审计",
    missionTabReflect: "反思评估",
    missionTabHistory: "历史记录",
    auditTitle: "AI 质量审计",
    auditWaiting: "生成课程后自动审计…",
    dimAccuracy: "学术准确性", dimFit: "教学适配度", dimDepth: "交互深度",
    dimFun: "趣味性", dimPersonalization: "个性化指数", dimCompliance: "需求一致性",
    reflectTitle: "AI 语义深度评估",
    reflectPlaceholder: "生成 Agent 后，在此提交你的学习感悟。AI 教授将评估你的理解深度。",
    reflectSubmit: "提交评估",
    reflectWaiting: "专家团队正在多维度研判…",
    historyTitle: "孵化记录",
    historyEmpty: "还没有孵化记录，去生成第一节课吧。",
    historyClear: "🗑 清空历史",
    settingsTitle: "设置",
    themeLabel: "视觉主题",
    themeDark: "星云暗夜",
    themeLight: "极昼纯白",
    langLabel: "🌐 界面语言 / 内容语言",
    uiLangLabel: "界面语言",
    contentLangNote: "生成课程的内容语言与界面语言一致；如需其他语言的内容，可在下方自定义 ISO 代码（如 pt、it）。",
    customIsoLabel: "自定义内容语言 ISO（可选）",
    customIsoPlace: "例如：pt / it / ko",
    aboutLabel: "关于 NEBULA",
    aboutHtml: "<b>NEBULA AI Agent</b><br>一款在「枯燥课本」与「漫无目的 AI 搜索」之间架起桥梁的个性化学习伴侣。输入主题、身份与难度，一键孵化属于你的游戏化交互课程——剧情引导、分章解锁、多题型测验与即时引导解析，让学习成为主动探索的创造之旅。",
    devLabel: "开发者",
    devHtml: "Nebula Team · Sam Su & DeepSeek",
    logout: "退出登录",
    closeBtn: "关闭",
    saveClose: "保存并关闭",
    loginTitle: "NEBULA SYSTEM",
    loginSub: "Enterprise Access Gateway",
    loginPlaceholder: "输入访问口令 Access Token",
    loginBtn: "连接终端 Connect",
    loginErr: "访问被拒绝：口令错误",
    toastNeedTopic: "请先填写学习主题",
    toastGenFail: "孵化失败，请稍后重试", regenBusy: "正在生成中，请等待当前课程完成后再提交意见",
    toastCopied: "分享链接已复制",
    toastCopyFail: "复制失败，请手动复制",
    toastExported: "独立文件已导出",
    toastFallback: "部分内容使用了保障模板（AI 生成超时），仍可正常学习",
    toastLoginOk: "已连接终端",
    toastHistoryCleared: "历史已清空",
    toastNeedLogin: "会话已过期，请重新登录",
    genEtaTitle: "预计用时", genEtaFlash: "Flash 引擎 · 约 1~2 分钟", genEtaPro: "Pro 引擎 · 约 3~5 分钟", genEtaCustom: "自定义模型 · 取决于你的服务速度",
    stageOutline: "教育专家团队正在规划课程大纲…",
    stageChapters: "正在撰写章节内容…",
    stageAudit: "AI 质量审计：六维评估中…",
    stageDone: "孵化完成",
    stageError: "生成中断",
    shareTip: "分享链接可让任何人以只读方式体验该课程",
  },
  en: {
    appTitle: "NEBULA AI Agent",
    brandSub: "Personalized Education Incubator",
    topicLabel: "Learning Topic",
    topicPlace: "e.g., Bayesian theorem, customer acquisition, Lagrange multipliers",
    roleLabel: "Your Role / Goal",
    rolePlace: "e.g., Cross-border e-commerce operator boosting conversion",
    diffLabel: "Difficulty Level",
    diffBeginner: "Beginner", diffBeginnerSub: "Intro · Fun · Analogy",
    diffAdvanced: "Advanced", diffAdvancedSub: "Theory · Derivation",
    diffExpert: "Expert", diffExpertSub: "Modeling · Frontier",
    chaptersLabel: "Chapters",
    chaptersAuto: "Auto suggest",
    modelLabel: "Model",
    modelV3: "DeepSeek-V3", modelV3Sub: "Fast & stable · Recommended",
    modelR1: "DeepSeek-R1", modelR1Sub: "Deep reasoning · Slower",
    domainLabel: "Domain Recognition",
    domainWait: "Waiting for a topic…",
    domainAnalyzing: "Analyzing…",
    generateBtn: "⚡ Generate Agent",
    generating: "Generating…",
    exportBtn: "📤 Export Standalone File",
    shareBtn: "🔗 Copy Share Link",
    canvasEmptyTitle: "Incubator Ready",
    canvasEmptyText: "Enter a topic and your role on the left, hit Generate, and NEBULA will incubate an interactive course just for you.",
    canvasTitle: "NEBULA Interactive Preview",
    tipClear: "Click to clear, double-click to restore",
    tipFullscreen: "Fullscreen preview",
    tipCollapse: "Collapse sidebar",
    tipNewWin: "Open in new window",
    missionTabAudit: "6-D Audit",
    missionTabReflect: "Reflection",
    missionTabHistory: "History",
    auditTitle: "AI Quality Audit",
    auditWaiting: "Audit runs automatically after generation…",
    dimAccuracy: "Accuracy", dimFit: "Fit", dimDepth: "Depth",
    dimFun: "Fun", dimPersonalization: "Personalization", dimCompliance: "Compliance",
    reflectTitle: "AI Semantic Assessment",
    reflectPlaceholder: "After generating an agent, submit your learning reflection here. The AI professor will assess your depth of understanding.",
    reflectSubmit: "Submit",
    reflectWaiting: "Expert panel analyzing your reflection…",
    historyTitle: "Incubation History",
    historyEmpty: "No history yet. Generate your first course!",
    historyClear: "🗑 Clear History",
    settingsTitle: "Settings",
    themeLabel: "Visual Theme",
    themeDark: "Nebula Dark",
    themeLight: "Pure Light",
    langLabel: "🌐 UI / Content Language",
    uiLangLabel: "UI Language",
    contentLangNote: "Course content follows the UI language. For other content languages, enter a custom ISO code below (e.g., pt, it).",
    customIsoLabel: "Custom content language ISO (optional)",
    customIsoPlace: "e.g., pt / it / ko",
    aboutLabel: "About NEBULA",
    aboutHtml: "<b>NEBULA AI Agent</b><br>A personalized learning companion bridging rigid textbooks and aimless AI searches. Enter a topic, role and difficulty to incubate a gamified interactive course — narrative guidance, chapter unlocks, diverse quizzes and instant guided feedback turn learning into creative exploration.",
    devLabel: "Developers",
    devHtml: "Nebula Team · Sam Su & DeepSeek",
    logout: "Sign out",
    closeBtn: "Close",
    saveClose: "Save & Close",
    loginTitle: "NEBULA SYSTEM",
    loginSub: "Enterprise Access Gateway",
    loginPlaceholder: "Enter Access Token",
    loginBtn: "Connect to Terminal",
    loginErr: "Access denied: invalid token",
    toastNeedTopic: "Please enter a learning topic first",
    toastGenFail: "Generation failed, please retry", regenBusy: "Generation in progress - please wait until the current course finishes",
    toastCopied: "Share link copied",
    toastCopyFail: "Copy failed, please copy manually",
    toastExported: "Standalone file exported",
    toastFallback: "Some parts used the safety template (AI timeout), still fully learnable",
    toastLoginOk: "Terminal connected",
    toastHistoryCleared: "History cleared",
    toastNeedLogin: "Session expired, please sign in again",
    genEtaTitle: "Estimated time", genEtaFlash: "Flash engine · about 1–2 min", genEtaPro: "Pro engine · about 3–5 min", genEtaCustom: "Custom model · depends on your provider",
    stageOutline: "Education experts are outlining the course…",
    stageChapters: "Writing chapter content…",
    stageAudit: "AI audit: six-dimension assessment…",
    stageDone: "Incubation complete",
    stageError: "Generation interrupted",
    shareTip: "Anyone with the link can experience this course read-only",
  }
};

const state = {
  code: "zh",
  customIso: "",
};

function getDict(code) {
  return DICT[code] || DICT.zh;
}

export const LinguaForce = {
  get status() {
    return { code: state.code, name: (LANGS.find((l) => l.code === state.code) || LANGS[0]).contentLang };
  },
  setLang(code) {
    state.code = DICT[code] ? code : "zh";
    document.documentElement.lang = state.code;
    document.documentElement.dir = state.code === "ar" ? "rtl" : "ltr";
    return state.code;
  },
  setCustomIso(iso) {
    state.customIso = String(iso || "").trim().slice(0, 8);
  },
  // 后端内容语言：自定义 ISO 优先
  get contentLang() {
    return state.customIso || state.code;
  },
  t(key) {
    return (
      getDict(state.code)[key] ??
      EXTRA_DICT[state.code]?.[key] ??
      MODEL_EXTRA[state.code]?.[key] ??
      PW_EXTRA[state.code]?.[key] ??
      SCHOOL_EXTRA[state.code]?.[key] ??
      ADMIN_EXTRA[state.code]?.[key] ??
      VERIFY_EXTRA[state.code]?.[key] ??
      PROFILE_EXTRA[state.code]?.[key] ??
      LEGAL_EXTRA[state.code]?.[key] ??
      AUDIT_GUIDE_EXTRA[state.code]?.[key] ??
      CHAT_EXTRA[state.code]?.[key] ??
      GOOGLE_EXTRA[state.code]?.[key] ??
      GOOGLE2_EXTRA[state.code]?.[key] ??
      NOTIF_EXTRA[state.code]?.[key] ??
      EMOJI_EXTRA[state.code]?.[key] ??
      REPOST_EXTRA[state.code]?.[key] ??
      SEARCH_EXTRA[state.code]?.[key] ??
      REJECT_EXTRA[state.code]?.[key] ??
      ADMIN2_EXTRA[state.code]?.[key] ??
      getDict("zh")[key] ??
      EXTRA_DICT.zh?.[key] ??
      MODEL_EXTRA.zh?.[key] ??
      PW_EXTRA.zh?.[key] ??
      SCHOOL_EXTRA.zh?.[key] ??
      ADMIN_EXTRA.zh?.[key] ??
      VERIFY_EXTRA.zh?.[key] ??
      PROFILE_EXTRA.zh?.[key] ??
      LEGAL_EXTRA.zh?.[key] ??
      AUDIT_GUIDE_EXTRA.zh?.[key] ??
      CHAT_EXTRA.zh?.[key] ??
      GOOGLE_EXTRA.zh?.[key] ??
      GOOGLE2_EXTRA.zh?.[key] ??
      NOTIF_EXTRA.zh?.[key] ??
      EMOJI_EXTRA.zh?.[key] ??
      REPOST_EXTRA.zh?.[key] ??
      SEARCH_EXTRA.zh?.[key] ??
      REJECT_EXTRA.zh?.[key] ??
      ADMIN2_EXTRA.zh?.[key] ??
      key
    );
  },
};
