// runtime-i18n.js - 课程运行时文案（12 语言，注入生成的课程页面）

export const RUNTIME_I18N = {
  zh: {
    start: "🚀 开始学习", resume: "继续学习", chapterLabel: "第 {n} 章", progress: "学习进度",
    storyLabel: "📖 剧情", keyPointsLabel: "✨ 本章要点", quizLabel: "📝 章节测验",
    questionLabel: "第 {n} 题 / 共 {m} 题", singleHint: "请选择一个选项",
    multiHint: "本题为多选题，可勾选多个选项后提交", judgeTrue: "正确", judgeFalse: "错误",
    matchHint: "点击左侧条目，再点击右侧条目完成配对", orderHint: "按正确顺序依次点击卡片（点击已选项可撤销）",
    fillHint: "在空格中填入你的答案", caseHint: "开放题：写下你的思路，再对照参考答案要点",
    submitAnswer: "提交答案", myAnswer: "我的思路", reference: "参考答案要点",
    iReviewed: "我已对照要点，继续", correct: "🎉 答对了！", wrong: "🤔 再想想",
    showExplain: "查看解析", nextQuestion: "下一题 →", nextChapter: "下一章 →",
    seeResults: "查看学习成果 →", finalScore: "最终得分", chapterClear: "章节完成！",
    badgeEarned: "获得徽章", finaleHint: "把你这趟旅程最重要的发现写下来：",
    finalePlaceholder: "写下你的学习发现与感悟…", finaleSubmit: "提交给 AI 教授",
    finaleSubmitted: "已提交！AI 教授正在点评…", wrongReviewTitle: "🔁 错题回顾",
    regenTitle: "想调整这门课吗？", regenPlaceholder: "例如：题目太难、例子换成电商场景、加入更多图表与案例……",
    regenBtn: "🔄 按意见重新生成", regenSent: "已提交，AI 正在按你的意见重新生成…",
    glossaryTitle: "📚 术语表", aiFeedback: "🧠 AI 教授点评", emptyAnswer: "请先作答或填写内容",
    backToCover: "回到封面", courseComplete: "课程完成！", totalQuestions: "共 {n} 题",
    scoreOf: "得分 {a} / {b}", noWrong: "全程零失误，太强了！", fillEmpty: "还有空格未填写",
    matchClear: "重新配对", orderClear: "清空重排", optionLabel: "选项",
  },
  en: {
    start: "🚀 Start Learning", resume: "Continue", chapterLabel: "Chapter {n}", progress: "Progress",
    storyLabel: "📖 Story", keyPointsLabel: "✨ Key Points", quizLabel: "📝 Chapter Quiz",
    questionLabel: "Question {n} of {m}", singleHint: "Choose one option",
    multiHint: "Multiple answers allowed - select all that apply", judgeTrue: "True", judgeFalse: "False",
    matchHint: "Click a left item, then a right item to pair them", orderHint: "Click cards in the correct order (click again to undo)",
    fillHint: "Fill in the blanks", caseHint: "Open question: write your approach, then check the reference",
    submitAnswer: "Submit", myAnswer: "My approach", reference: "Reference points",
    iReviewed: "I've reviewed - continue", correct: "🎉 Correct!", wrong: "🤔 Think again",
    showExplain: "Show explanation", nextQuestion: "Next Question →", nextChapter: "Next Chapter →",
    seeResults: "See Results →", finalScore: "Final Score", chapterClear: "Chapter Complete!",
    badgeEarned: "Badge earned", finaleHint: "Write down your most important discovery:",
    finalePlaceholder: "Write your learning reflection…", finaleSubmit: "Submit to AI Professor",
    finaleSubmitted: "Submitted! The AI professor is reviewing…", wrongReviewTitle: "🔁 Wrong Answer Review",
    regenTitle: "Want to refine this course?", regenPlaceholder: "e.g. questions too hard, switch examples to e-commerce, add more diagrams and cases…",
    regenBtn: "🔄 Regenerate with feedback", regenSent: "Submitted - AI is regenerating with your feedback…",
    glossaryTitle: "📚 Glossary", aiFeedback: "🧠 AI Professor's Feedback", emptyAnswer: "Please answer first",
    backToCover: "Back to Cover", courseComplete: "Course Complete!", totalQuestions: "{n} questions",
    scoreOf: "Score {a} / {b}", noWrong: "Flawless run - impressive!", fillEmpty: "Some blanks are still empty",
    matchClear: "Reset pairs", orderClear: "Reset order", optionLabel: "Option",
  }
};

export const SHARE_RT = {
  zh: { shareAskTitle: "分享你的作品", shareAskText: "恭喜完成课程！愿意把这门课分享到 NEBULA 社区，与更多学习者交流吗？", shareAskBtn: "分享到社区", shareAsked: "已发起分享，请在社区完善标题与描述" },
  en: { shareAskTitle: "Share your work", shareAskText: "Congratulations! Would you like to share this course to the NEBULA community?", shareAskBtn: "Share to community", shareAsked: "Opening community publishing - add a title and description" }
};

export function runtimeText(lang, key, vars) {
  const dict = { ...(RUNTIME_I18N.en || {}), ...(RUNTIME_I18N[lang] || {}), ...(COMMON_RT[lang] || COMMON_RT.en || {}), ...(SHARE_RT[lang] || SHARE_RT.en || {}) };
  let text = dict[key] ?? RUNTIME_I18N.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}

// V3 新增运行时词条（教学法结构：预热/回顾/费曼输出/连击）
// 分享询问词条（12 语言，跨语言 fallback）
export const COMMON_RT = {
  zh: {
    warmupTitle: "🤔 先想一想", warmupReveal: "展开思考提示",
    recallTitle: "🔁 温故知新", recallSub: "上一章的核心要点，先回忆再对照：",
    feynmanTitle: "🎓 讲给朋友听", feynmanPrompt: "费曼挑战：任选一条要点，用最通俗的大白话解释它，像在教一个完全不懂的朋友。写完点「对照要点」检验自己。",
    feynmanCompare: "对照要点", feynmanDone: "很棒！能讲清楚，才是真学会。",
    combo3: "🔥 三连击！提取练习正在加固你的记忆",
  },
  en: {
    warmupTitle: "🤔 Think First", warmupReveal: "Show thinking hint",
    recallTitle: "🔁 Recall", recallSub: "Key points from last chapter - recall before checking:",
    feynmanTitle: "🎓 Teach a Friend", feynmanPrompt: "Feynman challenge: pick one key point and explain it in plain words, as if teaching a friend who knows nothing. Then compare.",
    feynmanCompare: "Compare with key point", feynmanDone: "Great! If you can explain it, you truly know it.",
    combo3: "🔥 3 in a row! Retrieval practice is strengthening your memory",
  }
};
