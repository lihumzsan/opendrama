# Codex CLI Cross-Platform Resolution Design

## Goal

OpenDrama must use an already installed and authenticated Codex CLI on Windows and macOS without shipping, installing, upgrading, or authenticating Codex itself. The default experience is automatic discovery. Operators and users may still provide an explicit executable path when discovery is unsuitable.

This change also closes the user-visible failure mode in which an AI episode-split request attaches to a task that never returns a useful result while the browser polls forever.

## Scope

The implementation covers:

- one platform-aware Codex executable resolver shared by text, vision, image generation, and provider self-check paths;
- backward-compatible reading of existing Codex provider configuration;
- an automatic-detection default in the provider UI with an optional custom path;
- structured path-resolution and self-check failures;
- a finite client wait for AI episode splitting;
- unit, integration, and local macOS smoke verification.

OpenDrama will not download Codex, choose an account, perform login, update the CLI, or promise Windows runtime completion without a real Windows smoke test.

## Executable Resolution

The resolver returns structured data containing the resolved absolute path and its source. Resolution uses this precedence:

1. `CODEX_CLI_PATH`, when explicitly set by the process operator;
2. a user-saved custom executable path;
3. current-platform standard install candidates;
4. the process `PATH`, including Windows `PATHEXT` handling.

An explicit operator or user path is authoritative. If it is missing, is not a file, or is not executable on POSIX, resolution fails immediately instead of silently selecting another installation.

Automatic macOS candidates include:

- `/Applications/ChatGPT.app/Contents/Resources/codex`;
- `~/Applications/ChatGPT.app/Contents/Resources/codex`;
- common Homebrew locations and entries found through `PATH`.

Automatic Windows candidates include:

- versioned Codex directories below `%LOCALAPPDATA%\OpenAI\Codex\bin`;
- `%LOCALAPPDATA%\OpenAI\Codex\bin\codex.exe`;
- `%USERPROFILE%\.codex\.sandbox-bin\codex.exe`;
- `codex.exe`, `codex.cmd`, and other allowed `PATHEXT` matches found through `PATH`.

Known historical Windows defaults are compatibility sentinels, not explicit custom paths. On every platform they mean automatic detection.

## Configuration Compatibility

Codex executable configuration will have provider-specific `executablePath` semantics instead of pretending that a local file is an HTTP `baseUrl`.

Existing JSON provider configuration requires no database schema migration:

- an existing custom Codex `baseUrl` is read as the legacy executable path when `executablePath` is absent;
- the two historical Windows default values are normalized to automatic detection;
- new saves use the provider-specific executable path field and do not write a platform-specific default;
- non-Codex providers retain their existing `baseUrl` behavior unchanged.

Runtime consumers receive a `codexPath`/`executablePath` value and never interpret Codex configuration as a network endpoint.

## UI and Error Behavior

The Codex provider card defaults to “Auto-detect (recommended).” A custom executable path remains available in advanced settings.

Provider connection testing reports:

- resolution source;
- resolved executable path;
- CLI version when available;
- the existing authenticated Codex self-check result.

Failures remain machine-actionable:

- `CODEX_EXECUTABLE_NOT_FOUND` when no candidate exists;
- `CODEX_EXECUTABLE_NOT_EXECUTABLE` when a POSIX path cannot be executed;
- `CODEX_SELF_CHECK_FAILED` when the CLI is present but version/login/inference validation fails;
- the existing `CODEX_EXEC_TIMEOUT` for an unresponsive CLI process.

AI work validates the CLI before presenting a streaming stage. Episode splitting passes an explicit finite wait budget slightly above the worker’s Codex execution timeout. On timeout or terminal failure, the wizard returns to a retryable state and shows the task/error context instead of polling forever.

This scope does not introduce a global timeout for every asynchronous task because other task types have different runtime budgets.

## Components

The implementation keeps responsibilities narrow:

- a resolver module owns platform candidates, environment expansion, `PATH` scanning, validation, and resolution diagnostics;
- the Codex client owns process execution and consumes a resolved path;
- provider configuration owns legacy-to-current field normalization;
- the provider card owns auto/custom path presentation;
- the episode-split mutation owns its task wait budget.

No unrelated provider, queue, or workflow refactor is included.

## Verification

Resolver unit tests inject platform, environment, home directory, `PATH`, `PATHEXT`, and filesystem probes so Windows behavior is tested deterministically on macOS. Cases cover:

- environment override success and authoritative failure;
- saved custom path success and authoritative failure;
- macOS ChatGPT bundle and Homebrew discovery;
- Windows versioned, unversioned, legacy, and `PATH` discovery;
- paths containing spaces;
- legacy placeholder normalization;
- missing and non-executable candidates;
- stable precedence when multiple candidates exist.

Integration and UI-focused tests cover provider configuration round trips, legacy reads, automatic defaults, provider self-check diagnostics, and the finite episode-split wait option.

Local acceptance requires:

- focused unit and integration tests;
- type checking and `git diff --check`;
- resolving `/Applications/ChatGPT.app/Contents/Resources/codex` on the current Mac;
- a real Codex self-check;
- one real episode-split task reaching a terminal state or returning a concrete terminal error.

Windows is considered code-covered after deterministic platform tests, but release-level Windows acceptance still requires one real Windows self-check and episode-split smoke run.
