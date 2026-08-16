// pages/workbench.js - 孵化台：个性化问卷 → 生成 → 预览 → 评估/反思/历史

import { api, Session, streamGenerate, streamRegenerate, ApiError, t, esc, $, toast, navigate, state, saveModelPrefs, lessonHtml } from "../core.js";
import { icon } from "../ui/icons.js";
import { downloadLesson, openLessonInNewWindow } from "../export.js";
import { autoStartChat } from "./chat-panel.js";

const DIFFS = [
  ["beginner", "diffBeginner", "diffBeginnerSub"],
  ["advanced", "diffAdvanced", "diffAdvancedSub"],
  ["expert", "diffExpert", "diffExpertSub"],
];
const LEVELS = [
  ["zero", "levelZero"], ["novice", "levelNovice"], ["intermediate", "levelIntermediate"], ["expert", "levelExpert"],
];
const DURATIONS = [
  ["quick", "durationQuick"], ["standard", "durationStandard"], ["deep", "durationDeep"],
];
const STYLES = [
  ["story", "styleStory"], ["academic", "styleAcademic"], ["case", "styleCase"], ["fun", "styleFun"],
];
const SCENARIOS = [
  ["exam", "scenarioExam"], ["work", "scenarioWork"], ["interest", "scenarioInterest"], ["teaching", "scenarioTeaching"],
];

export function workbenchHtml() {
  const g = state.generating;
  return `
  <div class="workspace ${state.collapsed ? "side-collapsed" : ""}">
    <aside class="panel-col command">
      ${quizFormHtml()}
      <div class="glass" style="padding:14px;display:flex;gap:10px">
        <button class="btn" style="flex:1" data-action="export" ${state.course ? "" : "disabled"}>${icon("download", 15)} ${esc(t("exportBtn"))}</button>
        <button class="btn" style="flex:1" data-action="share" ${state.shareId ? "" : "disabled"}>${icon("link", 15)} ${esc(t("shareBtn"))}</button>
      </div>
      ${dailyCardHtml()}
      ${planCardHtml()}
    </aside>

    <section class="canvas-col">
      <div class="side-expand-btn" data-action="collapse-side" title="${esc(t("tipCollapse"))}">⟩</div>
      <div class="canvas-bar">
        <div class="dots">
          <span class="dot red" data-action="clear-frame" title="${esc(t("tipClear"))}"></span>
          <span class="dot yellow" data-action="collapse-side" title="${esc(t("tipCollapse"))}"></span>
          <span class="dot green" data-action="fullscreen" title="${esc(t("tipFullscreen"))}"></span>
        </div>
        <div class="canvas-bar-title">${state.course ? esc(state.course.meta.title) : esc(t("canvasTitle"))}</div>
        <button class="icon-btn" data-action="open-new-window" title="${esc(t("tipNewWin"))}">${icon("external", 15)}</button>
      </div>
      <div class="canvas-frame-wrap">
        <iframe id="preview" title="preview" sandbox="allow-scripts allow-same-origin allow-modals allow-popups"></iframe>
        <div class="canvas-empty" id="canvas-empty">
          <div class="big">🌌</div>
          <h3>${esc(t("canvasEmptyTitle"))}</h3>
          <p>${esc(t("canvasEmptyText"))}</p>
        </div>
        <div class="gen-overlay ${g ? "" : "hidden"}" id="gen-overlay">
          <div class="gen-ring"></div>
          <div class="gen-stage" id="gen-stage"></div>
          <div class="gen-sub" id="gen-sub"></div>
          <div class="gen-progress">
            <div class="gen-bar"><div class="gen-bar-fill" id="gen-fill"></div></div>
            <span id="gen-pct">0%</span>
          </div>
          <div class="gen-eta" id="gen-eta"></div>
        </div>
      </div>
    </section>

    <aside class="panel-col mission" id="mission">
      <div class="glass mission-tabs">
        <button class="mission-tab ${state.currentTab === "audit" ? "active" : ""}" data-action="tab" data-value="audit">${esc(t("missionTabAudit"))}</button>
        <button class="mission-tab ${state.currentTab === "reflect" ? "active" : ""}" data-action="tab" data-value="reflect">${esc(t("missionTabReflect"))}</button>
        <button class="mission-tab ${state.currentTab === "history" ? "active" : ""}" data-action="tab" data-value="history">${esc(t("missionTabHistory"))}</button>
      </div>
      <div class="mission-body">
        ${state.currentTab === "audit" ? auditHtml() : ""}
        ${state.currentTab === "reflect" ? reflectHtml() : ""}
        ${state.currentTab === "history" ? historyHtml() : ""}
      </div>
    </aside>
  </div>`;
}

function quizFormHtml() {
  return `
  <div class="glass" style="padding:18px;display:flex;flex-direction:column;gap:14px">
    <div class="field">
      <label class="field-label">${esc(t("topicLabel"))}</label>
      <input class="input" id="topic-input" placeholder="${esc(t("topicPlace"))}" value="${esc(state.topic)}" />
    </div>
    <div class="field">
      <label class="field-label">${esc(t("roleLabel"))}</label>
      <input class="input" id="role-input" placeholder="${esc(t("rolePlace"))}" value="${esc(state.role)}" />
    </div>
    <div class="field">
      <label class="field-label">${esc(t("levelQuestion"))}</label>
      <div class="chip-row">
        ${LEVELS.map(([v, k]) => `<span class="chip ${state.level === v ? "chip-active" : ""}" data-action="set-level" data-value="${v}">${esc(t(k))}</span>`).join("")}
      </div>
    </div>
    <div class="field">
      <label class="field-label">${esc(t("durationLabel"))}</label>
      <div class="diff-grid">
        ${DURATIONS.map(([v, k]) => `<div class="diff-card ${state.duration === v ? "active" : ""}" data-action="set-duration" data-value="${v}">${esc(t(k))}</div>`).join("")}
      </div>
    </div>
    <div class="field">
      <label class="field-label">${esc(t("styleLabel"))}</label>
      <div class="chip-row">
        ${STYLES.map(([v, k]) => `<span class="chip ${state.style === v ? "chip-active" : ""}" data-action="set-style" data-value="${v}">${esc(t(k))}</span>`).join("")}
      </div>
    </div>
    <div class="field">
      <label class="field-label">${esc(t("scenarioLabel"))}</label>
      <div class="chip-row">
        ${SCENARIOS.map(([v, k]) => `<span class="chip ${state.scenario === v ? "chip-active" : ""}" data-action="set-scenario" data-value="${v}">${esc(t(k))}</span>`).join("")}
      </div>
    </div>
    <div class="field">
      <label class="field-label">${esc(t("diffLabel"))}</label>
      <div class="diff-grid">
        ${DIFFS.map(([v, k, ks]) => `
          <div class="diff-card ${state.difficulty === v ? "active" : ""}" data-action="set-diff" data-value="${v}">
            ${esc(t(k))}
            <small>${esc(t(ks))}</small>
          </div>`).join("")}
      </div>
    </div>
    <div class="field">
      <label class="field-label">${esc(t("chaptersLabel"))} · <span style="text-transform:none;font-weight:600;color:var(--text-1)">${state.chaptersHint === 0 ? esc(t("chaptersAuto")) : state.chaptersHint}</span></label>
      <div class="chapter-stepper">
        <button class="stepper-btn" data-action="chapters-minus" ${state.chaptersHint <= 2 ? "disabled" : ""}>−</button>
        <span class="stepper-val">${state.chaptersHint === 0 ? "AUTO" : state.chaptersHint}</span>
        <button class="stepper-btn" data-action="chapters-plus" ${state.chaptersHint >= 10 ? "disabled" : ""}>＋</button>
        ${state.chaptersHint !== 0 ? `<button class="btn btn-ghost btn-sm" data-action="chapters-auto">${esc(t("chaptersAuto"))}</button>` : ""}
      </div>
    </div>
    <div class="field">
      <label class="field-label">${esc(t("modelLabel"))}</label>
      <div class="model-grid">
        <div class="model-card ${state.model === "flash" ? "active" : ""}" data-action="set-model" data-value="flash">
          ${esc(t("modelFlash"))}
          <small>${esc(t("modelFlashSub"))}</small>
        </div>
        <div class="model-card ${state.model === "pro" ? "active" : ""}" data-action="set-model" data-value="pro">
          ${esc(t("modelPro"))}
          <small>${esc(t("modelProSub"))}</small>
        </div>
        <div class="model-card ${state.model === "custom" ? "active" : ""}" data-action="set-model" data-value="custom" style="grid-column:1/-1">
          ${esc(t("modelCustom"))}
          <small>${esc(t("modelCustomSub"))}</small>
        </div>
      </div>
      ${state.model === "custom" ? `
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
          <input class="input" id="custom-base" placeholder="${esc(t("customBasePlace"))}" value="${esc(state.customModel.baseUrl)}" />
          <input class="input" id="custom-key" type="password" placeholder="${esc(t("customKeyPlace"))}" value="${esc(state.customModel.apiKey)}" />
          <input class="input" id="custom-name" placeholder="${esc(t("customModelPlace"))}" value="${esc(state.customModel.model)}" />
          <div style="font-size:11px;color:var(--text-2);line-height:1.5">${esc(t("customHint"))}</div>
        </div>` : ""}
    </div>
    <div class="domain-line">
      <span class="pulse"></span>
      <span>${esc(t("domainLabel"))}：</span>
      <span style="font-weight:700;color:var(--text-0)" id="domain-tag">${state.domainBusy ? esc(t("domainAnalyzing")) : state.domain ? esc(state.domain) : esc(t("domainWait"))}</span>
    </div>
    <button class="btn btn-primary generate-btn" data-action="generate" ${state.generating ? "disabled" : ""}>
      ${state.generating ? `<span class="spark">${icon("settings", 14)}</span> ${esc(t("generating"))}` : esc(t("generateBtn"))}
    </button>
  </div>`;
}

function dailyCardHtml() {
  return `
  <div class="glass" style="padding:14px;display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:13px;font-weight:800">${icon("target", 15)} ${esc(t("dailyTitle"))}</span>
      <button class="btn btn-ghost btn-sm" data-action="daily-load">${icon("refresh", 14)}</button>
    </div>
    <div id="daily-box" style="font-size:12.5px;color:var(--text-1);line-height:1.7">
      ${state.daily ? dailyQuestionHtml() : `<button class="btn btn-sm" data-action="daily-load">${esc(t("dailyTitle"))}</button>`}
    </div>
  </div>`;
}

function dailyQuestionHtml() {
  const d = state.daily;
  return `
    <div style="font-weight:700;color:var(--text-0)">${esc(d.question)}</div>
    ${d.remaining !== undefined ? `<div style="font-size:11px;color:var(--text-2);margin-top:2px">↻ ${d.remaining} / ${d.maxSeeds}</div>` : ""}
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px" id="daily-options">
      ${(d.options || []).map((o, i) => `
        <div class="diff-card ${d.__picked === i ? "active" : ""}" data-action="daily-pick" data-value="${i}" style="text-align:left;padding:8px 10px">${esc(o)}</div>`).join("")}
    </div>
    <button class="btn btn-primary btn-sm" data-action="daily-submit" ${d.__picked === undefined ? "disabled" : ""}>${esc(t("dailyAnswer"))}</button>
    <div id="daily-result"></div>`;
}

function planCardHtml() {
  return `
  <div class="glass" style="padding:14px;display:flex;flex-direction:column;gap:10px">
    <span style="font-size:13px;font-weight:800">${icon("map", 15)} ${esc(t("planTitle"))}</span>
    <div id="plan-box">
      ${state.plan ? planHtml() : `
        <input class="input" id="plan-goal" placeholder="${esc(t("planPlaceholder"))}" />
        <button class="btn btn-primary btn-sm" data-action="plan-generate" style="margin-top:8px;width:100%">${esc(t("planGenerate"))}</button>`}
    </div>
  </div>`;
}

function planHtml() {
  const p = state.plan;
  return `
    <div style="font-weight:800;color:var(--text-0);font-size:13px">${esc(p.title)}</div>
    ${p.description ? `<div style="font-size:11.5px;color:var(--text-2)">${esc(p.description)}</div>` : ""}
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
      ${(p.courses || []).map((c, i) => `
        <div class="history-item" data-action="plan-start" data-topic="${esc(c.topic)}">
          <div class="h-title">${i + 1}. ${esc(c.title || c.topic)}</div>
          <div class="h-meta">${esc(c.reason || "")}</div>
        </div>`).join("")}
    </div>`;
}

// ---------- Mission 面板 ----------
function auditHtml() {
  if (!state.course) {
    return `<div class="glass" style="padding:18px"><div style="font-size:13px;color:var(--text-2);text-align:center">${esc(t("auditWaiting"))}</div></div>`;
  }
  const a = state.audit;
  const nums = a ? ["accuracy", "fit", "depth", "fun", "personalization", "compliance"].map((k) => a[k]).filter((v) => typeof v === "number") : [];
  const avg = nums.length ? Math.round(nums.reduce((s, v) => s + v, 0) / nums.length) : null;
  return `
    <div class="glass radar-wrap">
      <div style="font-size:13px;font-weight:800">${esc(t("auditTitle"))} ${state.fallback ? '<span class="badge warn">FALLBACK</span>' : ""}</div>
      ${a ? `
        <svg class="radar-svg" viewBox="0 0 232 202">${radarSvg(a)}</svg>
        <div class="radar-score">${avg ?? "—"}</div>
        <div class="radar-legend">
          ${radarDims().map(([k, label]) => `<span><i style="background:var(--accent-2)"></i>${esc(label)} ${a[k] ?? "—"}</span>`).join("")}
        </div>
        ${a.comment ? `<div class="audit-comment">“${esc(a.comment)}”</div>` : ""}
      ` : `<div style="font-size:13px;color:var(--text-2)">${esc(t("auditWaiting"))}</div>`}
      <details class="audit-guide">
        <summary>${esc(t("auditGuideTitle"))}</summary>
        <ul>
          <li><b>${esc(t("dimAccuracy"))}</b> — ${esc(t("auditGuideAccuracy"))}</li>
          <li><b>${esc(t("dimFit"))}</b> — ${esc(t("auditGuideFit"))}</li>
          <li><b>${esc(t("dimDepth"))}</b> — ${esc(t("auditGuideDepth"))}</li>
          <li><b>${esc(t("dimFun"))}</b> — ${esc(t("auditGuideFun"))}</li>
          <li><b>${esc(t("dimPersonalization"))}</b> — ${esc(t("auditGuidePersonalization"))}</li>
          <li><b>${esc(t("dimCompliance"))}</b> — ${esc(t("auditGuideCompliance"))}</li>
        </ul>
      </details>
    </div>`;
}

function radarDims() {
  return [
    ["accuracy", t("dimAccuracy")],
    ["fit", t("dimFit")],
    ["depth", t("dimDepth")],
    ["fun", t("dimFun")],
    ["personalization", t("dimPersonalization")],
    ["compliance", t("dimCompliance")],
  ];
}

function radarSvg(audit) {
  const cx = 116, cy = 100, R = 72;
  const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / 6;
  const pt = (i, r) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  const dims = radarDims();
  let out = "";
  for (let ring = 1; ring <= 3; ring++) {
    const r = (R * ring) / 3;
    out += `<polygon points="${dims.map((_, i) => pt(i, r).map((n) => n.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="var(--border-strong)" stroke-width="1"/>`;
  }
  dims.forEach((_, i) => {
    const [x, y] = pt(i, R);
    out += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--border-strong)" stroke-width="1"/>`;
  });
  const vals = dims.map(([k]) => Math.max(0, Math.min(100, Number(audit?.[k]) || 0)));
  const dataPts = vals.map((v, i) => pt(i, (R * v) / 100).map((n) => n.toFixed(1)).join(",")).join(" ");
  out += `<polygon points="${dataPts}" fill="rgba(var(--accent-rgb),0.28)" stroke="var(--accent)" stroke-width="2"/>`;
  dims.forEach(([, label], i) => {
    const [x, y] = pt(i, R + 20);
    const anchor = Math.abs(x - cx) < 6 ? "middle" : x > cx ? "start" : "end";
    out += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="10.5" fill="var(--text-1)" text-anchor="${anchor}">${esc(label)}</text>`;
  });
  return out;
}

function reflectHtml() {
  return `
    <div class="glass" style="padding:18px;display:flex;flex-direction:column;gap:12px">
      <div style="font-size:13px;font-weight:800">${esc(t("reflectTitle"))}</div>
      <textarea class="textarea" id="reflect-input" rows="4" placeholder="${esc(t("reflectPlaceholder"))}" ${state.course ? "" : "disabled"}></textarea>
      <button class="btn btn-primary" data-action="reflect-submit" ${state.course && !state.reflectionBusy ? "" : "disabled"}>${state.reflectionBusy ? esc(t("reflectWaiting")) : esc(t("reflectSubmit"))}</button>
      <div class="reflect-result" id="reflect-result">${reflectResultHtml()}</div>
    </div>`;
}

function reflectResultHtml() {
  if (!state.reflection) return "";
  const r = state.reflection;
  return `
    <span class="reflect-score-big">${r.score}</span> / 100<br>${esc(r.comment)}
    ${r.nextStep ? `
      <div style="margin-top:10px;padding:10px;border-radius:10px;background:rgba(var(--accent-rgb),0.08);border:1px solid rgba(var(--accent-rgb),0.2)">
        <div style="font-size:11.5px;font-weight:800;color:var(--accent-2)">${esc(t("nextStepLabel"))}</div>
        <div style="font-size:12.5px;margin:4px 0 8px">${esc(r.nextStep)}</div>
        <button class="btn btn-sm btn-primary" data-action="next-step">${esc(t("nextStepGenerate"))}</button>
      </div>` : ""}`;
}

function historyHtml() {
  return `
    <div class="glass" style="padding:14px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:13px;font-weight:800">${esc(t("historyTitle"))}</span>
        <button class="btn btn-ghost btn-sm" data-action="clear-history" id="clear-hist-btn">${esc(t("historyClear"))}</button>
      </div>
      <div class="history-list" id="history-list">
        <div style="font-size:12.5px;color:var(--text-2);text-align:center;padding:8px">…</div>
      </div>
    </div>`;
}

// ---------- 事件绑定 ----------
export function bindWorkbench() {
  const f = $("#preview");
  if (f && state.course && !f.dataset.loaded) {
    f.srcdoc = lessonHtml(state.course);
    f.dataset.loaded = "1";
  }
  if (f && state.course) {
    const empty = $("#canvas-empty");
    if (empty) empty.style.display = "none";
  }
  if (state.generating) {
    const o = $("#gen-overlay");
    if (o) {
      o.classList.remove("hidden");
      $("#gen-stage").textContent = state.genStage || t("stageOutline");
      $("#gen-sub").textContent = state.genSub || "";
      $("#gen-fill").style.width = (state.genProgress || 0) + "%";
      $("#gen-pct").textContent = (state.genProgress || 0) + "%";
      const eta = $("#gen-eta");
      if (eta) eta.textContent = "⏱ " + (state.genEta || "");
    }
  }
  // 输入绑定
  const topicInput = $("#topic-input");
  if (topicInput) {
    topicInput.addEventListener("input", () => {
      state.topic = topicInput.value;
      clearTimeout(topicInput.__t);
      topicInput.__t = setTimeout(identifyDomain, 600);
    });
  }
  const roleInput = $("#role-input");
  if (roleInput) roleInput.addEventListener("input", () => { state.role = roleInput.value; });
  ["custom-base", "custom-key", "custom-name"].forEach((id) => {
    const el = $("#" + id);
    if (el) el.addEventListener("change", () => {
      state.customModel = {
        baseUrl: $("#custom-base")?.value.trim() || "",
        apiKey: $("#custom-key")?.value.trim() || "",
        model: $("#custom-name")?.value.trim() || "",
      };
      saveModelPrefs();
    });
  });
  // 历史加载
  if (state.currentTab === "history") loadHistoryList();
  if (state.currentTab === "audit" && !state.audit && state.course) {
    refreshAudit();
  }
}

document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  switch (action) {
    case "generate": await generate(); break;
    case "export": if (state.course) { downloadLesson(state.course, `nebula-${(state.course.meta.title || "course").replace(/[^\w\u4e00-\u9fa5-]+/g, "-").slice(0, 40)}.html`); toast(t("toastExported")); } break;
    case "share": await doShare(); break;
    case "set-diff": state.difficulty = el.dataset.value; rerenderWorkbench(); break;
    case "set-level": state.level = el.dataset.value; saveModelPrefs(); rerenderWorkbench(); break;
    case "set-duration": state.duration = el.dataset.value; rerenderWorkbench(); break;
    case "set-style": state.style = el.dataset.value; rerenderWorkbench(); break;
    case "set-scenario": state.scenario = el.dataset.value; rerenderWorkbench(); break;
    case "set-model": state.model = el.dataset.value; saveModelPrefs(); rerenderWorkbench(); break;
    case "chapters-plus": state.chaptersHint = Math.min(10, (state.chaptersHint || 3) + 1); rerenderWorkbench(); break;
    case "chapters-minus": state.chaptersHint = Math.max(2, state.chaptersHint - 1); rerenderWorkbench(); break;
    case "chapters-auto": state.chaptersHint = 0; rerenderWorkbench(); break;
    case "tab": state.currentTab = el.dataset.value; rerenderWorkbench(); break;
    case "clear-history": await clearHistory(); break;
    case "open-history": await openHistory(el.dataset.id); break;
    case "reflect-submit": await submitReflection(); break;
    case "next-step": startNextStep(); break;
    case "clear-frame": clearFrame(); break;
    case "collapse-side": collapseSide(); break;
    case "fullscreen": {
      const wrap = $(".canvas-frame-wrap");
      if (wrap) { if (!document.fullscreenElement) wrap.requestFullscreen?.(); else document.exitFullscreen?.(); }
      break;
    }
    case "open-new-window": if (state.course) openLessonInNewWindow(state.course); break;
    case "daily-load": await loadDaily(true); break;
    case "daily-pick": {
      const idx = Number(el.dataset.value);
      state.daily.__picked = idx;
      $("#daily-box").innerHTML = dailyQuestionHtml();
      break;
    }
    case "daily-submit": await submitDaily(); break;
    case "plan-generate": await generatePlan(); break;
    case "plan-start": {
      state.topic = el.dataset.topic;
      rerenderWorkbench();
      const ti = $("#topic-input");
      if (ti) ti.value = state.topic;
      break;
    }
  }
});

document.addEventListener("dblclick", (e) => {
  if (e.target.closest('[data-action="clear-frame"]')) {
    const f = $("#preview");
    if (f && state.lastHtml) {
      f.srcdoc = state.lastHtml;
      f.dataset.loaded = "1";
      const empty = $("#canvas-empty");
      if (empty) empty.style.display = "none";
    }
  }
});

function rerenderWorkbench() {
  const view = $("#page-view");
  if (!view) return;
  // 保持滚动位置：记录所有可滚动祖先（workspace/page-view）的 scrollTop，重建后恢复，避免输入或异步更新时页面跳回顶部
  const scrollState = [];
  const ws = view.closest(".workspace");
  if (ws && ws.scrollTop > 0) scrollState.push([ws, ws.scrollTop]);
  if (view.scrollTop > 0) scrollState.push([view, view.scrollTop]);
  view.innerHTML = workbenchHtml();
  bindWorkbench();
  if (scrollState.length) {
    requestAnimationFrame(() => {
      for (const [el, top] of scrollState) {
        try { el.scrollTop = Math.min(top, el.scrollHeight); } catch {}
      }
    });
  }
}

function clearFrame() {
  const f = $("#preview");
  if (f && state.course) {
    state.lastHtml = f.srcdoc;
    f.srcdoc = "about:blank";
    f.removeAttribute("data-loaded");
    const empty = $("#canvas-empty");
    if (empty) empty.style.display = "";
  }
}

function collapseSide() {
  state.collapsed = !state.collapsed;
  rerenderWorkbench();
}

// ---------- 领域识别 ----------
async function identifyDomain() {
  if (!state.topic.trim() || !Session.isLoggedIn) return;
  state.domainBusy = true;
  const tag = $("#domain-tag");
  if (tag) tag.textContent = t("domainAnalyzing");
  // 记录滚动位置：异步更新标签文本可能引起容器滚动锚定，完成后恢复
  const wsEl = document.querySelector(".workspace");
  const pvEl = document.getElementById("page-view");
  const tops = [wsEl, pvEl].map((el) => (el ? el.scrollTop : 0));
  const restoreScroll = () => {
    requestAnimationFrame(() => {
      [wsEl, pvEl].forEach((el, i) => {
        if (el) el.scrollTop = Math.min(tops[i], Math.max(0, el.scrollHeight - el.clientHeight));
      });
    });
  };
  try {
    const res = await api.identify(state.topic.trim(), LinguaForceContentLang());
    state.domain = res.domain || "";
    state.domainBusy = false;
    if (tag) tag.textContent = state.domain || t("domainWait");
  } catch {
    state.domainBusy = false;
    if (tag) tag.textContent = state.domain || t("domainWait");
  }
  restoreScroll();
}

function LinguaForceContentLang() {
  // 通过 core 的语言引擎获取内容语言
  try {
    return document.documentElement.lang || "zh";
  } catch {
    return "zh";
  }
}

// ---------- 生成 ----------
async function generate() {
  if (!state.topic.trim()) return toast(t("toastNeedTopic"), "err");
  if (!Session.isLoggedIn) {
    const { default: app } = await import("../app.js");
    app.showAuth && app.showAuth();
    return;
  }
  // 自定义模型校验
  if (state.model === "custom" && (!state.customModel.baseUrl || !state.customModel.model)) {
    return toast(t("customModelLabel") + " / Base URL " + t("toastNeedTopic"), "err");
  }
  state.generating = true;
  state.genStage = t("stageOutline");
  state.genSub = "";
  state.genProgress = 4;
  state.genEta = t(state.model === "pro" ? "genEtaPro" : state.model === "custom" ? "genEtaCustom" : "genEtaFlash");
  rerenderWorkbench();

  let gotDone = false;
  try {
    await streamGenerate(
      {
        topic: state.topic.trim(),
        role: state.role.trim(),
        difficulty: state.difficulty,
        model: state.model,
        custom: state.model === "custom" ? state.customModel : undefined,
        lang: document.documentElement.lang || "zh",
        domain: state.domain,
        chapters: state.chaptersHint || undefined,
        level: state.level,
        duration: state.duration,
        style: state.style,
        scenario: state.scenario,
        wrongItems: state.wrongItems || undefined,
      },
      (event, data) => handleGenEvent(event, data),
    );
    if (!gotDone) toast(t("toastGenFail"), "err");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      Session.clear();
      toast(t("toastNeedLogin"), "err");
    } else {
      toast(e.message || t("toastGenFail"), "err");
    }
  } finally {
    state.generating = false;
    state.genStage = "";
    state.genEta = "";
    rerenderWorkbench();
    if (state.currentTab === "history") loadHistoryList();
  }
}

function handleGenEvent(event, data) {
  const overlay = $("#gen-overlay");
  if (event === "stage") {
    const s = data.stage;
    if (s === "outline") { state.genStage = t("stageOutline"); state.genProgress = 12; state.genSub = ""; }
    else if (s === "chapters") {
      state.genStage = t("stageChapters");
      if (data.progress) {
        const [cur, total] = String(data.progress).split("/").map(Number);
        state.genProgress = Math.min(85, 12 + Math.round((cur / total) * 68));
        state.genSub = `${cur}/${total}`;
        if (data.text) state.genStage = data.text;
      }
    }
    else if (s === "audit") { state.genStage = t("stageAudit"); state.genProgress = 90; }
    if (overlay) {
      $("#gen-stage").textContent = state.genStage;
      $("#gen-sub").textContent = state.genSub || "";
      $("#gen-fill").style.width = state.genProgress + "%";
      $("#gen-pct").textContent = state.genProgress + "%";
    }
  } else if (event === "audit") {
    state.audit = data.audit;
  } else if (event === "done") {
    state.course = data.course;
    state.shareId = data.shareId;
    state.audit = data.audit;
    state.fallback = !!data.fallback;
    state.genProgress = 100;
    state.currentTab = "audit";
    state.lastHtml = "";
    state.wrongItems = null; // 复习课已生成，清空注入
    // 自动为这门课开一个 AI 助教对话（初始上下文=用户个性化输入+课程）
    autoStartChat(data.shareId, data.course.meta.title).catch(() => {});
    const f = $("#preview");
    if (f) {
      f.srcdoc = lessonHtml(data.course);
      f.dataset.loaded = "1";
    }
    const empty = $("#canvas-empty");
    if (empty) empty.style.display = "none";
    if (data.fallback) toast(t("toastFallback"), "warn");
    else if (data.fallbackChapters?.length) toast(`${t("toastFallback")}（${t("chapterLabel", { n: data.fallbackChapters[0] })}）`, "warn");
  } else if (event === "error") {
    state.genStage = t("stageError");
    if (overlay) $("#gen-stage").textContent = state.genStage;
    toast(data.message || t("toastGenFail"), "err");
  }
}

// ---------- 导出/分享 ----------
async function doShare() {
  if (!state.shareId) return;
  const url = `${location.origin}${location.pathname}#/s/${state.shareId}`;
  try {
    await navigator.clipboard.writeText(url);
    toast(t("toastCopied"));
  } catch {
    window.prompt(t("toastCopyFail"), url);
  }
}

// ---------- 历史 ----------
async function loadHistoryList() {
  const list = $("#history-list");
  if (!list) return;
  try {
    const data = await api.history();
    const items = data.items || [];
    list.innerHTML = items.length
      ? items.map((it) => `
        <div class="history-item" data-action="open-history" data-id="${esc(it.id)}">
          <div class="h-title">${esc(it.title)}</div>
          <div class="h-meta">
            <span class="badge ${it.fallback ? "warn" : "ok"}">${it.fallback ? "FALLBACK" : esc(it.model)}</span>
            <span>${esc(it.domain || "—")}</span>
            <span>${it.chapters} ch · ${it.totalQuestions} q</span>
            <span>${new Date(it.createdAt * 1000).toLocaleString()}</span>
          </div>
        </div>`).join("")
      : `<div style="font-size:12.5px;color:var(--text-2);text-align:center;padding:14px 0">${esc(t("historyEmpty"))}</div>`;
    const btn = $("#clear-hist-btn");
    if (btn) btn.style.display = items.length ? "" : "none";
  } catch {
    /* 静默 */
  }
}

async function openHistory(id) {
  try {
    const data = await api.historyItem(id);
    state.course = data.item.course;
    state.audit = data.item.audit;
    state.shareId = data.item.id;
    state.currentTab = "audit";
    rerenderWorkbench();
  } catch (e) {
    toast(e.message, "err");
  }
}

async function clearHistory() {
  try {
    await api.clearHistory();
    toast(t("toastHistoryCleared"));
    loadHistoryList();
  } catch (e) {
    toast(e.message, "err");
  }
}

// ---------- 反思 ----------
async function submitReflection() {
  const input = $("#reflect-input");
  if (!input || !input.value.trim() || !state.course) return;
  state.reflectionBusy = true;
  state.reflection = null;
  rerenderWorkbench();
  try {
    const res = await api.reflect({
      topic: state.course.meta.topic,
      domain: state.course.meta.domain,
      content: input.value.trim(),
    });
    state.reflection = res;
    postToFrame({ type: "AI_FEEDBACK", payload: { comment: res.comment, score: res.score } });
    rerenderWorkbench();
  } catch (e) {
    toast(e.message, "err");
  } finally {
    state.reflectionBusy = false;
    rerenderWorkbench();
  }
}

function startNextStep() {
  if (!state.reflection?.nextStep) return;
  state.topic = state.reflection.nextStep;
  const ti = $("#topic-input");
  if (ti) ti.value = state.topic;
  rerenderWorkbench();
  toast(state.topic);
}

async function handleAskShare(payload) {
  // 跳转社区并自动打开发布弹窗（预填课程）
  try {
    const m = await import("./community.js");
    m.openPublishForCourse();
    navigate("#/community");
  } catch (e) {
    toast(t("toastGenFail"), "err");
  }
}

async function handleRegenerate(payload) {
  const feedback = String(payload?.feedback || "").trim();
  if (!state.shareId || !feedback) return;
  if (state.generating) return toast(t("regenBusy"), "warn");
  state.generating = true;
  state.genStage = t("stageOutline");
  state.genSub = "";
  state.genProgress = 4;
  state.genEta = t(state.model === "pro" ? "genEtaPro" : state.model === "custom" ? "genEtaCustom" : "genEtaFlash");
  rerenderWorkbench();
  try {
    await streamRegenerate(state.shareId, feedback, (event, data) => handleGenEvent(event, data));
  } catch (e) {
    toast(e.message || t("toastGenFail"), "err");
  } finally {
    state.generating = false;
    state.genStage = "";
    state.genEta = "";
    rerenderWorkbench();
  }
}

function postToFrame(msg) {
  try {
    $("#preview")?.contentWindow?.postMessage(msg, "*");
  } catch {}
}

// ---------- iframe 消息 ----------
export function onWorkbenchMessage(d) {
  if (d.type === "ASK_SHARE") {
    handleAskShare(d.payload);
  } else if (d.type === "ASK_REGENERATE") {
    handleRegenerate(d.payload);
  } else if (d.type === "SUBMIT_LEARNING") {
    handleCourseReflection(d.payload);
  } else if (d.type === "SAVE_DATA") {
    const wrongItems = (d.payload?.wrongItems || []).map((w) => ({ question: w.question, answer: w.answer }));
    api.log({
      type: "save",
      topic: state.course?.meta?.topic,
      courseId: state.shareId,
      score: d.payload?.score,
      total: d.payload?.total,
      wrongItems,
    });
  }
}

async function handleCourseReflection(payload) {
  state.currentTab = "reflect";
  state.reflectionBusy = true;
  state.reflection = null;
  rerenderWorkbench();
  try {
    const res = await api.reflect({
      topic: payload?.topic || state.course?.meta?.topic,
      domain: payload?.domain || state.course?.meta?.domain,
      content: payload?.content,
    });
    state.reflection = res;
    postToFrame({ type: "AI_FEEDBACK", payload: { comment: res.comment, score: res.score } });
  } catch (e) {
    toast(e.message, "err");
  } finally {
    state.reflectionBusy = false;
    rerenderWorkbench();
  }
}

// ---------- 审计刷新 ----------
async function refreshAudit() {
  if (!state.course) return;
  try {
    const res = await api.audit(state.course);
    if (res.audit) {
      state.audit = res.audit;
      rerenderWorkbench();
    }
  } catch {}
}

// ---------- 每日一题 ----------
async function loadDaily(refresh = false) {
  try {
    const d = await api.daily(refresh);
    d.__picked = undefined;
    state.daily = d;
    const box = $("#daily-box");
    if (box) box.innerHTML = dailyQuestionHtml();
    if (refresh && d.remaining === 0) toast("今日换题次数已用完，明天再来吧～", "warn");
  } catch (e) {
    toast(e.message, "err");
  }
}

async function submitDaily() {
  const d = state.daily;
  if (!d || d.__picked === undefined) return;
  const correct = d.__picked === d.correct;
  try {
    const res = await api.dailyAnswer(correct);
    const result = $("#daily-result");
    if (result) {
      result.innerHTML = `
        <div style="margin-top:8px;padding:10px;border-radius:10px;background:${correct ? "rgba(48,209,88,.1)" : "rgba(255,159,10,.1)"}">
          <b>${correct ? esc(t("dailyCorrect")) : esc(t("dailyWrong"))}</b>
          <div style="font-size:12px;margin-top:4px">${esc(d.explain || "")}</div>
          ${d.funFact ? `<div style="font-size:11.5px;color:var(--text-2);margin-top:4px">${esc(d.funFact)}</div>` : ""}
          ${res.xpGained ? `<div style="font-size:12px;font-weight:800;color:var(--accent-2);margin-top:6px">${esc(t("dailyXp"))} +${res.xpGained} ${esc(t("xpWord"))} ✨</div>` : ""}
        </div>`;
    }
  } catch (e) {
    toast(e.message, "err");
  }
}

// ---------- 学习路径 ----------
async function generatePlan() {
  const goal = $("#plan-goal")?.value.trim();
  if (!goal) return toast(t("planEmpty"), "err");
  try {
    const res = await api.plan(goal, state.level, state.scenario);
    state.plan = res.plan;
    const box = $("#plan-box");
    if (box) box.innerHTML = planHtml();
  } catch (e) {
    toast(e.message, "err");
  }
}
