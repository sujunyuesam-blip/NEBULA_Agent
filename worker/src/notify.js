// notify.js - 站内通知：生成完成/新对话/社区审核/点赞/评论/主页点赞

import { nowSec } from "./util.js";

export async function addNotification(env, userId, type, payload) {
  if (!userId) return;
  try {
    await env.DB.prepare(
      "INSERT INTO notifications (user_id, type, payload, read, created_at) VALUES (?, ?, ?, 0, ?)"
    ).bind(userId, type, JSON.stringify(payload || {}), nowSec()).run();
  } catch (e) {
    console.warn("notify failed:", e?.message);
  }
}

export async function listNotifications(env, userId, unreadOnly = false) {
  const sql = unreadOnly
    ? "SELECT * FROM notifications WHERE user_id = ? AND read = 0 ORDER BY created_at DESC LIMIT 50"
    : "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50";
  const { results } = await env.DB.prepare(sql).bind(userId).all();
  const unread = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0"
  ).bind(userId).first();
  return {
    unread: unread?.n || 0,
    items: (results || []).map((r) => {
      let payload = {};
      try { payload = JSON.parse(r.payload || "{}"); } catch {}
      return { id: r.id, type: r.type, payload, read: !!r.read, createdAt: r.created_at };
    }),
  };
}

export async function markAllRead(env, userId) {
  await env.DB.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").bind(userId).run();
  return { ok: true };
}
