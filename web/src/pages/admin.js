// pages/admin.js - 内容管理后台：AI 拒绝内容的人工复核队列 + 帖子管理

import { api, t, esc, $, toast, navigate, lessonHtml } from "../core.js";
import { icon } from "../ui/icons.js";

const stateA = {
  queue: [],
  posts: [],
  schools: [],
  tickets: [],
  users: [],
  tab: "moderation",
  previewId: null,
};

export function adminHtml() {
  return `
  <div class="admin-page">
    <div class="community-head">
      <div>
        <h1>🛡️ ${esc(t("adminTitle"))}</h1>
        <p>${esc(t("aiReviewLabel"))} · ${esc(t("adminModerationTab"))}</p>
      </div>
    </div>
    <div class="glass mission-tabs" style="max-width:640px;margin-bottom:14px">
      <button class="mission-tab ${stateA.tab === "moderation" ? "active" : ""}" data-action="admin-tab" data-value="moderation">${esc(t("adminModerationTab"))}</button>
      <button class="mission-tab ${stateA.tab === "posts" ? "active" : ""}" data-action="admin-tab" data-value="posts">${esc(t("adminPostsTab"))}</button>
      <button class="mission-tab ${stateA.tab === "schools" ? "active" : ""}" data-action="admin-tab" data-value="schools">${icon("school", 14)} ${esc(t("adminSchoolsTab"))}</button>
      <button class="mission-tab ${stateA.tab === "tickets" ? "active" : ""}" data-action="admin-tab" data-value="tickets">${icon("contact", 14)} ${esc(t("adminTicketsTab"))}</button>
      <button class="mission-tab ${stateA.tab === "users" ? "active" : ""}" data-action="admin-tab" data-value="users">${icon("profile", 14)} ${esc(t("adminUsersTab"))}</button>
    </div>
    <div id="admin-body">
      ${stateA.tab === "moderation" ? moderationHtml() : stateA.tab === "posts" ? postsHtml() : stateA.tab === "schools" ? schoolsHtml() : stateA.tab === "tickets" ? ticketsHtml() : usersHtml()}
    </div>
  </div>`;
}

function moderationHtml() {
  if (stateA.queue.length === 0) {
    return `<div class="glass" style="padding:30px;text-align:center;color:var(--text-2)">✅ ${esc(t("adminQueueEmpty"))}</div>`;
  }
  return stateA.queue.map((item) => {
    if (item.type === "comment") {
      return `
    <div class="glass mod-card" style="border-left:3px solid var(--warning)">
      <div class="mod-head">
        <div>
          <b>💬 ${esc(t("adminCommentTitle"))}</b>
          <div class="post-meta" style="margin-top:4px">
            <span class="badge">${esc(item.authorName)}</span>
            <span class="badge">📄 ${esc(item.postTitle)}</span>
            <span class="badge">${new Date(item.createdAt * 1000).toLocaleString()}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-primary" data-action="mod-approve" data-id="${esc(item.id)}" data-type="comment">${esc(t("approveBtn"))}</button>
          <button class="btn btn-sm" style="color:var(--danger);border-color:rgba(255,69,58,.4)" data-action="mod-reject" data-id="${esc(item.id)}" data-type="comment">${esc(t("rejectBtn"))}</button>
        </div>
      </div>
      <div class="mod-reason">
        <b>🤖 ${esc(t("aiReasonLabel"))}：</b>${esc(item.review?.reason || "—")}
      </div>
      <div class="mod-desc" style="white-space:pre-wrap">${esc(item.content || "")}</div>
    </div>`;
    }
    return `
    <div class="glass mod-card">
      <div class="mod-head">
        <div>
          <b>${esc(item.title)}</b>
          <div class="post-meta" style="margin-top:4px">
            <span class="badge">${esc(item.topic || "")}</span>
            <span class="badge">${esc(item.authorName)}</span>
            <span class="badge">${new Date(item.createdAt * 1000).toLocaleString()}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-primary" data-action="mod-approve" data-id="${esc(item.id)}" data-type="post">${esc(t("approveBtn"))}</button>
          <button class="btn btn-sm" style="color:var(--danger);border-color:rgba(255,69,58,.4)" data-action="mod-reject" data-id="${esc(item.id)}" data-type="post">${esc(t("rejectBtn"))}</button>
        </div>
      </div>
      <div class="mod-reason">
        <b>🤖 ${esc(t("aiReasonLabel"))}：</b>${esc(item.review?.reason || "—")}
        ${item.review?.risk ? `<span class="badge warn">${esc(item.review.risk)}</span>` : ""}
      </div>
      <div class="mod-desc">${esc(item.description || "")}</div>
      <button class="btn btn-ghost btn-sm" data-action="mod-preview" data-id="${esc(item.id)}" data-course="${esc(item.courseId)}">👁 ${esc(t("viewCourse")) || "预览"}</button>
      ${stateA.previewId === item.id ? `<div class="mod-preview"><iframe id="mod-frame" sandbox="allow-scripts allow-same-origin" title="preview"></iframe></div>` : ""}
    </div>`;
  }).join("");
}

function postsHtml() {
  if (stateA.posts.length === 0) {
    return `<div class="glass" style="padding:30px;text-align:center;color:var(--text-2)">${esc(t("adminPostsEmpty"))}</div>`;
  }
  return stateA.posts.map((p) => `
    <div class="glass mod-card">
      <div class="mod-head">
        <div>
          <b>${esc(p.title)}</b>
          <div class="post-meta" style="margin-top:4px">
            <span class="badge ${p.status === "approved" ? "ok" : p.status === "pending" ? "warn" : "err"}">${esc(t(p.status + "Status") || p.status)}</span>
            <span class="badge">${esc(p.authorName)}</span>
            <span class="badge">❤️ ${p.likes}</span>
          </div>
        </div>
        <button class="btn btn-sm" style="color:var(--danger)" data-action="admin-delete" data-id="${esc(p.id)}">${esc(t("deleteBtn"))}</button>
      </div>
    </div>`).join("");
}

function schoolsHtml() {
  if (stateA.schools.length === 0) {
    return `<div class="glass" style="padding:30px;text-align:center;color:var(--text-2)">✅ ${esc(t("adminQueueEmpty"))}</div>`;
  }
  return stateA.schools.map((sc) => `
    <div class="glass mod-card">
      <div class="mod-head">
        <div>
          <b>${esc(sc.name)}</b>
          <div class="post-meta" style="margin-top:4px">
            <span class="badge">${esc(sc.region || "—")}</span>
            <span class="badge">${sc.kind === "middle" ? esc(t("schoolMiddle")) : esc(t("schoolHigh"))}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-primary" data-action="school-approve" data-id="${sc.id}">${esc(t("approveBtn"))}</button>
          <button class="btn btn-sm" style="color:var(--danger)" data-action="school-reject" data-id="${sc.id}">${esc(t("rejectBtn"))}</button>
        </div>
      </div>
    </div>`).join("");
}

function ticketsHtml() {
  if (stateA.tickets.length === 0) {
    return `<div class="glass" style="padding:30px;text-align:center;color:var(--text-2)">✅ ${esc(t("adminQueueEmpty"))}</div>`;
  }
  return stateA.tickets.map((tk) => `
    <div class="glass mod-card">
      <div class="mod-head">
        <div>
          <b>${esc(tk.subject)}</b>
          <div class="post-meta" style="margin-top:4px">
            <span class="badge ${tk.status === "open" ? "warn" : "ok"}">${tk.status === "open" ? "OPEN" : tk.status.toUpperCase()}</span>
            <span class="badge">${esc(tk.name)}</span>
            <span class="badge">${esc(tk.email)}</span>
            <span class="badge">${new Date(tk.createdAt * 1000).toLocaleString()}</span>
          </div>
        </div>
        <button class="btn btn-sm btn-primary" data-action="ticket-replied" data-id="${tk.id}" ${tk.status === "replied" ? "disabled" : ""}>${icon("contact", 14)} ${esc(t("ticketReplied"))}</button>
      </div>
      <div class="mod-desc" style="white-space:pre-wrap">${esc(tk.content)}</div>
    </div>`).join("");
}

function usersHtml() {
  return `
  <div class="glass" style="padding:14px;margin-bottom:12px;display:flex;gap:8px">
    <input class="input" id="admin-user-search" placeholder="${esc(t("searchUserPlaceholder"))}" />
    <button class="btn btn-sm btn-primary" data-action="admin-search-users">${icon("search", 14)}</button>
  </div>
  ${stateA.users.length === 0 ? `<div class="glass" style="padding:30px;text-align:center;color:var(--text-2)">${esc(t("adminUsersEmpty"))}</div>` :
    stateA.users.map((u) => `
    <div class="glass mod-card">
      <div class="mod-head">
        <div>
          <b>${esc(u.emoji || "🧑‍🚀")} ${esc(u.name)} ${u.role === "admin" ? '<span class="badge" style="background:rgba(255,159,10,.2);color:var(--warning)">ADMIN</span>' : ""}</b>
          <div class="post-meta" style="margin-top:4px">
            <span class="badge">${esc(u.email)}</span>
            ${u.school ? `<span class="badge">🏫 ${esc(u.school)}</span>` : ""}
            <span class="badge">📚 ${u.courses} 课</span>
            <span class="badge">📣 ${u.posts} 帖</span>
            <span class="badge">👍 ${u.likes} 赞</span>
            <span class="badge">${new Date(u.createdAt * 1000).toLocaleDateString()} 注册</span>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm" data-action="admin-view-user" data-id="${esc(u.id)}">👁 ${esc(t("viewProfile"))}</button>
          ${u.role !== "admin" && u.id !== "nebula-user" ? `<button class="btn btn-sm" style="color:var(--danger);border-color:rgba(251,113,133,.4)" data-action="admin-delete-user" data-id="${esc(u.id)}" data-name="${esc(u.name)}">🗑 ${esc(t("deleteUserBtn"))}</button>` : ""}
        </div>
      </div>
    </div>`).join("")}
  `;
}

export async function bindAdmin() {
  await Promise.all([loadQueue(), loadPosts(), loadSchools(), loadTickets()]);
  rerenderAdmin();
}

async function loadUsers(q = "") {
  try {
    const res = await api.adminUsers(q);
    stateA.users = res.items || [];
    rerenderAdmin();
  } catch (e) {
    toast(e.message, "err");
  }
}

async function loadQueue() {
  try {
    const res = await api.moderationQueue();
    stateA.queue = res.items || [];
  } catch {}
}

async function loadPosts() {
  try {
    const res = await api.adminPosts();
    stateA.posts = res.items || [];
  } catch {}
}

async function loadSchools() {
  try {
    const res = await api.adminSchools();
    stateA.schools = res.items || [];
  } catch {}
}

async function loadTickets() {
  try {
    const res = await api.adminTickets();
    stateA.tickets = res.items || [];
  } catch {}
}

function rerenderAdmin() {
  const view = $("#page-view");
  if (view) view.innerHTML = adminHtml();
  const frame = $("#mod-frame");
  if (frame && stateA.previewId) {
    const item = stateA.queue.find((q) => q.id === stateA.previewId);
    if (item) api.share(item.courseId).then((d) => { if (d.course) frame.srcdoc = lessonHtml(d.course); }).catch(() => {});
  }
}

document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  switch (action) {
    case "admin-tab":
      stateA.tab = el.dataset.value;
      rerenderAdmin();
      if (el.dataset.value === "users" && stateA.users.length === 0) loadUsers();
      break;
    case "mod-approve": await moderate(el.dataset.id, "approve", "", el.dataset.type || "post"); break;
    case "mod-reject": promptReject(el.dataset.id, el.dataset.type || "post"); break;
    case "mod-preview": stateA.previewId = stateA.previewId === el.dataset.id ? null : el.dataset.id; rerenderAdmin(); break;
    case "admin-delete": {
      try { await api.adminDeletePost(el.dataset.id); toast("OK"); await loadPosts(); rerenderAdmin(); } catch (err) { toast(err.message, "err"); }
      break;
    }
    case "school-approve": await schoolAction(el.dataset.id, "approve"); break;
    case "school-reject": promptReject(el.dataset.id, "school"); break;
    case "admin-view-user": navigate(`#/user/${el.dataset.id}`); break;
    case "admin-delete-user": confirmDeleteUser(el.dataset.id, el.dataset.name); break;
    case "admin-search-users": {
      const q = document.getElementById("admin-user-search")?.value.trim() || "";
      await loadUsers(q);
      break;
    }
    case "ticket-replied": {
      try { await api.adminTicketAction(el.dataset.id, "replied"); await loadTickets(); rerenderAdmin(); } catch (err) { toast(err.message, "err"); }
      break;
    }
  }
});

async function schoolAction(id, action, reason) {
  try {
    await api.adminSchoolAction(id, action, reason);
    await loadSchools();
    rerenderAdmin();
  } catch (e) {
    toast(e.message, "err");
  }
}

async function moderate(id, action, reason, type = "post") {
  try {
    if (type === "comment") await api.moderateComment(id, action, reason);
    else await api.moderatePost(id, action, reason);
    await loadQueue();
    await loadPosts();
    rerenderAdmin();
  } catch (e) {
    toast(e.message, "err");
  }
}

// 驳回弹窗：必须填写理由
function promptReject(id, kind) {
  const old = document.getElementById("reject-modal");
  if (old) old.remove();
  const modal = document.createElement("div");
  modal.id = "reject-modal";
  modal.className = "modal-backdrop2";
  modal.innerHTML = `
    <div class="publish-card glass">
      <h3>${esc(t("rejectReasonTitle"))}</h3>
      <p style="font-size:12.5px;color:var(--text-2)">${esc(t("rejectReasonHint"))}</p>
      <textarea class="textarea" id="reject-reason" rows="3" placeholder="${esc(t("rejectReasonPlaceholder"))}"></textarea>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="btn" style="color:var(--danger);border-color:rgba(251,113,133,.4)" data-action="confirm-reject" data-id="${esc(id)}" data-kind="${kind}">${esc(t("rejectBtn"))}</button>
        <button class="btn" data-action="cancel-reject">${esc(t("closeBtn"))}</button>
      </div>
      <div class="login-error" id="reject-error"></div>
    </div>`;
  document.body.appendChild(modal);
}

// 删除用户确认弹窗
function confirmDeleteUser(id, name) {
  const old = document.getElementById("deluser-modal");
  if (old) old.remove();
  const modal = document.createElement("div");
  modal.id = "deluser-modal";
  modal.className = "modal-backdrop2";
  modal.innerHTML = `
    <div class="publish-card glass">
      <h3>⚠️ ${esc(t("deleteUserTitle"))}</h3>
      <p style="font-size:12.5px;color:var(--text-2)">${esc(t("deleteUserConfirm"))}：<b>${esc(name)}</b></p>
      <p style="font-size:12px;color:var(--danger)">${esc(t("deleteUserWarn"))}</p>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="btn" style="color:var(--danger);border-color:rgba(251,113,133,.4)" data-action="confirm-delete-user" data-id="${esc(id)}">🗑 ${esc(t("deleteUserBtn"))}</button>
        <button class="btn" data-action="cancel-delete-user">${esc(t("closeBtn"))}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function deleteUserAction(id) {
  try {
    await api.adminDeleteUser(id);
    toast(t("deleteUserDone"));
    await loadUsers();
    rerenderAdmin();
  } catch (e) {
    toast(e.message, "err");
  }
}

document.addEventListener("click", async (e) => {
  const cancel = e.target.closest('[data-action="cancel-reject"]');
  if (cancel) { document.getElementById("reject-modal")?.remove(); return; }
  const cancelDel = e.target.closest('[data-action="cancel-delete-user"]');
  if (cancelDel) { document.getElementById("deluser-modal")?.remove(); return; }
  const confirmDel = e.target.closest('[data-action="confirm-delete-user"]');
  if (confirmDel) {
    document.getElementById("deluser-modal")?.remove();
    await deleteUserAction(confirmDel.dataset.id);
  }
  const confirm = e.target.closest('[data-action="confirm-reject"]');
  if (confirm) {
    const reason = document.getElementById("reject-reason")?.value.trim();
    const err = document.getElementById("reject-error");
    if (!reason || reason.length < 4) {
      if (err) err.textContent = t("rejectReasonRequired");
      return;
    }
    document.getElementById("reject-modal")?.remove();
    if (confirm.dataset.kind === "post") await moderate(confirm.dataset.id, "reject", reason, "post");
    else if (confirm.dataset.kind === "comment") await moderate(confirm.dataset.id, "reject", reason, "comment");
    else await schoolAction(confirm.dataset.id, "reject", reason);
  }
});
