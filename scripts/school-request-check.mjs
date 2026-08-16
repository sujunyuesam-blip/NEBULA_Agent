// school-request-check.mjs - 注册页未登录申请学校流程验证（生产）
import { chromium } from "playwright";

const WEB = "https://www.nebulavessel.com";
let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

async function main() {
  console.log(`\n[NEBULA 未登录申请学校验证] ${WEB}\n`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => console.log("   [pageerror]", e.message));
  try {
    await page.goto(`${WEB}/?t=${Date.now()}`, { waitUntil: "networkidle" });
    await page.click('[data-action="show-auth"]');
    await page.waitForSelector("#auth-layer", { timeout: 5000 });
    await page.click('[data-auth-mode="register"]');
    await page.waitForTimeout(500);

    // 展开学校申请表单
    await page.click("#school-request-btn");
    await page.waitForTimeout(300);
    const visible = await page.locator("#school-request").isVisible();
    check("申请表单展开", visible);

    const name = "端到端测试附属中学";
    await page.fill("#sr-name", name);
    await page.fill("#sr-region", "测试省");
    await page.click("#sr-submit");
    await page.waitForTimeout(2000);
    const result = await page.locator("#sr-result").innerText();
    check("未登录提交成功（无 401）", !result.includes("未登录") && !result.includes("会话"), `提示: ${result}`);
    console.log(`   [提示语] ${result}`);
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
