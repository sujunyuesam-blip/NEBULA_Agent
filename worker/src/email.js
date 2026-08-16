// email.js - 邮箱验证码：Resend 自动发信（From: nebula.vessel@outlook.com）
// 配置：npx wrangler secret put RESEND_API_KEY
// 未配置时（本地开发/MOCK）跳过验证码

import { nowSec } from "./util.js";

const CODE_TTL = 600; // 10 分钟
const MAX_ATTEMPTS = 5;

export async function sendVerificationEmail(env, email, code) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY 未配置");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM || "NEBULA <nebula.vessel@outlook.com>",
      to: [email],
      subject: "【NEBULA】邮箱验证码 / Verification Code",
      html: `
        <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0b0b1a;color:#f4f4fb;border-radius:16px">
          <div style="font-size:20px;font-weight:900;margin-bottom:8px">🌌 NEBULA</div>
          <p style="color:#a9a9c4;line-height:1.8">你好，你正在注册/验证 NEBULA 账号。你的验证码是：</p>
          <div style="font-size:34px;font-weight:900;letter-spacing:10px;text-align:center;margin:22px 0;color:#ffffff;background:#2a2a4a;border-radius:12px;padding:16px 8px">${code}</div>
          <p style="color:#6d6d8e;font-size:13px">验证码 ${Math.round(CODE_TTL / 60)} 分钟内有效，请勿转发给他人。如果不是你本人操作，请忽略此邮件。</p>
          <p style="color:#6d6d8e;font-size:12px;margin-top:24px">NEBULA · Personalized Education Incubator<br>https://www.nebulavessel.com</p>
        </div>`,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${text.slice(0, 200)}`);
  }
}

// 请求发送验证码（限流：每邮箱 60 秒 1 次）
export async function requestVerificationCode(env, email) {
  email = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "邮箱格式不正确" };
  const existing = await env.DB.prepare(
    "SELECT created_at FROM verification_codes WHERE email = ?"
  ).bind(email).first();
  if (existing && nowSec() - existing.created_at < 60) {
    return { error: "发送过于频繁，请 60 秒后再试" };
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  try {
    await sendVerificationEmail(env, email, code);
  } catch (e) {
    console.warn("send email failed:", e?.message);
    return { error: "验证码邮件发送失败，请稍后再试" };
  }
  await env.DB.prepare(
    `INSERT OR REPLACE INTO verification_codes (email, code, expires_at, attempts, created_at)
     VALUES (?, ?, ?, 0, ?)`
  ).bind(email, code, nowSec() + CODE_TTL, nowSec()).run();
  return { ok: true, message: "验证码已发送至你的邮箱（10 分钟内有效）" };
}

// 校验验证码（成功即作废；失败累计次数）
export async function verifyCode(env, email, code) {
  email = String(email || "").trim().toLowerCase();
  code = String(code || "").trim();
  const row = await env.DB.prepare(
    "SELECT * FROM verification_codes WHERE email = ?"
  ).bind(email).first();
  if (!row) return { ok: false, error: "请先获取验证码" };
  if (nowSec() > row.expires_at) return { ok: false, error: "验证码已过期，请重新获取" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "尝试次数过多，请重新获取验证码" };
  if (row.code !== code) {
    await env.DB.prepare("UPDATE verification_codes SET attempts = attempts + 1 WHERE email = ?").bind(email).run();
    return { ok: false, error: "验证码错误" };
  }
  await env.DB.prepare("DELETE FROM verification_codes WHERE email = ?").bind(email).run();
  return { ok: true };
}

// 生产环境强制邮箱验证（EMAIL_VERIFY_ENABLED=1 且配置了 Resend 且非 MOCK）
export function emailVerificationRequired(env) {
  return env.EMAIL_VERIFY_ENABLED === "1" && !!(env.RESEND_API_KEY) && env.MOCK !== "1";
}

// ---- Cloudflare Turnstile 人机验证 ----
export function turnstileEnabled(env) {
  return !!(env.TURNSTILE_SECRET_KEY && env.MOCK !== "1");
}

export async function verifyTurnstile(env, token, ip) {
  if (!turnstileEnabled(env)) return true; // 未配置时跳过（开发模式）
  if (!token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ip || undefined,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return data.success === true;
}
