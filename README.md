# NEBULA AI Agent v2

个性化教育 Agent 孵化器 —— 输入主题、身份与难度，一键孵化基于学习科学实证的游戏化交互课程。

- 前端：`www.nebulavessel.com`（Cloudflare Worker `nebula-web` 静态托管）
- 后端：`api.nebulavessel.com`（Cloudflare Worker `nebula-api` + D1 `nebula-db`）
- **状态：已部署上线（真实 DeepSeek API）**
- 文档：[PRD.md](./PRD.md)（定位/理念/理论支撑/实施结果）

## 线上信息

| 项 | 值 |
|---|---|
| 前端 | https://www.nebulavessel.com |
| 后端 | https://api.nebulavessel.com |
| 登录方式 | 邮箱注册/登录，或访问口令（Access Token）：见 `.deploy-secrets.txt` |
| 模型 | DeepSeek-V4-Flash（默认）/ V4-Pro（实际 API 名 `deepseek-v4-flash` / `deepseek-v4-pro`）|
| 管理员 | 在 `worker/wrangler.toml` 配置 `ADMIN_EMAILS` 后重新部署，该邮箱注册即为管理员 |

## 更新部署

```bash
export HOME=$PWD/.fake-home   # 本机 wrangler 凭据重定向目录

# 后端改动后：
cd worker && npx wrangler deploy

# 前端改动后：
cd web && VITE_API_BASE=https://api.nebulavessel.com npx vite build && chmod 644 dist/logo.svg
cd ../web-worker && npx wrangler deploy
```

## 目录结构

```
nebula/
├── PRD.md                    # 产品文档（含理论支撑与实施结果）
├── web/                      # 前端（Vite，原生 ES 模块，无框架依赖）
│   └── src/
│       ├── app.js            # 路由 + 顶栏 + 登录/注册 + 星云粒子
│       ├── core.js           # 共享状态与工具
│       ├── api/client.js     # API 客户端（SSE 流式生成）
│       ├── i18n/             # 12 语言引擎
│       ├── pages/            # 工作台/社区/个人主页/管理后台/介绍页
│       ├── renderer/         # 确定性课程渲染器（AI 只生成 JSON）
│       └── styles/           # NDS 设计系统 + 星云动画
├── worker/                   # 后端（Cloudflare Worker）
│   ├── wrangler.toml         # 部署与变量配置
│   ├── schema.sql            # D1 建表（用户/课程/社区/激励）
│   └── src/
│       ├── index.js          # 路由入口
│       ├── pipeline.js       # 生成管线（大纲→讲解→题卡→审计）
│       ├── prompts.js        # JSON Schema + 教学法引擎
│       ├── deepseek.js       # LLM 调用（Function Calling + 三级降级）
│       ├── community.js      # 社区 + AI 审核 + 人工复核
│       ├── gamify.js         # XP/等级/Streak/成就/排行榜
│       └── ...               # auth/daily/plan/audit/reflect/identify/mock
└── scripts/
    ├── smoke-api.mjs         # API 冒烟测试（43 项断言）
    ├── e2e.mjs               # 浏览器 E2E（25 项断言）
    ├── live-check.mjs        # 生产环境 token 登录冒烟
    └── admin-users-check.mjs # 生产环境管理员用户管理页验证（本地签发 admin JWT 注入 localStorage）
```

## 本地开发

```bash
# 1. 安装依赖（如遇 npm 缓存权限问题可加 --cache ./.npm-cache）
npm install

# 2. 初始化本地 D1（MOCK 模式无需任何 API Key）
cd worker
rm -rf .wrangler/state/v3/d1   # 可选：重置本地数据
HOME=$PWD/../.fake-home npx wrangler d1 execute nebula-db --local --file=./schema.sql
```

> 说明：wrangler 需要写 `~/Library/Preferences/.wrangler`。若沙箱/权限受限，用 `HOME=<工作区>/.fake-home` 重定向（如上）。

```bash
# 3. 启动后端（MOCK=1 时全部 AI 接口返回内置样例，无需 DeepSeek Key）
cd worker && HOME=$PWD/../.fake-home npx wrangler dev --port 8787 \
  --var MOCK:1 --var ADMIN_EMAILS:admin@nebula.test

# 4. 启动前端（新终端；/api 自动代理到 8787）
cd web && npx vite --port 5173

# 5. 打开 http://localhost:5173
#    注册任意账号；admin@nebula.test 注册后为管理员（可访问 #/admin 管理后台）
```

## 自动化测试

```bash
# API 冒烟（Worker 运行中）
node scripts/smoke-api.mjs

# 浏览器 E2E（需先 npm i -D playwright 并安装 Chromium 到工作区）
PLAYWRIGHT_BROWSERS_PATH=$PWD/.pw-browsers npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=$PWD/.pw-browsers node scripts/e2e.mjs
```

## 生产部署（回归原域名）

### 后端 → api.nebulavessel.com

```bash
cd worker

# 1. 创建 D1 数据库（记下返回的 database_id，填入 wrangler.toml）
npx wrangler d1 create nebula-db

# 2. 建表
npx wrangler d1 execute nebula-db --remote --file=./schema.sql

# 3. 设置密钥（务必替换默认值）
npx wrangler secret put DEEPSEEK_API_KEY     # DeepSeek 平台 Key
npx wrangler secret put ACCESS_TOKEN        # 访问令牌口令（可逗号分隔多个）
npx wrangler secret put JWT_SECRET          # 会话签名密钥（随机长字符串）

# 4. 部署
npx wrangler deploy

# 5. 绑定原域名（若旧 Worker 已占用，先删除旧绑定或直接覆盖路由）
npx wrangler routes add api.nebulavessel.com --zone nebulavessel.com
```

配置项（wrangler.toml `[vars]`）：

| 变量 | 说明 |
|---|---|
| `MODEL_FLASH` / `MODEL_PRO` | 预设模型名（按实际 API 模型名修改） |
| `ALLOWED_ORIGINS` | 前端跨域白名单（生产 `https://www.nebulavessel.com`） |
| `ADMIN_EMAILS` | 管理员邮箱（逗号分隔，注册即成为管理员） |
| `MOCK` | 生产必须为 `0` |

### 前端 → www.nebulavessel.com

```bash
cd web

# 方式一：Cloudflare Pages 直连构建
#   Build command:  npm install && npm run build
#   Output dir:     web/dist
#   Env var:        VITE_API_BASE = https://api.nebulavessel.com

# 方式二：本地构建后上传 dist/
VITE_API_BASE=https://api.nebulavessel.com npx vite build
# 将 web/dist 上传部署到 Pages，绑定 www.nebulavessel.com
```

> 前端无需任何密钥；自定义模型（BYOK）的 Key 仅保存在用户浏览器 localStorage。

## 核心机制速览

1. **结构化生成**：AI 只输出课程 JSON（Function Calling 硬约束），界面与交互由确定性渲染器输出 —— 不存在 AI 写坏的代码。
2. **生成管线**：大纲 → 章节讲解（并行）→ 题卡逐张生成（并行、独立重试）→ Schema 校验 → 五维审计 → 兜底降级（永远可交付）。
3. **教学法引擎**：提取练习/间隔重复/ZPD/生成效应/主动学习/认知负荷/SDT/Octalysis/成长型思维/心流/布鲁姆层级，全部内建于生成逻辑与课程结构（预热卡/回顾卡/费曼输出/错题本/每日一题/学习路径）。
4. **社区安全**：AI 审核 + 管理员人工复核双防线。
5. **模型选择**：Flash/Pro 预设 + 自定义 OpenAI 兼容 API（三级结构化降级兼容）。
