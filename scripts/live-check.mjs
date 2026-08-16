// live-check.mjs - 线上关键功能验证（token 登录，绕过验证码/Turnstile）
import { chromium } from "playwright";
import { readFileSync } from "fs";

const token = readFileSync(".deploy-secrets.txt", "utf8").split("\n")[0].trim();
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGE ERR:", e.message.slice(0, 300)));
await page.goto("https://www.nebulavessel.com", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
// token 登录
await page.click('[data-action="show-auth"]');
await page.click("#auth-token-mode");
await page.fill("#auth-token", token);
await page.click("#auth-submit");
await page.waitForTimeout(2000);
console.log("登录层关闭:", (await page.locator("#auth-layer").count()) === 0);
// 主页第一次
await page.click('[data-action="nav"][data-hash="#/profile"]');
await page.waitForTimeout(2500);
console.log("第一次主页:", await page.locator(".profile-hero").count());
// 编辑资料
await page.click('[data-action="edit-profile"]');
await page.waitForTimeout(800);
console.log("编辑表单出现:", await page.locator("#ep-name").count());
console.log("emoji 选择器个数:", await page.locator(".emoji-opt").count());
// 社区往返后第二次主页
await page.click('[data-action="nav"][data-hash="#/community"]');
await page.waitForTimeout(1500);
await page.click('[data-action="nav"][data-hash="#/profile"]');
await page.waitForTimeout(2500);
console.log("第二次主页:", await page.locator(".profile-hero").count());
console.log("hash:", await page.evaluate(() => location.hash));
await browser.close();
