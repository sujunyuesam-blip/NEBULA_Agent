// auth.js - 服务端鉴权：登录口令校验 + 会话 JWT（HMAC-SHA256，Web Crypto）

const b64url = {
  encode(buf) {
    const bytes = new Uint8Array(buf);
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  decode(str) {
    const s = str.replace(/-/g, "+").replace(/_/g, "/");
    const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
    const bin = atob(s + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  },
};

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJwt(payload, secret, ttlSec = 60 * 60 * 24) {
  const header = b64url.encode(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url.encode(
    new TextEncoder().encode(JSON.stringify({ ...payload, iat: now, exp: now + ttlSec }))
  );
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64url.encode(sig)}`;
}

export async function verifyJwt(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64url.decode(sig),
      new TextEncoder().encode(`${header}.${body}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64url.decode(body)));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function checkAccessToken(env, token) {
  if (!token) return false;
  const list = (env.ACCESS_TOKEN || "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.length > 0 && list.includes(token);
}

export function getSecret(env) {
  // 本地开发默认值；生产必须用 wrangler secret put 覆盖
  return env.JWT_SECRET || "nebula-local-dev-secret-change-me";
}

export async function issueSession(env, user, ttlSec) {
  return signJwt({ sub: user.id, role: user.role || "user", name: user.name || "", emoji: user.emoji || "" }, getSecret(env), ttlSec || 60 * 60 * 24 * 30);
}

export async function authFromRequest(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  return verifyJwt(token, getSecret(env));
}

// ---------- 密码哈希（PBKDF2-SHA256，Web Crypto，Worker 兼容） ----------
const enc = new TextEncoder();

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password, salt) {
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toHex(bits);
}

export function verifyPassword(password, salt, expectedHash) {
  return hashPassword(password, salt).then((h) => {
    // 常数时间比较（长度相同的前提下逐位 XOR）
    if (h.length !== expectedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    return diff === 0;
  });
}

// ---------- 用户注册 / 登录 ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// 专属 emoji 预设（与个人主页选择器一致），注册未选择时按邮箱哈希自动分配
const PRESET_EMOJIS = ["🧑‍🚀", "👩‍🚀", "🧑‍🎓", "👨‍🎓", "🧑‍💻", "👩‍💻", "🧑‍🔬", "👩‍🔬", "🧑‍🏫", "👩‍🏫", "🧑‍💼", "👩‍💼", "🧑‍🎨", "👩‍🎨", "🧑‍⚕️", "👩‍⚕️", "🧑‍🍳", "👨‍🍳", "🦊", "🐱", "🐼", "🐧", "🦉", "🐳", "🦄", "🦋", "🌟", "🍀", "🌙", "⚡"];
export function defaultEmoji(email) {
  let h = 0;
  const s = String(email || "nebula");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PRESET_EMOJIS[h % PRESET_EMOJIS.length];
}

export async function registerUser(env, { email, name, school, password, emoji }) {
  email = String(email || "").trim().toLowerCase();
  name = String(name || "").trim().slice(0, 40);
  school = String(school || "").trim().slice(0, 60);
  password = String(password || "");
  if (!EMAIL_RE.test(email)) return { error: "邮箱格式不正确" };
  if (name.length < 2) return { error: "昵称至少 2 个字符" };
  if (school.length < 2) return { error: "请填写你的学校" };
  if (password.length < 6) return { error: "密码至少 6 位" };

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return { error: "该邮箱已注册" };

  const id = crypto.randomUUID();
  const salt = crypto.randomUUID();
  const passHash = await hashPassword(password, salt);
  const isAdmin = (env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).includes(email);
  const emojiValue = String(emoji || "").trim().slice(0, 8) || defaultEmoji(email);
  await env.DB.prepare(
    "INSERT INTO users (id, email, name, school, pass_hash, salt, role, emoji, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, email, name, school || "", passHash, salt, isAdmin ? "admin" : "user", emojiValue, Math.floor(Date.now() / 1000)).run();
  return { user: { id, email, name, school: school || "", role: isAdmin ? "admin" : "user", emoji: emojiValue } };
}

export async function loginUser(env, { email, password }) {
  email = String(email || "").trim().toLowerCase();
  password = String(password || "");
  const row = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!row) return { error: "邮箱或密码错误" };
  const ok = await verifyPassword(password, row.salt, row.pass_hash);
  if (!ok) return { error: "邮箱或密码错误" };
  // 动态同步管理员角色：ADMIN_EMAILS 中的邮箱登录时自动升级（配置变更无需重新注册）
  const shouldAdmin = (env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).includes(email);
  if (shouldAdmin && row.role !== "admin") {
    await env.DB.prepare("UPDATE users SET role = 'admin' WHERE id = ?").bind(row.id).run();
  }
  // 老用户没有专属 emoji 的，首次登录自动分配一个
  let emoji = row.emoji || "";
  if (!emoji) {
    emoji = defaultEmoji(email);
    await env.DB.prepare("UPDATE users SET emoji = ? WHERE id = ?").bind(emoji, row.id).run();
  }
  return { user: { id: row.id, email: row.email, name: row.name, school: row.school || "", role: shouldAdmin ? "admin" : row.role, emoji } };
}

export function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, school: u.school || "", role: u.role };
}

// 修改密码
export async function changePassword(env, userId, { oldPassword, newPassword }) {
  oldPassword = String(oldPassword || "");
  newPassword = String(newPassword || "");
  if (newPassword.length < 6) return { error: "新密码至少 6 位" };
  const row = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
  if (!row) return { error: "用户不存在" };
  const ok = await verifyPassword(oldPassword, row.salt, row.pass_hash);
  if (!ok) return { error: "原密码错误" };
  const salt = crypto.randomUUID();
  const passHash = await hashPassword(newPassword, salt);
  await env.DB.prepare("UPDATE users SET pass_hash = ?, salt = ? WHERE id = ?").bind(passHash, salt, userId).run();
  return { ok: true };
}
