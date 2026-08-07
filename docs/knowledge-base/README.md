# OpenDrama 视觉和分镜知识库总览

## 目标

本知识库用于把外部文章里的提示词资料整理成项目可复用的角色、画面和 H3 视频生成参考。

原则：
- 按项目使用场景归类，不按文章来源堆文件。
- 只保留可复用的结构化知识，不照搬营销话术和整段 prompt。
- 先服务剧情和角色功能，再选择脸型、发型、服饰、动作、表情和镜头。
- 对 H3 视频生成，所有提示词都要强调连续性、身份一致和单一主运动。
- 涉及少年感、病弱、反派、欲感、异域、妖族等高风险标签时，必须改写成成年边界、剧情功能和具体视觉锚点。

## 当前分类

```text
docs/knowledge-base/
  image-prompts/
    character-visual-cn.md
    male-character-visual-cn.md
    face-differentiation-cn.md
    male-face-differentiation-cn.md
    modern-female-hairstyles-cn.md
    modern-male-hairstyles-cn.md
    modern-female-outfits-cn.md
    ancient-female-outfits-cn.md
    historical-hairstyles-cn.md
    xianxia-character-outfits-cn.md
  storyboard/
    body-actions-cn.md
    facial-expressions-cn.md
    cinematic-shots-cn.md
```

## 使用顺序

### 1. 小说文本到角色 bible

先从文本里抽取角色功能，再查人物视觉库。

推荐字段：

```text
role_function: [女主 / 男主 / 反派 / 男二 / 女配 / 长辈 / 群像]
age_boundary: adult / young adult / mature adult
story_context: [现代都市 / 古代宫廷 / 仙侠 / 江湖 / 校园成年线 / 职场 / 玄幻]
personality_function: [清冷 / 温柔 / 强势 / 病弱 / 反差 / 野性 / 书卷气]
face_profile: [脸型和面部气质]
hairstyle: [发型结构]
outfit_profile: [服饰系统和场景服装]
expression_range: [常用表情范围]
pose_baseline: [角色常用体态]
visual_constraints: [年龄、同脸、服装连续性、风险约束]
```

查库顺序：
- 女主基础气质：`image-prompts/character-visual-cn.md`
- 男主基础气质：`image-prompts/male-character-visual-cn.md`
- 女主脸型差异化：`image-prompts/face-differentiation-cn.md`
- 男主脸型差异化：`image-prompts/male-face-differentiation-cn.md`
- 现代女发：`image-prompts/modern-female-hairstyles-cn.md`
- 现代男发：`image-prompts/modern-male-hairstyles-cn.md`
- 现代女装：`image-prompts/modern-female-outfits-cn.md`
- 古代女装：`image-prompts/ancient-female-outfits-cn.md`
- 古风发髻：`image-prompts/historical-hairstyles-cn.md`
- 仙侠服饰：`image-prompts/xianxia-character-outfits-cn.md`

### 2. 角色 bible 到生图 prompt

生图 prompt 不要把所有词库都塞进去。每次只选关键锚点：

```text
[角色身份] + [年龄边界] + [脸型 2-3 个锚点] + [发型 1 个结构]
+ [服装系统] + [姿态] + [表情] + [镜头景别] + [光线/场景]
+ [负面约束]
```

推荐组合：
- 现代女主：女主视觉原型 + 女主脸型 + 现代女发 + 现代女装 + 表情。
- 现代男主：男主视觉原型 + 男主脸型 + 现代男发 + 表情。
- 古代女主：女主视觉原型 + 女主脸型 + 古代女装或仙侠服饰 + 古风发髻 + 表情。
- 群像角色：优先改变脸型、发型和服装系统，不靠增加“绝美、高级、电影感”解决撞脸。

### 3. 分镜到 H3 视频 prompt

H3 提示词优先查分镜库：
- 动作：`storyboard/body-actions-cn.md`
- 表情：`storyboard/facial-expressions-cn.md`
- 镜头：`storyboard/cinematic-shots-cn.md`

H3 推荐结构：

```text
shot_purpose: [这个镜头的叙事目的]
shot_size: [景别]
camera_position: [机位]
camera_motion: [固定 / 缓慢推进 / 跟随 / 上升 / POV]
subject_state: [角色起始姿态和表情]
main_motion: [唯一主动作或情绪变化]
ending_state: [结束姿态和表情]
continuity_guard: Keep identity, costume, hairstyle, face shape, body proportions, lighting direction, and environment consistent.
negative_prompt: [动作、表情、镜头对应的负面约束]
```

H3 约束：
- 一个 5 至 15 秒镜头只保留一个主动作或一条情绪弧线。
- 不在同一段里混合全景、特写、鸟瞰、POV 等多个镜头。
- 首尾帧必须是同一地点、同一服装、同一发型和同一人物脸型。
- 对大场面镜头，优先慢推进、慢后拉、云雾和衣摆小幅运动。
- 对情绪镜头，优先固定镜头或微推进，靠眼神、嘴角、泪光和呼吸变化表达。

## 归档规则

后续新文章按以下规则处理：

| 文章类型 | 归档位置 | 处理方式 |
| --- | --- | --- |
| 女主/男主人设 | `image-prompts/*character-visual-cn.md` | 提炼角色功能和视觉原型，去掉营销词 |
| 女主/男主脸型 | `image-prompts/*face-differentiation-cn.md` | 归并为面部气质和锚点，不逐条堆标签 |
| 现代发型 | `image-prompts/modern-*-hairstyles-cn.md` | 按发型族合并，记录别名和适用角色 |
| 现代/古代服饰 | `image-prompts/*outfits-cn.md` | 按服饰系统、身份和场景归并 |
| 古风发髻 | `image-prompts/historical-hairstyles-cn.md` | 按朝代感、身份、头饰和发髻结构归并 |
| 仙侠服饰 | `image-prompts/xianxia-character-outfits-cn.md` | 按门派、身份、元素属性和服饰系统归并 |
| 动作姿态 | `storyboard/body-actions-cn.md` | 只收身体关系和连续动作，不收写真服装 |
| 表情情绪 | `storyboard/facial-expressions-cn.md` | 按情绪族和微表演字段合并 |
| 镜头构图 | `storyboard/cinematic-shots-cn.md` | 按景别、机位、构图、运镜和 H3 风险整理 |

不建议收录：
- 只有“好看、绝美、高级、氛围感”但没有结构锚点的内容。
- 只适合某张图、无法迁移到角色或分镜的单次 prompt。
- 强依赖水印图、同一模特脸、平台引导或课程销售的话术。
- 会导致年龄含混、疾病浪漫化、异域刻板化、反派脸谱化的原始标签。

## 项目接入建议

当前知识库已经可以作为人工和 Codex 生成提示词时的项目上下文使用。后续如果要做成项目功能，建议分三步：

1. 角色 bible 生成阶段：把 `face_profile`、`hairstyle`、`outfit_profile`、`expression_range` 作为结构化字段保存。
2. 分镜生成阶段：为每个 shot 保存 `shot_size`、`camera_position`、`camera_motion`、`pose`、`expression`。
3. H3 prompt 组装阶段：从角色 bible 和分镜字段读取锚点，自动拼接一致性约束和负面约束。

最低可行接入方式：
- 先不改数据库，先让 Codex 在生成角色设定和分镜时引用这些 Markdown。
- 等生成结果稳定后，再把字段结构固化进项目的数据模型或 prompt builder。
