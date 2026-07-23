<h1 align="center">OpenDrama AI Video Studio</h1>

<p align="center">
  一款基于 AI 的短视频/分镜制作平台，支持小说解析、角色与场景生成、分镜合成、配音与任务编排。
</p>

<p align="center">
  <a href="README_en.md">English</a> · <a href="https://github.com/lihumzsan/opendrama/issues">反馈问题</a>
</p>

> [!IMPORTANT]
> 本仓库以开发模式为主。启动时默认同时运行 Next.js、Worker、Watchdog 与 Bull Board。

## ✨ 主要功能

- AI 剧本解析与角色提取
- 角色、场景、道具一致性生成
- 分镜管理与自动视频生成
- AI 配音（多角色）与音频工具
- 双语界面与任务流程可视化

## 🧭 当前代码结构（高层）

- `src/`：业务应用与接口实现
  - `src/app`：Next.js 路由/页面（含多语言路由）
  - `src/lib`：通用服务、Provider 封装、数据库/队列/日志工具
  - `src/app/**`：主页面、工作区、任务页
  - `scripts/`：启动、巡检、校验与开发脚本
  - `tests/`：单元测试、集成测试、系统/回归测试
- `prisma/`：数据库模型与迁移
- `messages/`：i18n 文案（中英）
- `lib/prompts/`：提示词模板库
- `public/`：前端静态资源

## 🧪 部署与运行流程

### 1. 预备

- Node.js >= 18.18.0
- npm >= 9.0.0

### 2. 获取与安装

```bash
git clone https://github.com/lihumzsan/opendrama.git
cd opendrama
cp .env.example .env
npm install
```

### 3. 开发启动（推荐）

```bash
npm run dev
```

启动后默认执行：
- `storage:init`（Prisma storage 初始化）
- `dev:next`（Next.js）
- `dev:worker`
- `dev:watchdog`
- `dev:board`（Bull Board）

访问地址：
- 应用：`http://localhost:3000`
- Bull Board：`http://localhost:3010/admin/queues`

### 4. 生产构建

```bash
npm run build
npm exec next start
```

或按你现有部署环境使用自定义启动入口（PM2/Docker/systemd）。

### 5. 环境变量与外部服务

项目默认依赖远端开发基础设施（数据库、Redis、MinIO、ComfyUI）。

```text
MySQL:    192.168.0.112:13306
Redis:    192.168.0.112:16379
MinIO:    http://192.168.0.112:19000
MinIO UI: http://192.168.0.112:19001
ComfyUI:  http://192.168.0.112:8878
```

`COMFYUI_WORKFLOW_ROOT` 在需要复用仓库外工作流目录时配置。

## 🧰 常用命令

```bash
npm run lint:all
npm run typecheck
npm run test:all
npm run build
npm run check:api-handler
npm run check:no-api-direct-llm-call
npm run test:unit:all
npm run test:integration:api
npm run test:integration:provider
```

> 这些脚本用于在 PR 前做静态校验和测试分层检查。

## 🧱 技术栈

- Next.js 15 + React 19
- TypeScript 5
- Prisma + MySQL
- Redis + BullMQ
- Tailwind CSS v4
- NextAuth.js

## 🤝 参与

- 提交 Issue：`https://github.com/lihumzsan/opendrama/issues`
- 建议提 PR 并在说明中补充变更影响范围与回归说明。

**Project Marker: OpenDrama**
