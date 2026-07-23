<h1 align="center">OpenDrama AI Video Studio</h1>

<p align="center">
  An AI-powered studio for short-form video/shot production: novel parsing, character/scene generation, storyboard composition, and voice integration.
</p>

<p align="center">
  <a href="README.md">中文文档</a> · <a href="https://github.com/lihumzsan/opendrama/issues">Report a bug</a>
</p>

> [!IMPORTANT]
> This repository is primarily intended for development mode. `npm run dev` launches Next.js, worker, watchdog and Bull Board together by default.

## ✨ Main Features

- AI script analysis and character extraction
- Consistent character and scene generation
- Storyboard pipeline and automated video assembly
- Multi-character voice generation and related video tools
- Bilingual interface and task visibility in the workspace

## 🧭 Code Layout (high level)

- `src/`: application code and API implementation
  - `src/app` for Next.js pages/routes with locale-aware routes
  - `src/lib` for shared services, providers, DB/queue/logging utilities
  - `scripts/` for startup, ops and validation scripts
  - `tests/` for unit/integration/system/regression suites
- `prisma/`: database schema and migration files
- `messages/`: i18n JSON content
- `lib/prompts/`: prompt templates
- `public/`: static assets

## 🚀 Deployment / Run Flow

### 1. Prerequisites

- Node.js >= 18.18.0
- npm >= 9.0.0

### 2. Setup

```bash
git clone https://github.com/lihumzsan/opendrama.git
cd opendrama
cp .env.example .env
npm install
```

### 3. Development

```bash
npm run dev
```

It starts:
- `storage:init` (Prisma storage init)
- `dev:next` (Next.js)
- `dev:worker`
- `dev:watchdog`
- `dev:board` (Bull Board)

Open:
- App: `http://localhost:3000`
- Bull Board: `http://localhost:3010/admin/queues`

### 4. Production build

```bash
npm run build
npm exec next start
```

Or replace startup command based on your deployment stack (PM2/Docker/systemd).

### 5. Environment and dependencies

Default remote services for local development:

```text
MySQL:    192.168.0.112:13306
Redis:    192.168.0.112:16379
MinIO:    http://192.168.0.112:19000
MinIO UI: http://192.168.0.112:19001
ComfyUI:  http://192.168.0.112:8878
```

Set `COMFYUI_WORKFLOW_ROOT` only when you need an external workflow directory.

## 🛠️ Useful Commands

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

These are useful pre-PR quality checks.

## 🧱 Tech Stack

- Next.js 15 + React 19
- TypeScript 5
- Prisma + MySQL
- Redis + BullMQ
- Tailwind CSS v4
- NextAuth.js

## 🤝 Contributing

- Open issues in `https://github.com/lihumzsan/opendrama/issues`
- Submit PRs with clear scope and regression impact notes.

**Project Marker: OpenDrama**
