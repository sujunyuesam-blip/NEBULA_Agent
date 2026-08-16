// wechat-auth.js - 微信扫码登录（微信开放平台「网站应用」OAuth2）
// 配置：WECHAT_APP_ID（wrangler.toml vars）/ WECHAT_APP_SECRET（wrangler secret put）
// 回调地址：https://api.nebulavessel.com/api/auth/wechat/callback
// 需在微信开放平台（open.weixin.qq.com）创建已认证的「网站应用」，并把
// https://api.nebulavessel.com 加入「授权回调域」（要求域名已备案）。
// 微信不提供邮箱：内部用 openid 派生邮箱（<openid>@wechat.local）唯一标识。

import { issueSession, defaultEmoji } from "./auth.js";
import { uid, nowSec } from "./util.js";

export function wechatEnabled(env) {
  return !!(env.WECHAT_APP_ID && env.WECHAT_APP_SECRET);
}

export function wechatAuthUrl(env, state) {
  const params = new URLSearchParams({
    appid: env.WECHAT_APP_ID,
    redirect_uri: "https://api.nebulavessel.com/api/auth/wechat/callback",
    response_type: "code",
    scope: "snsapi_login",
    state,
  });
  return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
}

export async function handleWechatCallback(env, url) {
  const code = url.searchParams.get("code");
  if (!code) return { error: "缺少微信授权码" };

  // 1. code 换 access_token + openid
  const tokenRes = await fetch(
    `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${encodeURIComponent(env.WECHAT_APP_ID)}&secret=${encodeURIComponent(env.WECHAT_APP_SECRET)}&code=${encodeURIComponent(code)}&grant_type=authorization_code`
  );
  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenData.openid) {
    console.warn("wechat token exchange failed:", tokenData.errcode, tokenData.errmsg);
    return { error: "微信授权失败：" + String(tokenData.errmsg || tokenData.errcode || "未知错误").slice(0, 120) };
  }
  const openid = String(tokenData.openid);
  const unionid = tokenData.unionid ? String(tokenData.unionid) : "";

  // 2. 获取昵称（失败不影响登录）
  let nickname = "微信用户";
  try {
    const infoRes = await fetch(
      `https://api.weixin.qq.com/sns/userinfo?access_token=${encodeURIComponent(tokenData.access_token)}&openid=${encodeURIComponent(openid)}&lang=zh_CN`
    );
    const info = await infoRes.json().catch(() => ({}));
    if (info.nickname) nickname = String(info.nickname).slice(0, 40);
  } catch {}

  // 3. 查找或创建用户
  const email = `${unionid || openid}@wechat.local`;
  let user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (user && !user.emoji) {
    const emoji = defaultEmoji(email);
    await env.DB.prepare("UPDATE users SET emoji = ? WHERE id = ?").bind(emoji, user.id).run();
    user.emoji = emoji;
  }
  if (!user) {
    const id = uid();
    const salt = uid();
    // 随机密码哈希占位（微信用户不设密码）
    const { hashPassword } = await import("./auth.js");
    const passHash = await hashPassword(crypto.randomUUID(), salt);
    const emoji = defaultEmoji(email);
    await env.DB.prepare(
      "INSERT INTO users (id, email, name, school, pass_hash, salt, role, emoji, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, email, nickname, "", passHash, salt, "user", emoji, nowSec()).run();
    user = { id, email, name: nickname, school: "", role: "user", emoji };
  }

  // 4. 签发会话 JWT
  const jwt = await issueSession(env, user);

  // 5. 回跳前端（hash 携带 token）
  const redirect = `https://www.nebulavessel.com/#/wechat-auth?token=${encodeURIComponent(jwt)}`;
  return { redirect, user };
}
