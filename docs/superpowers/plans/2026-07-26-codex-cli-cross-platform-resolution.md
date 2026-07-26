# Codex CLI Cross-Platform Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make an already installed Codex CLI automatically discoverable on Windows and macOS, preserve explicit overrides and legacy configuration, and stop AI episode splitting from polling forever.

**Architecture:** A focused resolver module owns platform candidates and validation. Provider configuration exposes `executablePath` for Codex while translating legacy `baseUrl` values at the persistence boundary. All Codex runtime paths and provider probes consume the same resolver, and the episode-split mutation supplies its own finite task wait budget.

**Tech Stack:** TypeScript, Node.js child processes and filesystem APIs, Next.js App Router, React, TanStack Query, Vitest.

## Global Constraints

- OpenDrama uses an already installed and authenticated Codex CLI; it does not install, update, or authenticate Codex.
- `CODEX_CLI_PATH` is the highest-priority operational override.
- An invalid explicit operator or user path fails immediately; automatic fallback is allowed only in automatic mode.
- Existing custom Codex `baseUrl` values remain readable, while the two historical Windows defaults mean automatic detection.
- Non-Codex provider `baseUrl` behavior remains unchanged.
- No database schema migration is required because provider configuration is stored as JSON.
- Episode splitting receives a feature-specific finite wait; the global task client default remains unchanged.
- Windows behavior is deterministically tested on macOS, but release acceptance still requires a real Windows smoke run.
- Preserve the existing untracked `.env-bf` file.

---

### Task 1: Platform-aware executable resolver

**Files:**
- Create: `src/lib/providers/codex/executable-resolver.ts`
- Modify: `src/lib/providers/codex/constants.ts`
- Modify: `src/lib/providers/codex/client.ts`
- Test: `tests/unit/providers/codex-executable-resolver.test.ts`
- Test: `tests/unit/providers/codex-client.test.ts`

**Interfaces:**
- Produces:
  - `CodexExecutableSource`
  - `CodexExecutableResolution`
  - `CodexExecutableResolverOptions`
  - `CodexExecutableResolutionError`
  - `isCodexAutoPath(value?: string): boolean`
  - `resolveCodexExecutable(options?: CodexExecutableResolverOptions): CodexExecutableResolution`
- `resolveCodexExecutablePath(rawPath?: string)` remains as a compatibility wrapper returning only the resolved string path.

- [ ] **Step 1: Write resolver tests for precedence, macOS, Windows, PATH, and explicit failures**

Create injected filesystem fixtures instead of mutating the real machine:

```ts
const files = new Set(['/Applications/ChatGPT.app/Contents/Resources/codex'])
const options = {
  platform: 'darwin' as NodeJS.Platform,
  env: {},
  homedir: '/Users/tester',
  isFile: (candidate: string) => files.has(candidate),
  isExecutable: (candidate: string) => files.has(candidate),
  listDirectories: () => [],
}

expect(resolveCodexExecutable(options)).toEqual({
  path: '/Applications/ChatGPT.app/Contents/Resources/codex',
  source: 'macos-chatgpt',
})
```

Cover:

- `CODEX_CLI_PATH` before saved configuration;
- invalid `CODEX_CLI_PATH` throws `CODEX_EXECUTABLE_NOT_FOUND`;
- invalid saved custom path throws instead of falling back;
- both legacy Windows placeholders return `true` from `isCodexAutoPath`;
- `/Applications` and `~/Applications` ChatGPT bundles;
- `/opt/homebrew/bin/codex` and `/usr/local/bin/codex`;
- Windows versioned directories sorted newest-first;
- Windows unversioned and legacy paths;
- POSIX `PATH` and Windows `PATH` plus `PATHEXT`;
- path names containing spaces;
- POSIX non-executable file throws `CODEX_EXECUTABLE_NOT_EXECUTABLE`;
- no candidates throws `CODEX_EXECUTABLE_NOT_FOUND`.

- [ ] **Step 2: Run the new resolver test and verify failure**

Run:

```bash
npx vitest run tests/unit/providers/codex-executable-resolver.test.ts
```

Expected: FAIL because `executable-resolver.ts` and its exports do not exist.

- [ ] **Step 3: Implement the resolver**

Use these public shapes:

```ts
export type CodexExecutableSource =
  | 'environment'
  | 'provider'
  | 'macos-chatgpt'
  | 'macos-homebrew'
  | 'windows-localappdata'
  | 'windows-legacy'
  | 'path'

export interface CodexExecutableResolution {
  path: string
  source: CodexExecutableSource
}

export interface CodexExecutableResolverOptions {
  configuredPath?: string
  platform?: NodeJS.Platform
  env?: NodeJS.ProcessEnv
  homedir?: string
  isFile?: (candidate: string) => boolean
  isExecutable?: (candidate: string) => boolean
  listDirectories?: (directory: string) => Array<{ name: string; mtimeMs: number }>
}

export class CodexExecutableResolutionError extends Error {
  code: 'CODEX_EXECUTABLE_NOT_FOUND' | 'CODEX_EXECUTABLE_NOT_EXECUTABLE'
  attemptedPaths: string[]
}
```

Build candidates without invoking a shell. Split `PATH` using `path.delimiter`; on Windows combine each entry with normalized `PATHEXT` values. Treat `CODEX_DEFAULT_EXECUTABLE_PATH` and `CODEX_LEGACY_SANDBOX_EXECUTABLE_PATH` as automatic sentinels on every platform.

- [ ] **Step 4: Route the Codex client through the resolver**

Keep `CodexExecError` as the public runtime error. Convert `CodexExecutableResolutionError` before process execution:

```ts
try {
  return resolveCodexExecutable({ configuredPath: rawPath }).path
} catch (error) {
  if (error instanceof CodexExecutableResolutionError) {
    throw new CodexExecError(error.code, error.message)
  }
  throw error
}
```

Remove the Windows-only candidate helpers from `client.ts`. Preserve text/image execution, timeout, cleanup, and process-kill behavior.

- [ ] **Step 5: Run resolver and Codex client tests**

Run:

```bash
npx vitest run \
  tests/unit/providers/codex-executable-resolver.test.ts \
  tests/unit/providers/codex-client.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the resolver**

```bash
git add \
  src/lib/providers/codex/executable-resolver.ts \
  src/lib/providers/codex/constants.ts \
  src/lib/providers/codex/client.ts \
  tests/unit/providers/codex-executable-resolver.test.ts \
  tests/unit/providers/codex-client.test.ts
git commit -m "feat: resolve Codex CLI across desktop platforms"
```

### Task 2: Provider configuration compatibility

**Files:**
- Modify: `src/lib/api-config.ts`
- Modify: `src/app/api/user/api-config/route.ts`
- Modify: `src/app/[locale]/profile/components/api-config/types.ts`
- Modify: `src/app/[locale]/profile/components/api-config/hooks.ts`
- Modify: Codex runtime consumers under `src/lib/llm/` and `src/lib/generators/image/codex.ts`
- Test: `tests/integration/api/specific/user-api-config-put.test.ts`
- Test: `tests/integration/api/specific/user-models-codex.test.ts`
- Test: `tests/unit/api-config/use-providers-order.test.ts`
- Test: `tests/unit/llm/codex-stream.test.ts`
- Test: `tests/unit/generators/codex-image.test.ts`

**Interfaces:**
- `Provider`, `CustomProvider`, `StoredProvider`, and `ProviderConfig` gain `executablePath?: string`.
- Codex runtime consumers read `providerConfig.executablePath`.
- Non-Codex consumers continue to read `providerConfig.baseUrl`.

- [ ] **Step 1: Write failing configuration compatibility tests**

Add assertions proving:

```ts
expect(savedCodexProvider).toMatchObject({
  id: 'codex',
  executablePath: '/custom/codex',
})
expect(savedCodexProvider.baseUrl).toBeUndefined()
```

Also cover:

- legacy custom `baseUrl` reads back as `executablePath`;
- both legacy default placeholders read back as automatic mode (`executablePath === undefined`);
- a new Codex preset has neither a Windows default `baseUrl` nor a forced executable path;
- a non-Codex provider still round-trips `baseUrl`;
- text, vision, and image Codex consumers pass `providerConfig.executablePath` as `codexPath`.
- the streaming Codex branch resolves the executable before emitting its `streaming` stage.

- [ ] **Step 2: Run focused configuration tests and verify failure**

Run:

```bash
npx vitest run \
  tests/integration/api/specific/user-api-config-put.test.ts \
  tests/integration/api/specific/user-models-codex.test.ts \
  tests/unit/api-config/use-providers-order.test.ts \
  tests/unit/llm/codex-stream.test.ts \
  tests/unit/generators/codex-image.test.ts
```

Expected: FAIL because provider types and persistence do not expose `executablePath`.

- [ ] **Step 3: Normalize legacy Codex configuration**

At both server read boundaries, apply:

```ts
function normalizeCodexExecutablePath(
  providerId: string,
  executablePath?: string,
  legacyBaseUrl?: string,
): string | undefined {
  if (getProviderKey(providerId) !== CODEX_PROVIDER_KEY) return undefined
  const candidate = readTrimmedString(executablePath) || readTrimmedString(legacyBaseUrl)
  return isCodexAutoPath(candidate) ? undefined : (candidate || undefined)
}
```

For Codex:

- accept `executablePath` in API input;
- translate legacy `baseUrl` only when the new field is absent;
- write `executablePath`;
- omit `baseUrl`.

For every other provider, keep the current `baseUrl` normalization unchanged.

- [ ] **Step 4: Update client configuration state and runtime consumers**

Add `updateProviderExecutablePath(providerId, executablePath)` to the profile hook. Merge saved and preset Codex providers using the saved `executablePath` without injecting the Windows constant.

Change Codex calls to:

```ts
runCodexTextCompletion({
  codexPath: providerConfig.executablePath,
  // existing fields unchanged
})
```

Apply the same field to vision and image generation.

In the Codex branch of `chat-stream.ts`, resolve the configured path before
emitting the `streaming` stage, then pass that validated absolute path into the
completion call. A missing or non-executable CLI must reject before the UI is
told that model streaming has started.

- [ ] **Step 5: Run configuration and consumer tests**

Run the focused command from Step 2.

Expected: PASS.

- [ ] **Step 6: Commit provider configuration compatibility**

Stage only the files listed in this task and commit:

```bash
git commit -m "refactor: separate Codex executable configuration"
```

### Task 3: Provider UI and self-check diagnostics

**Files:**
- Modify: `src/app/[locale]/profile/components/api-config/provider-card/types.ts`
- Modify: `src/app/[locale]/profile/components/api-config/provider-card/hooks/useProviderCardState.ts`
- Modify: `src/app/[locale]/profile/components/api-config/provider-card/ProviderBaseFields.tsx`
- Modify: `src/app/[locale]/profile/components/api-config-tab/ApiConfigProviderList.tsx`
- Modify: `src/lib/providers/codex/client.ts`
- Modify: `src/lib/user-api/provider-test.ts`
- Test: `tests/unit/api-config/provider-card-shell.test.ts`
- Test: `tests/unit/user-api/provider-test.test.ts`
- Test: `tests/unit/providers/codex-client.test.ts`

**Interfaces:**
- `ProviderCardProps` gains `onUpdateExecutablePath?: (providerId: string, executablePath: string) => void`.
- `CodexSelfCheckResult` gains `executablePath`, `resolutionSource`, and optional `version`.
- Codex provider test payload uses `executablePath`; `baseUrl` remains accepted only as a legacy input.

- [ ] **Step 1: Write failing UI and probe tests**

Assert that:

- automatic mode displays `Auto-detect (recommended)` instead of a Windows path;
- saving an empty Codex path selects automatic mode;
- saving a custom path calls `onUpdateExecutablePath`;
- provider test receives `executablePath`;
- successful self-check detail contains `source=...`, `path=...`, and `version=...` when available;
- missing and non-executable errors have distinct user messages;
- a present CLI that fails the authenticated inference is surfaced as
  `CODEX_SELF_CHECK_FAILED` with the original error retained in its detail.

- [ ] **Step 2: Run UI and probe tests and verify failure**

Run:

```bash
npx vitest run \
  tests/unit/api-config/provider-card-shell.test.ts \
  tests/unit/user-api/provider-test.test.ts \
  tests/unit/providers/codex-client.test.ts
```

Expected: FAIL on the new automatic-mode and diagnostic assertions.

- [ ] **Step 3: Implement automatic/custom path UI**

For Codex only:

- label the field `CLI Path`;
- render `Auto-detect (recommended)` when `executablePath` is empty;
- use `/Applications/ChatGPT.app/Contents/Resources/codex` as a neutral example on macOS-capable copy without saving it as a default;
- keep the field in the existing provider card path editor to avoid a new settings surface;
- test using the unsaved `tempExecutablePath` when the user explicitly tests a new value.

Do not change compatible-provider or ComfyUI base URL fields.

- [ ] **Step 4: Add version and resolution diagnostics**

Resolve once inside `runCodexSelfCheck`, run `codex --version` with a short timeout, and then run the existing authenticated `CODEX_OK` inference using the resolved path. Return:

```ts
{
  text,
  stdout,
  stderr,
  durationMs,
  executablePath: resolution.path,
  resolutionSource: resolution.source,
  version,
}
```

Version lookup failure must not replace a successful authenticated inference; omit `version` in that case. Resolver and inference failures remain terminal.

Wrap an authenticated inference failure in:

```ts
new CodexExecError('CODEX_SELF_CHECK_FAILED', original.message, {
  exitCode: original.exitCode,
  signal: original.signal,
  stdout: original.stdout,
  stderr: original.stderr,
})
```

Do not wrap executable-resolution or timeout errors; their existing specific
codes are more actionable.

- [ ] **Step 5: Run UI and probe tests**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 6: Commit UI and diagnostics**

Stage only Task 3 files and commit:

```bash
git commit -m "feat: expose Codex CLI auto detection"
```

### Task 4: Finite AI episode-split waiting

**Files:**
- Modify: `src/lib/query/mutations/useEpisodeMutations.ts`
- Test: `tests/unit/query/use-episode-mutations.test.ts`

**Interfaces:**
- Produces `EPISODE_SPLIT_TASK_TIMEOUT_MS = 21 * 60 * 1000`.
- `useSplitProjectEpisodes` passes `{ timeoutMs: EPISODE_SPLIT_TASK_TIMEOUT_MS }` to `resolveTaskResponse`.

- [ ] **Step 1: Write a failing mutation test**

Mock `useMutation`, `requestTaskResponseWithError`, and `resolveTaskResponse`. Capture the mutation function and assert:

```ts
expect(resolveTaskResponseMock).toHaveBeenCalledWith(
  response,
  { timeoutMs: EPISODE_SPLIT_TASK_TIMEOUT_MS },
)
```

- [ ] **Step 2: Run the mutation test and verify failure**

Run:

```bash
npx vitest run tests/unit/query/use-episode-mutations.test.ts
```

Expected: FAIL because the constant and timeout option do not exist.

- [ ] **Step 3: Add the feature-specific timeout**

Export the constant next to `useSplitProjectEpisodes` and pass it only for episode splitting. Leave `waitForTaskResult`’s global `timeoutMs ?? 0` behavior unchanged.

- [ ] **Step 4: Run the mutation test**

Run:

```bash
npx vitest run tests/unit/query/use-episode-mutations.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the timeout**

```bash
git add src/lib/query/mutations/useEpisodeMutations.ts tests/unit/query/use-episode-mutations.test.ts
git commit -m "fix: bound AI episode split waiting"
```

### Task 5: Cross-layer verification and local smoke test

**Files:**
- Modify only if verification exposes a defect in files already listed above.

**Interfaces:**
- Consumes all interfaces from Tasks 1–4.
- Produces verification evidence; it does not add a new runtime abstraction.

- [ ] **Step 1: Run the complete focused suite**

Run:

```bash
npx vitest run \
  tests/unit/providers/codex-executable-resolver.test.ts \
  tests/unit/providers/codex-client.test.ts \
  tests/unit/user-api/provider-test.test.ts \
  tests/unit/llm/codex-stream.test.ts \
  tests/unit/generators/codex-image.test.ts \
  tests/unit/api-config/use-providers-order.test.ts \
  tests/unit/api-config/provider-card-shell.test.ts \
  tests/unit/query/use-episode-mutations.test.ts \
  tests/integration/api/specific/user-api-config-put.test.ts \
  tests/integration/api/specific/user-models-codex.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run static verification**

Run:

```bash
npm run typecheck
git diff --check
```

Expected: both commands exit 0.

- [ ] **Step 3: Verify automatic resolution on the current Mac**

Run a read-only TypeScript probe and assert:

```json
{
  "path": "/Applications/ChatGPT.app/Contents/Resources/codex",
  "source": "macos-chatgpt"
}
```

Do not edit `.env` or `.env-bf`.

- [ ] **Step 4: Run a real authenticated Codex self-check**

Invoke `runCodexSelfCheck` with automatic detection and `gpt-5.5`. Record the resolved path/source/version and require `text === "CODEX_OK"`. Do not print credentials or configuration secrets.

- [ ] **Step 5: Run one real AI episode-split smoke check**

Use the authenticated browser state against the supplied project. Submit one split request, retain the task ID, and require either:

- `completed` with a non-empty episode result; or
- `failed`/`canceled` with a concrete terminal error.

HTTP 200 or a persistent `processing` state is not passing evidence. Do not save the previewed split episodes.

- [ ] **Step 6: Review final scope and status**

Run:

```bash
git status --short --branch
git log --oneline -6
git diff HEAD^ --stat
```

Confirm `.env-bf` remains untracked and untouched, no unrelated files changed, and Windows support is described as deterministic test coverage pending a real Windows smoke run.
