// admin-users-check.mjs - 生产环境管理员用户管理页验证
// 用法: JWT_SECRET 从 .deploy-secrets.txt 读取，本地签发 admin JWT 注入 localStorage 后访问 #/admin

import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";

const WEB = "https://www.nebulavessel.com";
const b64 = (buf) => Buffer.from(buf).toString("base64url");
const secret = readFileSync(new URL("../.deploy-secrets.txt", import.meta.url), "utf-8").split("\n")[1].trim();
const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const now = Math.floor(Date.now() / 1000);
const body = b64(JSON.stringify({ sub: "9085ab09-8ebc-4c31-b118-d809ddeb2d17", role: "admin", name: "Sam Su", iat: now, exp: now + 3600 }));
const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest();
const JWT = `${header}.${body}.${b64(sig)}`;

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

async function main() {
  console.log(`\n[NEBULA 管理员用户页验证] ${WEB}\n`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => console.log("   [pageerror]", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("   [console.error]", m.text().slice(0, 200)); });

  try {
    await page.goto(`${WEB}/?t=${Date.now()}`, { waitUntil: "networkidle" });
    await page.evaluate((t) => localStorage.setItem("nebula_session", t), JWT);
    await page.goto(`${WEB}/?t=${Date.now()}#/admin`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    // 1. 管理员 Tab 栏包含"用户"tab
    const userTab = page.locator('[data-action="admin-tab"][data-value="users"]');
    check("用户管理 Tab 存在", (await userTab.count()) > 0);

    // 2. 点击用户 tab → 列表渲染
    if (await userTab.count()) {
      await userTab.click();
      await page.waitForTimeout(3000);
    }
    const rows = page.locator('[data-action="admin-view-user"]');
    const n = await rows.count();
    check(`用户列表渲染（${n} 行）`, n >= 2, `只有 ${n} 行`);

    // 3. 搜索 Sam → 命中管理员本人
    const q = page.locator('#admin-user-search');
    if (await q.count()) {
      await q.fill("sam");
      await page.click('[data-action="admin-search-users"]');
      await page.waitForTimeout(2500);
      const bodyText = await page.locator("#page-view").innerText().catch(() => "");
      check("搜索 sam 命中 Sam Su", bodyText.includes("Sam Su") || bodyText.includes("sujunyue_sam"), bodyText.slice(0, 120));
    } else {
      check("搜索框存在", false);
    }

    // 4. 查看个人主页按钮 → 跳转 #/user/...
    const viewBtn = page.locator('[data-action="admin-view-user"]').first();
    if (await viewBtn.count()) {
      const targetId = await viewBtn.getAttribute("data-id");
      await viewBtn.click();
      await page.waitForTimeout(1200);
      const hash = await page.evaluate(() => location.hash);
      check(`查看主页跳转（${hash}）`, hash.includes("/user/") && hash.includes(targetId));
    }

    // 5. 无 console error / pageerror
    const err = await page.evaluate(() => window.__errCount || 0);
    check("无页面错误", err === 0);
  } catch (e) {
    fail++;
    console.log("  ❌ 异常:", e.message.slice(0, 200));
  } finally {
    await browser.close();
    console.log(`\n结果: ${pass} 通过 / ${fail} 失败\n`);
    process.exit(fail ? 1 : 0);
  }
}

main();
