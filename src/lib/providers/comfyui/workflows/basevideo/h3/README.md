# MiniMax H3 FL2VA workflows

The `upstream` directory contains untouched RunningHub ComfyUI UI workflows at the revision recorded in `upstream/manifest.json`.

The three JSON files in this directory are separate API-format runtime graphs used by OpenDrama:

- `fl2va-first-frame.json`: standard image-to-video;
- `fl2va-last-frame.json`: explicit/manual last-frame constraint;
- `fl2va-first-last-frame.json`: transition between two project panels.

All runtime graphs select INT8 converted weights, 832x480 output, 24 fps, native generated audio, and the 21-point `res_multistep` sampler with approximate acceleration disabled.

Runtime model layout:

- `ComfyUI/models/MiniMax-H3/`: converted tensor files;
- `ComfyUI/models/diffusers/MiniMax-H3/FL2VA/`: official configuration, tokenizer, processor, and source modules without BF16 tensor shards.

`models.manifest.json` records the exact tensor byte sizes and SHA256 hashes used by these graphs so local installs can be verified without committing the large model files.

The RunningHub plugin is Apache-2.0. MiniMax H3 model weights use the MiniMax community license and must not be described as OSI-approved open-source software. Context-IR and 2K regeneration are not included in these workflows.
