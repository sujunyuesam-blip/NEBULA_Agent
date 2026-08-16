-- NEBULA API Worker - D1 Schema v2
-- 用户 / 课程 / 社区（帖子·评论·点赞·审核） / 日志

-- 用户（注册/登录，归属学校，角色）
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  school     TEXT,
  pass_hash  TEXT NOT NULL,               -- PBKDF2-SHA256 十六进制
  salt       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'user', -- user | admin
  created_at INTEGER NOT NULL
);

-- 课程（历史 / 分享 / 社区引用）
CREATE TABLE IF NOT EXISTS courses (
  id          TEXT PRIMARY KEY,            -- shareId
  owner       TEXT NOT NULL,               -- 归属者（兼容旧字段）
  user_id     TEXT,                        -- 所属用户（V2）
  topic       TEXT NOT NULL,
  domain      TEXT,
  difficulty  TEXT,
  role        TEXT,
  model       TEXT,
  lang        TEXT,
  course_json TEXT NOT NULL,
  audit_json  TEXT,
  fallback    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_courses_owner ON courses(owner, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_user ON courses(user_id, created_at DESC);

-- 社区帖子（提交课程共享；status: pending 待人工复核 | approved | rejected）
CREATE TABLE IF NOT EXISTS posts (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL,
  course_id      TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  topic          TEXT,
  domain         TEXT,
  difficulty     TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',
  ai_review      TEXT,                     -- AI 审核 JSON {approved, reason, risk, score}
  human_reviewed INTEGER NOT NULL DEFAULT 0,
  likes          INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id, created_at DESC);

-- 评论（AI 审核：approved 显示 / pending 待人工复核 / rejected 隐藏）
CREATE TABLE IF NOT EXISTS comments (
  id            TEXT PRIMARY KEY,
  post_id       TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  content       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'approved',
  ai_review     TEXT,
  reject_reason TEXT,
  created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at ASC);

-- 点赞（用户-帖子 唯一）
CREATE TABLE IF NOT EXISTS likes (
  post_id    TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

-- 兼容旧版日志接口
CREATE TABLE IF NOT EXISTS logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  owner      TEXT NOT NULL,
  type       TEXT,
  payload    TEXT,
  created_at INTEGER NOT NULL
);

-- ============ V3 激励与个性化系统 ============

-- XP 积分流水（规则见 gamify.js）
CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  type       TEXT NOT NULL,     -- login/generate/complete/post/comment/like_received/daily/wrong_review
  xp         INTEGER NOT NULL,
  ref        TEXT,              -- 关联对象 id（如课程/帖子）
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, created_at DESC);

-- 活跃打卡（streak 计算）
CREATE TABLE IF NOT EXISTS activity (
  user_id    TEXT NOT NULL,
  day        TEXT NOT NULL,     -- YYYY-MM-DD
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
);

-- 每日一题缓存（按天 + 题号 seed：每天最多生成 3 道新题）
CREATE TABLE IF NOT EXISTS daily (
  day        TEXT NOT NULL,     -- YYYY-MM-DD
  seed       INTEGER NOT NULL DEFAULT 1,
  topic      TEXT,
  question   TEXT NOT NULL,     -- 题目 JSON
  created_at INTEGER NOT NULL,
  PRIMARY KEY (day, seed)
);

-- 错题本
CREATE TABLE IF NOT EXISTS course_wrong (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  course_id  TEXT,
  question   TEXT NOT NULL,
  answer     TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wrong_user ON course_wrong(user_id, created_at DESC);

-- ============ V3.1 学校 / 工单 / 用户扩展 ============

-- 学校库（预置 + 用户申请审核通过后加入）
CREATE TABLE IF NOT EXISTS schools (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  region     TEXT,               -- 省/市
  kind       TEXT DEFAULT 'high',-- high 高中 | middle 初中
  approved   INTEGER NOT NULL DEFAULT 1, -- 1 预置/已审核 0 待审核
  created_at INTEGER NOT NULL
);

-- 工单（联系我们）
CREATE TABLE IF NOT EXISTS tickets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  content    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open', -- open | replied | closed
  created_at INTEGER NOT NULL
);

-- 邮箱验证码（注册验证；Resend 发送）
CREATE TABLE IF NOT EXISTS verification_codes (
  email      TEXT PRIMARY KEY,
  code       TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- ============ V3.2 个人主页扩展 / 抽签 ============

-- 用户扩展字段（头像/介绍/研究领域/联系方式）直接改 users 表：
-- avatar TEXT（base64）、bio TEXT、fields TEXT（研究领域，逗号分隔）、
-- wechat TEXT、phone TEXT、contact_email TEXT

-- 每日抽签记录（每人每天一条）
CREATE TABLE IF NOT EXISTS fortunes (
  user_id    TEXT NOT NULL,
  day        TEXT NOT NULL,
  fortune_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
);

-- ============ V3.3 AI 课程聊天助手 ============
CREATE TABLE IF NOT EXISTS chats (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  course_id  TEXT,
  title      TEXT NOT NULL,
  model      TEXT DEFAULT 'flash',
  messages   TEXT NOT NULL DEFAULT '[]',  -- JSON 数组 [{role, content, ts}]
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id, updated_at DESC);

-- V3.4 用户扩展：专属 emoji / 主页获赞
-- users 表新增列：emoji TEXT、likes INTEGER DEFAULT 0（用 ALTER 在远程执行）

-- V3.5 通知系统
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  type       TEXT NOT NULL,
  payload    TEXT NOT NULL,
  read       INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at DESC);
