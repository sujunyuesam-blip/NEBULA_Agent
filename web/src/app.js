// app.js - NEBULA 前端装配：路由 + 顶栏导航 + 登录/注册 + 设置抽屉 + 星云粒子

import "./styles/theme.css";
import "./styles/app.css";
import "./styles/animations.css";
import "./styles/pages.css";
import { LANGS, LinguaForce } from "./i18n/linguaforce.js";
import { api, Session, ApiError, t, esc, $, toast, navigate, state, saveModelPrefs, jwtPayload } from "./core.js";
import { lessonHtml } from "./core.js";
import { icon } from "./ui/icons.js";
import { chatPanelHtml, openChatPanel, autoStartChat } from "./pages/chat-panel.js";
import { legalHtml } from "./pages/legal.js";
import { adminHtml, bindAdmin } from "./pages/admin.js";

const ICONS_T = {
  about: icon("about"),
  workbench: icon("workbench"),
  community: icon("community"),
  profile: icon("profile"),
  contact: icon("contact"),
};

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="70" height="70"><defs><linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B5CF6"/><stop offset="0.5" stop-color="#4F8CFF"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="17" fill="url(#lg1)"/><path d="M32 32 m0 -15 a15 15 0 1 1 -0.01 0" stroke="rgba(255,255,255,0.9)" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-dasharray="42 52"/><path d="M32 32 m0 -9 a9 9 0 1 0 -0.01 0" stroke="rgba(255,255,255,0.55)" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-dasharray="24 32"/><circle cx="32" cy="32" r="5.2" fill="#fff"/><circle cx="46.5" cy="17.5" r="2.4" fill="#fff" opacity="0.95"/><circle cx="18.5" cy="45" r="1.9" fill="#fff" opacity="0.75"/><circle cx="45" cy="46" r="1.5" fill="#fff" opacity="0.6"/></svg>`;

const navItems = [
  { hash: "#/about", key: "navAbout", icon: "about" },
  { hash: "#/workbench", key: "navWorkbench", icon: "workbench" },
  { hash: "#/community", key: "navCommunity", icon: "community" },
  { hash: "#/profile", key: "navProfile", icon: "profile" },
  { hash: "#/contact", key: "navContact", icon: "contact" },
];

const pageTitles = {
  "#/workbench": ["workbench", "navWorkbench", "brandSub"],
  "#/community": ["community", "communityTitle", "communitySub"],
  "#/profile": ["profile", "profileTitle", "profileTitle"],
  "#/admin": ["shield", "adminTitle", "aiReviewLabel"],
  "#/about": ["about", "navAbout", "navAbout"],
  "#/contact": ["contact", "navContact", "navContact"],
  "#/user": ["profile", "profileTitle", "profileTitle"],
  "#/terms": ["book", "termsShort", "termsShort"],
  "#/privacy": ["lock", "privacyShort", "privacyShort"],
  "#/transfer": ["community", "transferShort", "transferShort"],
};

// ---------- 渲染骨架 ----------
function renderShell(pageHtml) {
  const app = $("#app");
  const drawerWasOpen = document.getElementById("drawer")?.classList.contains("open");
  const payload = jwtPayload();
  const isLight = document.documentElement.dataset.theme === "light";
  const p = state.profileData;
  const rn = routeName();
  const [ico, titleKey, subKey] = pageTitles[rn] || pageTitles["#/about"];
  app.innerHTML = `
    <div class="nebula-bg"></div>
    <aside class="rail glass ${state.railOpen ? "open" : ""}">
      <div class="rail-logo" data-action="goto-home" title="NEBULA">
        ${LOGO_SVG.replace('width="70" height="70"', 'width="42" height="42"')}
        <div class="rail-logo-text">
          <b>NEBULA</b>
          <span>${esc(t("brandSub"))}</span>
        </div>
      </div>
      ${navItems
        .map((n) => `<button class="rail-btn ${rn === n.hash ? "active" : ""}" data-action="nav" data-hash="${n.hash}"><span class="ico">${ICONS_T[n.icon] || n.icon}</span><span class="lbl">${esc(t(n.key))}</span></button>`)
        .join("")}
      ${payload?.role === "admin" ? `<button class="rail-btn ${rn === "#/admin" ? "active" : ""}" data-action="nav" data-hash="#/admin"><span class="ico">${icon("shield")}</span><span class="lbl">${esc(t("navAdmin"))}</span></button>` : ""}
      <div class="rail-chat-wrap">
        ${state.chatHint ? `<span class="chat-hint-bubble">💬 ${esc(t("chatHintBubble"))}</span>` : ""}
        <button class="rail-btn" data-action="open-chat-panel"><span class="ico">${icon("chat")}</span><span class="lbl">${esc(t("chatAssistant"))}</span></button>
      </div>
      <div class="rail-spacer"></div>
      ${payload
        ? `<button class="rail-user" data-action="nav" data-hash="#/profile" title="${esc(t("profileTitle"))}">
             <span class="avatar">${state.profileData?.user?.emoji || payload?.emoji ? `<span style="font-size:16px">${esc(state.profileData?.user?.emoji || payload?.emoji)}</span>` : state.profileData?.user?.avatar ? `<img src="${esc(state.profileData.user.avatar)}" alt="" />` : `<span style="font-size:16px">🧑‍🚀</span>`}</span>
             <span class="uname">${esc(state.profileData?.user?.name || payload?.name || "· · ·")}</span>
           </button>`
        : `<button class="rail-user" data-action="show-auth" title="${esc(t("loginTab"))}">
             <span class="avatar">${icon("profile", 15)}</span>
             <span class="uname">${esc(t("loginTab"))} / ${esc(t("registerTab"))}</span>
           </button>`}
      <button class="rail-collapse" data-action="rail-toggle" title="折叠/展开">${state.railOpen ? "⟨" : "⟩"}</button>
    </aside>

    <div class="main-wrap">
      <header class="topbar">
        <div>
          <h1 style="display:flex;align-items:center;gap:10px"><span class="topbar-ico">${ICONS_T[ico] || ""}</span>${esc(t(titleKey))}</h1>
          <div class="topbar-sub">${esc(t(subKey))}</div>
        </div>
        <div class="topbar-spacer"></div>
        <div class="topbar-actions">
          ${p ? `
            <span class="xp-pill">⚡ ${p.xp || 0} XP</span>
            <span class="streak-pill">🔥 ${p.streak || 0}</span>` : ""}
          <select class="select" id="ui-lang" style="width:auto;padding:9px 10px;font-size:13px">
            ${LANGS.map((l) => `<option value="${l.code}" ${LinguaForce.status.code === l.code ? "selected" : ""}>${l.flag} ${l.name}</option>`).join("")}
          </select>
          <div class="notif-wrap">
            <button class="btn btn-ghost btn-sm notif-btn" data-action="toggle-notif">${icon("chat", 16)}<span class="notif-badge" id="notif-badge" style="${state.notifUnread > 0 ? "" : "display:none"}">${state.notifUnread > 99 ? "99+" : state.notifUnread}</span></button>
            ${state.notifOpen ? notifPanelHtml() : ""}
          </div>
          <div class="search-wrap">
            <button class="btn btn-ghost btn-sm" data-action="toggle-search">${icon("search", 16)}</button>
            ${state.searchOpen ? searchPanelHtml() : ""}
          </div>
          <button class="btn btn-ghost btn-sm" data-action="toggle-theme">${isLight ? icon("moon", 16) : icon("sun", 16)}</button>
          <button class="btn btn-ghost btn-sm" data-action="open-settings">${icon("settings", 16)}</button>
        </div>
      </header>
      <main class="page-view page-enter" id="page-view">${pageHtml}</main>
    </div>
    <div class="drawer-backdrop" id="drawer-backdrop" data-action="close-settings"></div>
    <div class="drawer" id="drawer">${drawerHtml()}</div>
    <div class="toast-wrap" id="toasts"></div>
  `;
  bindShell();
  // 语言/主题切换等重渲染后，恢复抽屉打开状态
  if (drawerWasOpen) {
    $("#drawer")?.classList.add("open");
    $("#drawer-backdrop")?.classList.add("open");
  }
  // 入场动画只播一次，播完移除（避免后续交互重渲染时页面闪动）
  const pv = $("#page-view");
  if (pv) setTimeout(() => pv.classList.remove("page-enter"), 450);
}

function routeName() {
  const h = location.hash || "#/about";
  if (h.startsWith("#/community/")) return "#/community";
  if (h.startsWith("#/user/")) return "#/user";
  if (h === "#/" || h === "") return "#/about";
  return h.split("?")[0];
}

// ---------- 路由分发 ----------
async function renderRoute() {
  const hash = location.hash || "#/about";
  if (hash.startsWith("#/wechat-auth")) {
    const params = new URLSearchParams(hash.split("?")[1] || "");
    const token = params.get("token");
    const err = params.get("error");
    if (token) {
      Session.set(token);
      toast(t("toastLoginOk"));
      history.replaceState(null, "", location.pathname + "#/about");
      renderRoute();
      api.profile().then((d) => { state.profileData = d; renderRoute(); }).catch(() => {});
    } else if (err) {
      toast(`${t("wechatLoginFail")}：${decodeURIComponent(err).slice(0, 100)}`, "err");
      history.replaceState(null, "", location.pathname + "#/about");
      renderRoute();
    }
    return;
  }
  if (hash.startsWith("#/s/")) {
    loadShare(hash.split("/")[2]);
    return;
  }
  let html = "";
  let bind = null;
  if (hash.startsWith("#/user/")) {
    const m = await import("./pages/profile.js");
    html = m.profileHtml();
    bind = () => m.bindUserProfile(hash.split("/")[2]);
  } else if (hash.startsWith("#/community/")) {
    const m = await import("./pages/community.js");
    html = m.communityDetailHtml(hash.split("/")[2]);
    bind = () => m.bindCommunityDetail();
  } else if (hash === "#/community") {
    const m = await import("./pages/community.js");
    html = m.communityListHtml();
    bind = () => m.bindCommunityList();
  } else if (hash === "#/profile") {
    if (!Session.isLoggedIn) { showAuth(); return; }
    const m = await import("./pages/profile.js");
    html = m.profileHtml();
    bind = () => m.bindProfile();
  } else if (hash === "#/admin") {
    if (!Session.isLoggedIn) { showAuth(); return; }
    const m = await import("./pages/admin.js");
    html = m.adminHtml();
    bind = () => m.bindAdmin();
  } else if (hash === "#/workbench" || hash === "#/") {
    const m = await import("./pages/workbench.js");
    html = m.workbenchHtml();
    bind = () => m.bindWorkbench();
  } else if (hash === "#/contact") {
    const m = await import("./pages/contact.js");
    html = m.contactHtml();
  } else if (hash === "#/terms" || hash === "#/privacy" || hash === "#/transfer") {
    const m = await import("./pages/legal.js");
    html = m.legalHtml(hash.slice(2));
  } else {
    const m = await import("./pages/about.js");
    html = m.aboutPageHtml();
  }
  renderShell(html);
  if (bind) bind();
}

async function loadShare(id) {
  try {
    const data = await api.share(id);
    if (data.course) {
      state.course = data.course;
      state.shareId = id;
      state.audit = null;
      navigate("#/workbench");
    } else {
      toast(data.error || "Not found", "err");
      navigate("#/about");
    }
  } catch (e) {
    toast(e.message, "err");
    navigate("#/about");
  }
}

// ---------- 顶栏事件 ----------
function bindShell() {
  const uiLang = $("#ui-lang");
  if (uiLang) uiLang.addEventListener("change", () => {
    LinguaForce.setLang(uiLang.value);
    localStorage.setItem("nebula_lang", uiLang.value);
    state.notifOpen = false;
    state.searchOpen = false;
    renderRoute();
  });
  const drawerLang = $("#drawer-lang");
  if (drawerLang) drawerLang.addEventListener("change", () => {
    LinguaForce.setLang(drawerLang.value);
    localStorage.setItem("nebula_lang", drawerLang.value);
    state.notifOpen = false;
    state.searchOpen = false;
    renderRoute();
  });
}

document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  switch (action) {
    case "nav":
      navigate(el.dataset.hash || "#/about");
      break;
    case "goto-home":
      navigate("#/about");
      break;
    case "goto-community":
      navigate("#/community");
      break;
    case "goto-workbench":
      navigate("#/workbench");
      break;
    case "rail-toggle": {
      state.railOpen = !state.railOpen;
      document.body.classList.toggle("rail-open", state.railOpen);
      renderRoute();
      break;
    }
    case "toggle-theme":
      document.documentElement.dataset.theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      localStorage.setItem("nebula_theme", document.documentElement.dataset.theme);
      renderRoute();
      break;
    case "open-settings":
      $("#drawer").classList.add("open");
      $("#drawer-backdrop").classList.add("open");
      break;
    case "close-settings":
      $("#drawer").classList.remove("open");
      $("#drawer-backdrop").classList.remove("open");
      break;
    case "logout":
      api.logout();
      location.reload();
      break;
    case "show-auth": showAuth(); break;
    case "toggle-notif": toggleNotif(); break;
    case "notif-read": await markNotifRead(); break;
    case "toggle-search": toggleSearch(); break;
    case "search-users": await searchUsers(); break;
    case "open-user-result": navigate(`#/user/${el.dataset.id}`); state.searchOpen = false; break;
    case "change-password": await changePassword(); break;
  }
});

async function changePassword() {
  const oldPw = $("#pw-old")?.value || "";
  const newPw = $("#pw-new")?.value || "";
  const newPw2 = $("#pw-new2")?.value || "";
  const result = $("#pw-result");
  if (!oldPw || !newPw) {
    if (result) { result.style.color = "var(--danger)"; result.textContent = t("passwordRequired"); }
    return;
  }
  if (newPw !== newPw2) {
    if (result) { result.style.color = "var(--danger)"; result.textContent = t("passwordMismatch"); }
    return;
  }
  if (newPw.length < 6) {
    if (result) { result.style.color = "var(--danger)"; result.textContent = t("passwordTooShort"); }
    return;
  }
  try {
    await api.changePassword({ oldPassword: oldPw, newPassword: newPw });
    if (result) { result.style.color = "var(--success)"; result.textContent = t("passwordChanged"); }
    ["#pw-old", "#pw-new", "#pw-new2"].forEach((sel) => { const el = $(sel); if (el) el.value = ""; });
  } catch (e) {
    if (result) { result.style.color = "var(--danger)"; result.textContent = e.message || t("loginFailed"); }
  }
}

// ---------- 用户搜索 ----------
function searchPanelHtml() {
  return `
  <div class="search-panel glass">
    <div class="search-row">
      <input class="input" id="search-user-input" placeholder="${esc(t("searchUserPlaceholder"))}" />
      <button class="btn btn-sm btn-primary" data-action="search-users">${icon("search", 14)}</button>
    </div>
    <div class="search-results" id="search-results">
      ${(state.searchResults || []).map((u) => `
        <div class="search-user-item" data-action="open-user-result" data-id="${esc(u.id)}">
          <span class="search-user-emoji">${esc(u.emoji || "🧑‍🚀")}</span>
          <div>
            <b>${esc(u.name)}</b>
            ${u.school ? `<span>🏫 ${esc(u.school)}</span>` : ""}
          </div>
        </div>`).join("")}
      ${(state.searchResults || []).length === 0 ? `<div class="search-empty">${esc(t("searchUserEmpty"))}</div>` : ""}
    </div>
  </div>`;
}
function toggleSearch() {
  state.searchOpen = !state.searchOpen;
  if (state.searchOpen) {
    const panel = document.querySelector(".search-panel");
    if (!panel) {
      const btn = document.querySelector(".search-wrap .btn");
      if (btn) btn.insertAdjacentHTML("afterend", searchPanelHtml());
    }
    setTimeout(() => document.getElementById("search-user-input")?.focus(), 60);
  } else {
    document.querySelector(".search-panel")?.remove();
    renderRoute();
  }
}
async function searchUsers() {
  const q = document.getElementById("search-user-input")?.value.trim();
  const box = document.getElementById("search-results");
  if (!q || !box) return;
  try {
    const res = await api.usersSearch(q);
    state.searchResults = res.items || [];
    box.innerHTML = (res.items || []).map((u) => `
      <div class="search-user-item" data-action="open-user-result" data-id="${esc(u.id)}">
        <span class="search-user-emoji">${esc(u.emoji || "🧑‍🚀")}</span>
        <div>
          <b>${esc(u.name)}</b>
          ${u.school ? `<span>🏫 ${esc(u.school)}</span>` : ""}
        </div>
      </div>`).join("") || `<div class="search-empty">${esc(t("searchUserEmpty"))}</div>`;
  } catch (e) {
    box.innerHTML = `<div class="search-empty">${esc(e.message)}</div>`;
  }
}

// ---------- 通知 ----------
const NOTIF_TEXT = {
  generate_done: "generateNotif",
  chat_created: "chatNotif",
  post_approved: "postApprovedNotif",
  post_pending: "postPendingNotif",
  post_rejected: "postRejectedNotif",
  comment_approved: "commentApprovedNotif",
  comment_rejected: "commentRejectedNotif",
  like: "likeNotif",
  comment: "commentNotif",
  like_profile: "likeProfileNotif",
  school_rejected: "schoolRejectedNotif",
  school_approved: "schoolApprovedNotif",
};

function notifSubHtml(n) {
  const from = n.payload?.from ? `<span class="notif-from">👤 ${esc(n.payload.from)}</span>` : "";
  if (n.type === "like_profile") return from;
  const base = esc(n.payload?.title || n.payload?.topic || n.payload?.content || "");
  return `${base}${from ? " " + from : ""}`;
}

function notifPanelHtml() {
  const items = state.notifications || [];
  return `
  <div class="notif-panel glass">
    <div class="notif-head">
      <b>${esc(t("notifTitle"))}</b>
      ${state.notifUnread > 0 ? `<button class="btn btn-ghost btn-sm" data-action="notif-read">${esc(t("notifMarkRead"))}</button>` : ""}
    </div>
    <div class="notif-list">
      ${items.length ? items.slice(0, 30).map((n) => `
        <div class="notif-item ${n.read ? "" : "unread"}">
          <div class="notif-ico">${notifIcon(n.type)}</div>
          <div>
            <div class="notif-text">${esc(t(NOTIF_TEXT[n.type] || "generateNotif"))}</div>
            <div class="notif-sub">${notifSubHtml(n)}</div>
            <div class="notif-time">${new Date(n.createdAt * 1000).toLocaleString()}</div>
          </div>
        </div>`).join("") : `<div style="font-size:12.5px;color:var(--text-2);text-align:center;padding:20px">${esc(t("notifEmpty"))}</div>`}
    </div>
  </div>`;
}
function notifIcon(type) {
  const map = { generate_done: "⚡", chat_created: "💬", post_approved: "✅", post_pending: "⏳", post_rejected: "❌", comment_approved: "✅", comment_rejected: "❌", like: "❤️", comment: "💬", like_profile: "👍" };
  return map[type] || "🔔";
}
async function refreshNotif() {
  if (!Session.isLoggedIn) return;
  try {
    const res = await api.notifications();
    state.notifUnread = res.unread || 0;
    state.notifications = res.items || [];
    if (state.notifOpen) {
      // 局部更新面板内容（避免重建 DOM 导致 pop 动画重放，视觉上像"弹了两次"）
      const panel = document.querySelector(".notif-panel");
      if (panel) {
        const head = panel.querySelector(".notif-head");
        const list = panel.querySelector(".notif-list");
        if (list) {
          const items = state.notifications || [];
          list.innerHTML = items.length ? items.slice(0, 30).map((n) => `
            <div class="notif-item ${n.read ? "" : "unread"}">
              <div class="notif-ico">${notifIcon(n.type)}</div>
              <div>
                <div class="notif-text">${esc(t(NOTIF_TEXT[n.type] || "generateNotif"))}</div>
                <div class="notif-sub">${notifSubHtml(n)}</div>
                ${n.payload?.reason ? `<div class="notif-reason">${esc(t("rejectReasonLabel"))}：${esc(n.payload.reason)}</div>` : ""}
                <div class="notif-time">${new Date(n.createdAt * 1000).toLocaleString()}</div>
              </div>
            </div>`).join("") : `<div style="font-size:12.5px;color:var(--text-2);text-align:center;padding:20px">${esc(t("notifEmpty"))}</div>`;
        }
        if (head && state.notifUnread === 0) {
          const btn = head.querySelector('[data-action="notif-read"]');
          if (btn) btn.remove();
        }
      }
    }
    const badge = document.getElementById("notif-badge");
    if (badge) {
      badge.textContent = state.notifUnread > 99 ? "99+" : state.notifUnread;
      badge.style.display = state.notifUnread > 0 ? "" : "none";
    }
    // 已读后也更新面板内状态
    if (state.notifOpen) {
      const panel = document.querySelector(".notif-panel");
      if (panel) {
        const items = state.notifications || [];
        const list = panel.querySelector(".notif-list");
        if (list) {
          list.innerHTML = items.length ? items.slice(0, 30).map((n) => `
            <div class="notif-item ${n.read ? "" : "unread"}">
              <div class="notif-ico">${notifIcon(n.type)}</div>
              <div>
                <div class="notif-text">${esc(t(NOTIF_TEXT[n.type] || "generateNotif"))}</div>
                <div class="notif-sub">${notifSubHtml(n)}</div>
                ${n.payload?.reason ? `<div class="notif-reason">${esc(t("rejectReasonLabel"))}：${esc(n.payload.reason)}</div>` : ""}
                <div class="notif-time">${new Date(n.createdAt * 1000).toLocaleString()}</div>
              </div>
            </div>`).join("") : `<div style="font-size:12.5px;color:var(--text-2);text-align:center;padding:20px">${esc(t("notifEmpty"))}</div>`;
        }
        if (state.notifUnread === 0) {
          const btn = panel.querySelector('[data-action="notif-read"]');
          if (btn) btn.remove();
        }
      }
    }
  } catch {}
}
function toggleNotif() {
  state.notifOpen = !state.notifOpen;
  if (state.notifOpen) {
    // 立即用缓存数据渲染面板（不等网络），再异步刷新
    const panel = document.querySelector(".notif-panel");
    if (!panel) {
      const btn = document.querySelector(".notif-btn");
      if (btn) btn.insertAdjacentHTML("afterend", notifPanelHtml());
    }
    refreshNotif();
  } else {
    const panel = document.querySelector(".notif-panel");
    if (panel) panel.remove();
    renderRoute();
  }
}
async function markNotifRead() {
  try {
    await api.notificationsRead();
    state.notifUnread = 0;
    refreshNotif();
  } catch {}
}
setInterval(refreshNotif, 15000);

// ---------- 设置抽屉 ----------
function drawerHtml() {
  return `
    <button class="icon-btn drawer-close" data-action="close-settings">✕</button>
    <h3>${esc(t("settingsTitle"))}</h3>
    <div class="setting-block">
      <label class="field-label">${esc(t("themeLabel"))}</label>
      <div class="model-grid">
        <div class="model-card ${document.documentElement.dataset.theme !== "light" ? "active" : ""}" data-action="set-theme" data-value="dark">🌙 ${esc(t("themeDark"))}</div>
        <div class="model-card ${document.documentElement.dataset.theme === "light" ? "active" : ""}" data-action="set-theme" data-value="light">☀️ ${esc(t("themeLight"))}</div>
      </div>
    </div>
    <div class="setting-block">
      <label class="field-label">${esc(t("langLabel"))}</label>
      <select class="select" id="drawer-lang">
        ${LANGS.map((l) => `<option value="${l.code}" ${LinguaForce.status.code === l.code ? "selected" : ""}>${l.flag} ${l.name}</option>`).join("")}
      </select>
    </div>
    <div class="setting-block">
      <label class="field-label">🔑 ${esc(t("changePasswordLabel"))}</label>
      <input class="input" id="pw-old" type="password" placeholder="${esc(t("oldPassword"))}" />
      <input class="input" id="pw-new" type="password" placeholder="${esc(t("newPassword"))}" />
      <input class="input" id="pw-new2" type="password" placeholder="${esc(t("passwordConfirm"))}" />
      <button class="btn btn-primary btn-sm" data-action="change-password">${esc(t("changePasswordBtn"))}</button>
      <div id="pw-result" style="font-size:12.5px;color:var(--success);min-height:16px"></div>
    </div>
    <div class="setting-block">
      <label class="field-label">${esc(t("aboutLabel"))}</label>
      <div class="setting-intro">${t("aboutHtml")}</div>
    </div>
    <div class="setting-block">
      <label class="field-label">${esc(t("devLabel"))}</label>
      <div class="setting-intro">${t("devHtml")}</div>
    </div>
    <div class="setting-block" style="flex-direction:row;gap:10px">
      <button class="btn" style="flex:1" data-action="close-settings">${esc(t("closeBtn"))}</button>
      <button class="btn btn-ghost" data-action="logout">${esc(t("logout"))}</button>
    </div>`;
}

document.addEventListener("click", (e) => {
  const el = e.target.closest('[data-action="set-theme"]');
  if (el) {
    document.documentElement.dataset.theme = el.dataset.value;
    localStorage.setItem("nebula_theme", el.dataset.value);
    renderRoute();
    $("#drawer").classList.add("open");
    $("#drawer-backdrop").classList.add("open");
  }
});

// ---------- 登录 / 注册 ----------
export function showAuth() {
  const old = $("#auth-layer");
  if (old) old.remove();
  const layer = document.createElement("div");
  layer.className = "login-layer";
  layer.id = "auth-layer";
  layer.innerHTML = `
    <div class="login-card glass" id="auth-card">
      <div class="login-logo">${LOGO_SVG}</div>
      <div class="auth-tabs">
        <button class="auth-tab active" data-auth-mode="login">${esc(t("loginTab"))}</button>
        <button class="auth-tab" data-auth-mode="register">${esc(t("registerTab"))}</button>
      </div>
      <div id="auth-fields">${authLoginFields()}</div>
      ${state.appConfig.turnstileSiteKey ? `<div class="cf-turnstile" id="turnstile-widget" style="margin-top:14px"></div>` : ""}
      <div class="login-error" id="auth-error"></div>
    </div>`;
  document.body.appendChild(layer);
  bindAuth(layer);
  loadSchoolList(layer);
  renderTurnstile(layer);
}

function authLoginFields() {
  const wBtn = state.appConfig.wechatEnabled
    ? `<button type="button" class="btn wechat-btn" data-action="wechat-login" style="width:100%;margin-top:10px;background:#07C160;color:#fff;border-color:#07C160">
         <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M9.5 4C5.36 4 2 6.69 2 10c0 1.89 1.08 3.56 2.77 4.66l-.7 2.09 2.44-1.23c.95.27 1.96.42 2.99.42.17 0 .34 0 .51-.02a5.4 5.4 0 0 1-.26-1.67c0-3.26 3.26-5.9 7.25-5.9.3 0 .6.01.9.04C17.26 5.98 13.66 4 9.5 4zM7 7.75a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zm5 0a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zM14.59 14.16c-3.03 0-5.5 2.02-5.5 4.5s2.47 4.5 5.5 4.5c.95 0 1.86-.2 2.67-.56l2.23 1.13-.63-1.9c1.55-1 2.55-2.5 2.55-4.17 0-2.48-2.47-4.5-5.5-4.5z"/></svg>
         ${esc(t("wechatLogin"))}
       </button>`
    : "";
  return `
    <input class="input" id="auth-email" type="email" placeholder="${esc(t("emailLabel"))}" />
    <div class="pw-wrap" style="margin-top:10px">
      <input class="input" id="auth-password" type="password" placeholder="${esc(t("passwordLabel"))}" />
      <button type="button" class="pw-eye" data-eye-for="auth-password">${eyeIcon(false)}</button>
    </div>
    <button class="btn btn-primary" id="auth-submit" style="width:100%;margin-top:16px;padding:13px">${esc(t("loginSubmitBtn"))}</button>
    ${wBtn}
    <button class="btn btn-ghost btn-sm" id="auth-token-mode" style="width:100%;margin-top:10px">${esc(t("tokenMode"))}</button>`;
}

function authRegisterFields() {
  return `
    <input class="input" id="auth-name" placeholder="${esc(t("nameLabel"))}" />
    <input class="input" id="auth-email" type="email" placeholder="${esc(t("emailLabel"))}" style="margin-top:10px" />
    ${state.appConfig.emailVerification ? `
    <div style="display:flex;gap:8px;margin-top:10px">
      <input class="input" id="auth-code" placeholder="${esc(t("codePlaceholder"))}" style="flex:1" />
      <button type="button" class="btn btn-sm" id="send-code-btn">${esc(t("sendCodeBtn"))}</button>
    </div>
    <div id="code-hint" style="font-size:11.5px;color:var(--text-2)"></div>` : ""}
    <div class="school-wrap" style="margin-top:10px;position:relative">
      <input class="input" id="auth-school" placeholder="${esc(t("schoolLabel"))} *" autocomplete="off" />
      <div class="school-drop hidden" id="school-drop"></div>
    </div>
    <button type="button" class="btn btn-ghost btn-sm" id="school-request-btn" style="width:100%">＋ ${esc(t("schoolNotFound"))}</button>
    <div class="school-request hidden" id="school-request" style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
      <input class="input" id="sr-name" placeholder="${esc(t("schoolFullName"))}" />
      <input class="input" id="sr-region" placeholder="${esc(t("schoolRegion"))}" />
      <select class="select" id="sr-kind">
        <option value="high">${esc(t("schoolHigh"))}</option>
        <option value="middle">${esc(t("schoolMiddle"))}</option>
        <option value="university">${esc(t("schoolUniversity"))}</option>
      </select>
      <button type="button" class="btn btn-sm btn-primary" id="sr-submit">${esc(t("schoolSubmit"))}</button>
      <div id="sr-result" style="font-size:12px;min-height:14px"></div>
    </div>
    <div class="pw-wrap" style="margin-top:10px">
      <input class="input" id="auth-password" type="password" placeholder="${esc(t("passwordLabel"))}" />
      <button type="button" class="pw-eye" data-eye-for="auth-password">${eyeIcon(false)}</button>
    </div>
    <div class="pw-wrap" style="margin-top:10px">
      <input class="input" id="auth-password2" type="password" placeholder="${esc(t("passwordConfirm"))}" />
      <button type="button" class="pw-eye" data-eye-for="auth-password2">${eyeIcon(false)}</button>
    </div>
    <div class="pw-match" id="pw-match"></div>
    <div class="legal-checks" style="margin-top:12px;display:flex;flex-direction:column;gap:8px;text-align:left">
      <label class="legal-check"><input type="checkbox" id="agree-terms" /> ${esc(t("agreeTerms"))} <a href="#/terms" target="_blank">${esc(t("termsShort"))}</a> · <a href="#/privacy" target="_blank">${esc(t("privacyShort"))}</a></label>
      <label class="legal-check"><input type="checkbox" id="agree-transfer" /> ${esc(t("agreeTransfer"))} <a href="#/transfer" target="_blank">${esc(t("transferShort"))}</a></label>
    </div>
    <button class="btn btn-primary" id="auth-submit" style="width:100%;margin-top:16px;padding:13px">${esc(t("registerBtn"))}</button>
    <button class="btn btn-ghost btn-sm" id="auth-token-mode" style="width:100%;margin-top:10px">${esc(t("tokenMode"))}</button>`;
}

function eyeIcon(open) {
  return open
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

let turnstileLoaded = false;
function renderTurnstile(layer) {
  const widget = layer.querySelector("#turnstile-widget");
  if (!widget || !state.appConfig.turnstileSiteKey) return;
  if (window.turnstile) {
    window.turnstile.render(widget, { sitekey: state.appConfig.turnstileSiteKey, theme: document.documentElement.dataset.theme });
    return;
  }
  if (turnstileLoaded) return;
  turnstileLoaded = true;
  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.onload = () => {
    if (window.turnstile) {
      window.turnstile.render(widget, { sitekey: state.appConfig.turnstileSiteKey, theme: document.documentElement.dataset.theme });
    }
  };
  document.head.appendChild(script);
}
function turnstileToken() {
  try { return window.turnstile?.getResponse?.() || ""; } catch { return ""; }
}

let schoolCache = [];
async function loadSchoolList(layer) {
  try {
    const res = await api.schools("", "");
    schoolCache = res.items || [];
    const input = layer.querySelector("#auth-school");
    const drop = layer.querySelector("#school-drop");
    if (!input || !drop) return;
    const render = () => {
      const q = input.value.trim();
      const matches = (q ? schoolCache.filter((sc) => sc.name.includes(q) || sc.region.includes(q)) : schoolCache).slice(0, 12);
      if (!matches.length) { drop.classList.add("hidden"); return; }
      drop.innerHTML = matches.map((sc) => `
        <div class="school-opt" data-name="${sc.name.replace(/"/g, "&quot;")}" data-region="${esc(sc.region || "")}">
          <b>${esc(sc.name)}</b><span>${esc(sc.region || "")}</span>
        </div>`).join("");
      drop.classList.remove("hidden");
    };
    input.addEventListener("input", render);
    input.addEventListener("focus", render);
    drop.addEventListener("click", (e) => {
      const opt = e.target.closest(".school-opt");
      if (opt) {
        input.value = opt.dataset.name;
        drop.classList.add("hidden");
      }
    });
    document.addEventListener("click", (e) => {
      if (!layer.contains(e.target)) drop.classList.add("hidden");
    });
  } catch {}
}

function authTokenFields() {
  return `
    <input class="input" id="auth-token" type="password" placeholder="${esc(t("loginPlaceholder"))}" style="text-align:center" />
    <button class="btn btn-primary" id="auth-submit" style="width:100%;margin-top:16px;padding:13px">${esc(t("loginBtn"))}</button>
    <button class="btn btn-ghost btn-sm" id="auth-token-mode" style="width:100%;margin-top:10px">${esc(t("backToAccount"))}</button>`;
}

function bindAuth(layer) {
  let mode = "login"; // login | register | token
  const card = $("#auth-card");
  const fail = (msg) => {
    const err = $("#auth-error");
    err.textContent = msg;
    card.classList.remove("shake");
    void card.offsetWidth;
    card.classList.add("shake");
    // Turnstile token 一次性：失败后重置，允许用户再次验证提交
    try { window.turnstile?.reset?.(); } catch {}
  };

  const switchMode = (m) => {
    mode = m;
    layer.querySelectorAll(".auth-tab").forEach((b) => b.classList.toggle("active", b.dataset.authMode === m));
    const fields = $("#auth-fields");
    fields.innerHTML = m === "register" ? authRegisterFields() : m === "token" ? authTokenFields() : authLoginFields();
    if (m === "register") {
      $("#auth-token-mode").style.display = "none";
      loadSchoolList(layer); // 重新绑定学校搜索下拉（字段已重建）
    }
  };

  layer.addEventListener("click", (e) => {
    // 密码小眼睛：切换明文/密文
    const eye = e.target.closest(".pw-eye");
    if (eye) {
      const input = document.getElementById(eye.dataset.eyeFor);
      if (input) {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        eye.innerHTML = eyeIcon(show);
      }
      return;
    }
    const tab = e.target.closest("[data-auth-mode]");
    if (tab) switchMode(tab.dataset.authMode);
    const tokenMode = e.target.closest("#auth-token-mode");
    if (tokenMode) {
      if (mode === "token") switchMode("login");
      else switchMode("token");
    }
    if (e.target.closest('[data-action="wechat-login"]')) {
      location.href = "https://api.nebulavessel.com/api/auth/wechat";
      return;
    }
    if (e.target.closest("#send-code-btn")) sendCode();
    if (e.target.closest("#auth-submit")) submit();
    if (e.target.closest("#school-request-btn")) {
      const box = layer.querySelector("#school-request");
      if (box) box.classList.toggle("hidden");
    }
    if (e.target.closest("#sr-submit")) {
      const name = layer.querySelector("#sr-name")?.value.trim();
      const region = layer.querySelector("#sr-region")?.value.trim();
      const kind = layer.querySelector("#sr-kind")?.value || "high";
      const result = layer.querySelector("#sr-result");
      if (!name || !region) {
        if (result) { result.style.color = "var(--danger)"; result.textContent = t("schoolNeed"); }
        return;
      }
      api.requestSchool({ name, region, kind }).then((res) => {
        if (result) { result.style.color = "var(--success)"; result.textContent = res.message || "OK"; }
      }).catch((err) => {
        if (result) { result.style.color = "var(--danger)"; result.textContent = err.message; }
      });
    }
  });

  // 确认密码：逐字符匹配动画（✓ 对 / ✗ 错 / • 待输入）
  const updateMatch = () => {
    const p1 = layer.querySelector("#auth-password")?.value || "";
    const pw2 = layer.querySelector("#auth-password2");
    const pwMatch = layer.querySelector("#pw-match");
    const v2 = pw2?.value || "";
    if (!pwMatch || !v2) {
      if (pwMatch) pwMatch.innerHTML = "";
      return;
    }
    const len = Math.max(p1.length, v2.length);
    let html = "";
    for (let i = 0; i < len; i++) {
      const cls = i >= v2.length ? "pending" : p1[i] === v2[i] ? "ok" : "bad";
      html += `<span class="mchar ${cls}">${cls === "ok" ? "✓" : cls === "bad" ? "✗" : "•"}</span>`;
    }
    pwMatch.innerHTML = html;
  };
  layer.addEventListener("input", (e) => {
    if (e.target.id === "auth-password2" || e.target.id === "auth-password") updateMatch();
  });

  layer.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") submit();
  });

  let codeCooldown = 0;
  async function sendCode() {
    const email = layer.querySelector("#auth-email")?.value.trim();
    const hint = layer.querySelector("#code-hint");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      if (hint) { hint.style.color = "var(--danger)"; hint.textContent = t("codeNeedEmail"); }
      return;
    }
    const btn = layer.querySelector("#send-code-btn");
    if (codeCooldown > 0 || btn?.disabled) return;
    try {
      const res = await api.sendCode(email);
      if (hint) { hint.style.color = "var(--success)"; hint.textContent = res.message || "OK"; }
      btn.disabled = true;
      codeCooldown = 60;
      const tick = () => {
        codeCooldown--;
        btn.textContent = codeCooldown + "s";
        if (codeCooldown <= 0) { btn.disabled = false; btn.textContent = t("sendCodeBtn"); }
        else setTimeout(tick, 1000);
      };
      tick();
    } catch (e) {
      if (hint) { hint.style.color = "var(--danger)"; hint.textContent = e.message; }
    }
  }

  async function submit() {
    try {
      const tt = turnstileToken();
      if (mode === "token") {
        const token = $("#auth-token")?.value.trim();
        if (!token) return;
        await api.login(token);
      } else if (mode === "register") {
        const email = $("#auth-email")?.value.trim();
        const name = $("#auth-name")?.value.trim();
        const school = $("#auth-school")?.value.trim();
        if (!school) return fail(t("schoolRequired"));
        const code = $("#auth-code")?.value.trim() || "";
        const p1 = $("#auth-password")?.value;
        const p2 = $("#auth-password2")?.value;
        if (p1 !== p2) return fail(t("passwordMismatch"));
        if (state.appConfig.emailVerification && !code) return fail(t("codeRequired"));
        if (!layer.querySelector("#agree-terms")?.checked || !layer.querySelector("#agree-transfer")?.checked) {
          return fail(t("mustAgree"));
        }
        const res = await api.register({ email, name, school, password: p1, code, turnstileToken: tt });
        if (!res.token) return fail(res.error || t("registerFailed"));
      } else {
        const email = $("#auth-email")?.value.trim();
        const password = $("#auth-password")?.value;
        const res = await api.loginAccount({ email, password, turnstileToken: tt });
        if (!res.token) return fail(t("loginFailed"));
      }
      toast(t("toastLoginOk"));
      layer.style.opacity = "0";
      setTimeout(() => {
        layer.remove();
        renderRoute();
      }, 450);
    } catch (e) {
      fail(e?.message || t("loginFailed"));
    }
  }
}

// ---------- iframe 消息（工作台转发） ----------
window.addEventListener("message", (e) => {
  import("./pages/workbench.js").then((m) => m.onWorkbenchMessage(e.data || {})).catch(() => {});
});

// ---------- 启动 ----------
function boot() {
  document.documentElement.dataset.theme = localStorage.getItem("nebula_theme") || "dark";
  LinguaForce.setLang(localStorage.getItem("nebula_lang") || "zh");
  document.body.classList.toggle("rail-open", state.railOpen);
  window.addEventListener("hashchange", renderRoute);
  // 立即渲染首屏（不等待 config，避免白屏）；config 到达后再刷新一次
  renderRoute();
  api.config().then((cfg) => {
    state.appConfig = { ...state.appConfig, ...cfg };
    // 若登录层已显示且 Turnstile 未渲染（config 晚到），补渲染
    const layer = document.getElementById("auth-layer");
    if (layer && state.appConfig.turnstileSiteKey) renderTurnstile(layer);
    renderRoute();
  }).catch(() => {});
  if (Session.isLoggedIn) {
    api.profile().then((d) => {
      state.profileData = d;
      renderRoute();
    }).catch(() => {});
  }
  spawnStars();
}

function spawnStars() {
  const count = 26;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "star-p";
    const size = Math.random() * 2.2 + 1;
    s.style.width = size + "px";
    s.style.height = size + "px";
    s.style.left = Math.random() * 100 + "vw";
    s.style.animationDuration = Math.random() * 22 + 14 + "s";
    s.style.animationDelay = -Math.random() * 30 + "s";
    document.body.appendChild(s);
  }
}

boot();
