# 人物肢体动作补充词库

## 收录原则

- 只收可复用的动作结构，不照搬原文。
- 动作提示必须明确身体朝向、手的位置、腿部姿态、头部视线和表情状态。
- 示例图中的运动服、同一模特和写真风格不进入角色设定；OpenDrama 只复用动作关系。
- 静态生图可以使用一个完整姿态；H3 视频提示词应使用一个清晰连续动作，不把多个动作塞进同一段。

## 来源评估

来源：`50个AI漫剧人物肢体动作描述提示词合集`，公众号文章 PDF，2026-08-07 本地导出。

结论：改写后收录为分镜和动作补充库。

可用点：
- 适合人物海报、角色设定、分镜首帧和尾帧构图。
- 动作类别覆盖站姿、坐姿、回眸、挥手、拉伸、平衡、弓步、跳跃、转身等常用姿态。
- 对 H3 很有用：可以把“首帧姿态”和“尾帧姿态”描述得更明确，减少模型乱动。

限制：
- 文章示例偏运动写真，不应把运动服、白底摄影棚和同一人物脸型带入项目。
- 一些动作幅度较大，例如跳跃、弓步、侧腰拉伸，静态图可用，视频生成时需要降低动作复杂度。
- PDF 第 2 至 6 页可读，第 7 页基本空白；不要声称精确复刻 50 条原始提示词。

## 动作族谱

| 动作族 | 可用动作 | 适用场景 | 提示重点 | 风险 |
| --- | --- | --- | --- | --- |
| 基础站姿 | 交腿站、放松站立、双手叉腰、抱臂站姿、并腿站 | 角色定稿、海报、人物介绍 | 重心在哪条腿、手放腰间或胸前、肩膀是否放松、视线方向 | 姿态太普通时缺少戏剧张力 |
| 回眸与侧身 | 撩发回眸、侧身回望、回身挥手、侧身引导、转身看表 | 邂逅、离别、被叫住、邀请跟随 | 身体朝侧面或背后，头部转向镜头，手部动作要单一 | H3 中容易转身过度，需要限制幅度 |
| 上身手势 | 手托脸、双手合十、单手比心、单手提发、胸前交叠、双手抱头 | 情绪特写、轻喜剧、甜美或思考状态 | 一只手还是双手、手在脸侧/胸前/头后、表情对应 | 手指容易畸形，近景需减少复杂手势 |
| 伸展与拉伸 | 双臂前伸、双臂侧平举、侧腰拉伸、伸展活力、单臂上举 | 运动、清晨、放松、活力镜头 | 手臂方向、身体弯曲方向、双脚是否站稳 | 古风长袖角色慎用，袖摆会遮挡动作 |
| 坐姿 | 坐姿整理鞋带、盘腿坐、坐姿抱膝、坐姿侧撑、坐姿伸腿 | 日常、等待、低落、亲密独白 | 坐在地面/台阶/椅边，膝盖和手的位置 | 服装裙摆、镜头裁切要配合 |
| 跪姿与低姿态 | 单膝跪、跑姿抬手、侧弓步伸展、弓箭步下压 | 训练、受伤、请求、准备起身 | 哪只腿跪地，前后腿关系，手是否扶膝或抬起 | 容易变成运动训练感，剧情要支持 |
| 平衡与跳跃 | 抬腿平衡、高抬腿准备、小跳落地、开臂小跳、原地慢跑 | 活力、运动、轻喜剧、舞台 | 只描述一个重心变化，保持动作简单 | H3 容易产生肢体错位，优先短动作 |
| 情绪姿态 | 扶膝前倾、背手甜笑、单腿后勾、回身扶臂、单脚侧点 | 羞涩、疲惫、轻松、回避、撒娇 | 情绪要和姿态一致，避免姿态和剧情冲突 | 过甜或过写真时会削弱剧情可信度 |

## 静态生图提示模板

基础站姿：

```text
standing with one leg slightly crossed in front of the other,
one hand resting on the waist, the other arm relaxed,
shoulders open, head slightly turned toward the camera,
calm confident expression
```

回眸：

```text
body turned three-quarters away, head looking back over the shoulder,
one hand gently touching the hair, the other arm relaxed,
soft eye contact, subtle emotional tension
```

坐姿抱膝：

```text
sitting on the ground with knees drawn close,
both arms loosely wrapped around the knees,
head slightly tilted, quiet introspective expression,
stable natural body proportions
```

侧身引导：

```text
standing sideways, one arm extended outward as if inviting someone forward,
the other hand relaxed near the waist, head turned toward the viewer,
clear directional gesture
```

弓步准备：

```text
one leg stepping forward into a low lunge, back leg extended,
hands lightly resting on the front thigh,
torso leaning forward, focused prepared expression
```

## H3 视频动作写法

H3 使用动作词时，要把动作写成短时间内可完成的连续变化。

好用结构：

```text
The character starts in [initial pose], then slowly [one main motion],
ending in [final pose]. Keep the face, costume, hairstyle, and body proportions consistent.
```

示例：

```text
The character starts standing sideways with one hand near her hair,
then slowly turns her head back toward the camera, ending in a soft over-the-shoulder glance.
Keep the body mostly still and the motion subtle.
```

```text
The character starts seated with both knees bent,
then gently lifts her head and shifts her gaze forward,
ending in a quiet attentive pose. Keep the hands resting naturally on the knees.
```

```text
The character starts standing with arms relaxed,
then raises one hand in a small wave, ending with the palm beside the shoulder.
Keep the gesture simple and avoid large body movement.
```

## 负面约束

```text
no impossible anatomy, no twisted limbs, no extra fingers, no duplicated hands,
no sudden pose change, no complex acrobatics, no unrelated fitness outfit,
no camera-obscuring hands, no exaggerated jump, no multiple actions at once
```

## OpenDrama 用法

- 角色定稿：优先使用基础站姿、三视图和少量手势，避免大幅动态影响服饰和脸部一致性。
- 分镜首帧：用动作说明镜头情绪，例如“回眸”“扶膝前倾”“抱臂站姿”。
- 分镜尾帧：只允许一个清楚变化，例如“低头到抬眼”“站立到轻挥手”“侧身到回眸”。
- H3：每 5 至 15 秒视频只选一个主动作，其他动作只能作为细节，例如发丝轻动、袖摆轻晃、视线转移。
- 古风角色：动作要考虑长袖、披帛、裙摆和头饰，减少高抬腿、跳跃、复杂手势。
- 现代角色：职场线适合整理袖口、抱臂、侧身回望；校园线适合挥手、转身、轻跑；情绪线适合坐姿抱膝、低头、抬眼。

## 风险

- 这篇素材动作偏运动写真，不能直接代表剧情表演。
- 静态姿态如果过多用于视频，会造成 H3 首尾帧突变；视频提示必须强调连续性。
- 手势类动作在图像生成里容易出现手指错误，近景应选择简单手势。
