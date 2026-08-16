// mock.js - 本地开发模式（MOCK=1）的内置样例课程，覆盖全部 6 种题型，无需 DeepSeek Key

import { sleep } from "./util.js";

export function mockOutline(topic, role, lang) {
  const zh = lang === "zh";
  return {
    title: zh ? `${topic}·互动课堂` : `${topic} · Interactive Class`,
    subtitle: zh ? "为你的目标量身定制的示例课程" : "A sample course tailored to your goal",
    coverTagline: zh ? "点击开始，进入剧情学习" : "Click to start your journey",
    intro: zh
      ? `这是一节为「${role || "你"}」定制的示例课程（本地 MOCK 数据）。你将跟随剧情探索「${topic}」的核心概念，并通过测验验证理解。`
      : `A sample course (MOCK data) customized for "${role || "you"}". Follow the story and verify your understanding with quizzes.`,
    chapters: [
      { id: "c1", title: zh ? "情境引入" : "Introduction", story: zh ? "从一个真实场景开始" : "Start from a real scenario", quizMix: ["single", "judge", "multi"] },
      { id: "c2", title: zh ? "核心机制" : "Core Mechanics", story: zh ? "拆解背后原理" : "Break down the principles", quizMix: ["match", "order", "case"] },
      { id: "c3", title: zh ? "实战演练" : "Practice", story: zh ? "在案例中检验所学" : "Test in a real case", quizMix: ["case", "judge", "single"] },
    ],
    finaleTitle: zh ? "最终发现" : "Final Discovery",
    finalePrompt: zh ? "写下你此刻的理解，提交给 AI 教授评估。" : "Write down your understanding for the AI professor.",
    glossary: [
      { term: zh ? "问题意识" : "Problem awareness", definition: zh ? "学习前先明确知识要解决的问题" : "Clarify what problem the knowledge solves before learning" },
      { term: zh ? "反馈闭环" : "Feedback loop", definition: zh ? "用真实世界的结果持续修正方案" : "Continuously improve solutions with real-world results" },
      { term: zh ? "主动加工" : "Active processing", definition: zh ? "通过复述、举例、教学等方式深度编码知识" : "Deeply encode knowledge by restating, exemplifying, and teaching" },
    ],
  };
}

export function mockChapter(topic, lang, index) {
  const zh = lang === "zh";
  const t = String(topic || (zh ? "本主题" : "this topic"));
  const chapters = [
    {
      id: "c1",
      title: zh ? "情境引入" : "Introduction",
      story: zh ? "你接到一个任务：用「" + t + "」解决团队的实际问题。" : "Your mission: solve a real problem with \"" + t + "\".",
      warmup: {
        question: zh ? `先想一想（不用急着回答）：你身边有哪些场景可能用得上「${t}」？` : `Think first: where in your daily life might "${t}" apply?`,
        hint: zh ? "提示：从“要解决的问题”出发找场景。" : "Hint: start from the problem it solves.",
      },
      content: [
        zh
          ? `在动手之前，先回答三个问题：「${t}」要解决什么？它为什么被需要？它如何融入现有流程？`
          : `Before diving in, ask: what problem does "${t}" solve? Why is it needed? How does it fit your workflow?`,
        zh
          ? "带着目标学习，比盲目阅读高效得多。本章先用三道题建立整体图景。"
          : "Learning with a goal beats aimless reading. Three questions build the big picture.",
      ],
      keyPoints: [
        zh ? "学习第一步：明确知识解决的问题" : "First step: clarify the problem the knowledge solves",
        zh ? "熟悉场景是知识迁移的试验场" : "Familiar scenarios are where knowledge transfers",
      ],
      reward: zh ? "情境领航员" : "Scenario Navigator",
      quiz: [
        {
          type: "single",
          question: zh ? `学习「${t}」的第一步应该是什么？` : `What is the best first step to learn "${t}"?`,
          options: zh
            ? ["明确它解决的问题", "立即背诵全部术语", "直接看最难的部分", "等别人讲给我听"]
            : ["Clarify the problem it solves", "Memorize every term at once", "Jump to the hardest part", "Wait for someone to explain"],
          correct: [0],
          optionHints: [
            zh ? "正确思路：先建立“它为什么存在”的图景，后续知识才有挂载点。" : "Correct: anchor new knowledge to the problem it solves.",
            zh ? "术语要在上下文中理解，孤立背诵很快就会遗忘——先回到问题本身。" : "Terms need context; memorizing first leads to forgetting.",
            zh ? "没有基础图景就挑战最难部分，容易挫败——请从问题定义开始。" : "Starting hard without context causes frustration.",
            zh ? "被动等待会失去探索的乐趣，试着主动提问一次。" : "Passive waiting kills curiosity; ask questions instead.",
          ],
          explainRight: zh
            ? "一切学习的起点都是“问题意识”：知道它解决什么，才知道该学什么。"
            : "Problem awareness is the starting point of all learning.",
        },
        {
          type: "judge",
          question: zh ? `判断下列说法。` : `Judge the statement.`,
          judgeStatement: zh
            ? `理解「${t}」的最好方式，是把它放进一个你熟悉的真实场景中检验。`
            : `The best way to understand "${t}" is to test it in a familiar real scenario.`,
          correct: true,
          optionHints: [
            zh ? "熟悉场景能激活已有经验，让新知识立刻“落地”，这个说法成立。" : "Familiar scenarios anchor new knowledge - true.",
            zh ? "真实场景是知识迁移的试验场，脱离场景的理解往往是空中楼阁。" : "Scenarios are where knowledge transfers - reconsider.",
          ],
          explainRight: zh
            ? "场景化学习能显著提升迁移能力：能用到的地方，才是真正学会的地方。"
            : "Scenario-based learning boosts transfer: use it where it matters.",
        },
        {
          type: "multi",
          question: zh ? `下列哪些是学习「${t}」时的有效做法？（多选）` : `Which practices help when learning "${t}"? (multi-select)`,
          options: zh
            ? ["用自己的话复述核心概念", "寻找反例来挑战理解", "只看视频从不练习", "向别人解释一遍"]
            : ["Restate the core concept in your own words", "Challenge it with counterexamples", "Watch videos without practice", "Explain it to someone else"],
          correct: [0, 1, 3],
          optionHints: [
            zh ? "复述是主动加工，有效！请继续勾选其他正确做法。" : "Restating is active processing - keep going.",
            zh ? "反例能暴露理解的边界，有效！请继续勾选其他正确做法。" : "Counterexamples expose the limits of understanding - keep going.",
            zh ? "只看不练是被动输入，留存率最低，不要勾选它。" : "Watching without practice is passive and least effective.",
            zh ? "费曼学习法：能教别人才是真学会，有效！" : "The Feynman technique: teaching proves understanding.",
          ],
          explainRight: zh
            ? "复述、寻找反例、教给别人，都是高留存率的主动学习方式；只看不练效果最差。"
            : "Restating, counterexamples, and teaching are high-retention active learning methods.",
        },
      ],
    },
    {
      id: "c2",
      title: zh ? "核心机制" : "Core Mechanics",
      story: zh ? "现在拆开「" + t + "」的黑箱，看看内部如何运转。" : "Open the black box of \"" + t + "\" and see inside.",
      warmup: {
        question: zh ? "一个完整的工作流程通常包含哪些环节？试着在脑中列出来。" : "What stages does a complete workflow usually contain? List them mentally.",
        hint: zh ? "提示：从“开始”到“改进”之间发生了什么？" : "Hint: what happens between \"start\" and \"improve\"?",
      },
      content: [
        zh
          ? `「${t}」由几个关键环节构成：输入、处理、输出与反馈。下面用连线题把它们对应起来。`
          : `"${t}" consists of key stages: input, processing, output, feedback. Match them below.`,
        zh ? "再把正确的执行顺序排出来，形成完整流程。" : "Then order the steps into a complete flow.",
      ],
      keyPoints: [
        zh ? "输入→处理→输出→反馈，四环节构成闭环" : "Input → processing → output → feedback form a loop",
        zh ? "反馈是闭环的发动机，缺失即退化为一次性猜测" : "Feedback drives the loop; without it, only one-shot guesses remain",
      ],
      reward: zh ? "机制拆解师" : "Mechanic Breaker",
      quiz: [
        {
          type: "match",
          question: zh ? "将概念与含义连线。" : "Match each concept with its meaning.",
          pairs: zh
            ? [["输入", "问题与数据"], ["处理", "分析与建模"], ["输出", "结论与方案"], ["反馈", "验证与修正"]]
            : [["Input", "Problem & data"], ["Processing", "Analysis & modeling"], ["Output", "Conclusion & plan"], ["Feedback", "Validation & fix"]],
          explainRight: zh
            ? "四环节构成闭环：反馈环节让方案在真实世界中不断修正，这是高质量学习与工作的共同结构。"
            : "The four stages form a loop where feedback keeps improving the outcome.",
        },
        {
          type: "order",
          question: zh ? "按正确顺序排列问题解决流程。" : "Order the problem-solving steps correctly.",
          sequence: zh
            ? ["定义问题", "收集信息", "提出方案", "验证并修正"]
            : ["Define the problem", "Collect information", "Propose a solution", "Validate and fix"],
          explainRight: zh
            ? "先定义再收集、再提出、再验证——跳过任何一步都会让后面的努力事倍功半。"
            : "Define, collect, propose, validate - skipping any step multiplies later effort.",
        },

      ],
    },
    {
      id: "c3",
      title: zh ? "实战演练" : "Practice",
      story: zh ? "把学到的机制放进一个真实案例中检验。" : "Put what you learned into a real case.",
      warmup: {
        question: zh ? `如果现在让你用「${t}」做一次实战，你会先确认什么？` : `If you applied "${t}" right now, what would you confirm first?`,
        hint: zh ? "提示：先定义问题，再谈方法。" : "Hint: define the problem before the method.",
      },
      content: [
        zh
          ? `下面是一个关于「${t}」的真实场景。先完成开放题，再用判断题与单选题巩固。`
          : `Here is a real scenario about "${t}". Start with the open question, then consolidate.`,
      ],
      keyPoints: [
        zh ? "从最痛、最高频的环节切入" : "Start with the most painful, frequent step",
        zh ? "小范围试点，低成本验证假设" : "Pilot small to validate assumptions at low cost",
      ],
      reward: zh ? "实战指挥官" : "Field Commander",
      quiz: [
        {
          type: "case",
          question: zh ? `实战分析：如果让你用「${t}」优化一个你熟悉的工作流程，你会从哪一步切入？` : `If you applied "${t}" to a familiar workflow, where would you start?`,
          casePrompt: zh
            ? "请写下你的切入思路（30 字以上）：先定义什么问题、收集什么信息、预期什么结果。"
            : "Write your approach (30+ words): what problem to define, what info to collect, what outcome to expect.",
          explainRight: zh
            ? "参考要点：从最痛、最高频的环节切入；先量化现状（问题定义），再小范围试点（验证），最后放大。"
            : "Key points: start with the most painful, frequent step; quantify the baseline, pilot small, then scale.",
        },
        {
          type: "judge",
          question: zh ? "判断：在真实场景中，小范围试点比一次性全面推广更稳妥。" : "Judge: a small pilot is safer than a full rollout.",
          judgeStatement: zh ? "小范围试点能低成本验证假设，比全面推广更稳妥。" : "A small pilot validates assumptions at low cost and is safer than full rollout.",
          correct: true,
          optionHints: [
            zh ? "试点=低成本试错，失败损失小、成功可放大，成立。" : "Pilots are cheap experiments - true.",
            zh ? "全面推广一旦失败代价高昂，试点正是为了降低这种风险。" : "Full rollout risks are high; pilots reduce them.",
          ],
          explainRight: zh
            ? "试点思维是工程与商业的通用智慧：用最小成本验证最大不确定性。"
            : "Pilot thinking: validate the biggest uncertainty at the smallest cost.",
        },
        {
          type: "single",
          question: zh ? "课程即将结束，你认为学习的最终检验标准是？" : "As we finish: what is the ultimate test of learning?",
          options: zh
            ? ["能把知识用于真实场景", "能背诵全部笔记", "考试分数高", "感觉学了很多"]
            : ["Apply it in real scenarios", "Recite all notes", "High exam scores", "Feeling like you learned a lot"],
          correct: [0],
          optionHints: [
            zh ? "正确：迁移到真实场景是学习的最终目标。" : "Correct: transfer to reality is the goal.",
            zh ? "背诵是手段不是目的，无法迁移的知识很快会贬值。" : "Reciting is a means, not the end.",
            zh ? "分数只能说明短期记忆，无法证明真实能力。" : "Scores reflect short-term memory, not ability.",
            zh ? "“感觉学到了”常常是错觉，用输出验证才算数。" : "Feeling of learning is often an illusion; verify with output.",
          ],
          explainRight: zh
            ? "费曼说：如果你不能简单地解释它，你就没有真正理解它。真实场景的运用，就是最好的解释。"
            : "As Feynman said: if you can't explain it simply, you don't understand it.",
        },
      ],
    },
  ];
  return chapters[index] || chapters[0];
}
