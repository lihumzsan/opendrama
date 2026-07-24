<h1 align="center">OpenDrama AI Video Studio</h1>

<p align="center">
  <a href="README.md">中文文档</a> · <a href="https://github.com/lihumzsan/opendrama/issues">Report a bug</a>
</p>

> This project is **Free + Open Source (Apache-2.0)**.
> You can run it in your own environment without binding to a commercial platform.

## 🎯 IMPORTANT: Runtime Requirements

### 1) Local tooling

- Node.js `>= 18.18.0`
- npm `>= 9.0.0`
- Git

### 2) External dependencies required to run

The project is configured for these default services (replace with your own hosts if needed):

- MySQL: `192.168.0.112:13306`
- Redis: `192.168.0.112:16379`
- MinIO API: `http://192.168.0.112:19000`
- MinIO Console: `http://192.168.0.112:19001`
- ComfyUI: `http://192.168.0.112:8878`

### 3) Quick start

```bash
git clone https://github.com/lihumzsan/opendrama.git
cd opendrama
cp .env.example .env
npm install
npm run dev
```

By default it starts:

- Next.js (`3000`)
- Worker
- Watchdog
- Bull Board (`3010`, base `/admin/queues`)

Open:
- App: `http://localhost:3000`
- Bull Board: `http://localhost:3010/admin/queues`

## ✨ Main capabilities

- AI script analysis and character extraction
- Consistent character / scene / prop generation
- Storyboard pipeline and auto video generation
- Multi-character voice generation
- Bilingual workspace

## 🧱 Code overview

- `src/`: core application and API implementation
  - `src/app`: Next.js routes and pages
  - `src/lib`: providers, queue, DB, logging layers
  - `scripts/`: startup, checks, validation
  - `tests/`: unit/integration/regression tests
- `prisma/`: DB schema and migrations
- `messages/`: i18n copy
- `lib/prompts/`: prompt templates
- `public/`: static assets

## 🛠️ Deployment

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm exec next start
```

Replace startup command with PM2/systemd/Docker if needed.

## ✅ Quality checks

```bash
npm run lint:all
npm run typecheck
npm run test:all
npm run build
npm run check:api-handler
npm run check:no-api-direct-llm-call
```

## 📦 Tech stack

- Next.js 15 + React 19
- TypeScript 5
- Prisma + MySQL
- Redis + BullMQ
- Tailwind CSS v4
- NextAuth.js

## 🤝 Contributing

- Open issues in `https://github.com/lihumzsan/opendrama/issues`
- Submit PRs with clear scope and regression notes.

**Project Marker: OpenDrama**
