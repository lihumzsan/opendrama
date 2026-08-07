# Character Knowledge Base Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Markdown character-visual knowledge base participate in character profile generation, character image generation, and character image editing with auditable source metadata.

**Architecture:** Add one server-only loader/selector that reads the fixed `docs/knowledge-base/image-prompts/` catalog, extracts approved sections, selects sources from `CharacterProfileData`, and returns a compact context plus source fingerprints. Reuse that result in the character-profile worker, the project character-image worker, and both character image-modification workers; keep the existing image-reference behavior unchanged.

**Tech Stack:** TypeScript, Node `fs`/`crypto`, Prisma worker queries, existing `prompt-i18n` templates, BullMQ task progress metadata, Vitest.

## Global Constraints

- Only character profile, character image, and character image-edit flows are in scope; storyboard and H3 flows remain unchanged.
- User-authored character descriptions, story facts, selected image references, and explicit edit instructions override knowledge-base recommendations.
- Never load arbitrary paths from user input; use a fixed server-side knowledge-source catalog.
- Missing Markdown files must fall back to the existing built-in character-visual guidance and must expose `knowledgeBase.fallback=true` in audit metadata.
- Do not add database tables or persist full Markdown contents.
- Preserve the existing primary-image reference behavior for secondary appearances and image editing.

---

### Task 1: Build the server-side character knowledge selector

**Files:**
- Create: `src/lib/knowledge-base/character-visual-library.ts`
- Test: `tests/unit/knowledge-base/character-visual-library.test.ts`

**Interfaces:**
- Consumes: `CharacterProfileData` from `src/types/character-profile.ts`.
- Produces: `selectCharacterVisualKnowledge(profile)` returning `{ contextText, sources, fingerprint, fallback }`.

- [ ] **Step 1: Write loader and selector tests**

Cover these concrete cases:

```ts
const profile = {
  role_level: 'S',
  archetype: '腹黑强者',
  personality_tags: ['冷静', '果断'],
  era_period: '仙侠玄幻',
  social_class: '顶级尊者',
  occupation: '炼道尊者',
  costume_tier: 5,
  suggested_colors: ['白色', '白金色', '深灰'],
  primary_identifier: '残破白色天网',
  visual_keywords: ['强者气场', '炼道仙尊'],
  gender: '男',
  age_range: '成年男性',
} as const

const result = selectCharacterVisualKnowledge(profile)

expect(result.sources.map((source) => source.id)).toEqual([
  'male-character-visual-cn',
  'male-face-differentiation-cn',
  'xianxia-character-outfits-cn',
])
expect(result.contextText).toContain('男主面部字段模板')
expect(result.contextText).toContain('推荐提示词片段')
expect(result.contextText).not.toContain('storyboard')
expect(result.fallback).toBe(false)
```

Also test that a modern female profile does not select male or xianxia sources, and that a missing source returns built-in guidance with `fallback: true`.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```powershell
npm.cmd exec vitest run tests/unit/knowledge-base/character-visual-library.test.ts
```

Expected: FAIL because the loader module and selector do not exist.

- [ ] **Step 3: Implement the fixed catalog and Markdown section extractor**

Define a literal catalog containing the allowed file path, source id, tags, and allowed headings. Read files relative to `process.cwd()`, reject any path outside the fixed catalog, extract only the configured headings, compute a SHA-256 fingerprint over the selected source content, and cache successful reads by absolute path plus file mtime.

The selector must normalize Chinese and English gender/era values, choose the male/female base and face sources, choose xianxia or modern clothing/hairstyle sources, and cap the combined context at a fixed character limit before returning it.

- [ ] **Step 4: Run the focused test and confirm it passes**

Run:

```powershell
npm.cmd exec vitest run tests/unit/knowledge-base/character-visual-library.test.ts
```

Expected: PASS.

---

### Task 2: Inject the selected knowledge into character-profile confirmation

**Files:**
- Modify: `src/lib/workers/handlers/character-profile.ts`
- Test: `tests/unit/worker/character-profile.test.ts`

**Interfaces:**
- Consumes: `selectCharacterVisualKnowledge(profile)` from Task 1.
- Produces: the existing `NP_AGENT_CHARACTER_VISUAL` prompt with the selected Markdown context and task metadata containing source ids/fingerprint.

- [ ] **Step 1: Add a failing worker assertion**

Extend the existing character-profile worker test so the mocked `buildPrompt` call is inspected and must contain a marker from the selected Markdown context, such as `男主面部字段模板`, while still containing the built-in preference preamble.

- [ ] **Step 2: Run the focused worker test and confirm it fails**

Run:

```powershell
npm.cmd exec vitest run tests/unit/worker/character-profile.test.ts
```

Expected: FAIL because the worker still passes only `getKnowledgePromptContext('character_visual')`.

- [ ] **Step 3: Use the selector when building `knowledge_context`**

After parsing `finalProfileData`, call the selector and combine its compact context with the existing built-in context. Pass the result to `buildPrompt` without changing the prompt id or response schema. Add the source ids, fingerprint, and fallback flag to the existing `executeAiTextStep.meta` and the relevant progress payload; do not store the full context there.

- [ ] **Step 4: Run the focused worker and prompt tests**

Run:

```powershell
npm.cmd exec vitest run tests/unit/worker/character-profile.test.ts tests/unit/prompt-i18n/knowledge-context.test.ts
```

Expected: PASS.

---

### Task 3: Inject the same knowledge into project character image generation

**Files:**
- Modify: `src/lib/workers/handlers/character-image-task-handler.ts`
- Test: `tests/unit/worker/character-image-task-handler.test.ts`

**Interfaces:**
- Consumes: `CharacterProfileData` from the character record and the selector from Task 1.
- Produces: image prompts that keep `appearance.description` authoritative and append the selected knowledge context as secondary guidance; existing reference-image options remain unchanged.

- [ ] **Step 1: Add failing prompt assertions**

Extend the existing success-path test fixture with a valid `profileData` and assert that the generation prompt contains a selected knowledge marker. Add a primary-appearance test asserting that `options.referenceImages` remains absent, and retain the existing secondary-appearance reference test.

- [ ] **Step 2: Run the focused image-worker test and confirm it fails**

Run:

```powershell
npm.cmd exec vitest run tests/unit/worker/character-image-task-handler.test.ts
```

Expected: FAIL because image prompts currently use only the appearance description and art style.

- [ ] **Step 3: Query profile data and compose the image prompt**

Extend the worker-local database interfaces and Prisma `include/select` shapes so both appearance lookup paths expose `character.profileData`. Build the knowledge context once per task, append a bounded block that says the current appearance description is authoritative, and add `knowledgeBase` source metadata to the generation progress/result audit payload. Do not pass Markdown as `referenceImages`.

- [ ] **Step 4: Run all character image-worker tests**

Run:

```powershell
npm.cmd exec vitest run tests/unit/worker/character-image-task-handler.test.ts
```

Expected: PASS, including grouped generation, regeneration-token, art-style, persistence-conflict, and primary/secondary reference cases.

---

### Task 4: Carry the knowledge context into character image editing

**Files:**
- Modify: `src/lib/workers/handlers/image-task-handlers-core.ts`
- Modify: `src/lib/workers/handlers/asset-hub-modify-task-handler.ts`
- Test: `tests/unit/worker/modify-image-reference-description.test.ts`
- Test: `tests/unit/worker/image-task-handlers-core.test.ts`

**Interfaces:**
- Consumes: project `CharacterAppearance.character.profileData` and global `GlobalCharacter.profileData` plus the selector from Task 1.
- Produces: character edit prompts that preserve the current appearance description and explicit edit instruction, with knowledge-base guidance appended and source metadata audited.

- [ ] **Step 1: Add failing edit-prompt assertions**

For both project and global character edit fixtures, assert that the outgoing prompt contains the selected knowledge marker, retains the explicit modification instruction, and still sends the current image as the required reference image.

- [ ] **Step 2: Run the focused edit tests and confirm they fail**

Run:

```powershell
npm.cmd exec vitest run tests/unit/worker/modify-image-reference-description.test.ts tests/unit/worker/image-task-handlers-core.test.ts
```

Expected: FAIL because edit prompts currently contain only the edit instruction.

- [ ] **Step 3: Compose edit prompts without changing image-reference behavior**

Load the character profile fields already available through Prisma relations, call the shared selector, and append the compact knowledge block after the edit instruction. Keep `currentUrl`/`requiredReference` as the first reference image and preserve the existing description synchronization behavior.

- [ ] **Step 4: Run the focused edit tests**

Run:

```powershell
npm.cmd exec vitest run tests/unit/worker/modify-image-reference-description.test.ts tests/unit/worker/image-task-handlers-core.test.ts
```

Expected: PASS.

---

### Task 5: Add integration guards and deployment verification

**Files:**
- Modify: `tests/unit/knowledge-base/character-visual-library.test.ts`
- Modify: `tests/unit/worker/character-profile.test.ts`
- Modify: `tests/unit/worker/character-image-task-handler.test.ts`
- Modify: `tests/unit/worker/modify-image-reference-description.test.ts`
- Modify: `tests/unit/worker/image-task-handlers-core.test.ts`

**Interfaces:**
- Consumes: the loader, profile worker, image worker, and edit worker behavior from Tasks 1–4.
- Produces: regression evidence that knowledge sources are present, fallback is explicit, and no storyboard/H3 path is affected.

- [ ] **Step 1: Add fallback and audit assertions**

Extend the loader test with a missing-catalog fixture and extend the worker tests with audit assertions. Verify that a missing catalog file does not fail the worker, returns `knowledgeBase.fallback=true`, and that audit metadata includes source ids/fingerprint but not the full Markdown context.

- [ ] **Step 2: Run the focused regression set**

Run:

```powershell
npm.cmd exec vitest run tests/unit/knowledge-base/character-visual-library.test.ts tests/unit/worker/character-profile.test.ts tests/unit/worker/character-image-task-handler.test.ts tests/unit/worker/modify-image-reference-description.test.ts tests/unit/worker/image-task-handlers-core.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run project type checking and relevant guards**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run check:no-api-direct-llm-call
npm.cmd run check:no-media-provider-bypass
```

Expected: PASS with no new diagnostics.

- [ ] **Step 4: Perform manual Fang Yuan verification**

Submit one character-profile confirmation and one three-image character generation for Fang Yuan. Confirm task metadata reports `male-character-visual-cn`, `male-face-differentiation-cn`, and `xianxia-character-outfits-cn`; confirm the generated prompt still contains the saved appearance description and that no Markdown file is treated as an image reference.

---

## Handoff

Implementation should proceed task-by-task with a focused test after each task. Do not modify storyboard or H3 prompt code while implementing this plan.
