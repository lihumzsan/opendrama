# MiniMax H3 ComfyUI Integration Design

**Date:** 2026-08-03
**Status:** Approved
**Scope:** Local FL2VA INT8 inference and OpenDrama integration

## Goal

Add a locally hosted MiniMax H3 video-generation path to the existing ComfyUI instance and expose three FL2VA workflows to OpenDrama:

1. first-frame image-to-video;
2. last-frame constrained video;
3. first-and-last-frame transition video.

LTX 2.3 remains available for long, multi-shot, and throughput-oriented generation. H3 is intended for short, high-motion clips with native synchronized audio.

## Runtime and model layout

The existing ComfyUI instance at `D:\workspace\comfui\dapao2604\ComfyUI` remains the runtime. The RunningHub `ComfyUI_RH_MinMaxH3` custom node is installed under `custom_nodes`.

H3 model files are stored in the shared ComfyUI model root:

- `D:\workspace\comfui\models\MiniMax-H3\` for converted INT8 tensors;
- `D:\workspace\comfui\models\diffusers\MiniMax-H3\` for official configuration, tokenizer, processor, and source metadata.

The first installation contains the FL2VA DiT, INT8 Qwen3-VL encoder, video VAE, and audio VAE. Ref2VA is deliberately deferred because it adds roughly 47 GB and is not required for keyframe-driven generation.

## Workflow preservation and adaptation

The three RunningHub example workflows are copied into the repository unchanged as upstream sources. A manifest records their source URLs, revisions, and SHA256 hashes. OpenDrama uses separately maintained runtime copies so upstream evidence is never overwritten.

The project workflow registry injects prompt, uploaded images, size, duration, frame rate, and randomized seeds. Image injection is title-aware for H3 (`First frame` and `Last frame`) so first/last semantics do not depend only on node order.

## Routing

- A normal image-to-video request with a source image routes to H3 first-frame FL2VA when the H3 model/profile is selected.
- A first/last-frame request routes to H3 first-and-last-frame FL2VA.
- The last-frame-only graph is registered for explicit/manual use but is not selected automatically by the current generator contract.
- Existing LTX 2.3 routing remains unchanged.

H3 is added as a distinct ComfyUI video model/profile rather than replacing the existing `comfyui-local-video` entry. This keeps model selection explicit and avoids surprising existing projects.

## Initial quality and memory profile

The safe initial profile is 832x480, 5 seconds, 24 fps, INT8 weights, layerwise offload, and `res_multistep` sampling with acceleration disabled. The RTX 5070 Ti has 16 GB VRAM, so the workflow relies on host-memory offload. The machine's 64 GB RAM is near the practical lower edge; the smoke test therefore starts with one job and no concurrently resident video model.

If the initial graph runs out of memory, the fallback order is:

1. free all resident ComfyUI models and retry;
2. reduce duration while keeping the supported canvas;
3. switch to the plugin's default Euler sampler only if `res_multistep` is incompatible;
4. retain the integrated workflow but document the measured local limit.

## Verification

Installation is accepted only when:

- ComfyUI starts cleanly and `/object_info` exposes all required H3 node classes;
- all required model/config/tokenizer files exist and downloaded tensor hashes are verified when upstream hashes are available;
- all three project workflow graphs convert to valid API graphs;
- unit tests for registry, routing, model capabilities, and API configuration pass;
- a real first-frame H3 prompt is queued through ComfyUI and produces a playable video with an audio stream;
- the first-and-last-frame graph is validated at least through prompt acceptance, with a render attempted when resources permit.

## Licensing boundary

The RunningHub plugin is Apache-2.0. MiniMax H3 weights use the MiniMax community license, which is not an OSI-approved open-source license. Context-IR and 2K regeneration are not part of this local open-weight path, so the UI and documentation must not describe the integration as the full H3 product.
