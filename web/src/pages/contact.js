// pages/contact.js - 关于我们 / 联系我们：联系方式 + 合作 + 工单提交

import { api } from "../core.js";

const L = {
  zh: {
    title: "关于我们",
    hero: "GET IN TOUCH WITH NEBULA",
    sub: "Have questions about NEBULA or want to collaborate? We'd love to hear from you.",
    contactTitle: "联系方式",
    emailLabel: "官方邮箱",
    wechatLabel: "微信",
    regionLabel: "地区",
    region: "中国北京市海淀区",
    collabTitle: "想与我们合作？",
    collabText: "无论你是学校、机构，还是热爱经济学教育的个人，我们都始终欢迎新的合作。",
    ticketTitle: "提交工单",
    ticketSub: "留下你的问题，我们会通过官方邮箱答复你",
    nameLabel: "你的名字",
    emailLabel2: "你的邮箱",
    subjectLabel: "问题主题",
    contentLabel: "问题具体内容",
    submitBtn: "提交工单",
    sentOk: "工单已提交，我们会尽快通过官方邮箱联系你 ✓",
  },
  en: {
    title: "About Us",
    hero: "GET IN TOUCH WITH NEBULA",
    sub: "Have questions about NEBULA or want to collaborate? We'd love to hear from you.",
    contactTitle: "Contact",
    emailLabel: "Email",
    wechatLabel: "WeChat",
    regionLabel: "Location",
    region: "Haidian District, Beijing, China",
    collabTitle: "想与我们合作？",
    collabText: "无论你是学校、机构，还是热爱经济学教育的个人，我们都始终欢迎新的合作。",
    ticketTitle: "Submit a Ticket",
    ticketSub: "Leave your question and we will reply via our official email",
    nameLabel: "Your name",
    emailLabel2: "Your email",
    subjectLabel: "Subject",
    contentLabel: "Details",
    submitBtn: "Submit Ticket",
    sentOk: "Ticket submitted. We'll contact you via official email soon ✓",
  }
};
export function contactHtml() {
  const lang = L[document.documentElement.lang] ? document.documentElement.lang : "en";
  const s = L[lang] || L.en;
  return `
  <div class="contact-page">
    <section class="contact-hero">
      <h1>${esc(s.hero)}</h1>
      <p>${esc(s.sub)}</p>
    </section>

    <div class="contact-grid">
      <div class="contact-left">
        <div class="glass contact-card">
          <h3>${esc(s.contactTitle)}</h3>
          <div class="contact-line">
            <span class="contact-ico">✉️</span>
            <div><b>${esc(s.emailLabel)}</b><div>nebula.vessel@outlook.com</div></div>
          </div>
          <div class="contact-line">
            <span class="contact-ico">💬</span>
            <div><b>${esc(s.wechatLabel)}</b><div>17732850060</div></div>
          </div>
          <div class="contact-line">
            <span class="contact-ico">📍</span>
            <div><b>${esc(s.regionLabel)}</b><div>${esc(s.region)}</div></div>
          </div>
        </div>

        <div class="glass contact-card collab">
          <h3>${esc(s.collabTitle)}</h3>
          <p>${esc(s.collabText)}</p>
        </div>
      </div>

      <div class="glass contact-card ticket-card">
        <h3>${esc(s.ticketTitle)}</h3>
        <p class="ticket-sub">${esc(s.ticketSub)}</p>
        <input class="input" id="tk-name" placeholder="${esc(s.nameLabel)}" />
        <input class="input" id="tk-email" type="email" placeholder="${esc(s.emailLabel2)}" />
        <input class="input" id="tk-subject" placeholder="${esc(s.subjectLabel)}" />
        <textarea class="textarea" id="tk-content" rows="5" placeholder="${esc(s.contentLabel)}"></textarea>
        <button class="btn btn-primary" data-action="ticket-submit">${esc(s.submitBtn)}</button>
        <div id="tk-result" style="font-size:12.5px;color:var(--success);min-height:16px;margin-top:4px"></div>
      </div>
    </div>
  </div>`;
}

document.addEventListener("click", async (e) => {
  if (!e.target.closest('[data-action="ticket-submit"]')) return;
  const name = document.querySelector("#tk-name")?.value.trim();
  const email = document.querySelector("#tk-email")?.value.trim();
  const subject = document.querySelector("#tk-subject")?.value.trim();
  const content = document.querySelector("#tk-content")?.value.trim();
  const result = document.querySelector("#tk-result");
  if (!result) return;
  try {
    const res = await api.ticket({ name, email, subject, content });
    result.style.color = "var(--success)";
    result.textContent = res.message || "OK";
    ["#tk-name", "#tk-email", "#tk-subject", "#tk-content"].forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) el.value = "";
    });
  } catch (err) {
    result.style.color = "var(--danger)";
    result.textContent = err.message;
  }
});

function esc(x) {
  return String(x ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
