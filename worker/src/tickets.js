// tickets.js - 联系我们工单：公开提交 + 管理员查看/标记回复

import { nowSec } from "./util.js";

export async function createTicket(env, { name, email, subject, content }) {
  name = String(name || "").trim().slice(0, 40);
  email = String(email || "").trim().slice(0, 80);
  subject = String(subject || "").trim().slice(0, 100);
  content = String(content || "").trim().slice(0, 2000);
  if (name.length < 2) return { error: "请填写姓名" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "请填写有效邮箱" };
  if (subject.length < 4) return { error: "请填写主题" };
  if (content.length < 10) return { error: "请详细描述你的问题（至少 10 字）" };
  const res = await env.DB.prepare(
    "INSERT INTO tickets (name, email, subject, content, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)"
  ).bind(name, email, subject, content, nowSec()).run();
  return { ok: true, id: res.meta?.last_row_id };
}

export async function adminTickets(env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM tickets ORDER BY (status = 'open') DESC, created_at DESC LIMIT 200"
  ).all();
  return (results || []).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    subject: r.subject,
    content: r.content,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function adminTicketAction(env, id, action) {
  const status = action === "replied" ? "replied" : action === "close" ? "closed" : null;
  if (!status) return { error: "无效操作" };
  await env.DB.prepare("UPDATE tickets SET status = ? WHERE id = ?").bind(status, id).run();
  return { ok: true };
}
