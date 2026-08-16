// extra.js - V3 新增词条（12 语言），与 linguaforce.js 主字典合并查询

export const EXTRA_DICT = {
  zh: {
    navWorkbench: "孵化台",
    navAbout: "关于NEBULA",
    navContact: "关于我们", navCommunity: "社区", navProfile: "我的", navAdmin: "管理后台", navLeaderboard: "排行榜",
    loginTab: "登录", registerTab: "注册", emailLabel: "邮箱", nameLabel: "昵称", schoolLabel: "学校 *",
    passwordLabel: "密码", passwordConfirm: "确认密码", registerBtn: "创建账号", loginSubmitBtn: "登 录",
    tokenMode: "使用访问令牌登录", backToAccount: "返回账号登录", registerOk: "注册成功，欢迎加入 NEBULA！",
    passwordMismatch: "两次输入的密码不一致", loginFailed: "邮箱或密码错误",
    profileTitle: "个人主页", joinedAt: "加入于", myStats: "学习数据", levelLabel: "等级", streakLabel: "连续学习",
    xpLabel: "积分 XP", achievementsTitle: "成就徽章", myCourses: "我的课程", myPosts: "我的社区帖",
    pendingStatus: "审核中", approvedStatus: "已通过", rejectedStatus: "未通过",
    wrongBookTitle: "错题本", wrongEmpty: "还没有错题，继续加油！", wrongReviewBtn: "⚡ 生成针对性复习课",
    wrongClear: "清空错题本", wrongGenerating: "正在生成复习课…",
    planTitle: "AI 学习路径", planPlaceholder: "输入一个大目标，如：30 天学会外贸获客", planGenerate: "生成学习路径",
    planEmpty: "还没有学习路径，让 AI 为你规划一条通往目标的路线吧。", planStartCourse: "开始这门课",
    dailyTitle: "每日一题", dailySub: "根据你的学习画像生成的趣味挑战", dailyAnswer: "提交答案", dailyAnswered: "今日已作答",
    dailyCorrect: "答对了！", dailyWrong: "再想想～", dailyXp: "获得", xpWord: "XP",
    leaderboardTitle: "社区排行榜", leaderboardXp: "学习榜", leaderboardPosts: "贡献榜", leaderboardLikes: "人气榜",
    communityTitle: "NEBULA 学习社区", communitySub: "分享你的孵化作品，与全球学习者讨论",
    communitySearch: "搜索主题 / 领域…", communityPostBtn: "📤 发布我的课程", communityEmpty: "社区还没有内容，来发布第一个作品吧！",
    communitySortHot: "🔥 热门", communitySortNew: "🕐 最新",
    postTitleLabel: "分享标题", postDescLabel: "分享描述（学完有什么收获？适合谁？）", postSelectCourse: "选择要分享的课程",
    postPublish: "发布到社区", postOk: "发布成功，已通过 AI 审核", postPending: "已提交，AI 审核未通过，进入人工复核队列",
    likeBtn: "点赞", likedBtn: "已点赞", commentsTitle: "讨论", commentPlaceholder: "写下你的讨论…", commentBtn: "发表评论", commentPendingToast: "评论已提交，正在等待人工复核，通过后将对所有人可见",
    commentRejected: "评论未通过内容审核", forkBtn: "📥 克隆到我的孵化台", forkOk: "已克隆到你的孵化台",
    backToCommunity: "← 返回社区", aiReviewLabel: "AI 审核",
    adminTitle: "内容管理后台", adminModerationTab: "人工复核队列", adminPostsTab: "全部帖子",
    adminQueueEmpty: "队列为空，暂无待复核内容", approveBtn: "通过", rejectBtn: "驳回", deleteBtn: "删除",
    adminPostsEmpty: "暂无帖子", aiReasonLabel: "AI 审核意见",
    levelZero: "零基础", levelNovice: "入门了解", levelIntermediate: "进阶掌握", levelExpert: "专家精通",
    levelQuestion: "你目前对这类知识的掌握程度？", durationLabel: "期望学习时长", durationQuick: "10 分钟快餐", durationStandard: "30 分钟标准", durationDeep: "1 小时深度",
    styleLabel: "偏好风格", styleStory: "剧情故事", styleAcademic: "严谨学术", styleCase: "案例实战", styleFun: "轻松幽默",
    scenarioLabel: "目标场景", scenarioExam: "考试备考", scenarioWork: "工作应用", scenarioInterest: "兴趣拓展", scenarioTeaching: "教学备课",
    profileHint: "以上画像将用于为你量身定制内容", nextStepLabel: "教授建议下一步", nextStepGenerate: "一键生成",
    checkinToast: "每日打卡", checkinXpToast: "连续学习", dayUnit: "天",
  },
  en: {
    navWorkbench: "Incubator",
    navAbout: "About NEBULA",
    navContact: "About Us", navCommunity: "Community", navProfile: "Me", navAdmin: "Admin", navLeaderboard: "Ranks",
    loginTab: "Sign in", registerTab: "Sign up", emailLabel: "Email", nameLabel: "Name", schoolLabel: "School *",
    passwordLabel: "Password", passwordConfirm: "Confirm password", registerBtn: "Create account", loginSubmitBtn: "Sign in",
    tokenMode: "Use access token", backToAccount: "Back to account login", registerOk: "Welcome to NEBULA!",
    passwordMismatch: "Passwords do not match", loginFailed: "Wrong email or password",
    profileTitle: "Profile", joinedAt: "Joined", myStats: "Stats", levelLabel: "Level", streakLabel: "Day streak",
    xpLabel: "XP", achievementsTitle: "Achievements", myCourses: "My courses", myPosts: "My posts",
    pendingStatus: "Pending", approvedStatus: "Approved", rejectedStatus: "Rejected",
    wrongBookTitle: "Wrong-answer book", wrongEmpty: "No wrong answers yet. Keep it up!", wrongReviewBtn: "⚡ Generate review course",
    wrongClear: "Clear", wrongGenerating: "Generating review course…",
    planTitle: "AI Learning Path", planPlaceholder: "Enter a big goal, e.g., learn外贸 acquisition in 30 days", planGenerate: "Build my path",
    planEmpty: "No path yet. Let AI plan a route to your goal.", planStartCourse: "Start this course",
    dailyTitle: "Daily Quest", dailySub: "A fun challenge based on your learning profile", dailyAnswer: "Submit", dailyAnswered: "Answered today",
    dailyCorrect: "Correct!", dailyWrong: "Think again~", dailyXp: "You earned", xpWord: "XP",
    leaderboardTitle: "Leaderboard", leaderboardXp: "XP", leaderboardPosts: "Contributions", leaderboardLikes: "Popularity",
    communityTitle: "NEBULA Learning Community", communitySub: "Share your incubations and discuss with learners worldwide",
    communitySearch: "Search topic / domain…", communityPostBtn: "📤 Publish my course", communityEmpty: "No posts yet - be the first!",
    communitySortHot: "🔥 Hot", communitySortNew: "🕐 New",
    postTitleLabel: "Title", postDescLabel: "Description (what did you learn? who is it for?)", postSelectCourse: "Choose a course",
    postPublish: "Publish", postOk: "Published and approved by AI review", postPending: "Submitted. AI review failed - now in human moderation queue",
    likeBtn: "Like", likedBtn: "Liked", commentsTitle: "Discussion", commentPlaceholder: "Write your thoughts…", commentBtn: "Comment", commentPendingToast: "Comment submitted for human review; it will be visible to everyone once approved",
    commentRejected: "Comment rejected by content review", forkBtn: "📥 Clone to my incubator", forkOk: "Cloned to your incubator",
    backToCommunity: "← Back to community", aiReviewLabel: "AI review",
    adminTitle: "Content Admin", adminModerationTab: "Moderation queue", adminPostsTab: "All posts",
    adminQueueEmpty: "Queue is empty", approveBtn: "Approve", rejectBtn: "Reject", deleteBtn: "Delete",
    adminPostsEmpty: "No posts", aiReasonLabel: "AI review reason",
    levelZero: "Absolute beginner", levelNovice: "Some basics", levelIntermediate: "Advanced", levelExpert: "Expert",
    levelQuestion: "Your current level on this topic?", durationLabel: "Preferred duration", durationQuick: "10 min quick", durationStandard: "30 min standard", durationDeep: "1 hour deep",
    styleLabel: "Preferred style", styleStory: "Story-driven", styleAcademic: "Academic", styleCase: "Case-based", styleFun: "Fun & humor",
    scenarioLabel: "Goal scenario", scenarioExam: "Exam prep", scenarioWork: "Work application", scenarioInterest: "Interest", scenarioTeaching: "Teaching prep",
    profileHint: "These preferences tailor your content", nextStepLabel: "Professor suggests next", nextStepGenerate: "Generate now",
    checkinToast: "Daily check-in", checkinXpToast: "Streak", dayUnit: "d",
  }
};

// ---- 模型系统词条（V4：Flash/Pro 预设 + 自定义 API 接入）----
export const MODEL_EXTRA = {
  zh: {
    modelFlash: "DeepSeek-V4-Flash", modelFlashSub: "0731 · 极速稳定 · 推荐",
    modelPro: "DeepSeek-V4-Pro", modelProSub: "0813 · 深度推理 · 更强",
    modelCustom: "自定义模型", modelCustomSub: "接入你自己的 API",
    customBaseLabel: "API Base URL", customBasePlace: "https://api.xxx.com/v1",
    customKeyLabel: "API Key（可选）", customKeyPlace: "sk-…",
    customModelLabel: "模型名", customModelPlace: "如 gpt-4o-mini / qwen-plus",
    customHint: "配置仅保存在你的浏览器（BYOK），Key 不落服务器，OpenAI 兼容接口即可接入。",
  },
  en: {
    modelFlash: "DeepSeek-V4-Flash", modelFlashSub: "0731 · Fast & stable · Recommended",
    modelPro: "DeepSeek-V4-Pro", modelProSub: "0813 · Deep reasoning · Stronger",
    modelCustom: "Custom model", modelCustomSub: "Bring your own API",
    customBaseLabel: "API Base URL", customBasePlace: "https://api.xxx.com/v1",
    customKeyLabel: "API Key (optional)", customKeyPlace: "sk-…",
    customModelLabel: "Model name", customModelPlace: "e.g., gpt-4o-mini / qwen-plus",
    customHint: "Config stays in your browser only (BYOK). Keys never touch our server. Any OpenAI-compatible API works.",
  }
};

// ---- 设置/密码 词条（12 语言）----
export const PW_EXTRA = {
  zh: { changePasswordLabel: "修改密码", oldPassword: "原密码", newPassword: "新密码（至少 6 位）", changePasswordBtn: "确认修改", passwordRequired: "请填写原密码与新密码", passwordTooShort: "新密码至少 6 位", passwordChanged: "密码修改成功 ✓" },
  en: { changePasswordLabel: "Change Password", oldPassword: "Current password", newPassword: "New password (6+ chars)", changePasswordBtn: "Update", passwordRequired: "Fill both fields", passwordTooShort: "New password needs 6+ chars", passwordChanged: "Password updated ✓" }
};

export const SCHOOL_EXTRA = {
  zh: { schoolNotFound: "没有找到我的学校？申请添加", schoolFullName: "学校全称", schoolRegion: "所在省市", schoolHigh: "高中", schoolMiddle: "初中", schoolSubmit: "提交审核", schoolNeed: "请填写学校名称与地区" },
  en: { schoolNotFound: "Can't find your school? Request it", schoolFullName: "Full school name", schoolRegion: "Province / City", schoolHigh: "High School", schoolMiddle: "Middle School", schoolSubmit: "Submit for review", schoolNeed: "Fill in name and region" }
};

export const ADMIN_EXTRA = {
  zh: { adminSchoolsTab: "学校审核", adminTicketsTab: "联系工单", ticketReplied: "已答复" },
  en: { adminSchoolsTab: "Schools", adminTicketsTab: "Tickets", ticketReplied: "Replied" }
};

export const VERIFY_EXTRA = {
  zh: { codePlaceholder: "邮箱验证码", sendCodeBtn: "获取验证码", codeRequired: "请填写邮箱验证码", codeNeedEmail: "请先填写有效邮箱" },
  en: { codePlaceholder: "Email code", sendCodeBtn: "Send code", codeRequired: "Enter the email code", codeNeedEmail: "Enter a valid email first" }
};

export const PROFILE_EXTRA = {
  zh: { editProfile: "编辑资料", bioLabel: "个人介绍", bioPlaceholder: "用几句话介绍你自己…", fieldsLabel: "研究领域（逗号分隔）", fieldsPlaceholder: "例如：宏观经济学，AI 教育，认知科学", phoneLabel: "电话", avatarHint: "点击上传头像", drawFortune: "抽一签", redrawFortune: "换一签", fortuneDaily: "每日一签" },
  en: { editProfile: "Edit Profile", bioLabel: "Bio", bioPlaceholder: "Introduce yourself in a few words…", fieldsLabel: "Research fields (comma separated)", fieldsPlaceholder: "e.g., Macroeconomics, AI in Education, Cognitive Science", phoneLabel: "Phone", avatarHint: "Click to upload avatar", drawFortune: "Draw a fortune", redrawFortune: "Redraw", fortuneDaily: "Daily fortune" }
};

export const LEGAL_EXTRA = {
  zh: { agreeTerms: "我已阅读并同意", termsShort: "服务条款", privacyShort: "隐私政策", agreeTransfer: "我同意个人信息跨境传输至 Cloudflare 境外数据中心", transferShort: "跨境数据传输确认", mustAgree: "请先勾选同意服务条款与跨境数据传输" },
  en: { agreeTerms: "I have read and agree to the", termsShort: "Terms of Service", privacyShort: "Privacy Policy", agreeTransfer: "I consent to cross-border transfer of my personal data to Cloudflare data centers abroad", transferShort: "Cross-border transfer notice", mustAgree: "Please agree to the Terms and cross-border transfer first" }
};

export const AUDIT_GUIDE_EXTRA = {
  zh: { auditGuideTitle: "评估机制说明（六维 AI 审计）", auditGuideAccuracy: "内容有无事实、公式、概念错误", auditGuideFit: "与你的身份/目标/难度的匹配度", auditGuideDepth: "引导质量、题型多样性、反馈颗粒度", auditGuideFun: "剧情吸引力与游戏化设计", auditGuidePersonalization: "案例与情境与你的相关程度", auditGuideCompliance: "章节数、题量与内容范围是否与要求一致" },
  en: { auditGuideTitle: "How it's scored (5-D AI Audit)", auditGuideAccuracy: "Factual, formula and concept errors", auditGuideFit: "Match with your role, goal and difficulty", auditGuideDepth: "Guidance quality, question variety, feedback granularity", auditGuideFun: "Story appeal and gamification design", auditGuidePersonalization: "Relevance of cases and scenarios to you" }
};

export const CHAT_EXTRA = {
  zh: { chatAssistant: "AI 助教", chatNew: "新对话", chatPlaceholder: "向课程助教提问（回车发送，Shift+回车换行）…", chatSend: "发送", chatEmpty: "的 AI 助教已就绪，随时解答你的疑问", chatEmptySub: "强制围绕本课程主题 · 默认联网搜索最新研究 · 支持跨学科与前沿方向引导", chatSearchOn: "联网搜索", chatSearchHint: "已开启联网搜索，回答会结合最新信息", chatDelete: "删除对话" },
  en: { chatAssistant: "AI Tutor", chatNew: "New chat", chatPlaceholder: "Ask the course tutor (Enter to send, Shift+Enter for newline)…", chatSend: "Send", chatEmpty: "AI tutor is ready to answer your questions", chatEmptySub: "Strictly on-course · web search on by default · cross-disciplinary and frontier guidance", chatSearchOn: "Web search", chatSearchHint: "Web search enabled - answers incorporate the latest info", chatDelete: "Delete chat" }
};

export const CHAT2_EXTRA = {
  zh: { chatReady: "AI 助教已就绪，点击侧边栏「AI 助教」随时提问" },
  en: { chatReady: "AI tutor ready - click 「AI Tutor」 in the sidebar anytime" }
};

export const SCHOOL2_EXTRA = {
  zh: { schoolRequired: "请选择或填写你的学校（必填）" },
  en: { schoolRequired: "Please select your school (required)" }
};

export const GOOGLE_EXTRA = {
  zh: { googleLogin: "使用 Google 登录", wechatLogin: "使用微信登录" },
  en: { googleLogin: "Sign in with Google", wechatLogin: "Sign in with WeChat" }
};

export const CHAT3_EXTRA = {
  zh: { chatRenameHint: "双击修改对话名称", chatRenamePrompt: "为对话起一个新名字：" },
  en: { chatRenameHint: "Double-click to rename", chatRenamePrompt: "Rename this chat:" }
};

export const FORTUNE2_EXTRA = {
  zh: { fortuneOnce: "每天仅此一签" },
  en: { fortuneOnce: "One fortune per day" }
};

export const CHAT4_EXTRA = {
  zh: { chatHintBubble: "如有不理解的地方，可随时与课程助教沟通" },
  en: { chatHintBubble: "Stuck anywhere? Chat with your course tutor anytime" }
};

export const GOOGLE2_EXTRA = {
  zh: { googleLoginFail: "Google 登录失败", wechatLoginFail: "微信登录失败" },
  en: { googleLoginFail: "Google sign-in failed", wechatLoginFail: "WeChat sign-in failed" }
};

export const NOTIF_EXTRA = {
  zh: { notifTitle: "消息通知", notifEmpty: "暂无消息", notifMarkRead: "全部已读", generateNotif: "课程生成完成", chatNotif: "AI 新对话已创建", postApprovedNotif: "社区内容已通过审核", postPendingNotif: "内容已进入人工复核", postRejectedNotif: "内容未通过审核", likeNotif: "有人赞了你的帖子", commentNotif: "有人评论了你的帖子", commentApprovedNotif: "评论已通过审核", commentRejectedNotif: "评论未通过审核", likeProfileNotif: "有人赞了你的主页" },
  en: { notifTitle: "Notifications", notifEmpty: "No messages", notifMarkRead: "Mark all read", generateNotif: "Course generated", chatNotif: "New AI chat created", postApprovedNotif: "Community post approved", postPendingNotif: "Post entered human review", postRejectedNotif: "Post rejected", likeNotif: "Someone liked your post", commentNotif: "Someone commented on your post", commentApprovedNotif: "Comment approved", commentRejectedNotif: "Comment rejected", likeProfileNotif: "Someone liked your profile" }
};

export const EMOJI_EXTRA = {
  zh: { emojiLabel: "专属图标（显示在昵称旁）", emojiCustom: "或输入你自己的 emoji", schoolUniversity: "大学", likeProfile: "赞主页" },
  en: { emojiLabel: "Your icon (shown beside nickname)", emojiCustom: "or type your own emoji", schoolUniversity: "University", likeProfile: "Like profile" }
};

export const REPOST_EXTRA = {
  zh: { repostFrom: "转载自", deleteMyPost: "删除", deleteMyPostConfirm: "确定删除这个作品吗？删除后可重新发布" },
  en: { repostFrom: "Reposted from", deleteMyPost: "Delete", deleteMyPostConfirm: "Delete this post? You can republish later" }
};

export const SEARCH_EXTRA = {
  zh: { searchUserPlaceholder: "搜索用户昵称 / 邮箱…", searchUserEmpty: "输入昵称或邮箱搜索用户" },
  en: { searchUserPlaceholder: "Search users by name / email…", searchUserEmpty: "Type a name or email to search users" }
};

export const REJECT_EXTRA = {
  zh: { rejectReasonTitle: "驳回理由", rejectReasonHint: "驳回时必须填写理由，将反馈给提交者", rejectReasonPlaceholder: "请写明驳回原因，如：内容与学习无关、包含广告信息…", rejectReasonRequired: "请填写驳回理由（至少 4 个字）", rejectReasonLabel: "驳回理由", schoolRejectedNotif: "学校申请被驳回", schoolApprovedNotif: "学校申请已通过" },
  en: { rejectReasonTitle: "Rejection reason", rejectReasonHint: "A reason is required and will be sent to the submitter", rejectReasonPlaceholder: "Explain why, e.g., off-topic content, advertising…", rejectReasonRequired: "Please enter a reason (4+ characters)", rejectReasonLabel: "Reason", schoolRejectedNotif: "School request rejected", schoolApprovedNotif: "School request approved" }
};

export const ADMIN2_EXTRA = {
  zh: { adminCommentTitle: "评论复核", adminUsersTab: "用户管理", adminUsersEmpty: "暂无用户", viewProfile: "查看主页", deleteUserBtn: "删除用户", deleteUserTitle: "删除用户账号", deleteUserConfirm: "确定删除该用户？其课程、帖子、评论等所有数据将被永久删除", deleteUserWarn: "此操作不可撤销", deleteUserDone: "用户已删除" },
  en: { adminCommentTitle: "Comment review", adminUsersTab: "Users", adminUsersEmpty: "No users yet", viewProfile: "View profile", deleteUserBtn: "Delete user", deleteUserTitle: "Delete user account", deleteUserConfirm: "Delete this user? All courses, posts, comments and other data will be permanently removed", deleteUserWarn: "This action cannot be undone", deleteUserDone: "User deleted" }
};
