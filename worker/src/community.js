// community.js - 社区：发布（AI 审核 + 人工复核）、帖子列表/详情、评论（AI 审核）、点赞、管理后台

import { callWithRetry } from "./deepseek.js";
import { extractJson, tryParseJson, uid, nowSec } from "./util.js";
import { publicUser } from "./auth.js";

// ---------- AI 内容审核 ----------
export async function aiReviewSubmission(env, { title, description, topic, courseDigest }) {
  if (env.MOCK === "1") {
    if (/垃圾|广告|test-reject/i.test(`${title} ${description}`)) {
      return { approved: false, reason: "MOCK：疑似广告/垃圾内容，转人工复核", risk: "high" };
    }
    return { approved: true, reason: "", risk: "low" };
  }
  try {
    const res = await callWithRetry(
      env,
      "flash",
      [
        {
          role: "system",
          content:
            "你是学习社区的内容安全审核员。审核用户提交的课程分享。判定是否包含：广告营销、垃圾信息、人身攻击、色情低俗、政治敏感、明显与学习无关的内容。只输出 JSON：{\"approved\": true/false, \"reason\": \"一句话原因(<=60字)\", \"risk\": \"low|medium|high\"}",
        },
        {
          role: "user",
          content: `标题：${title}\n描述：${description}\n主题：${topic}\n课程内容摘要：${String(courseDigest || "").slice(0, 800)}`,
        },
      ],
      { maxTokens: 300, temperature: 0.1 }
    );
    const parsed = tryParseJson(extractJson(res.content) || res.content);
    if (parsed && typeof parsed === "object") {
      return {
        approved: parsed.approved !== false,
        reason: String(parsed.reason || "").slice(0, 120),
        risk: String(parsed.risk || "low").slice(0, 10),
      };
    }
    return { approved: true, reason: "", risk: "low" };
  } catch (e) {
    console.warn("ai review failed:", e?.message);
    // AI 审核不可用时不能直接放行：转人工复核
    return { approved: false, reason: "AI 审核服务暂不可用，转人工复核", risk: "low" };
  }
}

export async function aiReviewComment(env, content) {
  if (env.MOCK === "1") {
    if (/垃圾|广告|辱骂|test-reject/i.test(content)) return { approved: false, reason: "MOCK：评论违规" };
    return { approved: true, reason: "" };
  }
  try {
    const res = await callWithRetry(
      env,
      "flash",
      [
        {
          role: "system",
          content:
            "你是学习社区的评论审核员。判定评论是否包含广告、辱骂、色情、政治敏感内容。只输出 JSON：{\"approved\": true/false, \"reason\": \"<=40字\"}",
        },
        { role: "user", content: String(content).slice(0, 500) },
      ],
      { maxTokens: 200, temperature: 0.1 }
    );
    const parsed = tryParseJson(extractJson(res.content) || res.content);
    if (parsed && typeof parsed === "object") {
      return { approved: parsed.approved !== false, reason: String(parsed.reason || "").slice(0, 80) };
    }
    return { approved: true, reason: "" };
  } catch {
    return { approved: true, reason: "" }; // 评论审核服务异常时不阻塞交流，管理员可事后删除
  }
}

// ---------- 发布 ----------
export async function createPost(env, auth, { courseId, title, description }) {
  courseId = String(courseId || "").trim();
  title = String(title || "").trim().slice(0, 80);
  description = String(description || "").trim().slice(0, 400);
  if (!courseId) return { error: "请选择要分享的课程" };
  if (!title) return { error: "请填写分享标题" };

  const course = await env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(courseId).first();
  if (!course) return { error: "课程不存在" };
  if (course.user_id && course.user_id !== auth.sub) return { error: "只能分享自己生成的课程" };

  let courseJson = null;
  try { courseJson = JSON.parse(course.course_json); } catch {}
  const originAuthor = courseJson?.meta?.origin?.authorName || "";
  const review = await aiReviewSubmission(env, {
    title,
    description,
    topic: course.topic,
    courseDigest: JSON.stringify({
      meta: courseJson?.meta,
      chapterTitles: (courseJson?.chapters || []).map((c) => c.title),
    }),
  });

  const id = uid();
  const status = review.approved ? "approved" : "pending";
  await env.DB.prepare(
    `INSERT INTO posts (id, user_id, course_id, title, description, topic, domain, difficulty, status, ai_review, origin_author, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, auth.sub, courseId, title, description,
    course.topic, course.domain || "", course.difficulty || "beginner",
    status, JSON.stringify(review), originAuthor, nowSec()
  ).run();

  return {
    post: { id, status, review },
    message: review.approved
      ? "发布成功，已通过 AI 审核"
      : "已提交。AI 审核未通过，进入人工复核队列，通过后将在社区展示",
  };
}

// ---------- 列表 / 详情 ----------
function postRow(row, author, liked) {
  let review = null;
  try { review = row.ai_review ? JSON.parse(row.ai_review) : null; } catch {}
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    topic: row.topic,
    domain: row.domain,
    difficulty: row.difficulty,
    status: row.status,
    review,
    rejectReason: row.reject_reason || "",
    originAuthor: row.origin_author || "",
    likes: row.likes,
    createdAt: row.created_at,
    author,
    likedByMe: !!liked,
    courseId: row.course_id,
  };
}

export async function listPosts(env, { sort = "hot", page = 0, q = "", viewerId }) {
  const limit = 20;
  const offset = Math.max(0, page) * limit;
  const order = sort === "new" ? "p.created_at DESC" : "p.likes DESC, p.created_at DESC";
  const where = q
    ? "WHERE p.status = 'approved' AND (p.title LIKE ? OR p.topic LIKE ? OR p.domain LIKE ? OR p.description LIKE ?)"
    : "WHERE p.status = 'approved'";
  const like = `%${q}%`;
  const { results } = await env.DB.prepare(
    `SELECT p.*, u.name AS author_name, u.school AS author_school
     FROM posts p LEFT JOIN users u ON u.id = p.user_id
     ${where}
     ORDER BY ${order} LIMIT ? OFFSET ?`
  ).bind(...(q ? [like, like, like, like, limit, offset] : [limit, offset])).all();

  const ids = results.map((r) => r.id);
  let myLikes = new Set();
  if (viewerId && ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    const liked = await env.DB.prepare(`SELECT post_id FROM likes WHERE user_id = ? AND post_id IN (${placeholders})`)
      .bind(viewerId, ...ids).all();
    liked.results?.forEach((r) => myLikes.add(r.post_id));
  }
  return {
    items: results.map((r) => postRow(r, publicUser({ id: r.user_id, name: r.author_name, school: r.author_school, role: "user" }), myLikes.has(r.id))),
  };
}

export async function postDetail(env, id, viewerId) {
  const row = await env.DB.prepare(
    `SELECT p.*, u.name AS author_name, u.school AS author_school, c.course_json
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_id
     LEFT JOIN courses c ON c.id = p.course_id
     WHERE p.id = ?`
  ).bind(id).first();
  if (!row) return { error: "帖子不存在" };
  if (row.status !== "approved") {
    // 非公开状态：仅作者本人或管理员可见
    const isOwner = viewerId && row.user_id === viewerId;
    if (!isOwner) return { error: "帖子正在审核中" };
  }
  let course = null;
  try { course = JSON.parse(row.course_json); } catch {}
  const liked = viewerId
    ? await env.DB.prepare("SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?").bind(id, viewerId).first()
    : null;
  const comments = await env.DB.prepare(
    `SELECT cm.*, u.name AS author_name, u.school AS author_school
     FROM comments cm LEFT JOIN users u ON u.id = cm.user_id
     WHERE cm.post_id = ? AND cm.status = 'approved'
     ORDER BY cm.created_at ASC LIMIT 100`
  ).bind(id).all();
  return {
    post: postRow(row, publicUser({ id: row.user_id, name: row.author_name, school: row.author_school, role: "user" }), !!liked),
    course,
    comments: (comments.results || []).map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.created_at,
      author: publicUser({ id: c.user_id, name: c.author_name, school: c.author_school, role: "user" }),
    })),
  };
}

// ---------- 评论 ----------
export async function addComment(env, auth, { postId, content }) {
  postId = String(postId || "").trim();
  content = String(content || "").trim().slice(0, 500);
  if (!postId) return { error: "缺少帖子 ID" };
  if (content.length < 2) return { error: "评论至少 2 个字符" };
  const post = await env.DB.prepare("SELECT id, status FROM posts WHERE id = ?").bind(postId).first();
  if (!post) return { error: "帖子不存在" };
  if (post.status !== "approved") return { error: "帖子正在审核中" };

  const review = await aiReviewComment(env, content);
  const id = uid();
  const status = review.approved ? "approved" : "pending"; // 不通过 → 转人工复核，而不是直接丢弃
  await env.DB.prepare(
    "INSERT INTO comments (id, post_id, user_id, content, status, ai_review, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, postId, auth.sub, content, status, review.approved ? null : JSON.stringify(review), nowSec()).run();
  return review.approved
    ? { ok: true, comment: { id, content, author: { id: auth.sub, name: auth.name || "" } } }
    : { ok: true, pending: true, message: "评论已提交，正在等待人工复核，通过后将对所有人可见" };
}

// ---------- 点赞 ----------
export async function toggleLike(env, auth, postId) {
  postId = String(postId || "").trim();
  if (!postId) return { error: "缺少帖子 ID" };
  const existing = await env.DB.prepare("SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?").bind(postId, auth.sub).first();
  if (existing) {
    await env.DB.prepare("DELETE FROM likes WHERE post_id = ? AND user_id = ?").bind(postId, auth.sub).run();
    await env.DB.prepare("UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?").bind(postId).run();
    return { liked: false };
  }
  await env.DB.prepare("INSERT INTO likes (post_id, user_id, created_at) VALUES (?, ?, ?)").bind(postId, auth.sub, nowSec()).run();
  await env.DB.prepare("UPDATE posts SET likes = likes + 1 WHERE id = ?").bind(postId).run();
  return { liked: true };
}

// ---------- 克隆课程到我的孵化台（fork） ----------
export async function forkPost(env, auth, postId) {
  const post = await env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(postId).first();
  if (!post) return { error: "帖子不存在" };
  if (post.status !== "approved") return { error: "帖子正在审核中" };
  const course = await env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(post.course_id).first();
  if (!course) return { error: "课程不存在" };
  const author = await env.DB.prepare("SELECT name FROM users WHERE id = ?").bind(post.user_id).first();

  // 在课程 meta 中记录原作者（转载署名）
  let courseJsonStr = course.course_json;
  try {
    const cj = JSON.parse(course.course_json);
    cj.meta = { ...cj.meta, origin: { authorName: author?.name || "社区作者", authorId: post.user_id, courseId: post.course_id } };
    courseJsonStr = JSON.stringify(cj);
  } catch {}
  const newId = uid();
  await env.DB.prepare(
    `INSERT INTO courses (id, owner, user_id, topic, domain, difficulty, role, model, lang, course_json, audit_json, fallback, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    newId, auth.sub, auth.sub, `${course.topic}（来自社区）`.slice(0, 120), course.domain, course.difficulty,
    course.role, course.model, course.lang, courseJsonStr, course.audit_json, course.fallback, nowSec()
  ).run();
  return { ok: true, courseId: newId, originAuthor: author?.name || "" };
}

// ---------- 作者删除自己的帖子（可重新发布） ----------
export async function deleteOwnPost(env, auth, postId) {
  const post = await env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(postId).first();
  if (!post) return { error: "帖子不存在" };
  if (post.user_id !== auth.sub) return { error: "只能删除自己的帖子" };
  await env.DB.prepare("DELETE FROM comments WHERE post_id = ?").bind(postId).run();
  await env.DB.prepare("DELETE FROM likes WHERE post_id = ?").bind(postId).run();
  await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(postId).run();
  return { ok: true, message: "作品已删除，可随时重新发布" };
}

// ---------- 管理后台 ----------
export function isAdmin(auth) {
  return auth && auth.role === "admin";
}

export async function moderationQueue(env) {
  const [posts, comments] = await Promise.all([
    env.DB.prepare(
      `SELECT p.*, u.name AS author_name, c.topic AS course_topic, c.course_json
       FROM posts p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN courses c ON c.id = p.course_id
       WHERE p.status = 'pending'
       ORDER BY p.created_at ASC LIMIT 100`
    ).all(),
    env.DB.prepare(
      `SELECT cm.*, u.name AS author_name, p.title AS post_title
       FROM comments cm
       LEFT JOIN users u ON u.id = cm.user_id
       LEFT JOIN posts p ON p.id = cm.post_id
       WHERE cm.status = 'pending'
       ORDER BY cm.created_at ASC LIMIT 100`
    ).all(),
  ]);
  const postItems = (posts.results || []).map((r) => {
    let review = null, courseMeta = null;
    try { review = r.ai_review ? JSON.parse(r.ai_review) : null; } catch {}
    try { courseMeta = JSON.parse(r.course_json)?.meta || null; } catch {}
    return {
      type: "post",
      id: r.id,
      title: r.title,
      description: r.description,
      topic: r.topic,
      authorName: r.author_name || "匿名",
      review,
      courseMeta,
      createdAt: r.created_at,
      courseId: r.course_id,
    };
  });
  const commentItems = (comments.results || []).map((r) => {
    let review = null;
    try { review = r.ai_review ? JSON.parse(r.ai_review) : null; } catch {}
    return {
      type: "comment",
      id: r.id,
      content: r.content,
      postId: r.post_id,
      postTitle: r.post_title || "(帖子已删除)",
      authorName: r.author_name || "匿名",
      review,
      createdAt: r.created_at,
    };
  });
  return {
    items: [...postItems, ...commentItems].sort((a, b) => a.createdAt - b.createdAt),
  };
}

export async function moderatePost(env, id, action, reason) {
  if (!["approve", "reject"].includes(action)) return { error: "无效操作" };
  if (action === "reject") {
    reason = String(reason || "").trim().slice(0, 200);
    if (reason.length < 4) return { error: "驳回时必须填写驳回理由（至少 4 个字）" };
  }
  const status = action === "approve" ? "approved" : "rejected";
  await env.DB.prepare(
    "UPDATE posts SET status = ?, human_reviewed = 1, reject_reason = ? WHERE id = ?"
  ).bind(status, action === "reject" ? reason : null, id).run();
  return { ok: true, status, reason: action === "reject" ? reason : "" };
}

export async function moderateComment(env, id, action, reason) {
  if (!["approve", "reject"].includes(action)) return { error: "无效操作" };
  if (action === "reject") {
    reason = String(reason || "").trim().slice(0, 200);
    if (reason.length < 4) return { error: "驳回时必须填写驳回理由（至少 4 个字）" };
  }
  const status = action === "approve" ? "approved" : "rejected";
  await env.DB.prepare(
    "UPDATE comments SET status = ?, reject_reason = ? WHERE id = ?"
  ).bind(status, action === "reject" ? reason : null, id).run();
  return { ok: true, status, reason: action === "reject" ? reason : "" };
}

export async function adminPostList(env, { page = 0 } = {}) {
  const limit = 30;
  const offset = Math.max(0, page) * limit;
  const { results } = await env.DB.prepare(
    `SELECT p.*, u.name AS author_name FROM posts p LEFT JOIN users u ON u.id = p.user_id
     ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();
  return {
    items: (results || []).map((r) => ({
      id: r.id, title: r.title, status: r.status, authorName: r.author_name || "匿名",
      likes: r.likes, createdAt: r.created_at,
    })),
  };
}

export async function deletePost(env, id) {
  await env.DB.prepare("DELETE FROM comments WHERE post_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM likes WHERE post_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
  return { ok: true };
}

// ---------- 管理员：删除用户（级联清理全部数据） ----------
export async function deleteUser(env, adminId, targetId) {
  targetId = String(targetId || "").trim();
  if (!targetId) return { error: "缺少用户 ID" };
  if (adminId === targetId) return { error: "不能删除自己的账号" };
  const target = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(targetId).first();
  if (!target) return { error: "用户不存在" };
  if (target.role === "admin") return { error: "不能删除管理员账号" };
  // 1. 该用户发布的帖子（级联其评论与点赞）
  const posts = await env.DB.prepare("SELECT id FROM posts WHERE user_id = ?").bind(targetId).all();
  for (const p of posts.results || []) {
    await env.DB.prepare("DELETE FROM comments WHERE post_id = ?").bind(p.id).run();
    await env.DB.prepare("DELETE FROM likes WHERE post_id = ?").bind(p.id).run();
  }
  await env.DB.prepare("DELETE FROM posts WHERE user_id = ?").bind(targetId).run();
  // 2. 该用户在其他帖子下的评论/点赞、主页点赞
  await env.DB.prepare("DELETE FROM comments WHERE user_id = ?").bind(targetId).run();
  await env.DB.prepare("DELETE FROM likes WHERE user_id = ?").bind(targetId).run();
  await env.DB.prepare("DELETE FROM profile_likes WHERE user_id = ? OR from_id = ?").bind(targetId, targetId).run();
  // 3. 用户自身数据
  await env.DB.prepare("DELETE FROM notifications WHERE user_id = ?").bind(targetId).run();
  await env.DB.prepare("DELETE FROM chats WHERE user_id = ?").bind(targetId).run();
  await env.DB.prepare("DELETE FROM activity WHERE user_id = ?").bind(targetId).run();
  await env.DB.prepare("DELETE FROM course_wrong WHERE user_id = ?").bind(targetId).run();
  await env.DB.prepare("DELETE FROM events WHERE user_id = ?").bind(targetId).run();
  await env.DB.prepare("DELETE FROM courses WHERE user_id = ?").bind(targetId).run();
  await env.DB.prepare("DELETE FROM tickets WHERE email = ?").bind(target.email || "").run();
  await env.DB.prepare("DELETE FROM verification_codes WHERE email = ?").bind(target.email || "").run();
  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(targetId).run();
  return { ok: true };
}

// ---------- 个人主页统计 ----------
export async function profileStats(env, userId) {
  const courses = await env.DB.prepare("SELECT COUNT(*) AS n FROM courses WHERE user_id = ?").bind(userId).first();
  const posts = await env.DB.prepare("SELECT COUNT(*) AS n FROM posts WHERE user_id = ? AND status = 'approved'").bind(userId).first();
  const pendingPosts = await env.DB.prepare("SELECT COUNT(*) AS n FROM posts WHERE user_id = ? AND status = 'pending'").bind(userId).first();
  const likesReceived = await env.DB.prepare("SELECT COALESCE(SUM(likes),0) AS n FROM posts WHERE user_id = ? AND status = 'approved'").bind(userId).first();
  const comments = await env.DB.prepare("SELECT COUNT(*) AS n FROM comments WHERE user_id = ? AND status = 'approved'").bind(userId).first();
  return {
    courses: courses?.n || 0,
    posts: posts?.n || 0,
    pendingPosts: pendingPosts?.n || 0,
    likesReceived: likesReceived?.n || 0,
    comments: comments?.n || 0,
  };
}
