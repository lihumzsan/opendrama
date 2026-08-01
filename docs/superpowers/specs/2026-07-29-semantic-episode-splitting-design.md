# Semantic Episode Splitting Design

## Goal

Replace the legacy 400-word and marker-matching splitter with a narrative-first
pipeline that supports both formatted screenplays and novel/story prose. The
system automatically chooses the episode count and whether the material fits
5–15 minute horizontal motion-comic episodes or 20+ minute conventional
episodes. Users review the result and may merge adjacent episodes, split at
recommended narrative boundaries, or move whole scenes between episodes.

## Product Principles

- Narrative causality, scene integrity, character arcs, turning points, and
  episode hooks determine boundaries.
- Word count is never a hard split boundary. It is used only to estimate runtime
  and detect extreme imbalance.
- The default output profile is a 5–15 minute horizontal motion comic.
- The 20+ minute conventional profile is chosen only when shorter episodes
  would materially damage complete dramatic movements.
- Users are not asked for episode counts or professional story parameters.
- Every output episode is assembled from stable source ranges. The source must
  be covered exactly once, in order, with no gaps or overlaps.

## Architecture

### 1. Source-unit parser

Classify the document as `screenplay`, `prose`, or `mixed`.

- Screenplays are divided at scene headings while keeping the complete heading,
  action, character, and dialogue block together.
- Prose is divided into chapter-aware paragraphs and narrative blocks.
- Mixed documents preserve recognized scene blocks and treat surrounding prose
  as narrative blocks.
- Every unit has a stable ID and exact `startIndex`/`endIndex` into the original
  content.

### 2. Hierarchical narrative analysis

Long inputs are divided into analysis batches at source-unit boundaries.
For each batch, AI returns contiguous narrative scenes with:

- source-unit range;
- characters, time, location, and event summary;
- character goal, conflict, and outcome;
- plotline membership;
- unresolved threads and payoffs;
- turning-point type;
- closure, hook, transition, and causal-break scores for the following boundary.

The application validates and normalizes these ranges. Invalid AI ranges are
rejected rather than used to slice raw text.

### 3. Global episode planning

A second AI pass receives compact scene cards rather than the full source text.
It selects:

- output profile (`horizontal_motion_comic` or `regular_episode`);
- episode count;
- contiguous scene ranges for every episode;
- title, summary, core goal, local dramatic arc, ending hook, rationale, and
  estimated runtime.

The planner receives runtime estimates as soft guidance. It must not split a
scene or direct causal chain to satisfy duration.

### 4. Deterministic assembly and validation

The application maps planned scene ranges back to exact source ranges and
assembles episode content locally. Validation requires:

- all scenes used exactly once;
- strictly increasing contiguous scene ranges;
- source coverage from index `0` to `content.length`;
- no missing or duplicated non-whitespace content;
- a valid profile and positive episode metadata.

If planning output is invalid, one repair attempt includes the exact validation
failure. Repeating the unchanged prompt is forbidden. Queue-level retries for
this task are disabled so deterministic validation failures do not multiply
model calls.

### 5. Preview adjustments

The preview exposes non-professional operations:

- merge an episode with the next episode;
- split at an AI-recommended scene boundary;
- move a whole scene to the previous or next episode;
- restore the original AI recommendation.

After each operation, the UI recalculates runtime and narrative warnings. Raw
text editing remains available only as an explicit advanced action because it
can invalidate source coverage.

## Data Contracts

The split-task result keeps the existing fields required by the current UI:

```ts
type SplitEpisode = {
  number: number
  title: string
  summary: string
  content: string
  wordCount: number
}
```

It adds optional planning metadata:

```ts
type SemanticSplitEpisode = SplitEpisode & {
  estimatedMinutes: number
  coreGoal: string
  dramaticArc: string
  endingHook: string
  rationale: string
  startSceneId: string
  endSceneId: string
  sceneIds: string[]
}

type SemanticSplitResult = {
  success: true
  method: 'semantic'
  profile: 'horizontal_motion_comic' | 'regular_episode'
  estimatedTotalMinutes: number
  episodes: SemanticSplitEpisode[]
  scenes: NarrativeScene[]
}
```

The extra fields are backward compatible: existing preview and batch-save code
continues to use the original five fields.

## Error Handling

- Inputs shorter than 100 characters retain the existing validation error.
- Missing model configuration produces the current user-facing settings error.
- Malformed local-analysis JSON reports the affected batch.
- Invalid global plans report the exact gap, overlap, range, or coverage error.
- A single planner repair pass receives the validation error and the previous
  plan. If it still fails, the task fails without destructive persistence.
- Splitting never saves episodes. Database changes occur only after the user
  confirms the preview.

## Testing and Acceptance

- Unit tests cover document classification, exact source-unit coverage, batch
  creation, plan normalization, gap/overlap rejection, deterministic assembly,
  and absence of a 400-word cap.
- Worker tests verify two-stage AI use, feedback-based repair, no legacy marker
  matcher, and backward-compatible result fields.
- Existing marker-based preview remains available as an explicit fast path, but
  its forced 400-word subdivision is removed.
- A real read/write task trial uses the latest source content submitted for the
  `周生如故` project. The trial may create a task record but must not save or
  replace project episodes.
- Acceptance requires a complete, non-overlapping result whose boundaries are
  explainable in terms of scenes, goals, turns, and hooks.
