// gamify.js - 激励系统：XP 积分 / 等级 / Streak 连续学习 / 成就 / 排行榜

import { nowSec } from "./util.js";

// XP 规则（type -> 分值）
export const XP_RULES = {
  login: 10,          // 每日首次登录（每天一次）
  generate: 50,       // 生成一门课程
  complete: 30,       // 完成课程学习（SAVE_DATA）
  post: 30,           // 社区发布（过审后由管理员 approve 时发放，简化：发布即发放）
  comment: 5,         // 发表评论
  like_received: 10,  // 帖子获赞（给作者）
  daily: 20,          // 每日一题答对
  wrong_review: 15,   // 完成针对性复习课
};

export function levelOf(xp) {
  // Lv1..Lv10：每级递增需求
  const thresholds = [0, 100, 300, 700, 1400, 2500, 4200, 6600, 10000, 15000];
  let lv = 1;
  for (let i = 0; i < thresholds.length; i++) if (xp >= thresholds[i]) lv = i + 1;
  const next = thresholds[lv] ?? null; // lv 从 1 开始，thresholds[lv] 是下一级
  return { level: lv, current: xp, next: next ?? xp, nextLevel: next ? lv + 1 : lv };
}

export async function addXp(env, userId, type, ref) {
  const xp = XP_RULES[type] || 0;
  if (!userId || xp <= 0) return 0;
  try {
    await env.DB.prepare(
      "INSERT INTO events (user_id, type, xp, ref, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(userId, type, xp, ref || null, nowSec()).run();
  } catch (e) {
    console.warn("addXp failed:", e?.message);
  }
  return xp;
}

export async function getUserXp(env, userId) {
  const row = await env.DB.prepare("SELECT COALESCE(SUM(xp),0) AS n FROM events WHERE user_id = ?").bind(userId).first();
  return row?.n || 0;
}

// 每日打卡 + streak 计算
export async function dailyCheckin(env, userId) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = await env.DB.prepare("SELECT 1 FROM activity WHERE user_id = ? AND day = ?").bind(userId, today).first();
  if (existing) return { streak: await streakOf(env, userId), xpGained: 0 };
  await env.DB.prepare("INSERT INTO activity (user_id, day, created_at) VALUES (?, ?, ?)").bind(userId, today, nowSec()).run();
  const xp = await addXp(env, userId, "login");
  return { streak: await streakOf(env, userId), xpGained: xp };
}

export async function streakOf(env, userId) {
  const { results } = await env.DB.prepare(
    "SELECT DISTINCT day FROM activity WHERE user_id = ? ORDER BY day DESC LIMIT 400"
  ).bind(userId).all();
  const days = new Set((results || []).map((r) => r.day));
  let streak = 0;
  const d = new Date();
  // 允许从昨天开始算（今天还没打卡）
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// 成就（基于累计行为计算）
export async function achievementsOf(env, userId) {
  const [xpRow, courseRow, postRow, likeRow, completeRow] = await Promise.all([
    getUserXp(env, userId),
    env.DB.prepare("SELECT COUNT(*) AS n FROM courses WHERE user_id = ?").bind(userId).first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM posts WHERE user_id = ? AND status = 'approved'").bind(userId).first(),
    env.DB.prepare("SELECT COALESCE(SUM(likes),0) AS n FROM posts WHERE user_id = ?").bind(userId).first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE user_id = ? AND type = 'complete'").bind(userId).first(),
  ]);
  const streak = await streakOf(env, userId);
  const xp = xpRow;
  const courseCount = courseRow?.n || 0;
  const postCount = postRow?.n || 0;
  const likes = likeRow?.n || 0;
  const completeCount = completeRow?.n || 0;

  const defs = [
    { id: "first_course", icon: "🌱", title: "初次孵化", desc: "生成第一门课程", done: courseCount >= 1 },
    { id: "course_5", icon: "🎓", title: "孵化五连", desc: "累计生成 5 门课程", done: courseCount >= 5 },
    { id: "complete_3", icon: "🏁", title: "有始有终", desc: "完成 3 门课程学习", done: completeCount >= 3 },
    { id: "post_1", icon: "📣", title: "初次分享", desc: "在社区发布首个作品", done: postCount >= 1 },
    { id: "likes_10", icon: "💎", title: "人气新星", desc: "累计获得 10 个赞", done: likes >= 10 },
    { id: "streak_3", icon: "🔥", title: "三日之约", desc: "连续学习 3 天", done: streak >= 3 },
    { id: "streak_7", icon: "⚡", title: "七日燃烧", desc: "连续学习 7 天", done: streak >= 7 },
    { id: "xp_1000", icon: "👑", title: "千分达人", desc: "累计获得 1000 XP", done: xp >= 1000 },
  ];
  return defs;
}

// 排行榜
export async function leaderboard(env, kind = "xp") {
  let sql;
  if (kind === "posts") {
    sql = `SELECT u.id, u.name, u.school, COUNT(p.id) AS score
           FROM users u LEFT JOIN posts p ON p.user_id = u.id AND p.status = 'approved'
           GROUP BY u.id ORDER BY score DESC LIMIT 20`;
  } else if (kind === "likes") {
    sql = `SELECT u.id, u.name, u.school, COALESCE(SUM(p.likes),0) AS score
           FROM users u LEFT JOIN posts p ON p.user_id = u.id AND p.status = 'approved'
           GROUP BY u.id ORDER BY score DESC LIMIT 20`;
  } else {
    sql = `SELECT u.id, u.name, u.school, COALESCE(SUM(e.xp),0) AS score
           FROM users u LEFT JOIN events e ON e.user_id = u.id
           GROUP BY u.id ORDER BY score DESC LIMIT 20`;
  }
  const { results } = await env.DB.prepare(sql).all();
  return (results || []).map((r, i) => ({ rank: i + 1, name: r.name, school: r.school || "", score: r.score || 0, me: false }));
}
