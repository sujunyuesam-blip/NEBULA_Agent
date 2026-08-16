// pages/profile.js - 个人主页：画像/头像/简介/联系方式/每日抽签/成就/错题本/排行榜
// 支持他人主页视图（#/user/:id）

import { api, t, esc, $, toast, navigate, state, isAdmin } from "../core.js";
import { icon } from "../ui/icons.js";

const PRESET = ["🧑‍🚀", "👩‍🚀", "🧑‍🎓", "👨‍🎓", "🧑‍💻", "👩‍💻", "🧑‍🔬", "👩‍🔬", "🧑‍🏫", "👩‍🏫", "🧑‍💼", "👩‍💼", "🧑‍🎨", "👩‍🎨", "🧑‍⚕️", "👩‍⚕️", "🧑‍🍳", "👨‍🍳", "🦊", "🐱", "🐼", "🐧", "🦉", "🐳", "🦄", "🦋", "🌟", "🍀", "🌙", "⚡"];

const stateP = {
  data: null,
  likedMe: false,
  wrong: [],
  leaderboard: [],
  lbKind: "xp",
  editing: false,
  viewUserId: null,
  isOwn: true,
};

export function profileHtml() {
  const d = stateP.data;
  if (!d) return `<div class="profile-page"><div style="text-align:center;color:var(--text-2);padding:60px">…</div></div>`;
  const u = d.user || {};
  const own = stateP.isOwn;
  return `
  <div class="profile-page">
    <div class="profile-hero glass">
      <div class="profile-avatar ${own ? "avatar-editable" : ""}" data-action="avatar-upload" title="${own ? esc(t("avatarHint")) : ""}">
        ${u.avatar ? `<img src="${esc(u.avatar)}" alt="avatar" />` : `<span>🧑‍🚀</span>`}
        ${own ? `<div class="avatar-edit-overlay">📷</div>` : ""}
      </div>
      <div class="profile-info">
        <h1>${esc(u.name || "· · ·")} ${u.role === "admin" ? '<span class="badge" style="background:rgba(255,159,10,.2);color:var(--warning)">ADMIN</span>' : ""}</h1>
        <div class="profile-meta">
          ${u.school ? `<span>🏫 ${esc(u.school)}</span>` : ""}
          <span>📧 ${esc(u.contactEmail || u.email || "")}</span>
        </div>
        ${u.bio ? `<p class="profile-bio">${esc(u.bio)}</p>` : ""}
        ${u.fields ? `<div class="field-tags">${u.fields.split(/[,，]/).filter(Boolean).slice(0, 6).map((f) => `<span class="badge">${esc(f.trim())}</span>`).join("")}</div>` : ""}
        <div class="profile-contact">
          ${u.wechat ? `<span>💬 ${esc(u.wechat)}</span>` : ""}
          ${u.phone ? `<span>📱 ${esc(u.phone)}</span>` : ""}
        </div>
      </div>
      <div class="profile-actions">
        ${own ? "" : `<button class="btn btn-sm ${stateP.likedMe ? "liked" : ""}" data-action="like-profile">${stateP.likedMe ? "👍" : "🤍"} ${esc(t("likeProfile"))} · ${d.user?.likes || 0}</button>`}
        ${own ? `<button class="btn btn-sm" data-action="edit-profile">${icon("settings", 14)} ${esc(t("editProfile"))}</button>` : ""}
        ${own && isAdmin() ? `<button class="btn btn-sm" data-action="goto-admin">🛡️ ${esc(t("navAdmin"))}</button>` : ""}
        <button class="btn btn-sm" data-action="goto-community">🌍 ${esc(t("navCommunity"))}</button>
      </div>
    </div>

    ${own ? editFormHtml() : ""}
    ${fortuneHtml()}

    <div class="profile-grid">
      <div class="glass stat-card"><div class="stat-num">${d.stats?.courses || 0}</div><div class="stat-label">${esc(t("myCourses"))}</div></div>
      <div class="glass stat-card"><div class="stat-num">${d.stats?.posts || 0}</div><div class="stat-label">${esc(t("myPosts"))}</div></div>
      <div class="glass stat-card"><div class="stat-num">${d.stats?.likesReceived || 0}</div><div class="stat-label">${esc(t("leaderboardLikes"))}</div></div>
      <div class="glass stat-card"><div class="stat-num">${d.xp || 0}</div><div class="stat-label">${esc(t("xpLabel"))}</div></div>
      <div class="glass stat-card"><div class="stat-num">🔥 ${d.streak || 0}</div><div class="stat-label">${esc(t("streakLabel"))}</div></div>
    </div>

    <div class="glass" style="padding:16px">
      <h3 style="font-size:14px;font-weight:800;margin-bottom:10px;display:flex;align-items:center;gap:8px">${icon("medal", 16)} ${esc(t("achievementsTitle"))}</h3>
      <div class="badge-wall">
        ${(d.achievements || []).map((a) => `
          <div class="badge-chip ${a.done ? "lit" : ""}" style="${a.done ? "" : "opacity:.4;filter:grayscale(.6)"}" title="${esc(a.desc)}">
            ${a.icon} ${esc(a.title)}
          </div>`).join("")}
      </div>
    </div>

    ${own && (stateP.data?.recentPosts || []).length ? `
    <div class="glass" style="padding:16px">
      <h3 style="font-size:14px;font-weight:800;margin-bottom:10px">📣 ${esc(t("myPosts"))}</h3>
      ${stateP.data.recentPosts.map((p) => `
        <div class="wrong-item" style="border-left-color:${p.status === "approved" ? "var(--success)" : p.status === "pending" ? "var(--warning)" : "var(--danger)"}">
          <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <b style="font-size:13px">${esc(p.title)}</b>
            <span class="badge ${p.status === "approved" ? "ok" : p.status === "pending" ? "warn" : "err"}">${esc(t(p.status + "Status") || p.status)}</span>
          </div>
          ${p.rejectReason ? `<div style="font-size:12px;color:var(--danger);margin-top:4px">${esc(t("rejectReasonLabel"))}：${esc(p.rejectReason)}</div>` : ""}
        </div>`).join("")}
    </div>` : ""}
    ${own ? wrongBookHtml() : ""}
    ${own ? leaderboardHtml() : ""}
  </div>`;
}

function editFormHtml() {
  if (!stateP.editing) return "";
  const u = stateP.data?.user || {};
  return `
  <div class="glass" style="padding:18px">
    <h3 style="font-size:14px;font-weight:800;margin-bottom:12px">✏️ ${esc(t("editProfile"))}</h3>
    <div style="display:flex;flex-direction:column;gap:10px">
      <label class="field-label">${esc(t("nameLabel"))}</label>
      <input class="input" id="ep-name" value="${esc(u.name || "")}" placeholder="${esc(t("nameLabel"))}" />
      <label class="field-label">${esc(t("emojiLabel"))}</label>
      <div class="emoji-picker">
        ${PRESET.map((e) => `<button type="button" class="emoji-opt ${u.emoji === e ? "active" : ""}" data-emoji="${e}">${e}</button>`).join("")}
      </div>
      <input class="input" id="ep-emoji" placeholder="${esc(t("emojiCustom"))}" value="${esc(u.emoji || "")}" maxlength="8" />
      <label class="field-label">${esc(t("schoolLabel"))}</label>
      <div class="school-wrap" style="position:relative">
        <input class="input" id="ep-school" value="${esc(u.school || "")}" placeholder="${esc(t("schoolLabel"))}" autocomplete="off" />
        <div class="school-drop hidden" id="ep-school-drop"></div>
      </div>
      <button type="button" class="btn btn-ghost btn-sm" id="ep-school-req-btn" style="width:100%">＋ ${esc(t("schoolNotFound"))}</button>
      <div class="school-request hidden" id="ep-school-req" style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
        <input class="input" id="epsr-name" placeholder="${esc(t("schoolFullName"))}" />
        <input class="input" id="epsr-region" placeholder="${esc(t("schoolRegion"))}" />
        <select class="select" id="epsr-kind">
          <option value="university">${esc(t("schoolUniversity"))}</option>
          <option value="high">${esc(t("schoolHigh"))}</option>
          <option value="middle">${esc(t("schoolMiddle"))}</option>
        </select>
        <button type="button" class="btn btn-sm btn-primary" id="epsr-submit">${esc(t("schoolSubmit"))}</button>
        <div id="epsr-result" style="font-size:12px;min-height:14px"></div>
      </div>
      <label class="field-label">${esc(t("bioLabel"))}</label>
      <textarea class="textarea" id="ep-bio" rows="2" placeholder="${esc(t("bioPlaceholder"))}">${esc(u.bio || "")}</textarea>
      <label class="field-label">${esc(t("fieldsLabel"))}</label>
      <input class="input" id="ep-fields" placeholder="${esc(t("fieldsPlaceholder"))}" value="${esc(u.fields || "")}" />
      <div class="field-row3">
        <div class="field"><label class="field-label">💬 ${esc(t("wechatLabel"))}</label><input class="input" id="ep-wechat" value="${esc(u.wechat || "")}" /></div>
        <div class="field"><label class="field-label">📱 ${esc(t("phoneLabel"))}</label><input class="input" id="ep-phone" value="${esc(u.phone || "")}" /></div>
        <div class="field"><label class="field-label">📧 ${esc(t("emailLabel"))}</label><input class="input" id="ep-email" value="${esc(u.contactEmail || "")}" /></div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-primary" data-action="save-profile">${esc(t("saveClose"))}</button>
        <button class="btn btn-ghost" data-action="cancel-edit-profile">${esc(t("closeBtn"))}</button>
      </div>
    </div>
  </div>`;
}

function fortuneHtml() {
  const f = stateP.fortune;
  if (!f) return `<div class="glass" style="padding:16px;text-align:center"><button class="btn btn-sm btn-primary" data-action="draw-fortune">${icon("sparkles", 15)} ${esc(t("drawFortune"))}</button></div>`;
  const color = { 大吉: "rgba(251,191,36,.35)", 吉: "rgba(52,211,153,.3)", 中吉: "rgba(79,140,255,.3)", 小吉: "rgba(139,92,246,.3)", 平: "rgba(169,169,196,.25)" }[f.level] || "var(--glass-border)";
  return `
  <div class="glass fortune-card" style="border-color:${color}">
    <div class="fortune-head">
      <span class="fortune-level" style="background:${color}">${f.emoji} ${esc(f.level)}</span>
      <span class="fortune-score">⚡ ${f.score}</span>
    </div>
    <div class="fortune-body">
      <div class="fortune-line"><b>宜</b><span>${esc(f.yi)}</span></div>
      ${f.yiBasis ? `<div class="fortune-basis">依据：${esc(f.yiBasis)}</div>` : ""}
      <div class="fortune-line"><b>忌</b><span>${esc(f.ji)}</span></div>
      ${f.jiBasis ? `<div class="fortune-basis">依据：${esc(f.jiBasis)}</div>` : ""}
      <p class="fortune-advice">${esc(f.advice)}</p>
    </div>
    <div class="fortune-foot">
      <span style="font-size:11px;color:var(--text-2)">${esc(f.day)} · ${esc(t("fortuneDaily"))} · ${esc(t("fortuneOnce"))}</span>
    </div>
    <div class="fortune-note">${esc(f.note || "")}</div>
  </div>`;
}

function wrongBookHtml() {
  return `
  <div class="glass" style="padding:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <h3 style="font-size:14px;font-weight:800;display:flex;align-items:center;gap:8px">${icon("book", 16)} ${esc(t("wrongBookTitle"))} (${stateP.wrong.length})</h3>
      <div style="display:flex;gap:8px">
        ${stateP.wrong.length ? `<button class="btn btn-sm btn-primary" data-action="wrong-review">${esc(t("wrongReviewBtn"))}</button>` : ""}
        ${stateP.wrong.length ? `<button class="btn btn-sm btn-ghost" data-action="wrong-clear">${esc(t("wrongClear"))}</button>` : ""}
      </div>
    </div>
    <div class="wrong-list">
      ${stateP.wrong.length
        ? stateP.wrong.slice(0, 8).map((w) => `
          <div class="wrong-item">
            <div class="wrong-q">${esc(w.question)}</div>
            <div class="wrong-a">✅ ${esc(w.answer || "—")}</div>
          </div>`).join("")
        : `<div style="font-size:12.5px;color:var(--text-2);text-align:center;padding:12px">${esc(t("wrongEmpty"))}</div>`}
    </div>
  </div>`;
}

function leaderboardHtml() {
  return `
  <div class="glass" style="padding:16px">
    <div style="display:flex;gap:6px;margin-bottom:10px">
      ${[["xp", "leaderboardXp"], ["posts", "leaderboardPosts"], ["likes", "leaderboardLikes"]].map(([v, k]) => `
        <button class="mission-tab ${stateP.lbKind === v ? "active" : ""}" data-action="lb-kind" data-value="${v}" style="padding:8px">${esc(t(k))}</button>`).join("")}
    </div>
    <div class="lb-list">
      ${(stateP.leaderboard || []).slice(0, 10).map((r) => `
        <div class="lb-row">
          <span class="lb-rank">${r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</span>
          <span class="lb-name">${esc(r.name)}${r.school ? ` <small>· ${esc(r.school)}</small>` : ""}</span>
          <span class="lb-score">${r.score}</span>
        </div>`).join("")}
    </div>
  </div>`;
}

export async function bindProfile() {
  stateP.viewUserId = null;
  stateP.isOwn = true;
  await loadOwnProfile();
}

export async function bindUserProfile(userId) {
  stateP.viewUserId = userId;
  stateP.isOwn = false;
  try {
    const d = await api.profileOf(userId);
    d.user = d.user || {};
    stateP.data = d;
  } catch (e) {
    toast(e.message, "err");
    navigate("#/profile");
    return;
  }
  rerenderProfile();
}

const PROFILE_CACHE_KEY = "nebula_profile_cache";

async function loadOwnProfile() {
  // 秒开：先显示 60 秒内的缓存数据
  try {
    const cached = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || "null");
    if (cached && Date.now() - (cached._t || 0) < 60000) {
      stateP.data = cached;
      rerenderProfile();
    }
  } catch {}
  if (!stateP.data) rerenderProfile(); // 无缓存则显示骨架
  // 4 个请求并行，后台刷新
  const [d, w, f, lb] = await Promise.all([
    api.profile().catch(() => null),
    api.wrongBook().catch(() => null),
    api.fortune().catch(() => null),
    api.leaderboard(stateP.lbKind).catch(() => null),
  ]);
  if (d) {
    d._t = Date.now();
    try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(d)); } catch {}
    stateP.data = d;
    if (d.checkinXp > 0) toast(`${t("checkinToast")} +${d.checkinXp} ${t("xpWord")} ✨`);
  }
  if (w) stateP.wrong = w.items || [];
  if (f) stateP.fortune = f;
  if (lb) stateP.leaderboard = lb.items || [];
  rerenderProfile();
}

async function loadLeaderboard() {
  try {
    const res = await api.leaderboard(stateP.lbKind);
    stateP.leaderboard = res.items || [];
  } catch {}
}

function rerenderProfile() {
  const view = $("#page-view");
  if (view) view.innerHTML = profileHtml();
  bindProfileSchoolSearch();
}

// 学校搜索下拉 + 申请（与注册页一致）
let profileSchoolCache = [];
let profileSchoolLoaded = false;

function bindProfileSchoolSearch() {
  const input = $("#ep-school");
  const drop = $("#ep-school-drop");
  if (!input || !drop) return;
  const ensureLoaded = async () => {
    if (profileSchoolLoaded) return;
    try {
      const res = await api.schools("", "");
      profileSchoolCache = res.items || [];
      profileSchoolLoaded = true;
    } catch {}
  };
  const render = () => {
    const q = input.value.trim();
    const matches = (q ? profileSchoolCache.filter((sc) => sc.name.includes(q) || sc.region.includes(q)) : profileSchoolCache).slice(0, 12);
    if (!matches.length) { drop.classList.add("hidden"); return; }
    drop.innerHTML = matches.map((sc) => `
      <div class="school-opt" data-name="${sc.name.replace(/"/g, "&quot;")}">
        <b>${esc(sc.name)}</b><span>${esc(sc.region || "")}</span>
      </div>`).join("");
    drop.classList.remove("hidden");
  };
  input.addEventListener("input", () => { ensureLoaded().then(render); });
  input.addEventListener("focus", () => { ensureLoaded().then(render); });
  drop.addEventListener("click", (e) => {
    const opt = e.target.closest(".school-opt");
    if (opt) {
      input.value = opt.dataset.name;
      drop.classList.add("hidden");
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".school-wrap")) drop.classList.add("hidden");
  });
  // 申请学校
  $("#ep-school-req-btn")?.addEventListener("click", () => {
    $("#ep-school-req")?.classList.toggle("hidden");
  });
  $("#epsr-submit")?.addEventListener("click", async () => {
    const name = $("#epsr-name")?.value.trim();
    const region = $("#epsr-region")?.value.trim();
    const kind = $("#epsr-kind")?.value || "university";
    const result = $("#epsr-result");
    if (!name || !region) {
      if (result) { result.style.color = "var(--danger)"; result.textContent = t("schoolNeed"); }
      return;
    }
    try {
      const res = await api.requestSchool({ name, region, kind });
      if (result) { result.style.color = "var(--success)"; result.textContent = res.message || "OK"; }
      profileSchoolLoaded = false;
    } catch (err) {
      if (result) { result.style.color = "var(--danger)"; result.textContent = err.message; }
    }
  });
}

document.addEventListener("click", async (e) => {
  const emojiBtn = e.target.closest(".emoji-opt");
  if (emojiBtn) {
    document.querySelectorAll(".emoji-opt").forEach((b) => b.classList.toggle("active", b === emojiBtn));
    const input = document.querySelector("#ep-emoji");
    if (input) input.value = emojiBtn.dataset.emoji || "";
    return;
  }
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  switch (action) {
    case "goto-admin": navigate("#/admin"); break;
    case "goto-community": navigate("#/community"); break;
    case "lb-kind": stateP.lbKind = el.dataset.value; await loadLeaderboard(); rerenderProfile(); break;
    case "wrong-clear": {
      try { await api.clearWrongBook(); stateP.wrong = []; rerenderProfile(); } catch (err) { toast(err.message, "err"); }
      break;
    }
    case "wrong-review": await wrongReview(); break;
    case "edit-profile": stateP.editing = true; rerenderProfile(); break;
    case "cancel-edit-profile": stateP.editing = false; rerenderProfile(); break;
    case "save-profile": await saveProfile(); break;
    case "avatar-upload": if (stateP.isOwn) triggerAvatarUpload(); break;
    case "draw-fortune": await drawFortune(); break;
    case "like-profile": await likeProfile(); break;

  }
});

async function saveProfile() {
  try {
    const emojiPicked = document.querySelector(".emoji-opt.active")?.dataset.emoji || "";
    await api.updateProfile({
      name: $("#ep-name")?.value.trim() || "",
      school: $("#ep-school")?.value.trim() || "",
      emoji: $("#ep-emoji")?.value.trim() || emojiPicked,
      bio: $("#ep-bio")?.value.trim() || "",
      fields: $("#ep-fields")?.value.trim() || "",
      wechat: $("#ep-wechat")?.value.trim() || "",
      phone: $("#ep-phone")?.value.trim() || "",
      contactEmail: $("#ep-email")?.value.trim() || "",
    });
    stateP.editing = false;
    await loadOwnProfile();
    toast("OK");
  } catch (e) {
    toast(e.message, "err");
  }
}

function triggerAvatarUpload() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file, 256, 0.85);
      await api.updateProfile({ avatar: dataUrl });
      await loadOwnProfile();
      toast("头像已更新 ✓");
    } catch (err) {
      toast(err.message, "err");
    }
  };
  input.click();
}

function compressImage(file, size, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, size / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("图片加载失败")); };
    img.src = url;
  });
}

async function drawFortune(redraw = false) {
  try {
    stateP.fortune = redraw ? await api.redrawFortune() : await api.fortune();
    rerenderProfile();
  } catch (e) {
    toast(e.message, "err");
  }
}

async function likeProfile() {
  const uid = stateP.viewUserId;
  if (!uid) return;
  try {
    const res = await api.likeProfile(uid);
    stateP.likedMe = res.liked;
    if (stateP.data?.user) stateP.data.user.likes = Math.max(0, (stateP.data.user.likes || 0) + (res.liked ? 1 : -1));
    rerenderProfile();
  } catch (e) {
    toast(e.message, "err");
  }
}

async function wrongReview() {
  if (!stateP.wrong.length) return;
  state.wrongItems = stateP.wrong.slice(0, 10).map((w) => ({ question: w.question, answer: w.answer }));
  toast(t("wrongGenerating"));
  navigate("#/workbench");
}
