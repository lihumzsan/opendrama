# 章节批次导入与剧集改编确认设计

## 背景

用户通常不会一次录入整本小说，而是一次录入一章或几章。当前系统已有语义分集、`NovelPromotionEpisode`、整集剧本 `NovelPromotionScreenplay` 和场景 `NovelPromotionScreenplayScene`，但“本次上传的章节素材”和“最终确认的改编剧集”之间缺少一个可审阅、可回退的中间层。

如果直接把章节文本写入 episode 并立即生成剧本，系统会把原始素材和改编结果混在一起。用户想调整“这几章改成一集还是两集”时，只能覆盖 episode，容易误删已生成剧本、分镜、语音和视频资产。

## 产品原则

- 章节批次是原始素材，episode 是确认后的改编结果，二者不能混用。
- AI 可以建议一章改一集、几章合一集、一章拆多集，但必须先生成候选方案，等待用户确认。
- 用户确认前不创建或覆盖 `NovelPromotionEpisode`。
- 整集剧本只读取已确认 episode，不直接读取未确认章节批次。
- 分镜、语音和视频只能从已确认剧本向下游生成，不能从原小说直接切镜头。
- 不假装知道整本小说后续。当前批次之外的信息只能来自项目层已确认设定和历史 episode 摘要。

## 目标流程

```text
NovelPromotionProject
  -> ChapterBatch（本次上传的一章或几章）
  -> AI 章节理解
  -> CandidateEpisodePlan[]（候选改编剧集）
  -> 用户确认一个方案
  -> NovelPromotionEpisode[]
  -> NovelPromotionScreenplay
  -> NovelPromotionScreenplayScene[]
  -> 分镜 / 语音 / 视频
```

## 数据模型

第一版新增一个批次级模型即可，不需要为每一章单独建表。

```text
NovelPromotionChapterBatch
- id
- novelPromotionProjectId
- title
- sourceText
- sourceFingerprint
- chapterStartLabel
- chapterEndLabel
- status: draft | analyzing | analyzed | failed | confirmed | discarded
- analysisJson
- candidateEpisodesJson
- selectedPlanJson
- createdEpisodeIdsJson
- errorJson
- createdAt
- updatedAt
```

字段含义：

- `sourceText` 保存用户本次输入的完整章节文本。
- `sourceFingerprint` 用于重复提交检查和后续追溯。
- `analysisJson` 保存章节摘要、人物变化、地点道具、剧情线、疑似伏笔和不确定推断。
- `candidateEpisodesJson` 保存 AI 给出的 1 个或多个改编方案。
- `selectedPlanJson` 保存用户最终确认的方案快照。
- `createdEpisodeIdsJson` 保存确认后创建或更新的 episode id 列表。
- `errorJson` 保存最近一次分析或确认失败的可读错误和校验详情。

`NovelPromotionEpisode.novelText` 继续保存该 episode 覆盖的原文片段。确认后写入 episode，而不是让 episode 反向充当章节批次。

## 候选方案结构

AI 输出的候选方案必须是可确认的结构化结果：

```text
CandidateEpisodePlan
- planId
- title
- rationale
- episodes[]
  - provisionalNumber
  - name
  - description
  - sourceStart
  - sourceEnd
  - sourceText
  - coreGoal
  - dramaticArc
  - endingHook
  - adaptationNotes
    - keep[]
    - merge[]
    - remove[]
    - externalize[]
    - inferred[]
```

规则：

- `sourceStart/sourceEnd/sourceText` 必须覆盖 `ChapterBatch.sourceText` 的连续范围。
- 一个方案内的 episode 来源范围必须顺序不变、无重叠。
- 允许因影视节奏删减内容，但删减只能出现在 `adaptationNotes.remove`，不能造成原文范围校验丢失。
- `inferred` 必须标注为推断，不得混成原文事实。

## API 接入

新增章节批次 API：

```text
POST /api/novel-promotion/[projectId]/chapter-batches
GET  /api/novel-promotion/[projectId]/chapter-batches
GET  /api/novel-promotion/[projectId]/chapter-batches/[batchId]
POST /api/novel-promotion/[projectId]/chapter-batches/[batchId]/analyze
POST /api/novel-promotion/[projectId]/chapter-batches/[batchId]/confirm
POST /api/novel-promotion/[projectId]/chapter-batches/[batchId]/discard
```

职责：

- `POST chapter-batches` 只保存原文和基本标签，不调用 AI。
- `analyze` 发起异步任务，产出 `analysisJson` 和 `candidateEpisodesJson`。
- `confirm` 接收 `planId` 和可选用户编辑后的 episode 草稿，写入 `NovelPromotionEpisode`。
- `discard` 只废弃未确认批次；已确认批次不物理删除 episode。

确认写入时复用现有 episode 保存语义：

- 新增内容默认 append 到已有 episode 后面。
- 如果用户选择更新当前 episode，必须指定 `episodeId`。
- 如果会覆盖已有生成资产，必须返回依赖计数并要求显式确认。

## Worker 接入

新增任务类型：

```text
CHAPTER_BATCH_ANALYZE
```

任务步骤：

1. 读取 `ChapterBatch.sourceText`，做换行归一化和章节标题识别。
2. 调用现有语义单元构建能力，形成 source units。
3. 结合最近已确认 episode 摘要、项目人物/地点/道具，生成章节理解。
4. 生成候选改编方案。
5. 本地校验每个候选方案的来源覆盖、顺序和字段完整性。
6. 失败时把校验错误反馈给模型修复一次。
7. 持久化分析结果和候选方案。

不在该 worker 中生成剧本、不生成分镜、不创建视频任务。

确认后再调用现有整集剧本链路：

```text
NovelPromotionEpisode -> episode screenplay worker -> NovelPromotionScreenplay
```

## UI 接入

新增“章节导入”工作区入口，推荐放在现有 episode 管理或小说推广工作流的最前面。

页面分四个区域：

1. 上传区：标题、章节范围、正文输入。
2. 分析结果：章节摘要、人物变化、地点道具、疑似伏笔、不确定推断。
3. 候选方案：以卡片展示“一集版”“两集版”等方案，每个方案列出每集覆盖范围、目标、冲突、钩子和改编说明。
4. 确认动作：确认为新 episode、更新当前 episode、废弃批次。

确认后跳转到该 episode 的“剧本”阶段，按钮文案为“生成整集剧本”。

## 与现有链路的关系

- `episodes/batch` 仍是 episode 批量写入的落地点，但前端不再把 AI 候选方案直接当最终 episode 自动保存。
- `episode_split_llm` 的语义切分能力可以复用为章节批次分析的一部分，但新任务需要保留批次状态和候选方案快照。
- `screenplay-conversion` 名称与旧 clip 语义不匹配。第一版可以继续复用 worker 能力，后续应把用户可见名称统一到“整集剧本生成”。
- 当前过渡期允许整集剧本生成后物化 `NovelPromotionClip` 给下游分镜使用，但 UI 不应把这些 clip 当成剧本层级展示。

## 错误处理

- 文本少于最低字数时拒绝分析，只保留 draft。
- 同一项目内相同 `sourceFingerprint` 的未废弃批次再次提交时提示重复。
- AI 返回空候选、来源范围不连续、字段缺失或 JSON 无法修复时，批次进入 `failed`，写入 `errorJson`，不创建 episode。
- 用户确认时如果目标 episode 已有 screenplay、clip、storyboard、shot、voiceLine、cover 等下游资产，必须要求显式确认覆盖或改为 append 新 episode。
- 已确认批次再次确认必须幂等：如果 `createdEpisodeIdsJson` 已存在，默认返回既有 episode，不重复创建。

## 非目标

- 不做整本小说版权、下载或全文管理。
- 不自动补全未提供的后续章节。
- 不在第一版实现跨批次人物关系图谱版本化。
- 不在章节分析阶段生成剧本、分镜、图片或视频。
- 不删除旧项目、旧 episode 或旧 clip 数据。

## 验收标准

- 用户上传一章或几章后，系统先保存为 `ChapterBatch`，不会立即创建 episode。
- AI 分析完成后至少返回一个候选改编方案，且每个方案的 episode 来源范围顺序不变、无重叠。
- 用户确认方案后才创建或更新 `NovelPromotionEpisode`，并能看到对应 episode id。
- 确认后的 episode 可以继续生成唯一的 `NovelPromotionScreenplay` 和多个 `NovelPromotionScreenplayScene`。
- 未确认或废弃批次不会被剧本、分镜、语音、视频链路读取。
- 覆盖已有 episode 且存在下游资产时，接口返回依赖计数并要求显式确认。
- 重复确认同一批次不会重复创建 episode。

## 实施顺序

1. 新增 `NovelPromotionChapterBatch` Prisma 模型和迁移。
2. 新增 chapter-batches CRUD、analyze、confirm、discard API。
3. 新增 `CHAPTER_BATCH_ANALYZE` 任务类型、队列策略、进度文案和 worker。
4. 复用语义分集工具，新增候选方案校验和修复逻辑。
5. 前端新增章节导入页面和候选方案确认 UI。
6. 确认动作接入现有 episode 保存逻辑，再跳转到整集剧本生成。
7. 添加单元测试、API 合约测试、worker 测试和一条章节导入到剧本生成的链路测试。
