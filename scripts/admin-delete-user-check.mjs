// admin-delete-user-check.mjs - 生产环境管理员删除用户 UI 验证（只测弹窗，不真删）
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";

const WEB = "https://www.nebulavessel.com";
const b64 = (buf) => Buffer.from(buf).toString("base64url");
const secret = readFileSync(new URL("../.deploy-secrets.txt", import.meta.url), "utf-8").split("\n")[1].trim();
const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const now = Math.floor(Date.now() / 1000);
const body = b64(JSON.stringify({ sub: "9085ab09-8ebc-4c31-b118-d809ddeb2d17", role: "admin", name: "Sam Su", emoji: "🦉", iat: now, exp: now + 3600 }));
const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest();
const JWT = `${header}.${body}.${b64(sig)}`;

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

async function main() {
  console.log(`\n[NEBULA 管理员删除用户 UI 验证] ${WEB}\n`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => console.log("   [pageerror]", e.message));
  try {
    await page.goto(`${WEB}/?t=${Date.now()}`, { waitUntil: "networkidle" });
    await page.evaluate((t) => localStorage.setItem("nebula_session", t), JWT);
    await page.goto(`${WEB}/?t=${Date.now()}#/admin`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.click('[data-action="admin-tab"][data-value="users"]');
    await page.waitForTimeout(2500);

    // 1. 普通用户行有删除按钮
    const delBtns = page.locator('[data-action="admin-delete-user"]');
    const n = await delBtns.count();
    check(`删除按钮出现（${n} 个普通用户）`, n >= 1, `0 个`);

    // 2. 管理员自己的行无删除按钮
    const ownRow = page.locator('.mod-card', { hasText: "sujunyue_sam@outlook.com" });
    const ownDel = ownRow.locator('[data-action="admin-delete-user"]');
    check("管理员自己无删除按钮", (await ownDel.count()) === 0);

    // 3. nebula-user 行无删除按钮
    const guestRow = page.locator('.mod-card', { hasText: "nebula-user@nebula.local" });
    const guestDel = guestRow.locator('[data-action="admin-delete-user"]');
    check("访客账号无删除按钮", (await guestDel.count()) === 0);

    // 4. 点击删除 → 确认弹窗出现 → 取消关闭
    if (n >= 1) {
      await delBtns.first().click();
      await page.waitForTimeout(500);
      const modal = page.locator("#deluser-modal");
      check("确认弹窗出现", await modal.isVisible());
      await page.click('[data-action="cancel-delete-user"]');
      await page.waitForTimeout(300);
      check("取消后弹窗关闭", (await page.locator("#deluser-modal").count()) === 0);
    }
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
