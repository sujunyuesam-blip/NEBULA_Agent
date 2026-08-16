// pages/about.js - NEBULA 介绍展示页：定位 + 理念 + 学习科学数据支撑 + 可信度
// 双语（zh / en，其他 UI 语言回退英文）


const L = {
  zh: {
    heroBadge: "个性化教育 Agent 孵化器 · 基于学习科学实证设计",
    heroTitle: "同一主题，千人千课",
    heroSub: "NEBULA 把「枯燥的课本」与「漫无目的的 AI 搜索」之间架起一座只为你而建的桥——输入主题、身份与难度，一键孵化属于你的游戏化交互课程。",
    ctaStart: "⚡ 开始孵化我的课程",
    ctaCommunity: "浏览学习社区",
    beliefTitle: "我们的信念",
    beliefText: "学习不止是学习课本上的知识，也可以是生活中的琐碎小事、过来人的生活经验；学习不止是身着长衫、住在象牙塔中的读书人的专属——它可以为从「市井之人」到「朝堂之士」的每一个人赋能，实现思想的跃迁。因此，请不要放过这个游戏化、个性化学习的机会，生活中的点点滴滴都值得你为之好奇、因之而苦心钻研。",
    pillarTitle: "四大产品理念",
    pillars: [
      { icon: "🧭", t: "学习个性化", d: "身份、水平、风格、场景、时长五维画像驱动内容生成：外贸商得到获客实操，考研生得到题型训练，法语学习者得到母语化课程。" },
      { icon: "🎮", t: "学习游戏化", d: "剧情章节、徽章、积分、连击与排行榜，用激励设计把「要我学」变成「我要学」。" },
      { icon: "🧱", t: "学习建构化", d: "强制引导式测验：答错必解释「为什么错、如何重想」，答对才前进——测验不再是考核，而是认知脚手架。" },
      { icon: "🪄", t: "生产零代码化", d: "AI 只生成结构化教学内容，界面与交互由确定性引擎渲染——零代码获得可导出、可离线分发的完整课程。" },
    ],
    scienceTitle: "理论支撑：为什么它有效",
    scienceSub: "NEBULA 的每一步设计都锚定在数十年来教育心理学的实证研究上",
    scienceNote: "每张卡片说明该理论如何被落地到产品中",
    theories: [
      { name: "提取练习", en: "Retrieval Practice", src: "Dunlosky 2013 元分析 · Agarwal et al. 2021 综述", desc: "主动回忆比重复阅读的长期记忆保持高 50% 以上（Roediger & Karpicke, 2006：一周后回忆率 61% vs 40%）。", how: "每章「预热问题」先想后学；测验、每日一题、错题复习课构成日常提取练习。" },
      { name: "间隔重复", en: "Spaced Practice", src: "Cepeda et al. 2006 · Smolen et al. 2016", desc: "分散复习的记忆保持可达集中突击的约 2 倍。", how: "每章开头的「温故知新」自动回顾前章要点；每日一题持续激活旧知识。" },
      { name: "最近发展区", en: "Zone of Proximal Development", src: "Vygotsky, 1978", desc: "学习发生在「当前水平 +1」的挑战区：太难挫败，太易无聊。", how: "难度阶梯 × 水平画像，AI 按 ZPD 原则把内容定在垫脚可及的位置。" },
      { name: "生成效应", en: "Generation Effect", src: "Slamecka & Graf, 1978", desc: "自己产出的知识比被动接收的记忆更深。", how: "案例题、填空题、费曼输出环节（用自己的话讲给朋友听）。" },
      { name: "主动学习", en: "Active Learning", src: "Freeman et al. 2014 PNAS · Theobald et al. 2020 PNAS", desc: "对 225 项研究的元分析：主动学习把考试失败率降低约三分之一（33.8%→21.8%）。", how: "整个课程即主动学习：章节解锁、交互测验、反思提交替代单向灌输。" },
      { name: "认知负荷理论", en: "Cognitive Load Theory", src: "Sweller, 1988", desc: "工作记忆有限，一次性信息过载会摧毁学习。", how: "每段讲解只承载一个核心概念；术语首次出现即解释；公式拆解含义。" },
      { name: "自我决定理论", en: "Self-Determination Theory", src: "Deci & Ryan 2000 · Ryan & Deci 2020 综述", desc: "自主感、胜任感、归属感是人类内在动机的三大燃料。", how: "自主=身份化定制课程；胜任=即时得分与反馈；归属=社区分享与讨论。" },
      { name: "Octalysis 游戏化", en: "Octalysis Framework", src: "Yu-kai Chou, 2015", desc: "八大核心驱动力解释人为什么愿意持续投入一件事。", how: "史诗意义（学习路径）、成就（XP/徽章）、社交（社区/排行榜）、好奇（每日一题）。" },
      { name: "成长型思维", en: "Growth Mindset", src: "Dweck 2006 · Yeager et al. 2019 Nature", desc: "相信能力可成长的学习者更愿意挑战困难。", how: "所有错误引导文案传递「错误是学习路标」，严禁贬低学习者。" },
      { name: "心流理论", en: "Flow", src: "Csikszentmihalyi, 1990", desc: "挑战与技能匹配时，人进入忘我的高效学习状态。", how: "难度渐进、章节钩子悬念、即时反馈共同维持心流通道。" },
    ],
    dataTitle: "关键数据一览",
    dataItems: [
      { num: "50%+", label: "提取练习相比重复阅读的长期记忆优势（Roediger & Karpicke, 2006）" },
      { num: "2×", label: "间隔重复相比集中突击的记忆保持（Cepeda et al., 2006）" },
      { num: "-35%", label: "主动学习带来的考试失败率降幅（Freeman et al., 2014, PNAS）" },
      { num: "90%", label: "「教给别人」类输出式学习的记忆留存（学习金字塔模型）" },
    ],
    loopTitle: "从生成到成长的完整闭环",
    loop: [
      { icon: "🎯", t: "意图理解", d: "主题识别 + 身份/水平/风格/场景画像" },
      { icon: "🧬", t: "内容生成", d: "教学法引擎驱动 AI 输出结构化课程" },
      { icon: "🛡️", t: "质量保障", d: "Schema 校验 → 重试修复 → 五维 AI 审计 → 降级兜底" },
      { icon: "🕹️", t: "交互交付", d: "确定性渲染器：剧情、测验、引导、徽章、公式" },
      { icon: "📈", t: "数据沉淀", d: "错题本、学习画像、积分、连续学习天数" },
      { icon: "🌍", t: "社区生长", d: "AI 审核 + 人工复核的学术社区、排行榜" },
    ],
    trustTitle: "可信与安全",
    trust: [
      { icon: "🤖", t: "AI 内容审核", d: "社区每篇提交先经 AI 审核，未通过进入管理员人工复核队列，双重防线。" },
      { icon: "📐", t: "结构化生成", d: "AI 只生成教学内容 JSON，界面与交互由确定性引擎渲染——不存在 AI 写坏的代码。" },
      { icon: "🛟", t: "永远可交付", d: "生成管线自带校验、重试与降级模板，任何网络/模型故障下你仍能得到可用课程。" },
      { icon: "🔒", t: "数据主权", d: "课程可一键导出为独立 HTML 离线运行；账号密码经 PBKDF2 加盐哈希存储。" },
    ],
    footerNote: "参考文献：Dunlosky J. et al. (2013) Psychological Science in the Public Interest; Roediger & Karpicke (2006) Psychological Science; Cepeda N. et al. (2006) Psychological Bulletin; Freeman S. et al. (2014) PNAS; Sweller J. (1988) Cognitive Science; Deci & Ryan (2000) American Psychologist; Dweck C. (2006) Mindset; Csikszentmihalyi M. (1990) Flow; Chou Y. (2015) Actionable Gamification.",
  },
  en: {
    heroBadge: "Personalized Education Agent Incubator · Designed on evidence-based learning science",
    heroTitle: "One Topic, a Thousand Courses",
    heroSub: "NEBULA builds a bridge - built only for you - between rigid textbooks and aimless AI searches. Enter a topic, your identity and difficulty, and incubate a gamified interactive course in one click.",
    ctaStart: "⚡ Incubate my course",
    ctaCommunity: "Browse the community",
    beliefTitle: "Our Belief",
    beliefText: "Learning is not only textbook knowledge — it lives in life's small moments and in the experience of those who walked before you. Learning is not the privilege of scholars in ivory towers: it empowers everyone, from the marketplace to the halls of power, to leap in thought. So don't miss this gamified, personalized chance to learn — everything in everyday life is worth your curiosity and your deep inquiry.",
    pillarTitle: "Four Product Pillars",
    pillars: [
      { icon: "🧭", t: "Personalization", d: "Five-dimension profile (identity, level, style, scenario, duration) drives content: exporters get acquisition playbooks, students get exam drills, francophones get native-language courses." },
      { icon: "🎮", t: "Gamification", d: "Story chapters, badges, XP, streaks and leaderboards turn \"have to learn\" into \"want to learn\"." },
      { icon: "🧱", t: "Constructivism", d: "Guided quizzes: every wrong answer explains why and how to rethink; you only advance by understanding - quizzes as cognitive scaffolding, not judgment." },
      { icon: "🪄", t: "Zero-Code", d: "AI generates structured content only; UI and interaction run on a deterministic engine - a complete course you can export and distribute offline, no code ever." },
    ],
    scienceTitle: "The Science Behind It",
    scienceSub: "Every design decision in NEBULA is anchored in decades of educational psychology research",
    scienceNote: "Each card shows how the theory is implemented in the product",
    theories: [
      { name: "Retrieval Practice", en: "Testing Effect", src: "Dunlosky 2013 meta-analysis · Agarwal et al. 2021 review", desc: "Active recall beats rereading by 50%+ in long-term retention (Roediger & Karpicke, 2006: 61% vs 40% recall after one week).", how: "Chapter warm-up questions, quizzes, daily quest and wrong-answer review build daily retrieval practice." },
      { name: "Spaced Practice", en: "Spacing Effect", src: "Cepeda et al. 2006 · Smolen et al. 2016", desc: "Distributed review roughly doubles retention versus cramming.", how: "\"Recall\" cards at each chapter revisit previous key points; the daily quest reactivates old knowledge." },
      { name: "Zone of Proximal Development", en: "ZPD", src: "Vygotsky, 1978", desc: "Learning happens at \"current level +1\": too hard frustrates, too easy bores.", how: "Difficulty ladders × level profiles; AI places content right at the reachable edge." },
      { name: "Generation Effect", en: "Self-generated knowledge", src: "Slamecka & Graf, 1978", desc: "Knowledge you produce yourself is remembered more deeply.", how: "Case questions, fill-in-the-blanks and the Feynman output section (explain it to a friend)." },
      { name: "Active Learning", en: "Meta-analysis", src: "Freeman et al. 2014 PNAS · Theobald et al. 2020 PNAS", desc: "Across 225 studies, active learning cut exam failure rates by ~1/3 (33.8% → 21.8%).", how: "The whole course is active learning: chapter unlocks, interactive quizzes and reflections replace passive lecturing." },
      { name: "Cognitive Load Theory", en: "CLT", src: "Sweller, 1988", desc: "Working memory is limited; information overload destroys learning.", how: "One core concept per paragraph; terms explained at first use; formulas broken down by meaning." },
      { name: "Self-Determination Theory", en: "SDT", src: "Deci & Ryan 2000 · Ryan & Deci 2020 review", desc: "Autonomy, competence and relatedness are the three fuels of intrinsic motivation.", how: "Autonomy = courses tailored to you; competence = instant feedback; relatedness = community discussion." },
      { name: "Octalysis Framework", en: "Gamification", src: "Yu-kai Chou, 2015", desc: "Eight core drives explain why people keep investing in an activity.", how: "Epic meaning (learning paths), accomplishment (XP/badges), social (community/ranks), curiosity (daily quest)." },
      { name: "Growth Mindset", en: "Mindset", src: "Dweck 2006 · Yeager et al. 2019 Nature", desc: "Learners who believe ability grows embrace challenges.", how: "Every wrong-answer hint says \"errors are signposts\", never belittling the learner." },
      { name: "Flow", en: "Optimal experience", src: "Csikszentmihalyi, 1990", desc: "When challenge matches skill, people enter absorbed, high-efficiency learning.", how: "Progressive difficulty, chapter cliffhangers and instant feedback keep you in the flow channel." },
    ],
    dataTitle: "Key Numbers",
    dataItems: [
      { num: "50%+", label: "Long-term memory advantage of retrieval practice over rereading (Roediger & Karpicke, 2006)" },
      { num: "2×", label: "Retention from spaced vs massed practice (Cepeda et al., 2006)" },
      { num: "-35%", label: "Exam failure-rate reduction from active learning (Freeman et al., 2014, PNAS)" },
      { num: "90%", label: "Retention of output-style learning such as teaching others (Learning Pyramid model)" },
    ],
    loopTitle: "From Generation to Growth - the Full Loop",
    loop: [
      { icon: "🎯", t: "Intent", d: "Topic recognition + identity/level/style/scenario profile" },
      { icon: "🧬", t: "Generation", d: "Pedagogy engine drives AI to produce structured courses" },
      { icon: "🛡️", t: "Quality", d: "Schema validation → retry/repair → 5-D AI audit → fallback" },
      { icon: "🕹️", t: "Delivery", d: "Deterministic renderer: story, quizzes, guidance, badges, formulas" },
      { icon: "📈", t: "Data", d: "Wrong-answer book, learner profile, XP, streaks" },
      { icon: "🌍", t: "Community", d: "AI-reviewed academic community, leaderboards" },
    ],
    trustTitle: "Trust & Safety",
    trust: [
      { icon: "🤖", t: "AI moderation", d: "Every community post passes AI review first; rejected items enter an admin human-review queue - a double defense line." },
      { icon: "📐", t: "Structured generation", d: "AI only produces content JSON; UI and interaction run on a deterministic engine - no AI-written code can break." },
      { icon: "🛟", t: "Always deliverable", d: "The generation pipeline validates, retries and falls back - you get a usable course under any network or model failure." },
      { icon: "🔒", t: "Data sovereignty", d: "Export courses as standalone HTML for offline use; passwords stored as PBKDF2 salted hashes." },
    ],
    footerNote: "References: Dunlosky J. et al. (2013) Psychological Science in the Public Interest; Roediger & Karpicke (2006) Psychological Science; Cepeda N. et al. (2006) Psychological Bulletin; Freeman S. et al. (2014) PNAS; Sweller J. (1988) Cognitive Science; Deci & Ryan (2000) American Psychologist; Dweck C. (2006) Mindset; Csikszentmihalyi M. (1990) Flow; Chou Y. (2015) Actionable Gamification.",
  },

};
export function aboutPageHtml() {
  const merged = L;
  const lang = merged[document.documentElement.lang] ? document.documentElement.lang : "en";
  const s = merged[lang] || merged.en;
  return `
  <div class="about-page">
    <section class="about-hero">
      <div class="about-hero-inner">
        <h1>${esc(s.heroTitle)}</h1>
        <p class="about-hero-sub">${esc(s.heroSub)}</p>
        <div class="about-cta">
          <button class="btn btn-primary" data-action="goto-workbench">${s.ctaStart}</button>
          <button class="btn" data-action="goto-community">${esc(s.ctaCommunity)}</button>
        </div>
      </div>
    </section>

    <section class="about-section">
      <h2>${esc(s.beliefTitle)}</h2>
      <div class="about-belief glass">
        <p>${esc(s.beliefText)}</p>
      </div>
    </section>

    <section class="about-section">
      <h2>${esc(s.pillarTitle)}</h2>
      <div class="about-grid pillars">
        ${s.pillars.map((p) => `
          <div class="about-card glass">
            <div class="about-card-icon">${p.icon}</div>
            <h3>${esc(p.t)}</h3>
            <p>${esc(p.d)}</p>
          </div>`).join("")}
      </div>
    </section>

    <section class="about-section">
      <h2>${esc(s.scienceTitle)}</h2>
      <p class="about-sub">${esc(s.scienceSub)}<br><small>${esc(s.scienceNote)}</small></p>
      <div class="about-grid theories">
        ${s.theories.map((th) => `
          <div class="about-card glass">
            <div class="about-card-head">
              <h3>${esc(th.name)}</h3>
              <span class="badge">${esc(th.en)}</span>
            </div>
            <div class="about-src">📚 ${esc(th.src)}</div>
            <p class="about-desc">${esc(th.desc)}</p>
            <p class="about-how">→ ${esc(th.how)}</p>
          </div>`).join("")}
      </div>
    </section>

    <section class="about-section">
      <h2>${esc(s.dataTitle)}</h2>
      <div class="about-stats">
        ${s.dataItems.map((d) => `
          <div class="about-stat glass">
            <div class="about-stat-num">${esc(d.num)}</div>
            <div class="about-stat-label">${esc(d.label)}</div>
          </div>`).join("")}
      </div>
    </section>

    <section class="about-section">
      <h2>${esc(s.loopTitle)}</h2>
      <div class="about-loop">
        ${s.loop.map((item, i) => `
          <div class="about-loop-item">
            <div class="about-loop-icon">${item.icon}</div>
            <b>${esc(item.t)}</b>
            <span>${esc(item.d)}</span>
            ${i < s.loop.length - 1 ? '<div class="about-loop-arrow">→</div>' : ""}
          </div>`).join("")}
      </div>
    </section>

    <section class="about-section">
      <h2>${esc(s.trustTitle)}</h2>
      <div class="about-grid pillars">
        ${s.trust.map((item) => `
          <div class="about-card glass">
            <div class="about-card-icon">${item.icon}</div>
            <h3>${esc(item.t)}</h3>
            <p>${esc(item.d)}</p>
          </div>`).join("")}
      </div>
    </section>

    <footer class="about-footer">
      <p>${esc(s.footerNote)}</p>
      <button class="btn btn-primary" data-action="goto-workbench">${s.ctaStart}</button>
    </footer>
  </div>`;
}

function esc(x) {
  return String(x ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
