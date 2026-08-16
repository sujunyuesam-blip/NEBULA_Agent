// smoke-api.mjs - API 全流程冒烟测试 V3（本地 Worker MOCK 模式）
// 覆盖：注册/登录/画像/生成SSE/每日一题/学习路径/社区+AI审核+人工复核/管理后台/错题/排行榜/历史
// 用法: node scripts/smoke-api.mjs

const BASE = process.env.API_BASE || "http://127.0.0.1:8787";
const rnd = Math.random().toString(36).slice(2, 8);

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
}

async function req(path, { method = "GET", body, token, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (raw) return res;
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

let userToken = null, adminToken = null, shareId = null;

async function sseGenerate(token, body) {
  const res = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", doneEvent = null, stages = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop();
    for (const block of blocks) {
      let event = "message";
      const dataLines = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) continue;
      const data = JSON.parse(dataLines.join("\n"));
      if (event === "stage") stages.push(data.stage);
      if (event === "done") doneEvent = data;
    }
  }
  return { status: res.status, stages, doneEvent };
}

async function main() {
  console.log(`\n[NEBULA API Smoke V3] ${BASE}\n`);

  // 1. 健康检查
  const h = await req("/healthz", {});
  check("healthz", h.status === 200 && h.data?.ok === true);

  // 2. 注册
  const reg = await req("/api/register", { method: "POST", body: { email: `user${rnd}@test.com`, name: "测试学习者", school: "星云大学", password: "pass123456" } });
  check("register: 返回 JWT", reg.status === 200 && typeof reg.data?.token === "string", JSON.stringify(reg.data));
  userToken = reg.data?.token;

  const reg2 = await req("/api/register", { method: "POST", body: { email: `user${rnd}@test.com`, name: "x", school: "", password: "pass123456" } });
  check("register: 重复邮箱 400", reg2.status === 400);

  // 3. 登录
  const login = await req("/api/login", { method: "POST", body: { email: `user${rnd}@test.com`, password: "pass123456" } });
  check("login: 成功", login.status === 200 && !!login.data?.token);
  const badLogin = await req("/api/login", { method: "POST", body: { email: `user${rnd}@test.com`, password: "wrong" } });
  check("login: 错误密码 401", badLogin.status === 401);

  // 4. 管理员注册/登录（ADMIN_EMAILS 匹配）
  const admin = await req("/api/register", { method: "POST", body: { email: "admin@nebula.test", name: "管理员", school: "", password: "admin123456" } });
  if (admin.status === 200) {
    adminToken = admin.data?.token;
    check("admin: ADMIN_EMAILS 注册为管理员", admin.data?.user?.role === "admin", JSON.stringify(admin.data?.user));
  } else {
    const adminLogin = await req("/api/login", { method: "POST", body: { email: "admin@nebula.test", password: "admin123456" } });
    adminToken = adminLogin.data?.token;
    check("admin: 已有管理员账号登录", adminLogin.status === 200 && !!adminToken);
  }

  // 5. 个人主页
  const prof = await req("/api/profile", { token: userToken });
  check("profile: 用户资料", prof.status === 200 && prof.data?.user?.name === "测试学习者", JSON.stringify(prof.data?.user));
  check("profile: xp/streak/成就", typeof prof.data?.xp === "number" && typeof prof.data?.streak === "number" && Array.isArray(prof.data?.achievements));
  check("profile: 打卡 XP", (prof.data?.checkinXp ?? 0) >= 0);

  // 6. identify
  const idf = await req("/api/identify", { method: "POST", body: { topic: "拉格朗日乘子法", lang: "zh" }, token: userToken });
  check("identify: 领域识别", idf.status === 200 && !!idf.data?.domain, JSON.stringify(idf.data));

  // 7. 生成（SSE，含个性化问卷参数）
  const gen = await sseGenerate(userToken, {
    topic: "拉格朗日乘子法", role: "外贸出口商", difficulty: "advanced", model: "flash",
    lang: "zh", level: "novice", duration: "standard", style: "story", scenario: "work",
  });
  check("generate: SSE 200", gen.status === 200, `status=${gen.status}`);
  check("generate: stage 事件", gen.stages.length > 0, JSON.stringify(gen.stages));
  check("generate: done 事件", !!gen.doneEvent);
  if (gen.doneEvent) {
    const c = gen.doneEvent.course;
    shareId = gen.doneEvent.shareId;
    check("generate: 课程结构完整", !!c?.meta?.title && Array.isArray(c?.chapters) && c.chapters.length >= 3, `chapters=${c?.chapters?.length}`);
    check("generate: 章节含 warmup(预热)", c.chapters.every((ch) => !!ch.warmup?.question));
    check("generate: 章节含 keyPoints", c.chapters.every((ch) => Array.isArray(ch.keyPoints) && ch.keyPoints.length > 0));
    check("generate: 题卡题型合法", c.chapters.every((ch) => (ch.quiz || []).every((q) => ["single","multi","judge","match","order","case","fill"].includes(q.type))));
    check("generate: 审计五维", ["accuracy","fit","depth","fun","personalization"].every((k) => typeof gen.doneEvent.audit?.[k] === "number"));
    check("generate: 有 shareId", !!shareId);
  }

  // 8. 分享公开可读
  if (shareId) {
    const sh = await req(`/api/share/${shareId}`, {});
    check("share: 公开可读", sh.status === 200 && !!sh.data?.course);
  }

  // 9. 每日一题
  const daily = await req("/api/daily", { token: userToken });
  check("daily: 返回题目", daily.status === 200 && !!daily.data?.question && Array.isArray(daily.data?.options), JSON.stringify(daily.data));
  const dAns = await req("/api/daily/answer", { method: "POST", body: { correct: true }, token: userToken });
  check("daily: 答对加 XP", dAns.status === 200 && dAns.data?.xpGained > 0, JSON.stringify(dAns.data));
  const dAns2 = await req("/api/daily/answer", { method: "POST", body: { correct: true }, token: userToken });
  check("daily: 重复作答不加 XP", dAns2.data?.already === true && dAns2.data?.xpGained === 0);

  // 10. 学习路径
  const plan = await req("/api/plan", { method: "POST", body: { goal: "30 天学会外贸获客", level: "novice", scenario: "work" }, token: userToken });
  check("plan: 返回课程序列", plan.status === 200 && Array.isArray(plan.data?.plan?.courses) && plan.data.plan.courses.length >= 2, JSON.stringify(plan.data?.plan?.courses?.length));

  // 11. 社区发布（正常 → AI 通过）
  // 先清理历史遗留帖子，保证测试可重复
  if (adminToken) {
    try {
      const old = await req("/api/admin/posts", { token: adminToken });
      for (const p of old.data?.items || []) {
        await req(`/api/admin/posts/${p.id}`, { method: "DELETE", token: adminToken });
      }
    } catch {}
  }
  if (shareId) {
    const pub = await req("/api/community", { method: "POST", body: { courseId: shareId, title: "外贸人必学：拉格朗日乘子法实战", description: "把约束优化用到成本控制里" }, token: userToken });
    check("publish: AI 审核通过", pub.status === 200 && pub.data?.post?.status === "approved", JSON.stringify(pub.data));
    const pub2 = await req("/api/community", { method: "POST", body: { courseId: shareId, title: "垃圾广告测试", description: "加微信买课" }, token: userToken });
    check("publish: AI 拒绝转人工复核", pub2.status === 200 && pub2.data?.post?.status === "pending", JSON.stringify(pub2.data));
    const postId = pub2.data?.post?.id;

    // 列表
    const list = await req("/api/community?sort=hot", {});
    check("community: 列表仅显示已通过", list.status === 200 && Array.isArray(list.data?.items) && list.data.items.every((p) => p.status === "approved"), `count=${list.data?.items?.length}`);
    check("community: 列表包含刚发布的帖子", (list.data?.items || []).some((p) => p.title.includes("拉格朗日")));

    // 搜索
    const search = await req(`/api/community?q=${encodeURIComponent("拉格朗日")}`, {});
    check("community: 搜索命中", (search.data?.items || []).some((p) => p.title.includes("拉格朗日")));

    const postIdOk = list.data?.items?.find((p) => p.title.includes("拉格朗日"))?.id;
    if (postIdOk) {
      // 详情
      const detail = await req(`/api/community/${postIdOk}`, { token: userToken });
      check("community: 详情含课程", detail.status === 200 && !!detail.data?.course);
      // 评论
      const cmt = await req(`/api/community/${postIdOk}/comment`, { method: "POST", body: { content: "写得很实用，学到了！" }, token: userToken });
      check("comment: 正常评论通过", cmt.status === 200 && cmt.data?.ok === true, JSON.stringify(cmt.data));
      const cmt2 = await req(`/api/community/${postIdOk}/comment`, { method: "POST", body: { content: "垃圾广告辱骂" }, token: userToken });
      check("comment: 违规评论被拒", cmt2.status === 400 || cmt2.data?.ok === false, JSON.stringify(cmt2.data));
      // 点赞
      const like = await req(`/api/community/${postIdOk}/like`, { method: "POST", body: {}, token: userToken });
      check("like: 点赞成功", like.data?.liked === true);
      // 克隆
      const fork = await req(`/api/community/${postIdOk}/fork`, { method: "POST", body: {}, token: userToken });
      check("fork: 克隆到我的孵化台", fork.status === 200 && !!fork.data?.courseId);
    }

    // 12. 管理后台：人工复核队列
    const queue = await req("/api/admin/moderation", { token: adminToken });
    check("admin: 复核队列含 AI 拒绝帖子", queue.status === 200 && (queue.data?.items || []).some((i) => i.id === postId), `queue=${queue.data?.items?.length}`);
    if (postId) {
      const approve = await req(`/api/admin/moderation/${postId}`, { method: "POST", body: { action: "approve" }, token: adminToken });
      check("admin: 人工复核通过", approve.data?.status === "approved", JSON.stringify(approve.data));
    }
    const adminPosts = await req("/api/admin/posts", { token: adminToken });
    check("admin: 帖子管理列表", adminPosts.status === 200 && Array.isArray(adminPosts.data?.items));
  }

  // 13. 错题本（模拟 SAVE_DATA 保存）
  const save = await req("/api/log", { method: "POST", body: { type: "save", courseId: shareId, score: 3, total: 5, wrongItems: [{ question: "测试错题1", answer: "答案A" }] }, token: userToken });
  check("log: 保存学习数据", save.status === 200 && save.data?.ok === true);
  const wrong = await req("/api/wrong", { token: userToken });
  check("wrong: 错题本有记录", (wrong.data?.items || []).length >= 1, `count=${wrong.data?.items?.length}`);

  // 14. 排行榜
  const lb = await req("/api/leaderboard?kind=xp", {});
  check("leaderboard: 返回排行", lb.status === 200 && Array.isArray(lb.data?.items) && lb.data.items.length > 0, `count=${lb.data?.items?.length}`);

  // 15. 历史
  const hist = await req("/api/history", { token: userToken });
  check("history: 列表", hist.status === 200 && (hist.data?.items?.length || 0) >= 1, `count=${hist.data?.items?.length}`);
  const del = await req("/api/history", { method: "DELETE", body: {}, token: userToken });
  check("history: 清空", del.data?.ok === true);
  const delWrong = await req("/api/wrong", { method: "DELETE", token: userToken });
  check("wrong: 清空错题本", delWrong.data?.ok === true);

  console.log(`\n结果: ${pass} 通过 / ${fail} 失败\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
