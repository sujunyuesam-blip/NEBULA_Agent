// schools.js - 学校库：预置（百强高中/知名初中）+ 用户申请 + 管理员审核
// 惰性初始化：首次访问时把预置数据写入 D1

import { PRESET_SCHOOLS } from "./schools-data.js";
import { nowSec } from "./util.js";

async function ensureSeeded(env) {
  // 以标志性大学判断是否已种子化（允许存在用户申请数据时也能补种子）
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM schools WHERE name = '清华大学' AND kind = 'university'"
  ).first();
  if (row?.n > 0) return;
  // 注意：D1 不支持同一 stmt 对象复用 bind，每条单独 prepare
  await env.DB.batch(PRESET_SCHOOLS.map(([name, region, kind]) =>
    env.DB.prepare(
      `INSERT INTO schools (name, region, kind, approved, created_at)
       SELECT ?, ?, ?, 1, ?
       WHERE NOT EXISTS (SELECT 1 FROM schools WHERE name = ? AND kind = ?)`
    ).bind(name, region, kind, nowSec(), name, kind)
  ));
  console.log(`schools seeded: ${PRESET_SCHOOLS.length}`);
}

export async function searchSchools(env, { q = "", kind = "" } = {}) {
  await ensureSeeded(env);
  const like = `%${String(q).slice(0, 40)}%`;
  let sql = "SELECT id, name, region, kind FROM schools WHERE approved = 1";
  const binds = [];
  if (q) { sql += " AND (name LIKE ? OR region LIKE ?)"; binds.push(like, like); }
  if (["high", "middle", "university"].includes(kind)) { sql += " AND kind = ?"; binds.push(kind); }
  sql += " ORDER BY id ASC LIMIT 500";
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return results || [];
}

export async function requestSchool(env, auth, { name, region, kind }) {
  name = String(name || "").trim().slice(0, 40);
  region = String(region || "").trim().slice(0, 20);
  kind = ["high", "middle", "university"].includes(kind) ? kind : "high";
  if (name.length < 4) return { error: "请填写完整学校名称" };
  if (!region) return { error: "请填写所在地区" };
  const existing = await env.DB.prepare(
    "SELECT id FROM schools WHERE name = ? AND approved = 1"
  ).bind(name).first();
  if (existing) return { error: "该学校已在库中" };
  const pending = await env.DB.prepare(
    "SELECT id FROM schools WHERE name = ? AND approved = 0"
  ).bind(name).first();
  if (pending) return { error: "该学校已在审核中" };
  await env.DB.prepare(
    "INSERT INTO schools (name, region, kind, approved, applicant_id, created_at) VALUES (?, ?, ?, 0, ?, ?)"
  ).bind(name, region, kind, auth?.sub || null, nowSec()).run();
  return { ok: true, message: "申请已提交，管理员审核通过后将出现在学校列表中" };
}

export async function adminSchoolQueue(env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM schools WHERE approved = 0 ORDER BY created_at ASC LIMIT 100"
  ).all();
  return (results || []).map((r) => ({
    id: r.id, name: r.name, region: r.region, kind: r.kind,
    applicantId: r.applicant_id || null, createdAt: r.created_at,
  }));
}

export async function adminSchoolAction(env, id, action, reason) {
  if (action === "approve") {
    await env.DB.prepare("UPDATE schools SET approved = 1, reject_reason = NULL WHERE id = ?").bind(id).run();
  } else if (action === "reject") {
    reason = String(reason || "").trim().slice(0, 200);
    if (reason.length < 4) return { error: "驳回时必须填写驳回理由（至少 4 个字）" };
    await env.DB.prepare(
      "UPDATE schools SET approved = 0, reject_reason = ? WHERE id = ?"
    ).bind(reason, id).run();
  } else {
    return { error: "无效操作" };
  }
  return { ok: true };
}
