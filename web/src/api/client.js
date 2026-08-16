// client.js - API 客户端：鉴权会话管理 + SSE 流解析
// 生产环境 __API_BASE__ = "https://api.nebulavessel.com"（构建时注入）
// 开发环境为空字符串 → 同源 /api（Vite 代理到本地 Worker）

const API_BASE = typeof __API_BASE__ !== "undefined" ? __API_BASE__ : "";

const SESSION_KEY = "nebula_session";

export const Session = {
  get token() {
    try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
  },
  set(token) {
    try { localStorage.setItem(SESSION_KEY, token); } catch {}
  },
  clear() {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  },
  get isLoggedIn() {
    return !!this.token;
  },
};

function authHeaders(json = true) {
  const headers = {};
  if (json) headers["Content-Type"] = "application/json";
  if (Session.token) headers["Authorization"] = `Bearer ${Session.token}`;
  return headers;
}

export class ApiError extends Error {
  constructor(status, data) {
    super(data?.error || data?.message || `HTTP ${status}`);
    this.status = status;
    this.data = data;
  }
}

async function request(path, { method = "GET", body, json = true } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(json && body !== undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new ApiError(res.status, data || {});
  return data;
}

export const api = {
  // 访问令牌登录
  async login(token) {
    const data = await request("/api/auth", { method: "POST", body: { token } });
    Session.set(data.token);
    return data;
  },
  // 账号注册（返回 {token, user}）
  async register(payload) {
    const data = await request("/api/register", { method: "POST", body: payload });
    if (data.token) Session.set(data.token);
    return data;
  },
  // 账号登录
  async loginAccount(payload) {
    const data = await request("/api/login", { method: "POST", body: payload });
    if (data.token) Session.set(data.token);
    return data;
  },
  logout() {
    Session.clear();
  },
  async profile() {
    return request("/api/profile");
  },
  async identify(topic, lang) {
    return request("/api/identify", { method: "POST", body: { topic, lang } });
  },
  async audit(course) {
    return request("/api/audit", { method: "POST", body: { course } });
  },
  async reflect(payload) {
    return request("/api/reflect", { method: "POST", body: payload });
  },
  async history() {
    return request("/api/history");
  },
  async historyItem(id) {
    return request(`/api/history/${encodeURIComponent(id)}`);
  },
  async clearHistory(ids) {
    return request("/api/history", { method: "DELETE", body: ids ? { ids } : {} });
  },
  async share(id) {
    return request(`/api/share/${encodeURIComponent(id)}`);
  },
  async log(payload) {
    return request("/api/log", { method: "POST", body: payload }).catch(() => ({}));
  },
  // ---- 社区 ----
  async community({ sort = "hot", page = 0, q = "" } = {}) {
    const qs = new URLSearchParams({ sort, page: String(page) });
    if (q) qs.set("q", q);
    return request(`/api/community?${qs.toString()}`);
  },
  async postDetail(id) {
    return request(`/api/community/${encodeURIComponent(id)}`);
  },
  async publishPost(payload) {
    return request("/api/community", { method: "POST", body: payload });
  },
  async addComment(postId, content) {
    return request(`/api/community/${encodeURIComponent(postId)}/comment`, { method: "POST", body: { content } });
  },
  async toggleLike(postId) {
    return request(`/api/community/${encodeURIComponent(postId)}/like`, { method: "POST", body: {} });
  },
  async deleteOwnPost(postId) {
    return request(`/api/community/${encodeURIComponent(postId)}`, { method: "DELETE" });
  },
  async forkPost(postId) {
    return request(`/api/community/${encodeURIComponent(postId)}/fork`, { method: "POST", body: {} });
  },
  // ---- 管理 ----
  async moderationQueue() {
    return request("/api/admin/moderation");
  },
  async moderatePost(id, action, reason) {
    return request(`/api/admin/moderation/${encodeURIComponent(id)}`, { method: "POST", body: { action, reason } });
  },
  async moderateComment(id, action, reason) {
    return request(`/api/admin/moderation/comment/${encodeURIComponent(id)}`, { method: "POST", body: { action, reason } });
  },
  async adminPosts() {
    return request("/api/admin/posts");
  },
  async adminDeletePost(id) {
    return request(`/api/admin/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  // ---- 激励 / 学习 ----
  async daily(refresh = false) {
    return request(`/api/daily${refresh ? "?refresh=1" : ""}`);
  },
  async dailyAnswer(correct) {
    return request("/api/daily/answer", { method: "POST", body: { correct } });
  },
  async plan(goal, level, scenario) {
    return request("/api/plan", { method: "POST", body: { goal, level, scenario } });
  },
  async wrongBook() {
    return request("/api/wrong");
  },
  async clearWrongBook() {
    return request("/api/wrong", { method: "DELETE" });
  },
  async leaderboard(kind = "xp") {
    return request(`/api/leaderboard?kind=${kind}`);
  },
  async config() {
    return request("/api/config");
  },
  async sendCode(email) {
    return request("/api/auth/send-code", { method: "POST", body: { email } });
  },
  async profileOf(id) {
    return request(`/api/profile/${encodeURIComponent(id)}`);
  },
  async updateProfile(payload) {
    return request("/api/profile/update", { method: "POST", body: payload });
  },
  async fortune() {
    return request("/api/fortune");
  },
  async redrawFortune() {
    return request("/api/fortune/redraw", { method: "POST", body: {} });
  },
  async chats() {
    return request("/api/chats");
  },
  async createChat(payload) {
    return request("/api/chats", { method: "POST", body: payload || {} });
  },
  async chatDetail(id) {
    return request(`/api/chats/${encodeURIComponent(id)}`);
  },
  async renameChat(id, title) {
    return request(`/api/chats/${encodeURIComponent(id)}/rename`, { method: "POST", body: { title } });
  },
  async summarizeChat(id) {
    return request(`/api/chats/${encodeURIComponent(id)}/summarize`, { method: "POST", body: {} });
  },
  async deleteChat(id) {
    return request(`/api/chats/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async chatStream(id, payload, onEvent) {
    const res = await fetch(`${API_BASE}/api/chats/${encodeURIComponent(id)}/messages`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let data = null;
      try { data = await res.json(); } catch {}
      throw new ApiError(res.status, data || {});
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let lastData = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop();
      for (const block of blocks) {
        let event = "message";
        const dataLines = [];
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
        }
        if (!dataLines.length) continue;
        let data = null;
        try { data = JSON.parse(dataLines.join("\n")); } catch { data = dataLines.join("\n"); }
        if (event === "done") lastData = data;
        onEvent(event, data);
      }
    }
    return lastData;
  },
  async notifications() {
    return request("/api/notifications");
  },
  async notificationsRead() {
    return request("/api/notifications/read", { method: "POST", body: {} });
  },
  async usersSearch(q) {
    return request(`/api/users/search?q=${encodeURIComponent(q)}`);
  },
  async likeProfile(id) {
    return request(`/api/profile/${encodeURIComponent(id)}/like`, { method: "POST", body: {} });
  },
  async changePassword(payload) {
    return request("/api/change-password", { method: "POST", body: payload });
  },
  async schools(q = "", kind = "") {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (kind) qs.set("kind", kind);
    return request(`/api/schools?${qs.toString()}`);
  },
  async requestSchool(payload) {
    return request("/api/schools/request", { method: "POST", body: payload });
  },
  async ticket(payload) {
    return request("/api/tickets", { method: "POST", body: payload });
  },
  async adminSchools() {
    return request("/api/admin/schools");
  },
  async adminSchoolAction(id, action, reason) {
    return request(`/api/admin/schools/${id}`, { method: "POST", body: { action, reason } });
  },
  async adminUsers(q = "") {
    return request(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  },
  async adminDeleteUser(id) {
    return request(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async adminTickets() {
    return request("/api/admin/tickets");
  },
  async adminTicketAction(id, action) {
    return request(`/api/admin/tickets/${id}`, { method: "POST", body: { action } });
  },
};

// ---- SSE 流式生成 ----
function parseEventBlock(block) {
  let event = "message";
  const dataLines = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  let data = null;
  try { data = JSON.parse(dataLines.join("\n")); } catch { data = dataLines.join("\n"); }
  return { event, data };
}

export async function streamGenerate(payload, onEvent, signal) {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    let data = null;
    try { data = await res.json(); } catch {}
    throw new ApiError(res.status, data || {});
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop();
    for (const block of blocks) {
      const parsed = parseEventBlock(block);
      if (parsed) onEvent(parsed.event, parsed.data);
    }
  }
  const tail = parseEventBlock(buffer);
  if (tail) onEvent(tail.event, tail.data);
}

export async function streamRegenerate(courseId, feedback, onEvent, signal) {
  const res = await fetch(`${API_BASE}/api/regenerate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ courseId, feedback }),
    signal,
  });
  if (!res.ok) {
    let data = null;
    try { data = await res.json(); } catch {}
    throw new ApiError(res.status, data || {});
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop();
    for (const block of blocks) {
      const parsed = parseEventBlock(block);
      if (parsed) onEvent(parsed.event, parsed.data);
    }
  }
  const tail = parseEventBlock(buffer);
  if (tail) onEvent(tail.event, tail.data);
}
