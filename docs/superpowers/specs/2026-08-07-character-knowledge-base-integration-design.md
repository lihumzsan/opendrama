# 人物知识库接入设计

> 状态：待用户评审

## 目标

将 `docs/knowledge-base/image-prompts/` 中的中文人物视觉知识库接入人物档案确认和人物生图流程，使知识库内容在首次生成、重新生成和修改人物形象时都能稳定生效，并能追踪每次任务使用了哪些知识库文件。

## 范围

本阶段只覆盖：

- 人物档案视觉描述生成；
- 人物候选图和重新生图；
- 人物图像修改时的视觉约束继承；
- 知识库来源和版本的任务审计。

本阶段不覆盖：

- 分镜、动作、表情和 H3 视频 prompt；
- 资产中心 UI 的知识库管理；
- 数据库中的用户自定义知识库表；
- 将 Markdown 内容转换成图片参考图。

## 当前问题

`docs/knowledge-base/README.md` 已经定义了人物视觉知识库的分类和组合规则，但运行时代码没有读取这些 Markdown 文件。当前 `src/lib/knowledge-base/prompt-context.ts` 是另一套写死在 TypeScript 中的简化规则，人物生图任务主要读取已保存的 `CharacterAppearance.description`，因此 Markdown 知识库不会自动影响生图。

## 推荐架构

采用“档案阶段 + 生图阶段双接入”，但第一版不新增数据库表。

### 1. 服务端知识库加载器

新增服务端模块 `src/lib/knowledge-base/character-visual-library.ts`，职责包括：

- 从 `docs/knowledge-base/image-prompts/` 读取 Markdown；
- 使用固定目录清单和标签，不根据用户输入拼接任意文件路径；
- 按 Markdown 标题提取允许用于 prompt 的章节；
- 对加载结果计算 SHA-256 指纹并在进程内缓存；
- 文档缺失或解析失败时返回内置 `character_visual` 规则并记录警告，不阻断人物生成。

服务只暴露结构化结果，不让 worker 直接操作文件系统。每个知识库条目包含：

```ts
type CharacterVisualKnowledgeSource = {
  id: string
  file: string
  tags: string[]
  sections: string[]
  fingerprint: string
}
```

### 2. 人物类型选择器

同一模块提供 `selectCharacterVisualKnowledge(profile)`，根据 `CharacterProfileData` 选择少量相关资料，不把整个知识库塞进 prompt。

选择规则：

- 男性角色：`male-character-visual-cn.md`、`male-face-differentiation-cn.md`；
- 女性角色：`character-visual-cn.md`、`face-differentiation-cn.md`；
- 仙侠、玄幻、古装关键词：`xianxia-character-outfits-cn.md`，必要时加入 `historical-hairstyles-cn.md`；
- 现代关键词：根据性别选择现代发型和现代服饰文件；
- 不在人物流程加载 `storyboard/` 目录。

每个文件只提取与人物生成有关的章节：推荐提示词片段、角色组合建议、负面约束和 OpenDrama 用法。来源评估等文档说明不进入模型 prompt。

以方源为例，第一版会选择：

- `male-character-visual-cn.md`；
- `male-face-differentiation-cn.md`；
- `xianxia-character-outfits-cn.md`。

`historical-hairstyles-cn.md` 只有在档案明确需要古代发髻或历史发式时才加入，避免把额外造型约束强加给角色。

### 3. 人物档案确认接入

修改 `src/lib/workers/handlers/character-profile.ts`：

1. 读取并解析当前 `profileData`；
2. 调用知识库选择器；
3. 将内置规则和选中的 Markdown 章节合并为 `knowledge_context`；
4. 继续使用现有 `NP_AGENT_CHARACTER_VISUAL` 模板和 gpt-5.5；
5. 生成的 `appearance.description` 作为后续图片任务的主要视觉描述。

知识库上下文必须明确标注为“建议”，并遵守以下优先级：

1. 用户明确写入或修改的内容；
2. 当前故事和角色档案事实；
3. 已选人物图片参考；
4. 本知识库的风格建议；
5. 系统默认审美建议。

知识库不能改变角色年龄、性别、种族、故事身份、用户选择的服装或已确认图片。

### 4. 人物生图接入

修改 `src/lib/workers/handlers/character-image-task-handler.ts`：

1. 在查询形象时同时读取角色的 `profileData`；
2. 使用同一个选择器得到知识库上下文；
3. 将精简后的知识库约束追加到当前人物描述之后；
4. 明确要求图片模型以 `appearance.description` 为主、知识库为辅助；
5. 保留现有副形象使用主形象图片作为参考的逻辑，不把 Markdown 当作图片参考；
6. 对重新生成、单张生成和批量候选图使用同一套选择规则。

生图 prompt 的优先级表达为：

```text
当前人物形象描述（最高优先级）
> 用户修改指令
> 已确认的图片参考
> 匹配到的人物知识库建议
> 通用负面约束
```

图片修改流程也要复用该上下文，避免用户修改服饰或脸部时完全脱离人物知识库，但修改指令仍然优先于知识库建议。

### 5. 审计信息

第一版不新增数据库字段，不保存整段 Markdown。每个相关任务在任务元信息或完成事件中记录：

```ts
{
  knowledgeBase: {
    kind: 'character_visual',
    sources: ['male-character-visual-cn', 'male-face-differentiation-cn', 'xianxia-character-outfits-cn'],
    fingerprint: '...'
  }
}
```

这样可以在日志和任务详情中确认“本次生图是否参考了知识库”，又不会把大段 prompt 写入数据库。

## 运行时和部署策略

知识库读取限定在服务端 worker。优先从项目根目录读取 Markdown，并在启动后缓存；生产构建必须保留 `docs/knowledge-base/image-prompts/`。如果部署产物缺少文档，系统回退到现有内置规则并明确记录 `knowledgeBase.fallback=true`，不得静默声称使用了 Markdown 知识库。

## 测试设计

新增和修改以下测试：

- 知识库加载器能够读取固定文件、提取指定章节并生成稳定指纹；
- 方源档案能够匹配男性视觉、男性脸型和仙侠服饰资料；
- 女性、现代角色不会错误加载男性或仙侠资料；
- 文档缺失时回退到内置规则，人物任务仍可完成；
- 人物档案 prompt 包含选中的知识库内容和来源标记；
- 人物生图 prompt 包含同一批知识库约束；
- 用户修改描述后，知识库不能覆盖修改内容；
- 主形象和副形象的现有图片参考逻辑保持不变；
- 任务审计信息包含来源文件和指纹，不包含整段 Markdown。

## 分阶段实施

### 阶段一：可读取、可选择、可测试

完成服务端加载器、文件清单、章节提取、标签选择和单元测试。此阶段不改变生图结果。

### 阶段二：接入人物档案

将选择后的知识库上下文接入人物档案确认 prompt，验证方源等角色生成的 `appearance.description` 是否包含稳定的脸型、发型和服饰锚点。

### 阶段三：接入人物生图

将同一选择结果接入人物生图和图片修改任务，并补充任务审计字段，验证初次生成、重新生成和编辑路径。

### 阶段四：人工回归

使用方源、一个现代男性角色和一个女性角色分别生成候选图，检查：

- 选中的知识库文件是否正确；
- 生图 prompt 是否包含来源；
- 知识库建议是否没有覆盖用户描述；
- 重新生成是否仍然使用同一套规则；
- 资产图片参考逻辑是否未被改变。

## 验收标准

1. 方源人物档案和人物生图任务都能记录使用了男性视觉、男性脸型和仙侠服饰知识库；
2. 生图任务不再只依赖“代码内置知识规则”而忽略 Markdown 知识库；
3. 重新生成和图片修改仍然使用匹配到的知识库；
4. 用户明确修改的形象描述优先级高于知识库；
5. 知识库文件缺失时不会导致任务失败，且会产生可见的回退审计信息；
6. 不接入分镜和 H3 逻辑，不引入新的数据库表。
