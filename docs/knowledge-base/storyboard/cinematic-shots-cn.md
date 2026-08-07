# 电影级镜头语言与 H3 分镜提示词库

## 收录原则

- 只收可复用的镜头语言，不照搬原文整段 prompt。
- 镜头提示必须先服务剧情目的，再选择景别、机位、运动、光线和构图。
- 摄影参数只作为视觉风格参考，不当作 H3 的真实物理控制项。
- H3 视频每个镜头只保留一个主要运动，其他变化只作为环境或表演细节。
- 电影感来自清楚的镜头意图、稳定的主体关系和一致的光影氛围，不靠堆叠“cinematic”等空泛词。

## 来源评估

来源：`10组电影级镜头全套prompt！新手必看！`，公众号文章 PDF，2026-08-07 本地导出。

结论：有用，适合收录为分镜和 H3 视频生成的镜头语言参考。

可用点：
- 覆盖短剧和漫剧常用的 10 类镜头：全景远景、中景、近景、特写、低角度、高角度、跟随、摇臂、鸟瞰、主观视角。
- 每组都包含镜头作用、场景、镜头/机位、光线、构图、氛围和参考参数，结构比单纯形容词库更适合工程化调用。
- 对 H3 的首尾帧和视频提示有帮助：能明确镜头从哪里看、主体占画面多少、镜头是否移动、移动方向是什么。

限制：
- PDF 第 2 至 11 页正文主要是图片层，文字层只稳定抽取到首页说明和页脚 URL。
- 原文使用的焦距、光圈、ISO、快门等参数只能当视觉暗示，不能保证视频模型按真实相机物理响应。
- 跟随镜头、摇臂镜头、鸟瞰镜头和 POV 镜头运动感较强，H3 中必须降低运动复杂度，避免主体漂移、空间变形和突兀转场。
- 示例偏古风战争和大场面，现代短剧、都市情感和室内戏使用时要替换场景元素。

## 镜头字段模板

生成分镜时优先填这些字段：

```text
shot_purpose: [交代环境 / 展示关系 / 强化情绪 / 压迫主体 / 进入主观体验]
scene: [地点、时间、天气、关键道具或人群]
subject: [主体是谁，主体在画面中的位置和动作]
shot_size: [全景远景 / 中景 / 近景 / 特写 / 极特写]
camera_position: [平视 / 低机位仰拍 / 高机位俯拍 / 垂直俯拍 / 角色眼睛高度]
camera_motion: [固定 / 缓慢推进 / 缓慢后拉 / 轻微跟随 / 缓慢上升 / 轻微主观晃动]
lighting: [自然光 / 侧逆光 / 柔光 / 硬光 / 局部高光 / 阴天漫射光]
composition: [三分构图 / 中心构图 / 前景遮挡 / 背景虚化 / 纵深透视 / 对称构图]
atmosphere: [宏大 / 紧张 / 温柔 / 压迫 / 孤独 / 沉浸 / 真实]
continuity_guard: Keep identity, costume, hairstyle, body proportions, lighting direction, and environment consistent.
```

## 10 类电影镜头索引

| 镜头 | 叙事作用 | 可复用视觉锚点 | H3 写法 | 风险控制 |
| --- | --- | --- | --- | --- |
| 全景远景 establishing shot | 交代故事发生的大环境，建立空间、时代和氛围 | 广角感，大场景留白，人物很小，远山/城市/宫殿/街区层次，晨曦或日落侧光 | 固定远景或非常缓慢推进，让云雾、衣摆、旗帜轻动 | 不要让主体过小到不可辨认；不要在一个镜头内横跨多个地点 |
| 中景人物 medium shot | 平衡人物与环境，承接对白、动作和关系 | 半身到膝上构图，人物居中或轻微偏侧，背景保留环境信息，浅景深突出主体 | 角色保持站位，进行一个小动作，例如转头、抬手、整理衣袖 | 背景不能抢主体；多人场景要明确主角是谁 |
| 近景 close-up | 强化表情和情绪，让观众进入人物内心 | 头肩近景，45 度侧脸，柔光或逆光轮廓，背景明显虚化，眼神清晰 | 镜头稳定，角色轻微抬眼、低头、呼吸或眼神变化 | 避免手部遮脸；不要同时写大幅转身和复杂表情 |
| 极特写 extreme close-up | 放大关键细节或情绪爆点 | 眼睛、唇、手指、玉佩、血痕、信物等单一细节占画面大部分，质感清晰 | 只让细节发生微小变化，例如眼睫颤动、手指收紧、泪光闪动 | 不要裁切多个身体部位；面部极近距离容易变形，需强调 natural proportions |
| 低角度镜头 low angle shot | 表现权力、威压、反抗或英雄感 | 低机位仰拍，主体高大，天空/高墙/旗帜向上延伸，强侧光或逆光 | 镜头可轻微上仰或缓慢推进，主体保持稳定姿态 | 过低会夸张变形；适合强势角色，不适合普通情绪对白滥用 |
| 高角度镜头 high angle shot | 表现弱小、孤立、受压或被审视 | 高机位俯拍，主体位于画面中心或偏下，环境占比大，冷色或阴天漫射光 | 固定俯拍，角色小幅抬头或停在空旷环境中 | 不要把所有悲伤都写成高角度；注意人物脸部仍可识别 |
| 跟随镜头 follow shot | 增强行动感和代入感，表现移动中的目标 | 从背后或侧后方跟随，主体在画面中心，环境沿两侧掠过，轻微运动模糊 | The camera follows behind the character at a steady pace, with one continuous forward movement. | 不要同时要求奔跑、打斗、转身和换景；H3 中要强调 steady pace |
| 摇臂镜头 crane shot | 通过上升、下降或后拉展示空间规模和人物渺小 | 高机位，缓慢升起或后拉，场景层次逐步展开，中心或对称构图 | The camera slowly rises and pulls back, revealing the larger environment while keeping the character centered. | 升降幅度要小到中等；避免突然飞越建筑或快速穿梭 |
| 鸟瞰镜头 bird's eye view | 展示整体布局、规模、阵列和路线关系 | 垂直俯拍，街道/宫殿/队伍形成清晰线条，人物像小点但路线明确 | 固定鸟瞰或非常慢的下压/上升，突出地面路径和人群运动 | 人脸细节不可期待；适合作为转场或信息镜头，不适合情绪特写 |
| 主观视角 POV shot | 让观众进入角色视角，强化沉浸和临场感 | 角色眼睛高度，前景出现手、缰绳、门框、武器或道具，视线沿道路延伸 | The shot is from the character's point of view, moving slowly forward with slight natural head movement. | 前景手部容易畸形；不要强烈晃动；避免长时间快速 POV 造成空间错乱 |

## 人物镜头感 30 组补充

来源：`AI短剧怎么让人物更具镜头感，从“会出图”到“出好图”，只差这30个镜头语言（附提示词）`，公众号文章 PDF，2026-08-07 本地导出。

结论：和本文件已有电影镜头高度相关，作为“景别 + 构图”补充合并，不单独建文件。

可用点：
- 这篇结构清楚，把 30 个镜头语言拆成 15 种景别/机位和 15 种人物构图。
- 比上一篇“10 组电影级镜头”更适合静态人物图、角色海报和分镜首帧。
- 对 OpenDrama 很有价值：能先确定景别，再确定构图，减少只写人物漂亮但画面没叙事的问题。

限制：
- 示例集中在冰蓝古风女主，不能把服饰、颜色和人脸一起复制。
- 多数内容适合生图和首帧，H3 中只能继承构图关系，不要要求模型在一个镜头内同时完成多个构图切换。
- 页面 2 至 3 是总览图，页面 4 至 6 是示例大图，第 7 页基本空白；正文仍以图片层为主。

### 15 种景别和机位

| 类型 | 用法 | 适用场景 | 风险控制 |
| --- | --- | --- | --- |
| 特写 Close-up | 聚焦面部、笑容、眼神和表情 | 情绪转折、对白反应、心理活动 | 不要同时塞入全身服饰细节 |
| 大特写 Extreme Close-up | 放大眼睛、饰品或关键细节 | 证物、泪光、眼神杀、信物 | 只拍一个细节，避免裁切混乱 |
| 半身 Medium Shot | 呈现上半身、服装和手势 | 对话、行礼、轻动作 | 手势要简单，避免手部畸形 |
| 中近景 Medium Close Shot | 从胸部以上表现情绪 | 近距离对话、暧昧、压迫 | 背景只保留少量环境信息 |
| 全身 Full Shot | 展示完整人物姿态和造型 | 角色卡、服装定稿、入场 | 人物要清楚，避免背景太抢 |
| 远景 Long Shot | 人物在环境中占比较小 | 环境交代、孤独感、旅途 | 不适合看表情 |
| 大远景 Extreme Long Shot | 人物极小，突出宏大环境 | 城池、雪原、山门、战场 | 只用于开场或转场 |
| 过肩镜头 Over-the-Shoulder | 从一人肩后拍另一人 | 对话、对峙、发现目标 | 前景肩部不要挡住主体脸 |
| 低角度 Low Angle | 从下往上拍，增强气势 | 登场、反击、高位人物 | 避免脸和身体透视变形 |
| 高角度 High Angle | 从上往下拍，突出压迫或渺小 | 失势、孤立、被审视 | 不要滥用于所有悲伤镜头 |
| 鸟瞰 Bird's-eye View | 垂直俯拍，展示布局 | 街道、阵列、路线、宫殿 | 不期待脸部细节 |
| 荷兰角 Dutch Angle | 画面倾斜制造不稳定 | 危机、幻觉、心理失衡 | 少用，过多会显廉价 |
| 居中对称 Centered Symmetry | 人物居中，画面稳定 | 高位、仪式、神女、登场 | 避免所有海报都像证件照 |
| 三分法 Rule of Thirds | 人物放在三分线附近 | 日常、对话、空间留白 | 与视线方向配合 |
| 引导线 Leading Lines | 用道路、栏杆、光线引导视线 | 走廊、桥、街道、阶梯 | 线条应指向主体或目标 |

### 15 种人物构图

| 构图 | 用法 | 适用场景 | 风险控制 |
| --- | --- | --- | --- |
| 头肩近景 Head-and-Shoulders | 取头部与肩线，突出神态 | 头像、情绪反应、角色介绍 | 发饰不能挡眼睛 |
| 胸像构图 Bust Shot | 取胸至头部，兼顾面部和上身服装 | 对话、礼服展示、亲密镜头 | 不要把手臂裁得不自然 |
| 膝上构图 Knee Shot | 取膝盖以上，平衡动作和服饰 | 站立、走近、行礼 | 裙摆和腿部比例要稳定 |
| 留白式单人构图 Negative Space Portrait | 大面积留白强化孤独和呼吸感 | 孤独、等待、雪景、空房 | 留白要有方向，不是主体太小 |
| 框中框 Frame within Frame | 用窗、门、镜框包围主体 | 偷看、回忆、被困、仪式 | 框不要遮挡脸部关键区域 |
| 前景遮挡 Foreground Framing | 用花、帘、枝叶、人物边缘制造层次 | 古风氛围、窥视、柔焦 | 遮挡只做层次，不挡主体 |
| 对角线动态构图 Diagonal Composition | 身体或场景形成斜线 | 动作、追逐、紧张关系 | H3 中不要配合复杂身体运动 |
| S 形视线构图 S-curve Composition | 用弯曲路径引导视线 | 桥、河道、长廊、裙摆 | 线条必须通向主体 |
| 三角稳定构图 Triangle Composition | 人物和环境形成稳定三角 | 群像、坐姿、仪式、对峙 | 不要把多人挤成一团 |
| 负空间构图 Negative Space | 用空白突出主体心境 | 孤独、压迫、告别 | 与留白式构图同族，避免重复标注 |
| 侧脸剪影 Profile Silhouette | 侧脸与逆光形成轮廓 | 回忆、离别、身份隐藏 | 面部不可过黑到失去识别 |
| 倒影映射 Reflection Composition | 用水面、镜面形成双重画面 | 自省、真相、梦境、身份反转 | 倒影不要替代主体 |
| 镜中窥视 Mirror Framing | 通过镜子观察主体 | 梳妆、监视、自我怀疑 | 镜中脸和真实脸要一致 |
| 长焦压缩 Telephoto Compression | 压缩前后景，增强距离感 | 人群、长街、重逢、追逐 | 参数仅作风格暗示，不保证物理镜头效果 |
| 环境肖像 Environmental Portrait | 人物与环境共同叙事 | 职业、身份、住所、宗门 | 环境必须服务身份，不堆装饰 |

### 二段式选择规则

- 第一步选景别：要看脸用特写/头肩，要看服装用全身/膝上，要看空间用远景/鸟瞰。
- 第二步选构图：情绪孤独用留白，权力稳定用居中对称，行动路线用引导线，窥视和秘密用框中框或镜中窥视。
- 如果是 H3，一个视频只继承一种景别和一种构图，不做景别跳切。
- 过肩、镜中窥视、前景遮挡、倒影构图都容易误伤主体一致性，优先用于静态图或短镜头。

## H3 视频提示模板

固定镜头：

```text
A [shot_size] shot of [subject] in [scene].
The camera remains steady, [lighting], [composition].
The character slowly [one subtle action], ending in [final pose].
Keep identity, costume, hairstyle, body proportions, lighting direction, and environment consistent.
```

跟随镜头：

```text
A steady follow shot from behind [subject] moving through [scene].
The camera follows at a slow constant pace, keeping the subject centered.
Only the environment passes gently on both sides, with subtle motion blur.
Keep identity, costume, hairstyle, body proportions, and route direction consistent.
```

摇臂镜头：

```text
A slow crane shot starting from [initial height] and gently rising to reveal [larger environment].
The subject remains visible and centered while the background scale expands.
Keep the camera movement smooth and moderate, with no sudden jump or location change.
```

主观视角：

```text
A first-person POV shot from [character]'s eye level, looking toward [target].
The camera moves slowly forward with slight natural head movement.
Foreground elements such as [hands/object/frame] stay stable and do not block the view.
Keep the route, lighting, and environment consistent.
```

## 分镜选择规则

- 开场或转场：优先全景远景、鸟瞰、摇臂。
- 对话和动作承接：优先中景人物。
- 情绪推进：优先近景。
- 关键心理变化或线索揭示：使用极特写，但一个镜头只拍一个细节。
- 权力、压迫、反抗：低角度和高角度成对使用更清楚。
- 追逐、赶路、跟随某人进入新空间：使用跟随镜头，运动必须稳定。
- 强代入或角色体验：使用 POV，但时长宜短，前景元素宜少。

## 负面约束

```text
no random camera jump, no sudden location change, no unstable identity,
no inconsistent costume or hairstyle, no warped face, no distorted hands,
no excessive camera shake, no fast zoom, no impossible crane movement,
no mixed shot types in one prompt, no overused cinematic buzzwords,
no unreadable tiny character when face detail is required
```

## OpenDrama 用法

- 小说拆分分镜时，先从剧情目的选镜头，不从风格词选镜头。
- 角色第一次出场可以用全景远景或中景；角色情绪转折用近景；证物、眼神、伤口、信物用极特写。
- H3 首尾帧应描述同一空间中的连续镜头，不要把“全景远景 + 特写 + 鸟瞰”塞进一个视频 prompt。
- 对大场面镜头，先用静态首帧建立空间，再让 H3 做缓慢推进、后拉或环境细节运动。
- 对人物情绪镜头，少写运镜，多写眼神、呼吸、头部角度和光线变化。
- 对强运动镜头，优先保证主体身份、服装和路线一致，牺牲一部分“大片感”比主体漂移更可靠。
