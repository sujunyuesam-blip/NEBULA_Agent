// runtime.js - NEBULA 确定性课程渲染器 v2
// AI 只生成结构化 JSON（course），本渲染器负责全部 HTML/CSS/JS —— 交互 100% 可控。
// lessonHtml(course) 同时服务于：iframe 预览(srcdoc)、独立导出、分享只读。

import { RUNTIME_I18N, COMMON_RT, SHARE_RT } from "./runtime-i18n.js";

// ---------- 课程样式（浅色学习风 + 双模板 story/focus） ----------
const LESSON_CSS = `
:root {
  --c-bg: #f6f7fb; --c-card: #ffffff; --c-text: #1c1e2e; --c-sub: #5a5e75;
  --c-accent: #6a46ff; --c-accent2: #0a84ff;
  --c-good: #1d9e5f; --c-bad: #e5484d; --c-border: #e5e7f2;
  --c-grad: linear-gradient(135deg, #6a46ff 0%, #3d6bff 50%, #12b7e8 100%);
  --radius: 16px;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; }
body {
  font-family: var(--font); background: var(--c-bg); color: var(--c-text);
  line-height: 1.7; -webkit-font-smoothing: antialiased; cursor: default;
}
body[dir="rtl"] { direction: rtl; }
button { font-family: inherit; cursor: pointer; }
input, textarea { font-family: inherit; }
.hidden { display: none !important; }

/* 顶部进度条 */
.topbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  display: flex; align-items: center; gap: 12px;
  padding: 10px 18px; background: rgba(255,255,255,0.9);
  backdrop-filter: blur(12px); border-bottom: 1px solid var(--c-border);
}
.topbar .ttl { font-weight: 800; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 42vw; }
.topbar .pbar { flex: 1; height: 7px; border-radius: 7px; background: #e8eaf5; overflow: hidden; min-width: 60px; }
.topbar .pfill { height: 100%; width: 0; background: var(--c-grad); border-radius: 7px; transition: width .5s ease; }
.topbar .pct { font-size: 11.5px; font-weight: 700; color: var(--c-sub); white-space: nowrap; }
.topbar .score-pill {
  font-size: 12px; font-weight: 800; padding: 4px 12px; border-radius: 999px;
  background: linear-gradient(135deg, rgba(106,70,255,.12), rgba(18,183,232,.12));
  color: #5a3de0; white-space: nowrap;
}

/* 页面容器 */
.page { max-width: 860px; margin: 0 auto; padding: 84px 20px 60px; }

/* 封面 */
.cover { text-align: center; padding-top: 7vh; animation: fadeUp .6s ease; }
.cover .logo {
  width: 84px; height: 84px; margin: 0 auto 22px; border-radius: 24px;
  background: var(--c-grad); display: flex; align-items: center; justify-content: center;
  font-size: 38px; color: #fff; box-shadow: 0 14px 40px rgba(106,70,255,.35);
}
.cover h1 { font-size: clamp(26px, 4.6vw, 40px); font-weight: 900; letter-spacing: .01em; }
.cover .sub { font-size: 16px; color: var(--c-sub); margin-top: 10px; }
.cover .tagline {
  display: inline-block; margin-top: 18px; font-size: 13px; font-weight: 700;
  color: #5a3de0; background: rgba(106,70,255,.1); padding: 7px 18px; border-radius: 999px;
}
.cover .intro { margin: 26px auto 0; max-width: 560px; font-size: 15px; color: var(--c-sub); }
.cover .metas { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 26px; }
.cover .metas .m {
  font-size: 12.5px; font-weight: 700; color: var(--c-sub);
  background: var(--c-card); border: 1px solid var(--c-border);
  padding: 8px 14px; border-radius: 12px;
}
.cover .metas .m b { color: var(--c-text); }
.btn-start {
  margin-top: 34px; padding: 15px 46px; font-size: 16px; font-weight: 800;
  color: #fff; background: var(--c-grad); border: none; border-radius: 999px;
  box-shadow: 0 10px 30px rgba(106,70,255,.35); transition: transform .15s, box-shadow .15s;
}
.btn-start:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(106,70,255,.45); }

/* 章节页 */
.chapter-head { margin-bottom: 22px; }
.chapter-head .ch-label { font-size: 12px; font-weight: 800; letter-spacing: .12em; color: #5a3de0; text-transform: uppercase; }
.chapter-head h2 { font-size: clamp(22px, 3.6vw, 30px); font-weight: 900; margin-top: 4px; }
.story-box {
  background: linear-gradient(135deg, rgba(106,70,255,.07), rgba(18,183,232,.07));
  border: 1px solid rgba(106,70,255,.18); border-radius: var(--radius);
  padding: 16px 20px; margin: 14px 0 22px; font-size: 14.5px; color: var(--c-text);
}
.story-box .lbl { font-size: 11.5px; font-weight: 800; color: #5a3de0; margin-bottom: 4px; display: block; }
body.focus .story-box { display: none; }
.content-block { font-size: 15.5px; color: var(--c-text); margin-bottom: 10px; }
.content-block p { margin-bottom: 12px; }
.content-block strong { color: #4a2fd0; }
.content-block code {
  background: #eef0fb; border-radius: 6px; padding: 2px 7px;
  font-size: 13.5px; color: #4a2fd0; font-family: ui-monospace, Menlo, Consolas, monospace;
}
.content-block ul { margin: 6px 0 14px 22px; }
.content-block li { margin-bottom: 6px; }
.keypoints {
  background: var(--c-card); border: 1px solid var(--c-border); border-radius: var(--radius);
  padding: 16px 20px; margin: 16px 0 24px;
}
.keypoints .lbl { font-size: 12px; font-weight: 800; color: #0a84ff; display: block; margin-bottom: 8px; }
.keypoints li { margin: 5px 0 5px 18px; font-size: 14px; }

/* 预热卡（提取练习 · 先想后学） */
.warmup-box {
  background: linear-gradient(135deg, rgba(255,159,10,.09), rgba(255,69,58,.04));
  border: 1px solid rgba(255,159,10,.28); border-radius: var(--radius);
  padding: 16px 20px; margin: 0 0 22px;
}
.warmup-box .lbl { display: block; font-size: 11.5px; font-weight: 800; color: #b06f00; margin-bottom: 7px; }
.warmup-q { font-size: 14.5px; font-weight: 700; line-height: 1.6; }
.warmup-hint { font-size: 13px; color: var(--c-sub); margin-top: 8px; line-height: 1.6; }

.feynman-prompt { font-size: 13px; color: var(--c-sub); margin-bottom: 12px; line-height: 1.7; }

/* 测验区 */
.quiz-wrap { margin-top: 28px; }
.quiz-head {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin-bottom: 14px; flex-wrap: wrap;
}
.quiz-head .q-title { font-size: 15px; font-weight: 900; color: #3a2aa0; }
.quiz-head .q-hint { font-size: 12.5px; color: var(--c-sub); }
.q-card {
  background: var(--c-card); border: 1px solid var(--c-border); border-radius: var(--radius);
  padding: 24px 22px; box-shadow: 0 6px 24px rgba(30,35,80,.06);
  animation: fadeUp .3s ease;
}
.q-question { font-size: 16.5px; font-weight: 800; margin-bottom: 18px; line-height: 1.6; }

.option-card {
  display: flex; align-items: flex-start; gap: 12px;
  border: 1.5px solid var(--c-border); border-radius: 12px;
  padding: 13px 15px; margin-bottom: 10px; cursor: pointer;
  transition: all .15s ease; background: #fff;
}
.option-card:hover { border-color: #b9a8ff; background: #faf9ff; }
.option-card.selected { border-color: var(--c-accent); background: rgba(106,70,255,.06); }
.option-card .letter {
  min-width: 26px; height: 26px; border-radius: 8px; background: #eef0fb;
  display: flex; align-items: center; justify-content: center;
  font-size: 12.5px; font-weight: 800; color: #4a2fd0; margin-top: 2px;
}
.option-card.selected .letter { background: var(--c-accent); color: #fff; }
.option-card .txt { font-size: 14.5px; line-height: 1.65; }

.judge-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.judge-btn {
  padding: 16px; font-size: 16px; font-weight: 800; border-radius: 12px;
  border: 1.5px solid var(--c-border); background: #fff; transition: all .15s;
}
.judge-btn:hover { border-color: #b9a8ff; }
.judge-btn.selected { border-color: var(--c-accent); background: rgba(106,70,255,.07); }

.match-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; }
.match-col { display: flex; flex-direction: column; gap: 10px; }
.match-item {
  padding: 11px 13px; border-radius: 10px; border: 1.5px solid var(--c-border);
  background: #fff; font-size: 13.5px; font-weight: 700; text-align: center;
  cursor: pointer; transition: all .15s; line-height: 1.4;
}
.match-item:hover { border-color: #b9a8ff; }
.match-item.sel { border-color: var(--c-accent); background: rgba(106,70,255,.08); }
.match-item.done { border-color: var(--c-good); background: rgba(29,158,95,.08); color: var(--c-good); cursor: default; }
.match-item.done.wrong-pair { border-color: var(--c-bad); background: rgba(229,72,77,.08); color: var(--c-bad); }

.order-pool { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
.order-chip {
  padding: 10px 16px; border-radius: 999px; border: 1.5px solid var(--c-border);
  background: #fff; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: all .15s;
}
.order-chip:hover { border-color: #b9a8ff; }
.order-chip.used { opacity: .25; pointer-events: none; }
.order-answer { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
.order-slot {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border: 1.5px dashed var(--c-border); border-radius: 10px; min-height: 42px;
  font-size: 13.5px; font-weight: 700; color: var(--c-sub); background: #fafbff;
}
.order-slot .no { min-width: 24px; height: 24px; border-radius: 50%; background: #eef0fb;
  display: flex; align-items: center; justify-content: center; font-size: 11.5px; font-weight: 800; color: #4a2fd0; }
.order-slot.filled { border-style: solid; border-color: #b9a8ff; color: var(--c-text); background: #fff; }

.fill-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 6px; }
.fill-input {
  flex: 1; min-width: 120px; padding: 11px 14px; border-radius: 10px;
  border: 1.5px solid var(--c-border); font-size: 14.5px; outline: none; background: #fff;
}
.fill-input:focus { border-color: var(--c-accent); }
.fill-input.correct { border-color: var(--c-good); background: rgba(29,158,95,.07); }
.fill-input.incorrect { border-color: var(--c-bad); background: rgba(229,72,77,.07); }

.case-area { width: 100%; min-height: 110px; padding: 13px 15px; border-radius: 12px;
  border: 1.5px solid var(--c-border); font-size: 14.5px; line-height: 1.7; resize: vertical; outline: none; }
.case-area:focus { border-color: var(--c-accent); }
.reference-box {
  margin-top: 14px; background: rgba(10,132,255,.06); border: 1px solid rgba(10,132,255,.2);
  border-radius: 12px; padding: 14px 16px; font-size: 14px; color: var(--c-text);
  animation: fadeUp .3s ease;
}
.reference-box .lbl { display: block; font-size: 11.5px; font-weight: 800; color: #0a84ff; margin-bottom: 5px; }

.btn-submit {
  margin-top: 18px; width: 100%; padding: 14px; font-size: 15px; font-weight: 800;
  color: #fff; background: var(--c-grad); border: none; border-radius: 12px;
  box-shadow: 0 8px 22px rgba(106,70,255,.3); transition: all .15s;
}
.btn-submit:hover { transform: translateY(-1px); }
.btn-submit:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.btn-link { background: none; border: none; color: #5a3de0; font-size: 13px; font-weight: 700; margin-top: 12px; }

/* 引导/解析 弹窗 */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(20,22,45,.55);
  display: flex; align-items: center; justify-content: center; z-index: 100;
  padding: 20px; animation: fadeIn .2s ease;
}
.modal {
  background: #fff; border-radius: 20px; max-width: 460px; width: 100%;
  padding: 26px 24px; box-shadow: 0 24px 70px rgba(20,22,45,.35);
  animation: pop .25s ease; max-height: 82vh; overflow-y: auto;
}
.modal .m-emoji { font-size: 34px; margin-bottom: 8px; }
.modal h3 { font-size: 18px; font-weight: 900; margin-bottom: 10px; }
.modal .m-body { font-size: 14.5px; color: var(--c-sub); line-height: 1.75; white-space: pre-wrap; }
.modal .m-body strong { color: var(--c-text); }
.modal .m-actions { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
.modal .m-actions .btn {
  flex: 1; min-width: 130px; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 800; border: none;
}
.modal .m-actions .btn.primary { background: var(--c-grad); color: #fff; }
.modal .m-actions .btn.ghost { background: #eef0fb; color: #4a2fd0; }

/* 终章 */
.finale { text-align: center; }
.finale .trophy { font-size: 60px; margin-bottom: 10px; }
.finale h2 { font-size: 28px; font-weight: 900; }
.finale .score-card {
  display: inline-block; margin: 22px 0; padding: 20px 46px;
  background: var(--c-card); border: 1px solid var(--c-border); border-radius: 20px;
  box-shadow: 0 10px 34px rgba(30,35,80,.08);
}
.finale .score-card .big { font-size: 44px; font-weight: 900; background: var(--c-grad);
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.finale .score-card .small { font-size: 13px; color: var(--c-sub); margin-top: 2px; }
.badge-wall { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 18px 0; }
.badge-chip {
  display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700;
  padding: 9px 15px; border-radius: 999px; background: rgba(106,70,255,.08); border: 1px solid rgba(106,70,255,.2); color: #4a2fd0;
}
.wrong-review, .glossary, .finale-form {
  background: var(--c-card); border: 1px solid var(--c-border); border-radius: var(--radius);
  padding: 20px 22px; margin: 16px 0; text-align: left;
}
.wrong-review h4, .glossary h4, .finale-form h4 { font-size: 15px; font-weight: 900; margin-bottom: 12px; }
.wrong-item { border-left: 3px solid var(--c-bad); padding: 8px 14px; margin-bottom: 10px; background: rgba(229,72,77,.04); border-radius: 0 10px 10px 0; font-size: 13.5px; }
.wrong-item .q { font-weight: 700; margin-bottom: 3px; }
.wrong-item .a { color: var(--c-sub); }
.glossary-item { margin-bottom: 10px; font-size: 13.5px; }
.glossary-item b { color: #4a2fd0; }
.finale-area { width: 100%; min-height: 130px; padding: 14px 16px; border-radius: 12px;
  border: 1.5px solid var(--c-border); font-size: 14.5px; line-height: 1.7; resize: vertical; outline: none; }
.finale-area:focus { border-color: var(--c-accent); }
.fb-box { margin-top: 16px; padding: 16px 18px; border-radius: 12px; background: rgba(106,70,255,.06);
  border: 1px solid rgba(106,70,255,.18); font-size: 14px; line-height: 1.7; text-align: left; }
.fb-box .lbl { display: block; font-size: 12px; font-weight: 800; color: #5a3de0; margin-bottom: 6px; }

@keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pop { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }

@media (max-width: 640px) {
  .page { padding: 76px 14px 40px; }
  .match-grid, .judge-row { grid-template-columns: 1fr; }
  .topbar .ttl { max-width: 30vw; }
}
`;

// ---------- 运行时脚本（自包含字符串，注入 srcdoc；内部不使用反引号） ----------
const RUNTIME_SOURCE = `(function () {
  'use strict';
  var COURSE = window.__COURSE__;
  var T = window.__T__;
  var t = T.t;
  var lang = (COURSE.meta && COURSE.meta.lang) || 'en';

  var state = {
    chapter: -1,
    qIndex: 0,
    score: 0,
    scoredTotal: 0,
    wrongList: [],
    badges: [],
    finaleSent: false,
  };
  var combo = 0;

  // ---------- 工具 ----------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  // markdown-lite：**bold**、\`code\`、- 列表；保留 $ 公式供 KaTeX 处理
  function mdLines(lines) {
    var out = [];
    var listBuf = [];
    function flushList() {
      if (listBuf.length) { out.push('<ul>' + listBuf.join('') + '</ul>'); listBuf = []; }
    }
    (lines || []).forEach(function (line) {
      var s = String(line);
      if (/^\\s*-\\s+/.test(s)) {
        listBuf.push('<li>' + inline(s.replace(/^\\s*-\\s+/, '')) + '</li>');
      } else {
        flushList();
        if (s.trim()) out.push('<p>' + inline(s) + '</p>');
      }
    });
    flushList();
    return out.join('');
  }
  function inline(s) {
    var x = esc(s);
    x = x.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
    x = x.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
    return x;
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function send(type, payload) {
    try { window.parent.postMessage({ type: type, payload: payload }, '*'); } catch (e) {}
  }
  function sendFinale(content) {
    send('SUBMIT_LEARNING', {
      content: content,
      courseTitle: COURSE.meta.title,
      topic: COURSE.meta.topic,
      domain: COURSE.meta.domain,
    });
  }
  function sendSave() {
    send('SAVE_DATA', {
      topic: COURSE.meta.topic,
      score: state.score,
      total: state.scoredTotal,
      wrong: state.wrongList.length,
      badges: state.badges,
      wrongItems: state.wrongList.slice(0, 20).map(function (w) { return { question: w.question, answer: w.answer }; }),
    });
  }

  // ---------- 音效 ----------
  var audioCtx = null;
  function beep(freq, dur, when) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var now = audioCtx.currentTime + (when || 0);
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + dur + 0.05);
    } catch (e) {}
  }
  function beepRight() { beep(880, 0.16); beep(1320, 0.22, 0.09); }
  function beepWrong() { beep(220, 0.3); beep(160, 0.3, 0.12); }

  // ---------- KaTeX ----------
  var katexLoaded = false;
  function loadKatex() {
    if (katexLoaded || !document.body.textContent.match(/\\$/)) return;
    katexLoaded = true;
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
    document.head.appendChild(css);
    var js = document.createElement('script');
    js.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
    js.onload = function () {
      var ar = document.createElement('script');
      ar.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js';
      ar.onload = function () {
        try {
          if (window.renderMathInElement) {
            window.renderMathInElement(document.body, { delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false },
            ], throwOnError: false });
          }
        } catch (e) {}
      };
      document.head.appendChild(ar);
    };
    document.head.appendChild(js);
  }

  // ---------- 弹窗 ----------
  function modal(emoji, title, bodyHtml, actions) {
    var backdrop = el('div', 'modal-backdrop');
    var box = el('div', 'modal');
    box.appendChild(el('div', 'm-emoji', emoji));
    box.appendChild(el('h3', null, title));
    var body = el('div', 'm-body');
    body.innerHTML = bodyHtml;
    box.appendChild(body);
    var actWrap = el('div', 'm-actions');
    (actions || []).forEach(function (a) {
      var b = el('button', 'btn ' + (a.primary ? 'primary' : 'ghost'), a.label);
      b.onclick = function () { backdrop.remove(); if (a.onClick) a.onClick(); };
      actWrap.appendChild(b);
    });
    box.appendChild(actWrap);
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
  }

  function hintFor(quiz, chosenIndex) {
    // 优先按选项索引取 optionHints；否则顺序轮流取 hints
    if (quiz.optionHints && quiz.optionHints[chosenIndex]) return quiz.optionHints[chosenIndex];
    if (quiz.hints && quiz.hints.length) {
      var used = quiz.__hintIdx || 0;
      var h = quiz.hints[used % quiz.hints.length];
      quiz.__hintIdx = used + 1;
      return h;
    }
    return quiz.explainRight || '';
  }

  // ---------- 页面渲染 ----------
  var root = el('div', 'page');
  document.body.appendChild(root);
  document.body.classList.add(COURSE.meta && COURSE.meta.mode === 'focus' ? 'focus' : 'story');

  function topbar() {
    var bar = el('div', 'topbar');
    bar.appendChild(el('div', 'ttl', COURSE.meta.title));
    var pbar = el('div', 'pbar');
    var pfill = el('div', 'pfill');
    pbar.appendChild(pfill);
    bar.appendChild(pbar);
    bar.appendChild(el('div', 'pct', '0%'));
    bar.appendChild(el('div', 'score-pill', t('scoreOf', { a: 0, b: 0 })));
    document.body.appendChild(bar);
    window.__updateTop = function (pct, score, total) {
      pfill.style.width = pct + '%';
      bar.querySelector('.pct').textContent = pct + '%';
      bar.querySelector('.score-pill').textContent = t('scoreOf', { a: score, b: total });
    };
  }

  function renderCover() {
    var m = COURSE.meta;
    root.innerHTML = '';
    var cover = el('div', 'cover');
    cover.appendChild(el('div', 'logo', '🌌'));
    cover.appendChild(el('h1', null, m.title));
    cover.appendChild(el('div', 'sub', m.subtitle));
    cover.appendChild(el('div', 'tagline', m.coverTagline));
    cover.appendChild(el('div', 'intro', m.intro));
    var metas = el('div', 'metas');
    var mk = function (label, val) {
      var d = el('div', 'm');
      d.innerHTML = label + ' <b>' + esc(val) + '</b>';
      metas.appendChild(d);
    };
    mk(t('chapterLabel', { n: m.chapters }) + ' · ', t('totalQuestions', { n: m.totalQuestions }));
    var diffNames = { beginner: '★', advanced: '★★', expert: '★★★' };
    mk('难度 · Difficulty: ', (diffNames[m.difficulty] || '★') + ' ' + esc(m.difficultyLabel));
    if (m.domain) mk('领域 · Domain: ', m.domain);
    if (m.role) mk('身份 · Role: ', m.role);
    cover.appendChild(metas);
    var startBtn = el('button', 'btn-start', t('start'));
    startBtn.onclick = function () { beep(660, 0.12); openChapter(0); };
    cover.appendChild(startBtn);
    root.appendChild(cover);
    window.__updateTop(0, 0, 0);
  }

  function openChapter(i) {
    state.chapter = i;
    state.qIndex = 0;
    renderChapter();
  }

  function renderChapter() {
    var ch = COURSE.chapters[state.chapter];
    var m = COURSE.meta;
    root.innerHTML = '';
    var head = el('div', 'chapter-head');
    head.appendChild(el('div', 'ch-label', t('chapterLabel', { n: state.chapter + 1 })));
    head.appendChild(el('h2', null, ch.title));
    root.appendChild(head);

    // 温故知新（间隔重复）：从第 2 章起，先回忆前章要点再对照
    if (state.chapter > 0) {
      var prev = COURSE.chapters[state.chapter - 1];
      var prevKps = (prev && prev.keyPoints) || [];
      if (prevKps.length) {
        var rc = el('div', 'keypoints');
        rc.appendChild(el('span', 'lbl', t('recallTitle')));
        var toggle = el('button', 'btn-link', t('recallSub'));
        var rul = document.createElement('ul');
        rul.classList.add('hidden');
        prevKps.forEach(function (k) {
          var li = document.createElement('li');
          li.innerHTML = inline(k);
          rul.appendChild(li);
        });
        toggle.onclick = function () { rul.classList.toggle('hidden'); };
        rc.appendChild(toggle);
        rc.appendChild(rul);
        root.appendChild(rc);
      }
    }

    var story = el('div', 'story-box');
    var lbl = el('span', 'lbl', t('storyLabel'));
    story.appendChild(lbl);
    story.appendChild(document.createTextNode(ch.story || ''));
    root.appendChild(story);

    // 预热问题（提取练习 · 先想后学）
    if (ch.warmup && ch.warmup.question) {
      var wu = el('div', 'warmup-box');
      wu.appendChild(el('span', 'lbl', t('warmupTitle')));
      wu.appendChild(el('div', 'warmup-q', ch.warmup.question));
      var hintWrap = el('div', 'warmup-hint hidden');
      hintWrap.appendChild(document.createTextNode(ch.warmup.hint || ''));
      var hintBtn = el('button', 'btn-link', t('warmupReveal'));
      hintBtn.onclick = function () { hintWrap.classList.remove('hidden'); hintBtn.remove(); };
      wu.appendChild(hintBtn);
      wu.appendChild(hintWrap);
      root.appendChild(wu);
    }

    var content = el('div', 'content-block');
    content.innerHTML = mdLines(ch.content || []);
    root.appendChild(content);

    if (ch.keyPoints && ch.keyPoints.length) {
      var kp = el('div', 'keypoints');
      var kl = el('span', 'lbl', t('keyPointsLabel'));
      kp.appendChild(kl);
      var ul = document.createElement('ul');
      ch.keyPoints.forEach(function (k) {
        var li = document.createElement('li');
        li.innerHTML = inline(k);
        ul.appendChild(li);
      });
      kp.appendChild(ul);
      root.appendChild(kp);
    }

    // 测验
    var quiz = ch.quiz || [];
    var qw = el('div', 'quiz-wrap');
    var qh = el('div', 'quiz-head');
    qh.appendChild(el('div', 'q-title', t('quizLabel')));
    qh.appendChild(el('div', 'q-hint', t('questionLabel', { n: state.qIndex + 1, m: quiz.length })));
    qw.appendChild(qh);
    var qcard = el('div', 'q-card');
    qcard.id = 'quiz-card';
    qw.appendChild(qcard);
    root.appendChild(qw);
    renderQuestion(qcard, quiz[state.qIndex], quiz.length);

    // 进度
    var totalChapters = COURSE.chapters.length;
    var progressBase = state.chapter / totalChapters;
    var within = quiz.length ? (state.qIndex / quiz.length) * (1 / totalChapters) : 0;
    window.__updateTop(Math.round((progressBase + within) * 100), state.score, state.scoredTotal);
    loadKatex();
  }

  function renderQuestion(card, q, total) {
    card.innerHTML = '';
    var qEl = el('div', 'q-question');
    qEl.innerHTML = inline(q.question || '');
    card.appendChild(qEl);

    var type = q.type;

    if (type === 'single' || type === 'multi') {
      var chosen = new Set();
      var optionCards = [];
      (q.options || []).forEach(function (opt, i) {
        var oc = el('div', 'option-card');
        oc.appendChild(el('div', 'letter', String.fromCharCode(65 + i)));
        var txt = el('div', 'txt');
        txt.innerHTML = inline(opt);
        oc.appendChild(txt);
        oc.onclick = function () {
          if (type === 'single') {
            chosen.clear(); chosen.add(i);
            optionCards.forEach(function (c, j) { c.classList.toggle('selected', j === i); });
          } else {
            if (chosen.has(i)) { chosen.delete(i); } else { chosen.add(i); }
            oc.classList.toggle('selected', chosen.has(i));
          }
        };
        optionCards.push(oc);
        card.appendChild(oc);
      });
      var btn = el('button', 'btn-submit', t('submitAnswer'));
      btn.onclick = function () {
        if (chosen.size === 0) { modal('⚠️', t('emptyAnswer'), '', [{ label: t('showExplain'), primary: true }]); return; }
        var correctArr = q.correct || [];
        var picked = Array.from(chosen);
        var isRight = type === 'single'
          ? correctArr.indexOf(picked[0]) !== -1
          : chosen.size === new Set(correctArr).size && picked.every(function (c) { return correctArr.indexOf(c) !== -1; });
        // 记录引导索引：优先第一个选错的选项
        var wrongPick = picked.filter(function (c) { return correctArr.indexOf(c) === -1; });
        q.__lastChosen = wrongPick.length ? wrongPick[0] : (picked[0] || 0);
        finishQuestion(q, isRight, function () {
          if (isRight) { state.score++; }
          state.scoredTotal++;
        });
      };
      card.appendChild(btn);
    } else if (type === 'judge') {
      var row = el('div', 'judge-row');
      var chosenJudge = null;
      var mkJudge = function (label, val) {
        var b = el('button', 'judge-btn', label);
        b.onclick = function () {
          chosenJudge = val;
          row.querySelectorAll('.judge-btn').forEach(function (x) { x.classList.remove('selected'); });
          b.classList.add('selected');
        };
        row.appendChild(b);
      };
      var stmt = el('div', 'q-question');
      stmt.innerHTML = inline(q.judgeStatement || q.question || '');
      card.appendChild(stmt);
      mkJudge(t('judgeTrue'), true);
      mkJudge(t('judgeFalse'), false);
      card.appendChild(row);
      var btnJ = el('button', 'btn-submit', t('submitAnswer'));
      btnJ.onclick = function () {
        if (chosenJudge === null) { modal('⚠️', t('emptyAnswer'), '', [{ label: t('showExplain'), primary: true }]); return; }
        var isRight = chosenJudge === q.correct;
        q.__lastChosen = chosenJudge === true ? 0 : 1; // optionHints[0]=认为正确时的引导 [1]=认为错误时的引导
        finishQuestion(q, isRight, function () {
          if (isRight) state.score++;
          state.scoredTotal++;
        });
      };
      card.appendChild(btnJ);
    } else if (type === 'match') {
      var pairs = q.pairs || [];
      var leftItems = shuffle(pairs.map(function (p, i) { return { text: p[0], idx: i, side: 'L' }; }));
      var rightItems = shuffle(pairs.map(function (p, i) { return { text: p[1], idx: i, side: 'R' }; }));
      var selLeft = null;
      var matched = 0;
      card.appendChild(el('div', 'q-hint', t('matchHint')));
      var grid = el('div', 'match-grid');
      var colL = el('div', 'match-col');
      var colR = el('div', 'match-col');
      leftItems.forEach(function (it) {
        var b = el('button', 'match-item', it.text);
        b.dataset.idx = it.idx;
        b.onclick = function () {
          if (b.classList.contains('done')) return;
          colL.querySelectorAll('.match-item').forEach(function (x) { x.classList.remove('sel'); });
          b.classList.add('sel');
          selLeft = b;
        };
        colL.appendChild(b);
      });
      rightItems.forEach(function (it) {
        var b = el('button', 'match-item', it.text);
        b.dataset.idx = it.idx;
        b.onclick = function () {
          if (b.classList.contains('done') || !selLeft) return;
          if (Number(b.dataset.idx) === Number(selLeft.dataset.idx)) {
            b.classList.add('done'); selLeft.classList.add('done');
            selLeft.classList.remove('sel');
            selLeft = null; matched++;
            beep(700, 0.1);
            if (matched === pairs.length) {
              state.score++; state.scoredTotal++;
              finishQuestion(q, true, function () {});
            }
          } else {
            b.classList.add('wrong-pair');
            beepWrong();
            setTimeout(function () { b.classList.remove('wrong-pair'); }, 600);
          }
        };
        colR.appendChild(b);
      });
      grid.appendChild(colL); grid.appendChild(colR);
      card.appendChild(grid);
      var btnM = el('button', 'btn-link', t('matchClear'));
      btnM.onclick = function () {
        colL.querySelectorAll('.match-item').forEach(function (x) { x.classList.remove('done', 'sel'); });
        colR.querySelectorAll('.match-item').forEach(function (x) { x.classList.remove('done', 'wrong-pair'); });
        selLeft = null; matched = 0;
      };
      card.appendChild(btnM);
    } else if (type === 'order') {
      var seq = q.sequence || [];
      var pool = shuffle(seq.map(function (s, i) { return { text: s, idx: i }; }));
      var chosenOrder = [];
      card.appendChild(el('div', 'q-hint', t('orderHint')));
      var poolEl = el('div', 'order-pool');
      var ansEl = el('div', 'order-answer');
      var redraw = function () {
        poolEl.innerHTML = ''; ansEl.innerHTML = '';
        pool.forEach(function (item) {
          var chip = el('button', 'order-chip' + (chosenOrder.indexOf(item) !== -1 ? ' used' : ''), item.text);
          chip.onclick = function () {
            chosenOrder.push(item);
            beep(520, 0.08);
            redraw();
          };
          poolEl.appendChild(chip);
        });
        chosenOrder.forEach(function (item, i) {
          var slot = el('div', 'order-slot filled');
          var no = el('span', 'no', String(i + 1));
          slot.appendChild(no);
          slot.appendChild(document.createTextNode(item.text));
          slot.onclick = function () {
            chosenOrder.splice(i, 1);
            beep(300, 0.08);
            redraw();
          };
          ansEl.appendChild(slot);
        });
      };
      redraw();
      card.appendChild(poolEl);
      card.appendChild(ansEl);
      var btnO = el('button', 'btn-submit', t('submitAnswer'));
      btnO.onclick = function () {
        if (chosenOrder.length !== seq.length) { modal('⚠️', t('emptyAnswer'), '', [{ label: t('showExplain'), primary: true }]); return; }
        var isRight = chosenOrder.every(function (item, i) { return item.idx === i; });
        finishQuestion(q, isRight, function () {
          if (isRight) state.score++;
          state.scoredTotal++;
        });
      };
      card.appendChild(btnO);
      var btnOc = el('button', 'btn-link', t('orderClear'));
      btnOc.onclick = function () { chosenOrder = []; redraw(); };
      card.appendChild(btnOc);
    } else if (type === 'fill') {
      var answers = q.answers || [];
      card.appendChild(el('div', 'q-hint', t('fillHint')));
      var rowF = el('div', 'fill-row');
      var inputs = [];
      answers.forEach(function (a, i) {
        var inp = el('input', 'fill-input');
        inp.type = 'text';
        inp.placeholder = (i + 1);
        rowF.appendChild(inp);
        inputs.push(inp);
      });
      card.appendChild(rowF);
      var btnF = el('button', 'btn-submit', t('submitAnswer'));
      btnF.onclick = function () {
        var allFilled = inputs.every(function (x) { return x.value.trim() !== ''; });
        if (!allFilled) { modal('⚠️', t('fillEmpty'), '', [{ label: t('showExplain'), primary: true }]); return; }
        var isRight = answers.every(function (a, i) {
          var ok = String(inputs[i].value).trim().toLowerCase() === String(a).trim().toLowerCase();
          inputs[i].classList.add(ok ? 'correct' : 'incorrect');
          return ok;
        });
        finishQuestion(q, isRight, function () {
          if (isRight) state.score++;
          state.scoredTotal++;
        });
      };
      card.appendChild(btnF);
    } else if (type === 'case') {
      var area = el('textarea', 'case-area');
      area.placeholder = t('caseHint');
      card.appendChild(area);
      var btnC = el('button', 'btn-submit', t('submitAnswer'));
      btnC.onclick = function () {
        if (!area.value.trim()) { modal('⚠️', t('emptyAnswer'), '', [{ label: t('showExplain'), primary: true }]); return; }
        var ref = el('div', 'reference-box');
        var rl = el('span', 'lbl', t('reference'));
        ref.appendChild(rl);
        ref.appendChild(document.createTextNode(q.explainRight || ''));
        card.appendChild(ref);
        btnC.disabled = true;
        var doneBtn = el('button', 'btn-submit', t('iReviewed'));
        doneBtn.onclick = function () { finishQuestion(q, true, function () { state.scoredTotal++; }, true); };
        card.appendChild(doneBtn);
      };
      card.appendChild(btnC);
    }
    loadKatex();
  }

  function finishQuestion(q, isRight, scoreFn, isCase) {
    if (isRight) {
      combo++;
      beepRight();
      var extra = combo >= 3
        ? '<p style="margin-top:10px;color:#b06f00;font-weight:800;font-size:13px">' + t('combo3') + '</p>'
        : '';
      modal('🎉', t('correct'), '<strong>' + esc(q.explainRight || '') + '</strong>' + extra, [
        {
          label: state.isLastInChapter() ? (state.chapter === COURSE.chapters.length - 1 ? t('seeResults') : t('nextChapter')) : t('nextQuestion'),
          primary: true,
          onClick: function () { scoreFn(); advance(); },
        },
      ]);
    } else {
      combo = 0;
      beepWrong();
      var hint = hintFor(q, q.__lastChosen || 0);
      // 收集错题（供错题本与针对性复习课）
      state.wrongList.push({ question: q.question || q.judgeStatement || q.casePrompt || "", answer: correctAnswerText(q) });
      modal('🤔', t('wrong'), '<strong>' + esc(hint) + '</strong>', [
        { label: t('showExplain'), primary: true },
      ]);
    }
  }

  function correctAnswerText(q) {
    if (q.type === 'single' || q.type === 'multi') {
      return (q.correct || []).map(function (i) { return (q.options || [])[i] || ''; }).join('；');
    }
    if (q.type === 'judge') return q.correct ? t('judgeTrue') : t('judgeFalse');
    if (q.type === 'match') return (q.pairs || []).map(function (p) { return p[0] + ' ↔ ' + p[1]; }).join('；');
    if (q.type === 'order') return (q.sequence || []).join(' → ');
    return q.explainRight || '';
  }

  function advance() {
    var ch = COURSE.chapters[state.chapter];
    var quiz = ch.quiz || [];
    if (state.qIndex < quiz.length - 1) {
      state.qIndex++;
      renderChapter();
    } else {
      state.badges.push(ch.reward || ch.title);
      send('CHAPTER_DONE', { chapter: state.chapter + 1, title: ch.title });
      if (state.chapter < COURSE.chapters.length - 1) {
        modal('🏆', t('chapterClear') + ' · ' + t('badgeEarned') + ': ' + (ch.reward || ch.title), '', [
          { label: t('nextChapter'), primary: true, onClick: function () { openChapter(state.chapter + 1); } },
        ]);
      } else {
        renderFinale();
      }
    }
  }
  state.isLastInChapter = function () {
    var ch = COURSE.chapters[state.chapter];
    return state.qIndex >= (ch.quiz || []).length - 1;
  };

  function renderFinale() {
    var m = COURSE.meta;
    root.innerHTML = '';
    var f = el('div', 'finale');
    f.appendChild(el('div', 'trophy', '🏆'));
    f.appendChild(el('h2', null, COURSE.finale.title || t('courseComplete')));
    var scoreCard = el('div', 'score-card');
    scoreCard.appendChild(el('div', 'big', state.score + ' / ' + state.scoredTotal));
    scoreCard.appendChild(el('div', 'small', t('finalScore')));
    f.appendChild(scoreCard);

    if (state.badges.length) {
      var wall = el('div', 'badge-wall');
      state.badges.forEach(function (b) {
        wall.appendChild(el('div', 'badge-chip', '🏅 ' + b));
      });
      f.appendChild(wall);
    }

    // 费曼输出（生成效应：用自己的话讲清楚 = 真学会）
    var fyn = el('div', 'finale-form');
    fyn.appendChild(el('h4', null, t('feynmanTitle')));
    var fp = el('div', 'feynman-prompt');
    fp.textContent = t('feynmanPrompt');
    fyn.appendChild(fp);
    var kpMap = [];
    COURSE.chapters.forEach(function (c) {
      (c.keyPoints || []).forEach(function (k) { kpMap.push({ ch: c.title, kp: k }); });
    });
    var sel = el('select', 'fill-input');
    kpMap.forEach(function (item, i) {
      var opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = item.ch + ' · ' + item.kp;
      sel.appendChild(opt);
    });
    fyn.appendChild(sel);
    var fa = el('textarea', 'finale-area');
    fa.placeholder = t('feynmanPrompt');
    fyn.appendChild(fa);
    var fc = el('button', 'btn-submit', t('feynmanCompare'));
    fc.onclick = function () {
      var item = kpMap[Number(sel.value)] || kpMap[0] || { kp: '' };
      modal('🎓', t('feynmanCompare'), '<strong>' + esc(item.kp) + '</strong><br>' + esc(t('feynmanDone')), [
        { label: 'OK', primary: true },
      ]);
    };
    fyn.appendChild(fc);
    f.appendChild(fyn);

    // 错题回顾
    if (state.wrongList.length) {
      var wr = el('div', 'wrong-review');
      wr.appendChild(el('h4', null, t('wrongReviewTitle')));
      state.wrongList.forEach(function (w) {
        var item = el('div', 'wrong-item');
        var qEl = el('div', 'q', w.question);
        item.appendChild(qEl);
        var aEl = el('div', 'a', w.answer);
        item.appendChild(aEl);
        wr.appendChild(item);
      });
      f.appendChild(wr);
    }

    // 术语表
    var glossary = COURSE.glossary || [];
    if (glossary.length) {
      var g = el('div', 'glossary');
      g.appendChild(el('h4', null, t('glossaryTitle')));
      glossary.forEach(function (item) {
        var gi = el('div', 'glossary-item');
        gi.innerHTML = '<b>' + esc(item.term) + '</b> — ' + esc(item.definition || '');
        g.appendChild(gi);
      });
      f.appendChild(g);
    }

    // 最终发现
    var form = el('div', 'finale-form');
    form.appendChild(el('h4', null, t('finaleHint')));
    var area = el('textarea', 'finale-area');
    area.placeholder = t('finalePlaceholder');
    form.appendChild(area);
    var fb = el('div', 'fb-box hidden');
    var fbl = el('span', 'lbl', t('aiFeedback'));
    fb.appendChild(fbl);
    var fbText = el('div');
    fb.appendChild(fbText);
    form.appendChild(fb);
    var submitBtn = el('button', 'btn-submit', t('finaleSubmit'));
    submitBtn.onclick = function () {
      if (!area.value.trim()) { modal('⚠️', t('emptyAnswer'), '', [{ label: t('showExplain'), primary: true }]); return; }
      if (state.finaleSent) return;
      state.finaleSent = true;
      submitBtn.disabled = true;
      submitBtn.textContent = t('finaleSubmitted');
      sendFinale(area.value.trim());
      sendSave();
    };
    form.appendChild(submitBtn);
    f.appendChild(form);

    // 按意见重新生成（与分享社区并列：学习完后的最后一步）
    var regenBox = el('div', 'finale-form');
    regenBox.appendChild(el('h4', null, t('regenTitle')));
    var regenArea = el('textarea', 'finale-area');
    regenArea.placeholder = t('regenPlaceholder');
    regenBox.appendChild(regenArea);
    var regenBtn = el('button', 'btn-submit', t('regenBtn'));
    regenBtn.onclick = function () {
      var fb = regenArea.value.trim();
      if (!fb) { modal('⚠️', t('emptyAnswer'), '', [{ label: t('showExplain'), primary: true }]); return; }
      if (regenBtn.disabled) return;
      send('ASK_REGENERATE', { feedback: fb });
      regenBtn.disabled = true;
      regenBtn.textContent = t('regenSent');
    };
    regenBox.appendChild(regenBtn);
    f.appendChild(regenBox);

    // 询问是否分享到社区
    var shareBox = el('div', 'finale-form');
    shareBox.appendChild(el('h4', null, t('shareAskTitle')));
    var shareP = el('div', 'feynman-prompt');
    shareP.textContent = t('shareAskText');
    shareBox.appendChild(shareP);
    var shareBtn = el('button', 'btn-submit', t('shareAskBtn'));
    shareBtn.onclick = function () {
      send('ASK_SHARE', { courseTitle: COURSE.meta.title });
      shareBtn.disabled = true;
      shareBtn.textContent = t('shareAsked');
    };
    shareBox.appendChild(shareBtn);
    f.appendChild(shareBox);

    var back = el('button', 'btn-link', '← ' + t('backToCover'));
    back.onclick = function () { state.finaleSent = false; renderCover(); };
    f.appendChild(back);

    root.appendChild(f);
    window.__updateTop(100, state.score, state.scoredTotal);
    sendSave();
  }

  // 监听父页面 AI 反馈
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'AI_FEEDBACK') {
      var fb = document.querySelector('.fb-box');
      if (fb) {
        fb.classList.remove('hidden');
        var body = fb.querySelector('.fb-box div:not(.lbl)');
        if (body) body.textContent = (e.data.payload && e.data.payload.comment) || '';
      }
    }
  });

  // 启动
  topbar();
  renderCover();
})();
`;

// ---------- 组装完整 HTML 文档 ----------
export function lessonHtml(course) {
  const lang = course?.meta?.lang || "zh";
  const rtl = ["ar", "fa", "he", "ur"].includes(lang);
  const courseJson = JSON.stringify(course).replace(/</g, "\\u003c");
  const runtimeI18nJson = JSON.stringify({ dict: RUNTIME_I18N, common: COMMON_RT, share: SHARE_RT, lang }).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="${lang}"${rtl ? ' dir="rtl"' : ""}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="generator" content="NEBULA AI Agent v2">
<title>${escapeHtml(course?.meta?.title || "NEBULA Course")}</title>
<style>${LESSON_CSS}</style>
</head>
<body>
<script>
window.__COURSE__ = ${courseJson};
window.__T__ = (function () {
  var payload = ${runtimeI18nJson};
  var dict = payload.dict[payload.lang] || payload.dict.en || {};
  var common = payload.common[payload.lang] || payload.common.en || {};
  var share = payload.share[payload.lang] || payload.share.en || {};
  var en = payload.dict.en || {};
  return {
    t: function (key, vars) {
      var text = dict[key] != null ? dict[key] : (common[key] != null ? common[key] : (share[key] != null ? share[key] : (en[key] != null ? en[key] : key)));
      if (vars) for (var k in vars) text = text.split('{' + k + '}').join(String(vars[k]));
      return text;
    }
  };
})();
</script>
<script>
${RUNTIME_SOURCE}
</script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
