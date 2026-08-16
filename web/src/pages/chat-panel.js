// pages/chat-panel.js - AI 课程助教面板：会话列表 + 流式对话 + 模型选择 + 联网搜索

import { api, t, esc, $, toast, state } from "../core.js";

const chatState = {
  open: false,
  chats: [],
  current: null, // {id, title, model, messages, course}
  sending: false,
  model: "flash",
  custom: { baseUrl: "", apiKey: "", model: "" },
};

export function chatPanelHtml() {
  if (!chatState.open) return "";
  const c = chatState.current;
  return `
  <div class="chat-backdrop" data-action="close-chat"></div>
  <aside class="chat-panel glass" id="chat-panel">
    <div class="chat-head" id="chat-drag-handle">
      <span class="chat-title">${esc(t("chatAssistant"))}</span>
      <span class="chat-title-edit" id="chat-title-text" title="${esc(t("chatRenameHint"))}">${c ? esc(c.title || "") : ""}</span>
      <button class="icon-btn" data-action="close-chat">✕</button>
    </div>
    <div class="chat-body">
      <div class="chat-list" id="chat-list">
        <button class="btn btn-sm btn-primary" data-action="new-chat" style="width:100%">＋ ${esc(t("chatNew"))}</button>
        <div class="chat-list-items" id="chat-list-items">
          ${chatState.chats.map((ch) => `
            <div class="chat-item ${c?.id === ch.id ? "active" : ""}" data-action="open-chat" data-id="${esc(ch.id)}">
              <div class="chat-item-title">${esc(ch.title)}</div>
              <div class="chat-item-meta">${esc(ch.model)} · ${new Date(ch.updatedAt * 1000).toLocaleString()}</div>
            </div>`).join("")}
        </div>
      </div>
      <div class="chat-main">
        <div class="chat-toolbar">
          <select class="select chat-model-select" id="chat-model">
            <option value="flash" ${chatState.model === "flash" ? "selected" : ""}>${esc(t("modelFlash"))}</option>
            <option value="pro" ${chatState.model === "pro" ? "selected" : ""}>${esc(t("modelPro"))}</option>
            <option value="custom" ${chatState.model === "custom" ? "selected" : ""}>${esc(t("modelCustom"))}</option>
          </select>
          <span class="badge ok" title="${esc(t("chatSearchHint"))}">🌐 ${esc(t("chatSearchOn"))}</span>
          <button class="icon-btn" data-action="delete-chat" title="${esc(t("chatDelete"))}">🗑</button>
        </div>
        ${chatState.model === "custom" ? `
        <div class="chat-custom">
          <input class="input" id="chat-custom-base" placeholder="${esc(t("customBasePlace"))}" value="${esc(chatState.custom.baseUrl)}" />
          <input class="input" id="chat-custom-key" type="password" placeholder="${esc(t("customKeyPlace"))}" value="${esc(chatState.custom.apiKey)}" />
          <input class="input" id="chat-custom-model" placeholder="${esc(t("customModelPlace"))}" value="${esc(chatState.custom.model)}" />
        </div>` : ""}
        <div class="chat-messages" id="chat-messages">
          ${renderMessages()}
        </div>
        <div class="chat-input-row">
          <textarea class="textarea" id="chat-input" rows="2" placeholder="${esc(t("chatPlaceholder"))}" ${chatState.sending ? "disabled" : ""}></textarea>
          <button class="btn btn-primary" data-action="chat-send" ${chatState.sending ? "disabled" : ""}>${esc(t("chatSend"))}</button>
        </div>
      </div>
    </div>
  </aside>`;
}

function renderMessages() {
  const msgs = chatState.current?.messages || [];
  if (msgs.length === 0) {
    const course = chatState.current?.course;
    return `<div class="chat-empty">
      <div class="big">💬</div>
      <p>${course?.meta?.title ? `「${esc(course.meta.title)}」` : ""} ${esc(t("chatEmpty"))}</p>
      <p class="chat-empty-sub">${esc(t("chatEmptySub"))}</p>
    </div>`;
  }
  return msgs.map((m) => `
    <div class="chat-msg ${m.role === "user" ? "user" : "ai"}">
      <div class="chat-msg-avatar">${m.role === "user" ? "🧑‍🚀" : "🌌"}</div>
      <div class="chat-msg-bubble">${esc(m.content)}</div>
    </div>`).join("");
}

// ---------- 数据 ----------
export async function openChatPanel(openChatId) {
  chatState.open = true;
  try {
    const res = await api.chats();
    chatState.chats = res.items || [];
    if (openChatId) {
      await loadChatOnly(openChatId);
    } else if (chatState.chats.length > 0 && !chatState.current) {
      await loadChatOnly(chatState.chats[0].id);
    }
  } catch (e) {
    toast(e.message, "err");
  }
  rerenderChatPanel(); // 数据就绪后只渲染一次
  bindChatPanelShell();
}

async function loadChatOnly(id) {
  try {
    const res = await api.chatDetail(id);
    chatState.current = res.chat;
    chatState.model = res.chat.model || "flash";
  } catch (e) {
    toast(e.message, "err");
  }
}

export function closeChatPanel() {
  chatState.open = false;
  rerenderChatPanel();
}

function rerenderChatPanel() {
  const old = document.getElementById("chat-panel-root");
  if (old) old.remove();
  const root = document.createElement("div");
  root.id = "chat-panel-root";
  root.innerHTML = chatPanelHtml();
  document.body.appendChild(root);
  bindChatPanelShell();
}

function bindChatPanelShell() {
  const ta = $("#chat-input");
  if (ta) {
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  const modelSel = $("#chat-model");
  if (modelSel) {
    modelSel.addEventListener("change", () => {
      chatState.model = modelSel.value;
      rerenderChatPanel();
      scrollChatBottom();
    });
  }
  // 拖拽移动
  const panel = $("#chat-panel");
  const handle = $("#chat-drag-handle");
  if (panel && handle) {
    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest("button") || e.target.closest("#chat-title-text")) return;
      e.preventDefault();
      const rect = panel.getBoundingClientRect();
      const offX = e.clientX - rect.left;
      const offY = e.clientY - rect.top;
      const move = (ev) => {
        const x = Math.min(Math.max(ev.clientX - offX, 0), window.innerWidth - 80);
        const y = Math.min(Math.max(ev.clientY - offY, 0), window.innerHeight - 60);
        panel.style.left = x + "px";
        panel.style.top = y + "px";
        panel.style.right = "auto";
        panel.style.bottom = "auto";
      };
      const up = () => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });
  }
  // 双击标题改名
  const titleEl = $("#chat-title-text");
  if (titleEl) {
    titleEl.addEventListener("dblclick", async () => {
      const cur = chatState.current;
      if (!cur) return;
      const newTitle = window.prompt(t("chatRenamePrompt"), cur.title || "");
      if (newTitle && newTitle.trim()) {
        try {
          const res = await api.renameChat(cur.id, newTitle.trim());
          chatState.current.title = res.title || newTitle.trim();
          titleEl.textContent = chatState.current.title;
          refreshChatList();
        } catch (err) { toast(err.message, "err"); }
      }
    });
  }
  // 缩放
  const panelEl = $("#chat-panel");
  if (panelEl) {
    panelEl.style.resize = "both";
    panelEl.style.overflow = "hidden";
  }
}

async function selectChat(id) {
  try {
    const res = await api.chatDetail(id);
    chatState.current = res.chat;
    chatState.model = res.chat.model || "flash";
    const box = $("#chat-messages");
    if (box) {
      box.innerHTML = renderMessages();
      scrollChatBottom();
      const titleEl = $("#chat-title-text");
      if (titleEl) titleEl.textContent = chatState.current?.title || "";
      // 更新列表高亮
      document.querySelectorAll(".chat-item").forEach((it) => it.classList.toggle("active", it.dataset.id === id));
    } else {
      rerenderChatPanel();
      scrollChatBottom();
    }
  } catch (e) {
    toast(e.message, "err");
  }
}

function scrollChatBottom(force = true) {
  const box = $("#chat-messages");
  if (!box) return;
  // 非强制时：仅当用户已接近底部才跟随滚动，避免打断往上翻历史
  if (force || box.scrollHeight - box.scrollTop - box.clientHeight < 120) {
    box.scrollTop = box.scrollHeight;
  }
}

async function sendMessage() {
  const input = $("#chat-input");
  const content = input?.value.trim();
  if (!content || chatState.sending || !chatState.current) return;
  chatState.sending = true;
  input.value = "";
  // 追加用户消息
  chatState.current.messages = [...(chatState.current.messages || []), { role: "user", content }];
  // 追加空 AI 气泡占位
  chatState.current.messages = [...chatState.current.messages, { role: "assistant", content: "", streaming: true }];
  rerenderChatPanel();
  scrollChatBottom();

  try {
    const res = await api.chatStream(chatState.current.id, {
      content,
      model: chatState.model,
      custom: chatState.model === "custom" ? {
        baseUrl: $("#chat-custom-base")?.value?.trim() || "",
        apiKey: $("#chat-custom-key")?.value?.trim() || "",
        model: $("#chat-custom-model")?.value?.trim() || "",
      } : undefined,
      personalization: { level: state.level, style: state.style, scenario: state.scenario },
    }, (event, data) => {
      const msgs = chatState.current?.messages || [];
      const last = msgs[msgs.length - 1];
      if (event === "delta" && last) {
        last.content += data.content || "";
        const box = $("#chat-messages");
        if (box) {
          const bubbles = box.querySelectorAll(".chat-msg.ai .chat-msg-bubble");
          const lastBubble = bubbles[bubbles.length - 1];
          if (lastBubble) lastBubble.textContent = last.content;
          scrollChatBottom(false); // 近底部才跟随，不打断翻历史
        }
      }
      if (event === "error") toast(data.message || "error", "err");
    });
    const msgs = chatState.current?.messages || [];
    const last = msgs[msgs.length - 1];
    if (last) { last.streaming = false; if (!last.content) last.content = res?.content || ""; }
    chatState.sending = false;
    rerenderChatPanel();
    scrollChatBottom(); // 重建 DOM 后恢复到底部（修复聊完跳到开头的 bug）
    refreshChatList();
    // 新对话（无课程绑定）：发送后让 AI 概括标题
    const isFresh = !chatState.current?.course && (chatState.current?.messages?.filter((m) => m.role === "user").length || 0) <= 1;
    if (isFresh && chatState.current?.id) {
      try {
        const res = await api.summarizeChat(chatState.current.id);
        if (res.title && chatState.current) {
          chatState.current.title = res.title;
          const titleEl = $("#chat-title-text");
          if (titleEl) titleEl.textContent = res.title;
          refreshChatList();
        }
      } catch {}
    }
  } catch (e) {
    chatState.sending = false;
    toast(e.message, "err");
    rerenderChatPanel();
    scrollChatBottom();
  }
}

async function refreshChatList() {
  try {
    const res = await api.chats();
    chatState.chats = res.items || [];
  } catch {}
}

// 生成课程后自动创建新对话（由 workbench 调用）——不自动弹出面板，避免打断学习
export async function autoStartChat(courseId, title) {
  try {
    await api.createChat({ courseId, title });
    toast(`💬 ${t("chatReady")}`);
  } catch (e) {
    // 静默：聊天失败不影响主流程
  }
}

// 事件委托
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  switch (el.dataset.action) {
    case "open-chat-panel": await openChatPanel(); break;
    case "close-chat": closeChatPanel(); break;
    case "new-chat": {
      try {
        const chat = await api.createChat({});
        chatState.current = { id: chat.id, title: chat.title, messages: [], course: null, model: "flash" };
        chatState.model = "flash";
        rerenderChatPanel();
        refreshChatList();
      } catch (err) { toast(err.message, "err"); }
      break;
    }
    case "open-chat": await selectChat(el.dataset.id); break;
    case "chat-send": await sendMessage(); break;
    case "delete-chat": {
      if (!chatState.current) break;
      try {
        await api.deleteChat(chatState.current.id);
        chatState.current = null;
        rerenderChatPanel();
        refreshChatList();
      } catch (err) { toast(err.message, "err"); }
      break;
    }
  }
});
