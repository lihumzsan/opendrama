# OpenDrama Dev Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `start-opendrama-dev.bat` bootstrap local prerequisites, release ports `3000` and `3010`, and reliably start OpenDrama in development mode.

**Architecture:** Keep the existing BAT as the only launcher. Use built-in PowerShell only for listener PID discovery and `taskkill` for process-tree termination, while retaining the existing foreground `npm.cmd run dev` workflow.

**Tech Stack:** Windows Batch, Windows PowerShell, Node.js, npm, Next.js

## Global Constraints

- Only terminate listeners on TCP ports `3000` and `3010`.
- Run `npm.cmd ci` only when `node_modules` is absent.
- Create `.env` only when absent, using `.env.example` as the source.
- Do not stop an existing service until prerequisites have passed.
- Keep `--check` non-destructive: it must neither stop listeners nor start the project.

---

### Task 1: Bootstrap and port-aware launcher

**Files:**
- Modify: `start-opendrama-dev.bat`
- Verify: PowerShell and live runtime commands from the repository root

**Interfaces:**
- Consumes: `.env.example`, `package-lock.json`, `npm.cmd`, `ffmpeg`, `ffprobe`, TCP ports `3000` and `3010`
- Produces: `.env`, `node_modules`, foreground `npm.cmd run dev`, HTTP listeners on `3000` and `3010`

- [ ] **Step 1: Verify the missing behavior**

Run a temporary TCP listener on port `3000`, execute the current BAT only far enough to observe its behavior, and confirm the current script contains no port-release routine. Expected result: the listener remains alive and the source has no `taskkill` or equivalent port cleanup.

- [ ] **Step 2: Initialize the development environment**

Copy `.env.example` to ignored `.env`, then run:

```powershell
npm.cmd ci
```

Expected result: exit code `0`, `node_modules` exists, and Prisma client generation completes.

- [ ] **Step 3: Implement automatic bootstrap**

Update `start-opendrama-dev.bat` so missing `.env` is copied from `.env.example`, missing `node_modules` triggers `npm.cmd ci`, and failures exit before touching any listener.

- [ ] **Step 4: Implement exact-port cleanup**

Add a `:stop_port` subroutine that discovers unique listener PIDs with `Get-NetTCPConnection`, prints each PID, calls `taskkill /PID <pid> /T /F`, and verifies the port is no longer listening. Call it for `3000` and `3010` only after prerequisite checks.

- [ ] **Step 5: Verify non-destructive check mode**

Run:

```powershell
cmd.exe /d /c start-opendrama-dev.bat --check
```

Expected result: exit code `0`; prerequisite success is printed; any pre-existing test listener remains alive.

- [ ] **Step 6: Verify occupied-port restart behavior**

Start temporary listeners on `3000` and `3010`, then launch:

```powershell
cmd.exe /d /c start-opendrama-dev.bat
```

Expected result: both temporary PIDs are terminated, then OpenDrama listens on both ports.

- [ ] **Step 7: Verify HTTP readiness**

Request:

```powershell
Invoke-WebRequest http://localhost:3000 -UseBasicParsing
Invoke-WebRequest http://localhost:3010/admin/queues -UseBasicParsing
```

Expected result: both endpoints return an HTTP response, with successful page status preferred; listener PIDs and command lines belong to the newly started OpenDrama process tree.

- [ ] **Step 8: Review the final diff**

Run:

```powershell
git diff --check
git diff -- start-opendrama-dev.bat
```

Expected result: no whitespace errors and only the intended launcher behavior changed.
