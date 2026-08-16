// google-auth.js - Google OAuth 登录：授权跳转 + 回调换 token + 自动注册/登录
// 配置（wrangler.toml vars）：
//   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET（secret）
// 回调地址：https://api.nebulavessel.com/api/auth/google/callback
// 需在 Google Cloud Console 的 OAuth 客户端中把该回调加入 Authorized redirect URIs

import { issueSession, defaultEmoji } from "./auth.js";
import { uid, nowSec } from "./util.js";

export function googleEnabled(env) {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function googleAuthUrl(env, state) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: "https://api.nebulavessel.com/api/auth/google/callback",
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function handleGoogleCallback(env, url) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) return { error: "缺少授权码" };

  // 1. code 换 token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: "https://api.nebulavessel.com/api/auth/google/callback",
      grant_type: "authorization_code",
    }),
  });
  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenData.access_token) {
    const msg = tokenData.error_description || tokenData.error || "授权失败";
    console.warn("google token exchange failed:", msg);
    try {
      await env.DB.prepare("INSERT INTO logs (owner, type, payload, created_at) VALUES ('system', 'glogin_debug', ?, ?)")
        .bind(JSON.stringify({ step: "token_exchange", detail: String(msg).slice(0, 300), code: code.slice(0, 20), at: Date.now() }).slice(0, 800), nowSec()).run();
    } catch {}
    return { error: "Google 授权失败：" + String(msg).slice(0, 120) };
  }

  // 2. 获取用户信息
  const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const info = await infoRes.json().catch(() => ({}));
  if (!info.email) {
    console.warn("google userinfo failed:", JSON.stringify(info).slice(0, 200));
    try {
      await env.DB.prepare("INSERT INTO logs (owner, type, payload, created_at) VALUES ('system', 'glogin_debug', ?, ?)")
        .bind(JSON.stringify({ step: "userinfo", detail: JSON.stringify(info).slice(0, 300), at: Date.now() }).slice(0, 800), nowSec()).run();
    } catch {}
    return { error: "获取 Google 用户信息失败（请确认 OAuth 客户端配置正确）" };
  }
  if (!info.verified_email) return { error: "Google 邮箱未验证，无法登录" };

  // 3. 查找或创建用户
  const email = String(info.email).toLowerCase();
  let user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (user && !user.emoji) {
    const emoji = defaultEmoji(email);
    await env.DB.prepare("UPDATE users SET emoji = ? WHERE id = ?").bind(emoji, user.id).run();
    user.emoji = emoji;
  }
  if (!user) {
    const id = uid();
    const salt = uid();
    // 随机密码哈希占位（Google 用户不设密码）
    const { hashPassword } = await import("./auth.js");
    const passHash = await hashPassword(crypto.randomUUID(), salt);
    const isAdmin = (env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).includes(email);
    const emoji = defaultEmoji(email);
    await env.DB.prepare(
      "INSERT INTO users (id, email, name, school, pass_hash, salt, role, emoji, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, email, String(info.name || info.email).slice(0, 40), "", passHash, salt, isAdmin ? "admin" : "user", emoji, nowSec()).run();
    user = { id, email, name: String(info.name || info.email).slice(0, 40), school: "", role: isAdmin ? "admin" : "user", emoji };
  }

  // 4. 签发会话 JWT
  const jwt = await issueSession(env, user);
  try {
    await env.DB.prepare("INSERT INTO logs (owner, type, payload, created_at) VALUES ('system', 'glogin_debug', ?, ?)")
      .bind(JSON.stringify({ step: "ok", email, at: Date.now() }).slice(0, 400), nowSec()).run();
  } catch {}

  // 5. 回跳前端（hash 携带 token）
  const redirect = `https://www.nebulavessel.com/#/google-auth?token=${encodeURIComponent(jwt)}`;
  return { redirect, user };
}
