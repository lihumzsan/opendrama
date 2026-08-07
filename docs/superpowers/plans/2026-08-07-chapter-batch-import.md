# Chapter Batch Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a chapter-batch import flow that stores uploaded chapter text, analyzes candidate episode plans, requires confirmation, and then writes confirmed episodes for the existing episode screenplay chain.

**Architecture:** Add a `NovelPromotionChapterBatch` persistence layer between `NovelPromotionProject` and `NovelPromotionEpisode`. Reuse existing semantic episode split utilities for candidate planning, then add confirm APIs that materialize selected candidates through the existing episode model without invoking screenplay, storyboard, voice, or video generation.

**Tech Stack:** Next.js route handlers, Prisma/MySQL, BullMQ task types, Vitest, React Query style fetch mutations, React/TypeScript frontend components.

## Global Constraints

- Chapter batches are source material; episodes are confirmed adaptation results.
- User confirmation is required before creating or overwriting `NovelPromotionEpisode`.
- The analysis worker must not generate screenplay, storyboard, voice, image, or video output.
- Candidate episode source ranges must be ordered and non-overlapping.
- Confirming the same batch twice must not create duplicate episodes.
- Existing generated assets require explicit overwrite confirmation before updating an existing episode.
- Keep the implementation narrowly scoped to chapter batch import and existing smart-import entry points.

---

### Task 1: Domain Contracts And Candidate Validation

**Files:**
- Create: `src/lib/novel-promotion/chapter-batch/types.ts`
- Create: `src/lib/novel-promotion/chapter-batch/validation.ts`
- Test: `tests/unit/novel-promotion/chapter-batch-validation.test.ts`

**Interfaces:**
- Produces: `ChapterBatchAnalysis`, `CandidateEpisodePlan`, `CandidateEpisodeDraft`, `validateCandidateEpisodePlans(sourceText: string, plans: unknown): CandidateEpisodePlan[]`, `hashChapterBatchSource(sourceText: string): string`.
- Consumes: TypeScript standard library and `node:crypto`.

- [ ] **Step 1: Write failing validation tests** for empty plans, invalid source ranges, overlapping ranges, and valid plans.
- [ ] **Step 2: Run validation tests** with `npm run test:unit:all -- tests/unit/novel-promotion/chapter-batch-validation.test.ts`; expect missing module failure.
- [ ] **Step 3: Implement types and validation** with exact range and source substring checks.
- [ ] **Step 4: Re-run validation tests**; expect pass.

### Task 2: Prisma Model And Generated Client

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.sqlit.prisma`
- Create: `prisma/migrations/20260807120000_add_chapter_batches/migration.sql`

**Interfaces:**
- Produces: `NovelPromotionChapterBatch` Prisma model with project relation and indexed `novelPromotionProjectId`, `sourceFingerprint`, `status`.
- Consumes: existing `NovelPromotionProject` relation model.

- [ ] **Step 1: Add schema relation fields** for `chapterBatches`.
- [ ] **Step 2: Add MySQL migration SQL** for `novel_promotion_chapter_batches`.
- [ ] **Step 3: Run `npx prisma generate`**; expect generated client includes `novelPromotionChapterBatch`.

### Task 3: Chapter Batch APIs

**Files:**
- Create: `src/app/api/novel-promotion/[projectId]/chapter-batches/route.ts`
- Create: `src/app/api/novel-promotion/[projectId]/chapter-batches/[batchId]/route.ts`
- Create: `src/app/api/novel-promotion/[projectId]/chapter-batches/[batchId]/analyze/route.ts`
- Create: `src/app/api/novel-promotion/[projectId]/chapter-batches/[batchId]/confirm/route.ts`
- Create: `src/app/api/novel-promotion/[projectId]/chapter-batches/[batchId]/discard/route.ts`
- Test: `tests/integration/api/contract/novel-promotion-chapter-batches.route.test.ts`

**Interfaces:**
- Consumes: `hashChapterBatchSource`, `validateCandidateEpisodePlans`, `TASK_TYPE.CHAPTER_BATCH_ANALYZE`, `maybeSubmitLLMTask`.
- Produces: CRUD, analyze, confirm, and discard endpoints.

- [ ] **Step 1: Write failing API tests** covering save-without-task, duplicate draft rejection, analyze task submission, confirm append, confirm idempotency, update_current asset precheck, and discard.
- [ ] **Step 2: Run API tests**; expect missing route/model failures.
- [ ] **Step 3: Implement route handlers** using `apiHandler`, `requireProjectAuthLight`, and Prisma transactions.
- [ ] **Step 4: Re-run API tests**; expect pass.

### Task 4: Analyze Worker And Task Wiring

**Files:**
- Modify: `src/lib/task/types.ts`
- Modify: `src/lib/task/queues.ts`
- Modify: `src/lib/task/progress-message.ts`
- Modify: `src/lib/task/intent.ts`
- Modify: `src/lib/workers/text.worker.ts`
- Modify: `src/lib/llm-observe/task-policy.ts`
- Modify: `src/lib/llm-observe/stage-pipeline.ts`
- Create: `src/lib/workers/handlers/chapter-batch-analyze.ts`
- Test: `tests/unit/worker/chapter-batch-analyze.test.ts`
- Modify: `tests/contracts/task-type-catalog.ts`
- Modify: `tests/integration/api/contract/llm-observe-routes.test.ts`

**Interfaces:**
- Consumes: existing semantic episode split helpers and prompt ids.
- Produces: `handleChapterBatchAnalyzeTask(job)` and task type `chapter_batch_analyze`.

- [ ] **Step 1: Write failing worker test** for source analysis, candidate validation, failed validation persistence, and no episode creation.
- [ ] **Step 2: Run worker test**; expect missing handler/task type failure.
- [ ] **Step 3: Wire task type and route contract case**.
- [ ] **Step 4: Implement worker** by adapting semantic episode split flow to persist candidates on the batch.
- [ ] **Step 5: Re-run worker and route tests**; expect pass.

### Task 5: Smart Import Frontend Integration

**Files:**
- Modify: `src/lib/query/mutations/useEpisodeMutations.ts`
- Modify: `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/smart-import/hooks/useWizardState.ts`
- Modify: `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/smart-import/types.ts`
- Modify: `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/smart-import/steps/StepSource.tsx`
- Modify: `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/smart-import/steps/StepConfirm.tsx`
- Test: existing smart import tests under `tests/unit/novel-promotion`.

**Interfaces:**
- Consumes: chapter batch APIs.
- Produces: smart import flow that creates a batch, analyzes it, displays candidates, and confirms selected episodes.

- [ ] **Step 1: Add or update frontend tests** for persisted-preview copy and confirm behavior where practical.
- [ ] **Step 2: Run targeted frontend unit tests**; expect failures before implementation.
- [ ] **Step 3: Implement mutation wrappers and wizard state changes**.
- [ ] **Step 4: Re-run targeted frontend tests**; expect pass.

### Task 6: Verification And Commit

**Files:**
- All changed files.

**Interfaces:**
- Consumes: completed tasks.
- Produces: verified implementation commit.

- [ ] **Step 1: Run targeted tests** for chapter batch validation, API route, worker, task catalogs, and smart import.
- [ ] **Step 2: Run `npm run typecheck`**.
- [ ] **Step 3: Start dev server if practical and inspect the changed UI path in browser**; if blocked, report the blocker explicitly.
- [ ] **Step 4: Review `git diff --check` and staged file list**.
- [ ] **Step 5: Commit only files changed for this feature**.
