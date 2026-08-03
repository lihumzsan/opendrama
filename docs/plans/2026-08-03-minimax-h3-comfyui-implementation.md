# MiniMax H3 ComfyUI Integration Implementation Plan

> **Execution note:** Implement task-by-task, verify each affected trigger point, and preserve the upstream workflow sources separately from project runtime copies.

**Goal:** Install local MiniMax H3 FL2VA INT8 inference and make first-frame and first/last-frame H3 generation selectable from OpenDrama.

**Architecture:** RunningHub's H3 nodes run in the existing ComfyUI service. OpenDrama registers H3-specific workflow profiles and routes existing video generator inputs into API-format copies of the upstream workflows. The current generic ComfyUI client remains responsible for upload, queueing, polling, and output retrieval.

**Stack:** ComfyUI 0.30.1, PyTorch 2.9/CUDA 13, RunningHub MiniMax H3 custom nodes, Next.js/TypeScript, Vitest.

---

## Task 1: Preserve and characterize upstream workflows

**Files:**

- Create: `src/lib/providers/comfyui/workflows/basevideo/h3/upstream/*.json`
- Create: `src/lib/providers/comfyui/workflows/basevideo/h3/upstream/manifest.json`
- Create: `src/lib/providers/comfyui/workflows/basevideo/h3/README.md`

**Steps:**

1. Download the three pinned RunningHub FL2VA example JSON files.
2. Record repository revision, source URL, file size, and SHA256 in the manifest.
3. Verify the stored hashes against freshly downloaded bytes.
4. Document model filenames, directory layout, and license boundary.

## Task 2: Add failing workflow/profile tests

**Files:**

- Create: `tests/unit/providers/comfyui/h3-workflow-profiles.test.ts`
- Modify: `tests/unit/providers/comfyui-workflow-registry.test.ts`
- Modify: `tests/unit/model-capabilities/comfyui-video-capabilities.test.ts`
- Modify: API/model configuration contract tests as discovered

**Steps:**

1. Assert all three H3 profile IDs resolve to workflow files.
2. Assert first-frame and first/last routing selects the intended profile.
3. Assert prompt, duration, dimensions, first frame, and last frame are injected into correct titled nodes.
4. Assert the H3 model advertises image-to-video and first/last-frame capabilities.
5. Run focused Vitest tests and confirm the new assertions initially fail.

## Task 3: Add H3 runtime workflows and routing

**Files:**

- Create: `src/lib/providers/comfyui/workflows/basevideo/h3/*.json`
- Create: `src/lib/providers/comfyui/h3-workflow-profiles.ts`
- Create: `src/lib/providers/comfyui/h3-workflow-router.ts`
- Modify: `src/lib/providers/comfyui/workflow-registry.ts`
- Modify: `src/lib/generators/comfyui-video.ts`

**Steps:**

1. Convert each upstream UI graph into deterministic API JSON.
2. Add stable profile metadata for first, last, and first/last frame modes.
3. Route standard source-image generation to the first-frame profile and first/last requests to the paired profile.
4. Make image injection prefer H3 node titles before falling back to graph order.
5. Preserve all existing LTX 2.3 paths.
6. Run focused registry/router/generator tests until green.

## Task 4: Expose H3 in model configuration

**Files:**

- Modify: `src/lib/api-config.ts`
- Modify: `src/app/api/user/models/route.ts`
- Modify: the model capability catalog used by the current branch
- Modify: relevant configuration/capability tests

**Steps:**

1. Add an explicit H3 local video model without replacing the default ComfyUI video model.
2. Associate the new model with H3 workflow selection metadata.
3. Expose native audio, image-to-video, and first/last-frame capabilities accurately.
4. Run the API-config and model-capability contract tests.

## Task 5: Install plugin and dependencies

**Runtime paths:**

- `D:\workspace\comfui\dapao2604\ComfyUI\custom_nodes\ComfyUI_RH_MinMaxH3`
- `D:\workspace\comfui\dapao2604\python_dapao312`

**Steps:**

1. Clone the pinned plugin revision and record it in the project manifest/docs.
2. Install only the plugin's declared Python dependencies into the existing ComfyUI Python environment.
3. Confirm Transformers stays within the plugin-supported range.
4. Check ffmpeg/ffprobe and CUDA imports before restarting.

## Task 6: Download FL2VA INT8 tensors and official sidecars

**Runtime paths:**

- `D:\workspace\comfui\models\MiniMax-H3`
- `D:\workspace\comfui\models\diffusers\MiniMax-H3`

**Steps:**

1. Download the FL2VA DiT, Qwen3-VL INT8 encoder, video VAE, and audio VAE with resume enabled.
2. Download the official FL2VA config/tokenizer/processor/source files while excluding BF16 tensors.
3. Verify file sizes and available upstream hashes.
4. Confirm plugin loaders resolve every selected component.

## Task 7: Restart and validate ComfyUI nodes

**Steps:**

1. Identify only the process tree serving the current ComfyUI path and port 8878.
2. Stop that process tree without touching other ComfyUI installs.
3. Start it with the existing launch configuration.
4. Verify HTTP readiness, listener ownership, command line, and `/object_info` H3 node classes.
5. Submit all three API graphs to `/prompt` for schema validation.

## Task 8: Render real H3 smoke tests

**Artifacts:**

- Store inputs, prompt payloads, logs, and outputs under `.codex-artifacts/h3-smoke/` outside Git.

**Steps:**

1. Generate a deterministic 832x480 test frame.
2. Queue a short first-frame H3 render using the recommended memory profile.
3. Poll history until completion or capture the complete node error.
4. Verify output container, resolution, duration, video stream, and audio stream with ffprobe.
5. Queue a first/last-frame validation using two deterministic frames.
6. Record measured VRAM/RAM behavior and render time.

## Task 9: Full project verification and delivery

**Steps:**

1. Run focused unit tests.
2. Run the project's type check and lint commands.
3. Run the broader relevant test suite.
4. Run `git diff --check` and inspect all repository changes.
5. Commit project integration changes with a scoped message.
6. Report exact workflow IDs, runtime URLs, model locations, generated artifact paths, measured performance, and any remaining limits.
