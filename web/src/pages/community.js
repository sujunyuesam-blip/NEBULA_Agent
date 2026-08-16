// pages/community.js - 学习社区：列表（搜索/排序）+ 详情（试玩/点赞/评论/克隆）+ 发布

import { api, t, esc, $, toast, navigate, state, lessonHtml } from "../core.js";
import { icon } from "../ui/icons.js";

const stateC = {
  posts: [],
  myId: "",
  sort: "hot",
  sort: "hot",
  page: 0,
  q: "",
  detail: null,
  publishOpen: false,
  myCourses: [],
};

function postCard(p) {
  return `
  <div class="post-card glass">
    <div class="post-head" data-action="open-post" data-id="${esc(p.id)}">
      <div class="post-title">${esc(p.title)}</div>
      <div class="post-meta">
        <span class="badge">${esc(p.difficulty)}</span>
        <span class="badge">${esc(p.domain || p.topic || "—")}</span>
        ${p.originAuthor ? `<span class="badge warn" title="${esc(t("repostFrom"))}">📎 ${esc(p.originAuthor)}</span>` : ""}
      </div>
      <div class="post-desc">${esc(p.description || "")}</div>
    </div>
    <div class="post-foot">
      <span class="post-author" style="cursor:pointer" data-action="open-user" data-id="${esc(p.author?.id || "")}">🧑‍🚀 ${esc(p.author?.name || "匿名")}${p.author?.school ? ` · ${esc(p.author.school)}` : ""}</span>
      <span class="post-actions">
        <button class="btn btn-ghost btn-sm like-heart ${p.likedByMe ? "liked" : ""}" data-action="like-post" data-id="${esc(p.id)}">
          ${p.likedByMe ? "❤️" : "🤍"} ${p.likes}
        </button>
        <button class="btn btn-ghost btn-sm" data-action="open-post" data-id="${esc(p.id)}">💬 ${esc(t("commentsTitle"))}</button>
      </span>
    </div>
  </div>`;
}

export function communityListHtml() {
  return `
  <div class="community-page">
    <div class="community-head">
      <div>
        <h1 style="display:flex;align-items:center;gap:10px">${icon("community", 22)} ${esc(t("communityTitle"))}</h1>
        <p>${esc(t("communitySub"))}</p>
      </div>
      <button class="btn btn-primary" data-action="open-publish">${icon("send", 15)} ${esc(t("communityPostBtn"))}</button>
    </div>
    <div class="community-tools">
      <input class="input" id="community-search" placeholder="${esc(t("communitySearch"))}" value="${esc(stateC.q)}" />
      <div class="chip-row">
        <span class="chip ${stateC.sort === "hot" ? "chip-active" : ""}" data-action="sort" data-value="hot">${icon("flame", 14)} ${esc(t("communitySortHot"))}</span>
        <span class="chip ${stateC.sort === "new" ? "chip-active" : ""}" data-action="sort" data-value="new">${esc(t("communitySortNew"))}</span>
      </div>
    </div>
    <div class="community-list" id="community-list">
      <div style="color:var(--text-2);text-align:center;padding:30px">…</div>
    </div>
    ${stateC.publishOpen ? publishModalHtml() : ""}
  </div>`;
}

function publishModalHtml() {
  return `
  <div class="modal-backdrop2" id="publish-modal">
    <div class="publish-card glass">
      <h3>${esc(t("postTitleLabel"))}</h3>
      <input class="input" id="pub-title" placeholder="${esc(t("postTitleLabel"))}" />
      <textarea class="textarea" id="pub-desc" rows="3" placeholder="${esc(t("postDescLabel"))}"></textarea>
      <label class="field-label" style="margin-top:8px">${esc(t("postSelectCourse"))}</label>
      <select class="select" id="pub-course">
        <option value="">—</option>
        ${stateC.myCourses.map((c) => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join("")}
      </select>
      <div style="display:flex;gap:10px;margin-top:14px">
        <button class="btn btn-primary" style="flex:1" data-action="do-publish">${esc(t("postPublish"))}</button>
        <button class="btn" data-action="close-publish">${esc(t("closeBtn"))}</button>
      </div>
      <div class="login-error" id="pub-error"></div>
    </div>
  </div>`;
}

export function communityDetailHtml(postId) {
  const d = stateC.detail;
  if (!d || d.post?.id !== postId) {
    return `<div class="community-page"><div style="text-align:center;color:var(--text-2);padding:40px">…</div></div>`;
  }
  const p = d.post;
  const statusBadge = { pending: ["warn", "pendingStatus"], approved: ["ok", "approvedStatus"], rejected: ["err", "rejectedStatus"] }[p.status] || ["", ""];
  return `
  <div class="community-page">
    <button class="btn btn-ghost btn-sm" data-action="back-community">${esc(t("backToCommunity"))}</button>
    <div class="post-detail glass">
      <div class="post-detail-head">
        <div>
          <h1>${esc(p.title)}</h1>
          <div class="post-meta" style="margin-top:8px">
            <span class="badge ${statusBadge[0]}">${esc(t(statusBadge[1]))}</span>
            <span class="badge">${esc(p.difficulty)}</span>
            <span class="badge">${esc(p.domain || "")}</span>
            ${p.originAuthor ? `<span class="badge warn">📎 ${esc(t("repostFrom"))}：${esc(p.originAuthor)}</span>` : ""}
          ${p.review?.reason ? `<span class="badge warn" title="${esc(t("aiReasonLabel"))}">🤖 ${esc(p.review.reason)}</span>` : ""}
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-sm like-heart ${p.likedByMe ? "liked" : ""}" data-action="like-post-detail" data-id="${esc(p.id)}">
            ${p.likedByMe ? "❤️" : "🤍"} ${esc(t("likeBtn"))} · ${p.likes}
          </button>
          <button class="btn btn-sm" data-action="fork-post" data-id="${esc(p.id)}">${esc(t("forkBtn"))}</button>
          ${stateC.detail?.post?.author?.id === stateC.myId ? `<button class="btn btn-sm" style="color:var(--danger)" data-action="delete-own-post" data-id="${esc(p.id)}">${esc(t("deleteMyPost"))}</button>` : ""}
        </div>
      </div>
      <div class="post-author-line"><span style="cursor:pointer;color:var(--accent-2)" data-action="open-user" data-id="${esc(p.author?.id || "")}">🧑‍🚀 ${esc(p.author?.name || "匿名")}${p.author?.school ? ` · ${esc(p.author.school)}` : ""}</span> · ${new Date(p.createdAt * 1000).toLocaleString()}</div>
      <p class="post-desc" style="margin:12px 0">${esc(p.description || "")}</p>
      <div class="post-course-frame">
        <iframe id="post-course-frame" sandbox="allow-scripts allow-same-origin allow-modals" title="course"></iframe>
      </div>
    </div>
    <div class="glass" style="padding:16px;margin-top:12px">
      <h3 style="font-size:14px;font-weight:800;margin-bottom:10px">💬 ${esc(t("commentsTitle"))} (${d.comments?.length || 0})</h3>
      <div class="comment-input-row">
        <input class="input" id="comment-input" placeholder="${esc(t("commentPlaceholder"))}" />
        <button class="btn btn-primary" data-action="add-comment" data-id="${esc(p.id)}">${esc(t("commentBtn"))}</button>
      </div>
      <div class="comment-list">
        ${(d.comments || []).map((c) => `
          <div class="comment-item">
            <div class="comment-author">🧑‍🚀 ${esc(c.author?.name || "匿名")}${c.author?.school ? ` · ${esc(c.author.school)}` : ""}</div>
            <div class="comment-content">${esc(c.content)}</div>
            <div class="comment-time">${new Date(c.createdAt * 1000).toLocaleString()}</div>
          </div>`).join("")}
        ${(d.comments || []).length === 0 ? `<div style="font-size:12.5px;color:var(--text-2);text-align:center;padding:12px">${esc(t("communityEmpty"))}</div>` : ""}
      </div>
    </div>
  </div>`;
}

// ---------- 绑定 ----------
export async function bindCommunityList() {
  const search = $("#community-search");
  if (search) {
    search.addEventListener("input", () => {
      clearTimeout(search.__t);
      search.__t = setTimeout(() => { stateC.q = search.value.trim(); stateC.page = 0; loadPosts(); }, 500);
    });
  }
  await loadPosts();
}

async function loadPosts() {
  try {
    const data = await api.community({ sort: stateC.sort, page: stateC.page, q: stateC.q });
    stateC.posts = data.items || [];
    const list = $("#community-list");
    if (list) {
      list.innerHTML = stateC.posts.length
        ? stateC.posts.map(postCard).join("")
        : `<div style="color:var(--text-2);text-align:center;padding:40px">${esc(t("communityEmpty"))}</div>`;
    }
  } catch (e) {
    toast(e.message, "err");
  }
}

export async function bindCommunityDetail() {
  try {
    const { jwtPayload } = await import("../core.js");
    stateC.myId = jwtPayload()?.sub || "";
  } catch {}
  const postId = (location.hash || "").split("/")[2]?.split("?")[0];
  try {
    const d = await api.postDetail(postId);
    stateC.detail = d;
    rerenderCommunity();
    const frame = $("#post-course-frame");
    if (frame && d.course) {
      frame.srcdoc = lessonHtml(d.course);
    }
  } catch (e) {
    toast(e.message, "err");
    navigate("#/community");
  }
}

function rerenderCommunity() {
  const view = $("#page-view");
  if (!view) return;
  const postId = (location.hash || "").split("/")[2]?.split("?")[0];
  if (postId && stateC.detail) {
    view.innerHTML = communityDetailHtml(postId);
    const frame = $("#post-course-frame");
    if (frame && stateC.detail?.course) frame.srcdoc = lessonHtml(stateC.detail.course);
  } else {
    view.innerHTML = communityListHtml();
    loadPosts();
  }
}

document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  switch (action) {
    case "open-post": navigate(`#/community/${el.dataset.id}`); break;
    case "open-user": if (el.dataset.id) navigate(`#/user/${el.dataset.id}`); break;
    case "back-community": navigate("#/community"); break;
    case "sort": stateC.sort = el.dataset.value; rerenderCommunity(); break;
    case "open-publish": await openPublish(); break;
    case "close-publish": stateC.publishOpen = false; rerenderCommunity(); break;
    case "do-publish": await doPublish(); break;
    case "like-post":
    case "like-post-detail": await likePost(el.dataset.id); break;
    case "fork-post": await forkPost(el.dataset.id); break;
    case "add-comment": await addComment(el.dataset.id); break;
    case "delete-own-post": await deleteOwnPost(el.dataset.id); break;
  }
});

export async function openPublishForCourse() {
  try {
    const data = await api.history();
    stateC.myCourses = data.items || [];
  } catch {
    stateC.myCourses = [];
  }
  stateC.publishOpen = true;
}

async function openPublish() {
  try {
    const data = await api.history();
    stateC.myCourses = data.items || [];
  } catch {
    stateC.myCourses = [];
  }
  stateC.publishOpen = true;
  rerenderCommunity();
}

async function doPublish() {
  const title = $("#pub-title")?.value.trim();
  const description = $("#pub-desc")?.value.trim();
  const courseId = $("#pub-course")?.value;
  if (!title) return toast(t("postNeedTitle") || t("postTitleLabel"), "err");
  if (!courseId) return toast(t("postSelectCourse"), "err");
  try {
    const res = await api.publishPost({ courseId, title, description });
    stateC.publishOpen = false;
    rerenderCommunity();
    toast(res.message || t("postOk"));
  } catch (e) {
    const err = $("#pub-error");
    if (err) err.textContent = e.message;
  }
}

async function likePost(id) {
  try {
    await api.toggleLike(id);
    // 刷新当前视图数据
    if (stateC.detail && stateC.detail.post?.id === id) {
      const d = await api.postDetail(id);
      stateC.detail = d;
      rerenderCommunity();
    } else {
      loadPosts();
    }
  } catch (e) {
    toast(e.message, "err");
  }
}

async function forkPost(id) {
  try {
    await api.forkPost(id);
    toast(t("forkOk"));
  } catch (e) {
    toast(e.message, "err");
  }
}

async function deleteOwnPost(postId) {
  if (!confirm(t("deleteMyPostConfirm"))) return;
  try {
    const res = await api.deleteOwnPost(postId);
    toast(res.message || "OK");
    navigate("#/community");
  } catch (e) {
    toast(e.message, "err");
  }
}

async function addComment(postId) {
  const input = $("#comment-input");
  if (!input || !input.value.trim()) return;
  try {
    const res = await api.addComment(postId, input.value.trim());
    if (res.error) return toast(res.error, "err");
    if (res.pending) {
      toast(res.message || t("commentPendingToast"));
      input.value = "";
      return; // 待人工复核的评论不立即显示，避免混淆
    }
    const d = await api.postDetail(postId);
    stateC.detail = d;
    rerenderCommunity();
  } catch (e) {
    toast(e.message, "err");
  }
}
