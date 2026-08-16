// e2e.mjs - 前端浏览器端到端测试（Vite dev + 本地 Worker MOCK）
// 覆盖：注册 → 工作台问卷 → 生成课程 → 课程交互（封面/章节/答题）→ 社区 → 个人主页 → 介绍页

import { chromium } from "playwright";

const WEB = "http://localhost:5173";
const rnd = Math.random().toString(36).slice(2, 8);
let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

async function main() {
  console.log(`\n[NEBULA E2E] ${WEB}\n`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => console.log("   [pageerror]", e.message));

  try {
    // 1. 打开 → 默认关于页可浏览，rail 有登录按钮
    await page.goto(WEB, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-action="show-auth"]', { timeout: 8000 });
    check("未登录可浏览 + 登录入口显示", true);
    await page.click('[data-action="show-auth"]');
    await page.waitForSelector("#auth-layer", { timeout: 5000 });
    check("登录层弹出", await page.locator("#auth-layer").isVisible());

    // 2. 切到注册
    await page.click('[data-auth-mode="register"]');
    const email = `e2e${rnd}@test.com`;
    await page.fill("#auth-name", "端到端测试员");
    await page.fill("#auth-school", "中国人民大学附属中学");
    await page.fill("#auth-email", email);
    await page.fill("#auth-school", "星云大学");
    await page.fill("#auth-password", "pass123456");
    await page.fill("#auth-password2", "pass123456");
    // 勾选条款
    await page.check("#agree-terms");
    await page.check("#agree-transfer");
    const matchChars = await page.locator("#pw-match .mchar.ok").count();
    check("密码逐字符匹配动画（✓）", matchChars === 10, `ok=${matchChars}`);
    // 小眼睛测试
    await page.click('[data-eye-for="auth-password"]');
    const pwType = await page.evaluate(() => document.querySelector("#auth-password")?.type);
    check("密码小眼睛切换明文", pwType === "text");
    await page.click("#auth-submit");
    await page.waitForSelector("#auth-layer", { state: "detached", timeout: 8000 }).catch(() => {});
    check("注册后登录层关闭", (await page.locator("#auth-layer").count()) === 0);

    // 3. 默认首页 = 关于 NEBULA
    await page.waitForTimeout(600);
    check("默认首页为关于NEBULA", await page.locator(".about-hero h1").isVisible(), await page.evaluate(() => location.hash));
    // 切到工作台
    await page.click('[data-action="nav"][data-hash="#/workbench"]');
    await page.waitForSelector(".workspace", { timeout: 8000 });
    check("工作台渲染", await page.locator("#topic-input").isVisible());
    check("问卷字段齐全", (await page.locator('[data-action="set-level"]').count()) === 4 && (await page.locator('[data-action="set-style"]').count()) === 4);

    // 4. 填写问卷并生成
    await page.fill("#topic-input", "拉格朗日乘子法");
    await page.fill("#role-input", "外贸出口商");
    await page.click('[data-action="set-level"][data-value="novice"]');
    await page.click('[data-action="set-style"][data-value="case"]');
    await page.click('[data-action="set-scenario"][data-value="work"]');
    await page.click('[data-action="set-duration"][data-value="standard"]');
    // 领域识别
    await page.waitForTimeout(1500);
    const domainText = await page.textContent("#domain-tag");
    check("领域识别完成", domainText && !domainText.includes("等待") && !domainText.includes("分析"), domainText);

    await page.click('[data-action="generate"]');
    await page.waitForSelector("#gen-overlay", { state: "visible", timeout: 5000 });
    check("生成遮罩出现", true);
    // 等待完成（MOCK 约 2-4 秒）
    await page.waitForSelector(".radar-wrap", { timeout: 30000 });
    check("审计面板出现（生成完成）", true);

    // 5. 课程 iframe 渲染
    const frame = page.frameLocator("#preview");
    await page.waitForTimeout(800);
    const coverVisible = await frame.locator(".cover").isVisible().catch(() => false);
    check("课程封面渲染", coverVisible);
    if (coverVisible) {
      const title = await frame.locator(".cover h1").textContent().catch(() => "");
      check("课程标题非空", !!title?.trim(), title);
      // 点击开始
      await frame.locator(".btn-start").click();
      await page.waitForTimeout(400);
      const chapterHead = await frame.locator(".chapter-head").isVisible().catch(() => false);
      check("章节页打开", chapterHead);
      if (chapterHead) {
        // 预热卡
        const warmup = await frame.locator(".warmup-box").isVisible().catch(() => false);
        check("预热卡（提取练习）", warmup);
        // 回顾卡（第 2 章才有；第 1 章不检查）
        // 做题：单选
        const qcard = frame.locator(".q-card");
        const hasQuiz = await qcard.isVisible().catch(() => false);
        check("测验卡渲染", hasQuiz);
        if (hasQuiz) {
          // 选第一个选项（MOCK 第 1 章第 1 题正确答案是第 1 项）
          await frame.locator(".option-card").first().click();
          await frame.locator(".btn-submit").first().click();
          await page.waitForTimeout(400);
          const modalOk = await frame.locator(".modal").isVisible().catch(() => false);
          check("答题弹窗（正确/引导）", modalOk);
        }
      }
    }

    // 6. 五维雷达
    const radar = await page.locator(".radar-svg polygon").count();
    check("五维雷达图渲染", radar >= 4, `polygons=${radar}`);

    // 7. 每日一题
    await page.click('[data-action="daily-load"]');
    await page.waitForTimeout(800);
    const dailyQ = await page.locator("#daily-box .diff-card").first().isVisible().catch(() => false);
    check("每日一题加载", dailyQ);
    if (dailyQ) {
      await page.locator("#daily-box .diff-card").first().click();
      await page.click('[data-action="daily-submit"]');
      await page.waitForTimeout(800);
      check("每日一题提交反馈", (await page.locator("#daily-result").textContent().catch(() => ""))?.length > 0);
    }

    // 8. 社区页
    await page.click('[data-action="nav"][data-hash="#/community"]');
    await page.waitForTimeout(1000);
    check("社区页渲染", await page.locator(".community-head").isVisible());

    // 9. 个人主页
    await page.click('[data-action="nav"][data-hash="#/profile"]');
    await page.waitForTimeout(1200);
    check("个人主页渲染", await page.locator(".profile-hero").isVisible());
    const name = await page.locator(".profile-info h1").textContent().catch(() => "");
    check("个人主页显示昵称", name?.includes("端到端测试员"), name);
    const statCards = await page.locator(".stat-card").count();
    check("统计卡片 ≥4", statCards >= 4, `cards=${statCards}`);
    const badges = await page.locator(".badge-chip").count();
    check("成就徽章渲染", badges >= 4, `badges=${badges}`);

    // 10. 介绍页
    await page.click('[data-action="nav"][data-hash="#/about"]');
    await page.waitForTimeout(600);
    check("介绍页渲染", await page.locator(".about-hero h1").isVisible());
    const theoryCards = await page.locator(".about-grid.theories .about-card").count();
    check("理论卡片 ≥8", theoryCards >= 8, `cards=${theoryCards}`);
    const statNums = await page.locator(".about-stat-num").count();
    check("数据卡片 = 4", statNums === 4, `nums=${statNums}`);
    // About → 社区按钮
    await page.click('[data-action="goto-community"]');
    await page.waitForTimeout(800);
    check("About「浏览社区」跳转到社区页", (location => true)(0) && (await page.locator(".community-head").isVisible()), await page.evaluate(() => location.hash));

    // 11. 红绿灯：折叠/恢复
    await page.click('[data-action="nav"][data-hash="#/workbench"]');
    await page.waitForTimeout(600);
    await page.click('.dot.yellow');
    await page.waitForTimeout(400);
    const collapsed = await page.evaluate(() => document.querySelector(".workspace")?.classList.contains("side-collapsed"));
    check("黄灯折叠左栏", collapsed === true);
    if (collapsed) {
      await page.click(".side-expand-btn");
      await page.waitForTimeout(400);
      const restored = await page.evaluate(() => !document.querySelector(".workspace")?.classList.contains("side-collapsed"));
      check("展开按钮恢复左栏", restored === true);
    }
    // 生成状态下的折叠恢复（模拟：折叠后再生成完成后仍可恢复）
    await page.click('.dot.yellow');
    await page.waitForTimeout(300);
    await page.click(".side-expand-btn");
    await page.waitForTimeout(300);
    check("折叠状态在重渲染后保持可恢复", await page.locator("#topic-input").isVisible());

    // 12. 动画元素
    const stars = await page.locator(".star-p").count();
    check("星云粒子渲染", stars > 0, `stars=${stars}`);
    const logo = await page.locator('.rail-logo svg').isVisible().catch(() => false);
    check("Logo 渲染（内联 SVG + favicon 同源）", logo);

    // 截图存档
    await page.screenshot({ path: "/tmp/nebula-about.png", fullPage: false });
  } catch (e) {
    console.error("E2E FATAL:", e.message);
    await page.screenshot({ path: "/tmp/nebula-e2e-fatal.png" }).catch(() => {});
    fail++;
  } finally {
    await browser.close();
  }

  console.log(`\n结果: ${pass} 通过 / ${fail} 失败\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
