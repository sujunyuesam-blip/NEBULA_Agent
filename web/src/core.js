// core.js - 前端共享核心：状态、工具、API 再导出、导航

import { LinguaForce } from "./i18n/linguaforce.js";
import { api, Session, streamGenerate, streamRegenerate, ApiError } from "./api/client.js";
import { lessonHtml } from "./renderer/runtime.js";

export const t = (key) => LinguaForce.t(key);

export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const $ = (sel, root = document) => root.querySelector(sel);

export function toast(msg, kind = "ok") {
  const wrap = $("#toasts");
  if (!wrap) return;
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity .4s";
    setTimeout(() => el.remove(), 400);
  }, 2600);
}

export function navigate(hash) {
  location.hash = hash;
}

// JWT payload 解析（获取 name/role 等）
export function jwtPayload() {
  try {
    const token = Session.token;
    if (!token) return null;
    const body = token.split(".")[1];
    return JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function isAdmin() {
  return jwtPayload()?.role === "admin";
}

export const state = {
  course: null,
  shareId: null,
  audit: null,
  fallback: false,
  generating: false,
  genStage: "",
  genSub: "",
  genProgress: 0,
  currentTab: "audit",
  lastHtml: "",
  // 个性化问卷
  topic: "",
  role: "",
  difficulty: "beginner",
  model: localStorage.getItem("nebula_model") || "flash",
  customModel: JSON.parse(localStorage.getItem("nebula_custom_model") || "null") || { baseUrl: "", apiKey: "", model: "" },
  chaptersHint: 0,
  level: localStorage.getItem("nebula_level") || "novice",
  duration: "standard",
  style: "story",
  scenario: "interest",
  domain: "",
  domainBusy: false,
  reflection: null,
  reflectionBusy: false,
  // 每日一题 / 路径
  daily: null,
  plan: null,
  // 错题复习（profile 跳转注入）
  wrongItems: null,
  // UI 状态
  appConfig: { emailVerification: false, turnstileSiteKey: "", googleClientId: "" },
  chatHint: false,
  notifUnread: 0,
  searchOpen: false,
  searchResults: [],
  notifications: [],
  notifOpen: false,
  collapsed: false,
  railOpen: false,
  profileData: null,
};

export function saveModelPrefs() {
  localStorage.setItem("nebula_model", state.model);
  localStorage.setItem("nebula_custom_model", JSON.stringify(state.customModel));
  localStorage.setItem("nebula_level", state.level);
}

export { api, Session, streamGenerate, streamRegenerate, ApiError, lessonHtml };
