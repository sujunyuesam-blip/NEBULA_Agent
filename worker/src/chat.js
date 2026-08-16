// chat.js - AI 课程聊天助手：课程绑定会话、强制主题相关、联网搜索、模型选择、历史保留

import { resolveModelName, chatCompletion } from "./deepseek.js";
import { uid, nowSec } from "./util.js";

// ---------- 联网搜索（DuckDuckGo Instant Answer，免费无 key；失败静默降级）----------
export async function webSearch(query) {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { "User-Agent": "NEBULA-AI-Agent/2.0 (+https://www.nebulavessel.com)" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = [];
    if (data.AbstractText) {
      items.push({ title: data.Heading || "摘要", snippet: String(data.AbstractText).slice(0, 400), url: data.AbstractURL || "" });
    }
    (data.RelatedTopics || []).slice(0, 6).forEach((t) => {
      if (t.Text) {
        items.push({
          title: String(t.Text).slice(0, 60),
          snippet: String(t.Text).slice(0, 300),
          url: t.FirstURL || "",
        });
      }
    });
    return items.filter((i) => i.snippet).slice(0, 6);
  } catch {
    return [];
  }
}

function endpoint(baseUrl) {
  const base = (baseUrl || "https://api.deepseek.com").trim().replace(/\/+$/, "");
  return /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;
}

export function chatSystemPrompt(course, personalization) {
  const m = course?.meta || {};
  return `你是 NEBULA 课程助教，跟随学习者完成「${m.title || m.topic || "当前"}」这门课程。
【课程主题】：${m.topic || ""}
【学习者身份/目标】：${m.role || "通用学习者"}
【个性化画像】：水平=${personalization?.level || "novice"}，风格=${personalization?.style || "story"}，场景=${personalization?.scenario || "interest"}，难度=${m.difficulty || "beginner"}

规则：
1. 只回答与课程主题相关的问题；若用户明显偏离主题，礼貌提醒并把话题拉回主题主线（可以说"这个问题和本课程关系不大，我们回到…"）。
2. 回答紧扣课程内容与学习者的身份场景，用 ta 能理解的语言。
3. 主动介绍该主题的最新研究进展、跨学科联系（如与经济学/数学/计算机/心理学的交叉）与前沿方向，启发用户继续探索。
4. 若提供了【联网搜索结果】，优先结合最新信息回答，并在结尾标注来源。
5. 篇幅控制：默认 200~400 字；用户要求详细时再展开。`;
}

// ---------- 会话管理 ----------
export async function createChat(env, auth, { courseId, title }) {
  const course = courseId
    ? await env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(courseId).first()
    : null;
  let courseJson = null;
  try { courseJson = course?.course_json ? JSON.parse(course.course_json) : null; } catch {}
  const id = uid();
  await env.DB.prepare(
    "INSERT INTO chats (id, user_id, course_id, title, model, messages, created_at, updated_at) VALUES (?, ?, ?, ?, 'flash', '[]', ?, ?)"
  ).bind(id, auth.sub, courseId || null, title || (courseJson?.meta?.title || "新对话"), nowSec(), nowSec()).run();
  return { id, title: title || (courseJson?.meta?.title || "新对话") };
}

export async function listChats(env, auth) {
  const { results } = await env.DB.prepare(
    "SELECT id, course_id, title, model, created_at, updated_at FROM chats WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100"
  ).bind(auth.sub).all();
  return (results || []).map((r) => ({
    id: r.id,
    courseId: r.course_id,
    title: r.title,
    model: r.model,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getChat(env, auth, chatId) {
  const row = await env.DB.prepare("SELECT * FROM chats WHERE id = ? AND user_id = ?").bind(chatId, auth.sub).first();
  if (!row) return null;
  let messages = [];
  try { messages = JSON.parse(row.messages || "[]"); } catch {}
  let course = null;
  if (row.course_id) {
    const c = await env.DB.prepare("SELECT course_json FROM courses WHERE id = ?").bind(row.course_id).first();
    try { course = c?.course_json ? JSON.parse(c.course_json) : null; } catch {}
  }
  return { id: row.id, title: row.title, model: row.model, messages, course };
}

export async function deleteChat(env, auth, chatId) {
  await env.DB.prepare("DELETE FROM chats WHERE id = ? AND user_id = ?").bind(chatId, auth.sub).run();
  return { ok: true };
}

// ---------- 改名 / AI 概括标题 ----------
export async function renameChat(env, auth, chatId, title) {
  title = String(title || "").trim().slice(0, 40);
  if (!title) return { error: "标题不能为空" };
  await env.DB.prepare("UPDATE chats SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .bind(title, nowSec(), chatId, auth.sub).run();
  return { ok: true, title };
}

export async function summarizeChatTitle(env, auth, chatId) {
  const chat = await getChat(env, auth, chatId);
  if (!chat) return { error: "会话不存在" };
  const userMsgs = (chat.messages || []).filter((m) => m.role === "user").map((m) => m.content).join(" | ");
  if (!userMsgs) return { error: "暂无对话内容" };
  if (env.MOCK === "1") {
    const title = userMsgs.slice(0, 20) + "…";
    await env.DB.prepare("UPDATE chats SET title = ?, updated_at = ? WHERE id = ?").bind(title, nowSec(), chatId).run();
    return { ok: true, title };
  }
  try {
    const res = await chatCompletion(env, {
      model: resolveModelName(env, "flash"),
      messages: [
        { role: "system", content: "你是标题生成器。把用户的对话内容概括为 10 字以内的会话标题。只输出标题，不要其他文字。" },
        { role: "user", content: userMsgs.slice(0, 600) },
      ],
      maxTokens: 40,
      temperature: 0.3,
      jsonMode: false,
    });
    const title = String(res.content || "").trim().replace(/^["'「『]+|["'」』]+$/g, "").slice(0, 20);
    if (title) {
      await env.DB.prepare("UPDATE chats SET title = ?, updated_at = ? WHERE id = ?").bind(title, nowSec(), chatId).run();
      return { ok: true, title };
    }
    return { error: "概括失败" };
  } catch (e) {
    return { error: String(e?.message || e).slice(0, 100) };
  }
}

// ---------- 流式回复（SSE 转发）----------
export function chatStreamResponse(request, env, auth, chatId, body) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const emit = (event, data) => {
    writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)).catch(() => {});
  };

  (async () => {
    try {
      const chat = await getChat(env, auth, chatId);
      if (!chat) {
        emit("error", { message: "会话不存在" });
        return;
      }
      const userContent = String(body?.content || "").trim().slice(0, 2000);
      if (!userContent) {
        emit("error", { message: "消息不能为空" });
        return;
      }
      const modelId = ["flash", "pro", "custom"].includes(body?.model) ? body.model : "flash";
      const custom = modelId === "custom"
        ? { baseUrl: String(body?.custom?.baseUrl || "").slice(0, 200), apiKey: String(body?.custom?.apiKey || "").slice(0, 200), model: String(body?.custom?.model || "").slice(0, 100) }
        : null;
      if (modelId === "custom" && (!custom.baseUrl || !custom.model)) {
        emit("error", { message: "自定义模型缺少配置" });
        return;
      }

      // MOCK 模式：返回模拟流式回复（本地开发）
      if (env.MOCK === "1") {
        const mockReply = `（MOCK 回复）围绕「${chat.course?.meta?.topic || "本课程"}」的这个问题很有意思！建议你先回顾课程中相关章节的 keyPoints，再尝试用自己的话复述。联网搜索会为你补充最新研究进展（本地开发模式未实际联网）。`;
        for (const piece of mockReply.match(/.{1,24}/g) || [mockReply]) {
          emit("delta", { content: piece });
          await new Promise((r) => setTimeout(r, 40));
        }
        emit("done", { content: mockReply, sources: [] });
        const updated = [...(chat.messages || []), { role: "user", content: userContent, ts: nowSec() }, { role: "assistant", content: mockReply, ts: nowSec() }].slice(-40);
        await env.DB.prepare(
          "UPDATE chats SET messages = ?, model = ?, updated_at = ? WHERE id = ?"
        ).bind(JSON.stringify(updated), modelId, nowSec(), chatId).run();
        return;
      }

      // 联网搜索（默认开启）
      const results = await webSearch(`${chat.course?.meta?.topic || ""} ${userContent}`.slice(0, 200));
      const searchBlock = results.length
        ? `\n【联网搜索结果】（最新信息，回答时可引用）\n${results.map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}${r.url ? `\n来源: ${r.url}` : ""}`).join("\n")}`
        : "";

      const messages = [
        { role: "system", content: chatSystemPrompt(chat.course, body?.personalization) + searchBlock },
        ...(chat.messages || []).slice(-12).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userContent },
      ];

      const model = modelId === "custom" ? custom.model : resolveModelName(env, modelId);
      const key = custom?.apiKey || env.DEEPSEEK_API_KEY;
      const res = await fetch(endpoint(custom?.baseUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages, stream: true, max_tokens: 1500, temperature: 0.4 }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        emit("error", { message: `模型请求失败 ${res.status}: ${text.slice(0, 200)}` });
        return;
      }

      // 转发流式
      let full = "";
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content || "";
            if (delta) {
              full += delta;
              emit("delta", { content: delta });
            }
          } catch {}
        }
      }
      emit("done", { content: full, sources: results.slice(0, 6).map((r) => ({ title: r.title, url: r.url })) });

      // 保存消息
      const updated = [...(chat.messages || []), { role: "user", content: userContent, ts: nowSec() }, { role: "assistant", content: full, ts: nowSec() }].slice(-40);
      await env.DB.prepare(
        "UPDATE chats SET messages = ?, model = ?, updated_at = ? WHERE id = ?"
      ).bind(JSON.stringify(updated), modelId, nowSec(), chatId).run();
    } catch (e) {
      console.error("chat stream error:", e);
      emit("error", { message: String(e?.message || e).slice(0, 300) });
    } finally {
      try { await writer.close(); } catch {}
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
