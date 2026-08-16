// index.js - NEBULA API Worker 路由入口 v2
// 部署域名：https://api.nebulavessel.com
// 能力：注册/登录（Token 与密码双模式）、生成管线（SSE）、审计/反思/识别、
//      云端历史/分享、社区（AI 审核 + 人工复核）、管理后台、个人主页

import { json, withCors, handleCorsPreflight, readJson, uid, nowSec } from "./util.js";
import { checkAccessToken, issueSession, authFromRequest, registerUser, loginUser, publicUser, changePassword, defaultEmoji } from "./auth.js";
import { identifyDomain } from "./identify.js";
import { runGenerationPipeline } from "./pipeline.js";
import { auditCourse } from "./audit.js";
import { reflectOnLearning } from "./reflect.js";
import {
  createPost, listPosts, postDetail, addComment, toggleLike,
  moderationQueue, moderatePost, moderateComment, adminPostList, deletePost, profileStats, isAdmin, forkPost, deleteOwnPost, deleteUser,
} from "./community.js";
import { getUserXp, levelOf, dailyCheckin, streakOf, achievementsOf, leaderboard, addXp } from "./gamify.js";
import { getDailyQuestion, answerDaily, DAILY_MAX_SEEDS } from "./daily.js";
import { createPlan } from "./plan.js";
import { searchSchools, requestSchool, adminSchoolQueue, adminSchoolAction } from "./schools.js";
import { createTicket, adminTickets, adminTicketAction } from "./tickets.js";
import { drawFortune } from "./fortune.js";
import { createChat, listChats, getChat, deleteChat, chatStreamResponse, renameChat, summarizeChatTitle } from "./chat.js";
import { addNotification, listNotifications, markAllRead } from "./notify.js";
import { googleEnabled, googleAuthUrl, handleGoogleCallback } from "./google-auth.js";
import { wechatEnabled, wechatAuthUrl, handleWechatCallback } from "./wechat-auth.js";
import { requestVerificationCode, verifyCode, emailVerificationRequired, verifyTurnstile } from "./email.js";

// ---- 简单内存限流 ----
const rateMap = new Map();
function rateLimited(key, limit = 30, windowSec = 60) {
  const now = Math.floor(Date.now() / 1000);
  const entry = rateMap.get(key);
  if (!entry || now >= entry.reset) {
    rateMap.set(key, { count: 1, reset: now + windowSec });
    return false;
  }
  entry.count++;
  return entry.count > limit;
}
function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "local";
}

// ---- 课程持久化 ----
async function saveCourse(env, { course, audit, fallback, model }, input, auth) {
  const id = uid();
  try {
    await env.DB.prepare(
      `INSERT INTO courses (id, owner, user_id, topic, domain, difficulty, role, model, lang, course_json, audit_json, fallback, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, auth?.sub || (env.OWNER || "nebula-user"), auth?.sub || null,
      input.topic, input.domain || "", input.difficulty, input.role,
      model, input.lang, JSON.stringify(course), audit ? JSON.stringify(audit) : null,
      fallback ? 1 : 0, nowSec()
    ).run();
  } catch (e) {
    console.error("saveCourse failed:", e?.message);
    return null;
  }
  return id;
}

// ---- SSE 生成 ----
function sseResponse(stream, request, env) {
  return withCors(
    new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    }),
    request,
    env
  );
}

function handleGenerate(request, env, auth, genBody) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const emit = (event, data) => {
    writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)).catch(() => {});
  };

  (async () => {
    try {
      const body = genBody || (await readJson(request));
      if (!body?.topic) {
        emit("error", { message: "学习主题不能为空" });
        return;
      }
      const result = await runGenerationPipeline(env, body, emit);
      const input = {
        topic: String(body.topic).slice(0, 120),
        role: String(body.role || "").slice(0, 120),
        difficulty: ["beginner", "advanced", "expert"].includes(body.difficulty) ? body.difficulty : "beginner",
        lang: String(body.lang || "zh").slice(0, 8),
        domain: String(body.domain || "").slice(0, 24),
        model: ["flash", "pro", "custom"].includes(body.model) ? body.model : "flash",
      };
      const shareId = await saveCourse(env, result, input, auth);
      await addNotification(env, auth.sub, "generate_done", { topic: input.topic, shareId, fallback: result.fallback });
      emit("done", {
        shareId,
        course: result.course,
        audit: result.audit,
        fallback: result.fallback,
        fallbackChapters: result.fallbackChapters || [],
        model: result.model,
      });
    } catch (e) {
      console.error("generate error:", e);
      emit("error", { message: String(e?.message || e).slice(0, 300) });
    } finally {
      try { await writer.close(); } catch {}
    }
  })();

  return sseResponse(readable, request, env);
}

// ---- 历史 ----
function historyMetaRow(r) {
  let course = null;
  try { course = JSON.parse(r.course_json); } catch {}
  return {
    id: r.id,
    topic: r.topic,
    domain: r.domain,
    difficulty: r.difficulty,
    role: r.role,
    model: r.model,
    lang: r.lang,
    fallback: !!r.fallback,
    createdAt: r.created_at,
    title: course?.meta?.title || r.topic,
    chapters: course?.meta?.chapters || 0,
    totalQuestions: course?.meta?.totalQuestions || 0,
  };
}

async function handleHistoryGet(request, env, auth, url) {
  const idMatch = url.pathname.match(/^\/api\/history\/([\w-]+)$/);
  if (idMatch) {
    const row = await env.DB.prepare(
      "SELECT * FROM courses WHERE id = ? AND (user_id = ? OR owner = ?)"
    ).bind(idMatch[1], auth.sub, auth.sub).first();
    if (!row) return json({ error: "记录不存在" }, 404);
    let course = null, audit = null;
    try { course = JSON.parse(row.course_json); } catch {}
    try { audit = row.audit_json ? JSON.parse(row.audit_json) : null; } catch {}
    return json({ item: { ...historyMetaRow(row), course, audit } });
  }
  const { results } = await env.DB.prepare(
    "SELECT * FROM courses WHERE (user_id = ? OR owner = ?) ORDER BY created_at DESC LIMIT 100"
  ).bind(auth.sub, auth.sub).all();
  return json({ items: results.map(historyMetaRow) });
}

async function handleHistoryDelete(request, env, auth) {
  const body = await readJson(request);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((i) => typeof i === "string").slice(0, 100) : [];
  // 被社区帖子引用的课程不可删除（避免帖子悬空）
  const keepRef = "id NOT IN (SELECT course_id FROM posts)";
  if (ids.length === 0) {
    await env.DB.prepare(`DELETE FROM courses WHERE (user_id = ? OR owner = ?) AND ${keepRef}`).bind(auth.sub, auth.sub).run();
  } else {
    for (const id of ids) {
      await env.DB.prepare(`DELETE FROM courses WHERE id = ? AND (user_id = ? OR owner = ?) AND ${keepRef}`).bind(id, auth.sub, auth.sub).run();
    }
  }
  return json({ ok: true });
}

// ---- 分享（公开只读）----
async function handleShare(request, env, url) {
  const m = url.pathname.match(/^\/api\/share\/([\w-]+)$/);
  if (!m) return json({ error: "无效的分享 ID" }, 404);
  const row = await env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(m[1]).first();
  if (!row) return json({ error: "分享内容不存在或已删除" }, 404);
  let course = null;
  try { course = JSON.parse(row.course_json); } catch {}
  return json({ course, meta: historyMetaRow(row), shareUrl: `${url.origin}/#/s/${row.id}` });
}

// ---- 日志（兼容原 action=log 语义；type=save 时发放完成 XP 并收集错题）----
async function handleLog(request, env, auth) {
  const body = await readJson(request);
  const data = body?.data || body;
  await env.DB.prepare(
    "INSERT INTO logs (owner, type, payload, created_at) VALUES (?, ?, ?, ?)"
  ).bind(auth.sub, String(data?.type || "log").slice(0, 40), JSON.stringify({ ...data }).slice(0, 8000), nowSec()).run();
  if (data?.type === "save") {
    await addXp(env, auth.sub, "complete", data.courseId || null);
    const wrongItems = Array.isArray(data?.wrongItems) ? data.wrongItems : [];
    for (const w of wrongItems.slice(0, 20)) {
      if (!w?.question) continue;
      await env.DB.prepare(
        "INSERT INTO course_wrong (user_id, course_id, question, answer, created_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(auth.sub, data.courseId || null, String(w.question).slice(0, 300), String(w.answer || "").slice(0, 300), nowSec()).run();
    }
  }
  return json({ ok: true });
}

// ---- 错题本 ----
async function handleWrongGet(env, auth) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM course_wrong WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
  ).bind(auth.sub).all();
  return json({
    items: (results || []).map((r) => ({ id: r.id, question: r.question, answer: r.answer, createdAt: r.created_at })),
  });
}

async function handleWrongDelete(env, auth) {
  await env.DB.prepare("DELETE FROM course_wrong WHERE user_id = ?").bind(auth.sub).run();
  return json({ ok: true });
}

// ---- 个人主页 ----
function publicProfile(u) {
  return {
    id: u.id,
    name: u.name,
    school: u.school || "",
    role: u.role,
    avatar: u.avatar || "",
    bio: u.bio || "",
    fields: u.fields || "",
    wechat: u.wechat || "",
    phone: u.phone || "",
    contactEmail: u.contact_email || u.email || "",
    emoji: u.emoji || "",
    likes: u.likes || 0,
    createdAt: u.created_at,
  };
}

async function handleProfile(env, auth) {
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(auth.sub).first();
  if (!user) return json({ error: "用户不存在" }, 404);
  // 所有统计并行查询（原串行 13 次 → 1 批并行）
  const [stats, checkin, xp, achievements, recentCourses, recentPosts] = await Promise.all([
    profileStats(env, auth.sub),
    dailyCheckin(env, auth.sub),
    getUserXp(env, auth.sub),
    achievementsOf(env, auth.sub),
    env.DB.prepare("SELECT * FROM courses WHERE user_id = ? ORDER BY created_at DESC LIMIT 6").bind(auth.sub).all(),
    env.DB.prepare("SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 6").bind(auth.sub).all(),
  ]);
  const level = levelOf(xp);
  return json({
    user: { ...publicUser(user), ...publicProfile(user) },
    stats,
    xp,
    level,
    streak: checkin.streak,
    checkinXp: checkin.xpGained,
    achievements,
    recentCourses: (recentCourses.results || []).map(historyMetaRow),
    recentPosts: (recentPosts.results || []).map((p) => ({ id: p.id, title: p.title, status: p.status, rejectReason: p.reject_reason || "", createdAt: p.created_at })),
  });
}

// ---- 分享/历史/主页以外的全部路由与 fetch 处理器（重建） ----
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") return handleCorsPreflight(request, env);
    if (path === "/healthz") return withCors(json({ ok: true, service: "nebula-api", mock: env.MOCK === "1" }), request, env);

    const ip = clientIp(request);

    // ---- 公开接口 ----
    if (request.method === "POST" && path === "/api/auth") {
      if (rateLimited(`auth:${ip}`, 20, 60)) return withCors(json({ error: "请求过于频繁，请稍后再试" }, 429), request, env);
      const body = await readJson(request);
      if (checkAccessToken(env, body?.token)) {
        const ownerId = env.OWNER || "nebula-user";
        const existing = await env.DB.prepare("SELECT id, emoji, name FROM users WHERE id = ?").bind(ownerId).first();
        let ownerEmoji = existing?.emoji || "";
        if (!ownerEmoji) {
          ownerEmoji = defaultEmoji(`${ownerId}@nebula.local`);
          if (existing) await env.DB.prepare("UPDATE users SET emoji = ? WHERE id = ?").bind(ownerEmoji, ownerId).run();
        }
        if (!existing) {
          const { hashPassword } = await import("./auth.js");
          const salt = crypto.randomUUID();
          const passHash = await hashPassword(crypto.randomUUID(), salt);
          await env.DB.prepare(
            "INSERT INTO users (id, email, name, school, pass_hash, salt, role, emoji, created_at) VALUES (?, ?, ?, ?, ?, ?, 'user', ?, ?)"
          ).bind(ownerId, `${ownerId}@nebula.local`, "访客用户", "", passHash, salt, ownerEmoji, Math.floor(Date.now() / 1000)).run();
        }
        const jwt = await issueSession(env, { id: ownerId, role: "user", name: existing?.name || "访客用户", emoji: ownerEmoji });
        return withCors(json({ token: jwt, expiresIn: 2592000 }), request, env);
      }
      return withCors(json({ error: "口令错误" }, 401), request, env);
    }
    if (request.method === "GET" && path === "/api/auth/google") {
      if (!googleEnabled(env)) return withCors(json({ error: "Google 登录未配置" }, 404), request, env);
      const state = crypto.randomUUID();
      return Response.redirect(googleAuthUrl(env, state), 302);
    }
    if (request.method === "GET" && path === "/api/auth/google/callback") {
      const result = await handleGoogleCallback(env, url);
      if (result.error) {
        return Response.redirect(`https://www.nebulavessel.com/#/google-auth?error=${encodeURIComponent(result.error)}`, 302);
      }
      return Response.redirect(result.redirect, 302);
    }
    if (request.method === "GET" && path === "/api/auth/wechat") {
      if (!wechatEnabled(env)) return withCors(json({ error: "微信登录未配置" }, 404), request, env);
      const state = crypto.randomUUID();
      return Response.redirect(wechatAuthUrl(env, state), 302);
    }
    if (request.method === "GET" && path === "/api/auth/wechat/callback") {
      const result = await handleWechatCallback(env, url);
      if (result.error) {
        return Response.redirect(`https://www.nebulavessel.com/#/wechat-auth?error=${encodeURIComponent(result.error)}`, 302);
      }
      return Response.redirect(result.redirect, 302);
    }
    if (request.method === "POST" && path === "/api/auth/send-code") {
      if (rateLimited(`code:${ip}`, 10, 600)) return withCors(json({ error: "请求过于频繁，请稍后再试" }, 429), request, env);
      const body = await readJson(request);
      const result = await requestVerificationCode(env, body?.email);
      if (result.error) return withCors(json({ error: result.error }, 429), request, env);
      return withCors(json(result), request, env);
    }
    if (request.method === "GET" && path === "/api/config") {
      return withCors(json({
        emailVerification: emailVerificationRequired(env),
        turnstileSiteKey: env.TURNSTILE_SITE_KEY || "",
        googleClientId: env.GOOGLE_CLIENT_ID || "",
        wechatEnabled: wechatEnabled(env),
      }), request, env);
    }
    if (request.method === "POST" && path === "/api/register") {
      if (rateLimited(`reg:${ip}`, 10, 60)) return withCors(json({ error: "请求过于频繁，请稍后再试" }, 429), request, env);
      const body = await readJson(request);
      if (!(await verifyTurnstile(env, body?.turnstileToken, ip))) {
        return withCors(json({ error: "人机验证未通过，请重试" }, 400), request, env);
      }
      if (emailVerificationRequired(env)) {
        const v = await verifyCode(env, body?.email, body?.code);
        if (!v.ok) return withCors(json({ error: v.error || "验证码错误" }, 400), request, env);
      }
      const result = await registerUser(env, body || {});
      if (result.error) return withCors(json({ error: result.error }, 400), request, env);
      const jwt = await issueSession(env, result.user);
      return withCors(json({ token: jwt, user: result.user, expiresIn: 2592000 }), request, env);
    }
    if (request.method === "POST" && path === "/api/login") {
      if (rateLimited(`login:${ip}`, 20, 60)) return withCors(json({ error: "请求过于频繁，请稍后再试" }, 429), request, env);
      const body = await readJson(request);
      if (!(await verifyTurnstile(env, body?.turnstileToken, ip))) {
        return withCors(json({ error: "人机验证未通过，请重试" }, 400), request, env);
      }
      const result = await loginUser(env, body || {});
      if (result.error) return withCors(json({ error: result.error }, 401), request, env);
      const jwt = await issueSession(env, result.user);
      return withCors(json({ token: jwt, user: result.user, expiresIn: 2592000 }), request, env);
    }
    if (request.method === "GET" && path.startsWith("/api/share/")) {
      return withCors(await handleShare(request, env, url), request, env);
    }
    if (request.method === "GET" && path.startsWith("/api/community/")) {
      const id = path.split("/")[3];
      const viewer = await authFromRequest(request, env);
      return withCors(json(await postDetail(env, id, viewer?.sub)), request, env);
    }
    if (request.method === "GET" && path === "/api/community") {
      const viewer = await authFromRequest(request, env);
      const sort = url.searchParams.get("sort") === "new" ? "new" : "hot";
      const page = Math.max(0, parseInt(url.searchParams.get("page") || "0", 10) || 0);
      const q = (url.searchParams.get("q") || "").trim().slice(0, 40);
      return withCors(json(await listPosts(env, { sort, page, q, viewerId: viewer?.sub })), request, env);
    }
    if (request.method === "GET" && path === "/api/leaderboard") {
      const kind = ["xp", "posts", "likes"].includes(url.searchParams.get("kind")) ? url.searchParams.get("kind") : "xp";
      return withCors(json({ items: await leaderboard(env, kind) }), request, env);
    }
    if (request.method === "GET" && path === "/api/users/search") {
      const q = (url.searchParams.get("q") || "").trim().slice(0, 40);
      if (q.length < 1) return withCors(json({ items: [] }), request, env);
      const like = `%${q}%`;
      const { results } = await env.DB.prepare(
        "SELECT id, name, school, emoji, avatar FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY likes DESC LIMIT 20"
      ).bind(like, like).all();
      return withCors(json({
        items: (results || []).map((u) => ({ id: u.id, name: u.name, school: u.school || "", emoji: u.emoji || "", avatar: u.avatar || "" })),
      }), request, env);
    }
    if (request.method === "GET" && path === "/api/schools") {
      return withCors(json({
        items: await searchSchools(env, { q: url.searchParams.get("q") || "", kind: url.searchParams.get("kind") || "" }),
      }), request, env);
    }
    if (request.method === "POST" && path === "/api/tickets") {
      if (rateLimited(`ticket:${ip}`, 5, 3600)) return withCors(json({ error: "提交过于频繁，请稍后再试" }, 429), request, env);
      const body = await readJson(request);
      const result = await createTicket(env, body || {});
      if (result.error) return withCors(json({ error: result.error }, 400), request, env);
      return withCors(json({ ok: true, message: "工单已提交，我们将尽快通过官方邮箱与你联系" }), request, env);
    }
    // 学校申请无需登录（注册时发现列表中没有自己的学校即可提交）；已登录则记录申请人
    if (request.method === "POST" && path === "/api/schools/request") {
      if (rateLimited(`schoolreq:${ip}`, 5, 3600)) return withCors(json({ error: "提交过于频繁，请稍后再试" }, 429), request, env);
      const body = await readJson(request);
      const auth = await authFromRequest(request, env);
      const result = await requestSchool(env, auth, body || {});
      if (result.error) return withCors(json({ error: result.error }, 400), request, env);
      return withCors(json(result), request, env);
    }

    // ---- 需要会话 ----
    const auth = await authFromRequest(request, env);
    if (!auth) return withCors(json({ error: "未登录或会话已过期" }, 401), request, env);
    if (rateLimited(`${ip}:${auth.sub}`, 120, 60)) {
      return withCors(json({ error: "请求过于频繁，请稍后再试" }, 429), request, env);
    }

    try {
      if (request.method === "POST" && path === "/api/identify") {
        const body = await readJson(request);
        if (!body?.topic) return withCors(json({ error: "缺少主题" }, 400), request, env);
        const result = await identifyDomain(env, { topic: String(body.topic).slice(0, 120), lang: String(body.lang || "zh") });
        return withCors(json(result), request, env);
      }
      if (request.method === "POST" && path === "/api/generate") return handleGenerate(request, env, auth);
      // 按用户反馈重新生成课程（学完后想调整/优化时触发）
      if (request.method === "POST" && path === "/api/regenerate") {
        const body = await readJson(request);
        const courseId = String(body?.courseId || "").trim();
        const feedback = String(body?.feedback || "").trim();
        if (!courseId) return withCors(json({ error: "缺少课程 ID" }, 400), request, env);
        if (feedback.length < 4) return withCors(json({ error: "请填写你的修改意见（至少 4 个字）" }, 400), request, env);
        const row = await env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(courseId).first();
        if (!row) return withCors(json({ error: "课程不存在" }, 404), request, env);
        if (row.user_id && row.user_id !== auth.sub) return withCors(json({ error: "只能修改自己的课程" }, 403), request, env);
        let meta = {};
        try { meta = (JSON.parse(row.course_json) || {}).meta || {}; } catch {}
        const genBody = {
          topic: String(meta.topic || row.topic || "").slice(0, 120),
          role: String(meta.role || row.role || "").slice(0, 120),
          difficulty: ["beginner", "advanced", "expert"].includes(meta.difficulty || row.difficulty) ? (meta.difficulty || row.difficulty) : "beginner",
          lang: /^[a-z]{2,8}$/.test(String(meta.lang || "")) ? meta.lang : "zh",
          domain: String(meta.domain || row.domain || "").slice(0, 24),
          model: ["flash", "pro", "custom"].includes(row.model) ? row.model : "flash",
          chapters: meta.chaptersHint ? Number(meta.chaptersHint) : undefined,
          level: String(meta.level || "").slice(0, 16),
          duration: String(meta.duration || "").slice(0, 16),
          style: String(meta.style || "").slice(0, 16),
          scenario: String(meta.scenario || "").slice(0, 16),
          feedback,
        };
        if (!genBody.topic) return withCors(json({ error: "原课程缺少主题信息" }, 400), request, env);
        return handleGenerate(request, env, auth, genBody);
      }
      if (request.method === "POST" && path === "/api/audit") {
        const body = await readJson(request);
        if (!body?.course) return withCors(json({ error: "缺少课程数据" }, 400), request, env);
        const audit = await auditCourse(env, {
          topic: body.course?.meta?.topic || "",
          domain: body.course?.meta?.domain || "",
          difficulty: body.course?.meta?.difficulty || "beginner",
          courseJson: JSON.stringify(body.course).slice(0, 5000),
        });
        return withCors(json({ audit }), request, env);
      }
      if (request.method === "POST" && path === "/api/reflect") {
        const body = await readJson(request);
        if (!body?.content) return withCors(json({ error: "缺少感悟内容" }, 400), request, env);
        const result = await reflectOnLearning(env, {
          domain: String(body.domain || ""),
          topic: String(body.topic || ""),
          content: String(body.content).slice(0, 2000),
        });
        return withCors(json(result), request, env);
      }
      if (request.method === "POST" && path === "/api/change-password") {
        const body = await readJson(request);
        const result = await changePassword(env, auth.sub, body || {});
        if (result.error) return withCors(json({ error: result.error }, 400), request, env);
        return withCors(json({ ok: true }), request, env);
      }
      if (request.method === "GET" && path === "/api/profile") {
        return withCors(await handleProfile(env, auth), request, env);
      }
      if (request.method === "POST" && path.startsWith("/api/profile/") && path.endsWith("/like")) {
        const targetId = path.split("/")[3];
        if (targetId === auth.sub) return withCors(json({ error: "不能给自己点赞" }, 400), request, env);
        const target = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(targetId).first();
        if (!target) return withCors(json({ error: "用户不存在" }, 404), request, env);
        const existing = await env.DB.prepare("SELECT 1 FROM profile_likes WHERE user_id = ? AND from_id = ?").bind(targetId, auth.sub).first();
        if (existing) {
          await env.DB.prepare("DELETE FROM profile_likes WHERE user_id = ? AND from_id = ?").bind(targetId, auth.sub).run();
          await env.DB.prepare("UPDATE users SET likes = MAX(0, likes - 1) WHERE id = ?").bind(targetId).run();
          return withCors(json({ liked: false }), request, env);
        }
        await env.DB.prepare("INSERT INTO profile_likes (user_id, from_id, created_at) VALUES (?, ?, ?)").bind(targetId, auth.sub, nowSec()).run();
        await env.DB.prepare("UPDATE users SET likes = likes + 1 WHERE id = ?").bind(targetId).run();
        await addNotification(env, targetId, "like_profile", { from: auth.name || "某位学习者" });
        return withCors(json({ liked: true }), request, env);
      }
      if (request.method === "GET" && path.startsWith("/api/profile/")) {
        const targetId = path.split("/")[3];
        const u = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(targetId).first();
        if (!u) return withCors(json({ error: "用户不存在" }, 404), request, env);
        const [stats, xp, achievements, streak] = await Promise.all([
          profileStats(env, targetId),
          getUserXp(env, targetId),
          achievementsOf(env, targetId),
          streakOf(env, targetId),
        ]);
        return withCors(json({ user: publicProfile(u), stats, xp, achievements, streak }), request, env);
      }
      if (request.method === "POST" && path === "/api/profile/update") {
        const body = await readJson(request);
        const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(auth.sub).first();
        if (!user) return withCors(json({ error: "用户不存在" }, 404), request, env);
        const next = {
          name: body?.name !== undefined ? String(body.name).trim().slice(0, 40) : user.name,
          school: body?.school !== undefined ? String(body.school).trim().slice(0, 60) : (user.school || ""),
          bio: body?.bio !== undefined ? String(body.bio).trim().slice(0, 300) : (user.bio || ""),
          fields: body?.fields !== undefined ? String(body.fields).trim().slice(0, 100) : (user.fields || ""),
          wechat: body?.wechat !== undefined ? String(body.wechat).trim().slice(0, 40) : (user.wechat || ""),
          phone: body?.phone !== undefined ? String(body.phone).trim().slice(0, 30) : (user.phone || ""),
          contactEmail: body?.contactEmail !== undefined ? String(body.contactEmail).trim().slice(0, 80) : (user.contact_email || ""),
          avatar: body?.avatar !== undefined ? String(body.avatar).slice(0, 200 * 1024) : (user.avatar || ""),
          emoji: body?.emoji !== undefined ? String(body.emoji).trim().slice(0, 8) : (user.emoji || ""),
        };
        if (body?.name !== undefined && next.name.length < 2) {
          return withCors(json({ error: "昵称至少 2 个字符" }, 400), request, env);
        }
        await env.DB.prepare(
          "UPDATE users SET name = ?, school = ?, bio = ?, fields = ?, wechat = ?, phone = ?, contact_email = ?, avatar = ?, emoji = ? WHERE id = ?"
        ).bind(next.name, next.school, next.bio, next.fields, next.wechat, next.phone, next.contactEmail, next.avatar, next.emoji, auth.sub).run();
        return withCors(json({ ok: true, user: publicProfile({ ...user, ...next, contact_email: next.contactEmail }) }), request, env);
      }
      if (request.method === "GET" && path === "/api/daily") {
        const last = await env.DB.prepare(
          "SELECT topic FROM courses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
        ).bind(auth.sub).first();
        const refresh = url.searchParams.get("refresh") === "1";
        const day = new Date().toISOString().slice(0, 10);
        const { results } = await env.DB.prepare(
          "SELECT seed FROM daily WHERE day = ? ORDER BY seed DESC LIMIT 3"
        ).bind(day).all();
        const existing = (results || []).length;
        const seed = refresh ? Math.min(DAILY_MAX_SEEDS, existing + 1) : Math.max(1, existing);
        const q = await getDailyQuestion(env, last?.topic, seed);
        return withCors(json({ ...q, maxSeeds: DAILY_MAX_SEEDS, remaining: Math.max(0, DAILY_MAX_SEEDS - seed) }), request, env);
      }
      if (request.method === "POST" && path === "/api/daily/answer") {
        const body = await readJson(request);
        return withCors(json(await answerDaily(env, auth, body || {})), request, env);
      }
      if (request.method === "POST" && path === "/api/plan") {
        const body = await readJson(request);
        if (!body?.goal) return withCors(json({ error: "请填写学习目标" }, 400), request, env);
        const plan = await createPlan(env, {
          goal: String(body.goal).slice(0, 100),
          level: body.level || "novice",
          scenario: body.scenario || "interest",
          lang: String(body.lang || "zh"),
        });
        return withCors(json({ plan }), request, env);
      }
      if (request.method === "GET" && path === "/api/wrong") {
        return withCors(await handleWrongGet(env, auth), request, env);
      }
      if (request.method === "DELETE" && path === "/api/wrong") {
        return withCors(await handleWrongDelete(env, auth), request, env);
      }
      if (request.method === "GET" && path.startsWith("/api/history")) {
        return withCors(await handleHistoryGet(request, env, auth, url), request, env);
      }
      if (request.method === "DELETE" && path === "/api/history") {
        return withCors(await handleHistoryDelete(request, env, auth), request, env);
      }
      if (request.method === "POST" && path === "/api/log") {
        return withCors(await handleLog(request, env, auth), request, env);
      }
      // 社区
      if (request.method === "POST" && path === "/api/community") {
        const body = await readJson(request);
        const result = await createPost(env, auth, body || {});
        if (result.error) return withCors(json({ error: result.error }, 400), request, env);
        await addNotification(env, auth.sub, result.post.status === "approved" ? "post_approved" : "post_pending", { title: result.post.title, status: result.post.status });
        return withCors(json(result), request, env);
      }
      if (request.method === "DELETE" && path.startsWith("/api/community/")) {
        const result = await deleteOwnPost(env, auth, path.split("/")[3]);
        if (result.error) return withCors(json({ error: result.error }, 400), request, env);
        return withCors(json(result), request, env);
      }
      if (request.method === "POST" && path.startsWith("/api/community/") && path.endsWith("/comment")) {
        const body = await readJson(request);
        const result = await addComment(env, auth, { postId: path.split("/")[3], content: body?.content });
        if (result.error) return withCors(json({ error: result.error }, 400), request, env);
        if (result.ok && !result.pending) {
          const post = await env.DB.prepare("SELECT user_id, title FROM posts WHERE id = ?").bind(path.split("/")[3]).first();
          if (post && post.user_id !== auth.sub) {
            await addNotification(env, post.user_id, "comment", { title: post.title, from: auth.name || "某位学习者" });
          }
        }
        return withCors(json(result), request, env);
      }
      if (request.method === "POST" && path.startsWith("/api/community/") && path.endsWith("/like")) {
        const result = await toggleLike(env, auth, path.split("/")[3]);
        if (result.error) return withCors(json({ error: result.error }, 400), request, env);
        if (result.liked) {
          const post = await env.DB.prepare("SELECT user_id, title FROM posts WHERE id = ?").bind(path.split("/")[3]).first();
          if (post && post.user_id !== auth.sub) {
            await addNotification(env, post.user_id, "like", { title: post.title, from: auth.name || "某位学习者" });
          }
        }
        return withCors(json(result), request, env);
      }
      if (request.method === "POST" && path.startsWith("/api/community/") && path.endsWith("/fork")) {
        const result = await forkPost(env, auth, path.split("/")[3]);
        if (result.error) return withCors(json({ error: result.error }, 400), request, env);
        return withCors(json(result), request, env);
      }
      // 聊天
      if (request.method === "POST" && path === "/api/chats") {
        const body = await readJson(request);
        const chat = await createChat(env, auth, body || {});
        await addNotification(env, auth.sub, "chat_created", { title: chat.title });
        return withCors(json(chat), request, env);
      }
      if (request.method === "GET" && path === "/api/chats") {
        return withCors(json({ items: await listChats(env, auth) }), request, env);
      }
      if (request.method === "GET" && path.startsWith("/api/chats/")) {
        const chat = await getChat(env, auth, path.split("/")[3]);
        if (!chat) return withCors(json({ error: "会话不存在" }, 404), request, env);
        return withCors(json({ chat }), request, env);
      }
      if (request.method === "DELETE" && path.startsWith("/api/chats/")) {
        return withCors(json(await deleteChat(env, auth, path.split("/")[3])), request, env);
      }
      if (request.method === "POST" && path.startsWith("/api/chats/") && path.endsWith("/rename")) {
        const body = await readJson(request);
        const result = await renameChat(env, auth, path.split("/")[3], body?.title);
        if (result.error) return withCors(json({ error: result.error }, 400), request, env);
        return withCors(json(result), request, env);
      }
      if (request.method === "POST" && path.startsWith("/api/chats/") && path.endsWith("/summarize")) {
        const result = await summarizeChatTitle(env, auth, path.split("/")[3]);
        if (result.error) return withCors(json({ error: result.error }, 400), request, env);
        return withCors(json(result), request, env);
      }
      if (request.method === "POST" && path.startsWith("/api/chats/") && path.endsWith("/messages")) {
        const body = await readJson(request);
        const res = chatStreamResponse(request, env, auth, path.split("/")[3], body || {});
        return withCors(res, request, env);
      }
      // 通知
      if (request.method === "GET" && path === "/api/notifications") {
        return withCors(json(await listNotifications(env, auth.sub, url.searchParams.get("unread") === "1")), request, env);
      }
      if (request.method === "POST" && path === "/api/notifications/read") {
        return withCors(json(await markAllRead(env, auth.sub)), request, env);
      }
      // 抽签
      if (request.method === "GET" && path === "/api/fortune") {
        return withCors(json(await drawFortune(env, auth.sub)), request, env);
      }
      // 管理后台
      if (path.startsWith("/api/admin")) {
        if (!isAdmin(auth)) return withCors(json({ error: "需要管理员权限" }, 403), request, env);
        if (request.method === "GET" && path === "/api/admin/moderation") {
          return withCors(json(await moderationQueue(env)), request, env);
        }
        if (request.method === "POST" && path.startsWith("/api/admin/moderation/comment/")) {
          const body = await readJson(request);
          const comment = await env.DB.prepare("SELECT user_id, content, post_id FROM comments WHERE id = ?").bind(path.split("/")[5]).first();
          const result = await moderateComment(env, path.split("/")[5], body?.action, body?.reason);
          if (result.error) return withCors(json({ error: result.error }, 400), request, env);
          if (comment) {
            await addNotification(env, comment.user_id, result.status === "approved" ? "comment_approved" : "comment_rejected", {
              content: String(comment.content || "").slice(0, 60),
              reason: result.reason || "",
            });
          }
          return withCors(json(result), request, env);
        }
        if (request.method === "POST" && path.startsWith("/api/admin/moderation/")) {
          const body = await readJson(request);
          const post = await env.DB.prepare("SELECT user_id, title FROM posts WHERE id = ?").bind(path.split("/")[4]).first();
          const result = await moderatePost(env, path.split("/")[4], body?.action, body?.reason);
          if (result.error) return withCors(json({ error: result.error }, 400), request, env);
          if (post) {
            await addNotification(env, post.user_id, result.status === "approved" ? "post_approved" : "post_rejected", {
              title: post.title,
              status: result.status,
              reason: result.reason || "",
            });
          }
          return withCors(json(result), request, env);
        }
        if (request.method === "GET" && path === "/api/admin/posts") {
          const page = Math.max(0, parseInt(url.searchParams.get("page") || "0", 10) || 0);
          return withCors(json(await adminPostList(env, { page })), request, env);
        }
        if (request.method === "DELETE" && path.startsWith("/api/admin/posts/")) {
          return withCors(json(await deletePost(env, path.split("/")[4])), request, env);
        }
        if (request.method === "GET" && path === "/api/admin/schools") {
          return withCors(json({ items: await adminSchoolQueue(env) }), request, env);
        }
        if (request.method === "POST" && path.startsWith("/api/admin/schools/")) {
          const body = await readJson(request);
          const row = await env.DB.prepare("SELECT applicant_id, name FROM schools WHERE id = ?").bind(path.split("/")[4]).first();
          const result = await adminSchoolAction(env, path.split("/")[4], body?.action, body?.reason);
          if (result.error) return withCors(json({ error: result.error }, 400), request, env);
          if (row?.applicant_id && body?.action === "reject") {
            await addNotification(env, row.applicant_id, "school_rejected", { name: row.name, reason: body?.reason || "" });
          }
          if (row?.applicant_id && body?.action === "approve") {
            await addNotification(env, row.applicant_id, "school_approved", { name: row.name });
          }
          return withCors(json(result), request, env);
        }
        if (request.method === "GET" && path === "/api/admin/users") {
          const q = (url.searchParams.get("q") || "").trim().slice(0, 40);
          const like = `%${q}%`;
          const sql = q
            ? "SELECT id, email, name, school, role, emoji, likes, created_at FROM users WHERE name LIKE ? OR email LIKE ? OR school LIKE ? ORDER BY created_at DESC LIMIT 200"
            : "SELECT id, email, name, school, role, emoji, likes, created_at FROM users ORDER BY created_at DESC LIMIT 200";
          const { results } = await env.DB.prepare(sql).bind(...(q ? [like, like, like] : [])).all();
          const items = await Promise.all((results || []).map(async (u) => {
            const stats = await profileStats(env, u.id);
            return {
              id: u.id, email: u.email, name: u.name, school: u.school || "",
              role: u.role, emoji: u.emoji || "", likes: u.likes || 0, createdAt: u.created_at,
              courses: stats.courses, posts: stats.posts,
            };
          }));
          return withCors(json({ items }), request, env);
        }
        if (request.method === "DELETE" && path.startsWith("/api/admin/users/")) {
          if (path.split("/")[4] === (env.OWNER || "nebula-user")) {
            return withCors(json({ error: "不能删除系统访客账号" }, 400), request, env);
          }
          const result = await deleteUser(env, auth.sub, path.split("/")[4]);
          if (result.error) return withCors(json({ error: result.error }, 400), request, env);
          return withCors(json(result), request, env);
        }
        if (request.method === "GET" && path === "/api/admin/tickets") {
          return withCors(json({ items: await adminTickets(env) }), request, env);
        }
        if (request.method === "POST" && path.startsWith("/api/admin/tickets/")) {
          const body = await readJson(request);
          return withCors(json(await adminTicketAction(env, path.split("/")[4], body?.action)), request, env);
        }
        return withCors(json({ error: "管理接口不存在" }, 404), request, env);
      }

      return withCors(json({ error: "接口不存在" }, 404), request, env);
    } catch (e) {
      console.error("api error:", e);
      return withCors(json({ error: String(e?.message || e).slice(0, 300) }, 500), request, env);
    }
  },
};
