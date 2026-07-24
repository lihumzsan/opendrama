<h1 align="center">OpenDrama AI Video Studio</h1>

<p align="center">
  <a href="README_en.md">English</a> · <a href="https://github.com/lihumzsan/opendrama/issues">反馈问题</a>
</p>

> 本项目为 **免费 + 开源（Apache-2.0）**。
> 可自建环境运行，不绑定商业服务或专有平台。

## 🎯 先看这里：启动要求（最重要）

### 1) 本地运行环境

- Node.js `>= 18.18.0`
- npm `>= 9.0.0`
- Git

### 2) 运行前环境依赖（必须）

项目默认依赖以下外部服务（按需替换成你的部署地址）：

- MySQL：`192.168.0.112:13306`
- Redis：`192.168.0.112:16379`
- MinIO API：`http://192.168.0.112:19000`
- MinIO 控制台：`http://192.168.0.112:19001`
- ComfyUI：`http://192.168.0.112:8878`

### 3) 直接启动（建议）

```bash
git clone https://github.com/lihumzsan/opendrama.git
cd opendrama
cp .env.example .env
npm install
npm run dev
```

启动后默认运行：

- Next.js（端口 `3000`）
- Worker
- Watchdog
- Bull Board（默认端口 `3010`，路径 `/admin/queues`）

打开：
- 应用：`http://localhost:3000`
- Bull Board：`http://localhost:3010/admin/queues`

## ✨ 项目能力

- AI 剧本解析与角色提取
- 角色、场景、道具一致性生成
- 分镜管理与自动视频生成
- AI 配音（多角色）
- 中文 / 英文双语界面与任务编排

## 🧱 代码结构（概览）

- `src/`：核心业务与 API 实现
  - `src/app`：Next.js 路由与页面
  - `src/lib`：Provider、队列、数据库、日志等能力层
  - `scripts/`：启动、巡检、校验脚本
  - `tests/`：单测/集成/回归测试
- `prisma/`：数据库模型与迁移
- `messages/`：i18n 文案
- `lib/prompts/`：提示词模板集合
- `public/`：静态资源

## 🛠️ 交付与部署

### 开发

```bash
npm run dev
```

### 生产

```bash
npm run build
npm exec next start
```

按需可改为 PM2、systemd、Docker 等启动方式。

## ✅ 常用质量校验

```bash
npm run lint:all
npm run typecheck
npm run test:all
npm run build
npm run check:api-handler
npm run check:no-api-direct-llm-call
```

## 📦 技术栈

- Next.js 15 + React 19
- TypeScript 5
- Prisma + MySQL
- Redis + BullMQ
- Tailwind CSS v4
- NextAuth.js

## 🤝 参与方式

- 提交 Issue：`https://github.com/lihumzsan/opendrama/issues`
- 提交 PR 并说明变更范围与回归影响。

**Project Marker: OpenDrama**
