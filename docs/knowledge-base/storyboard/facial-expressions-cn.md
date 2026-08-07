# 表情层次与微表演提示词库

## 收录原则

- 表情提示用于角色表演和镜头情绪，不替代剧情事件。
- 每个镜头只选择一个主情绪，最多补一个次级心理状态。
- 表情必须拆成眼神、眉形、嘴部、面部肌肉、头部角度和呼吸状态。
- H3 视频中优先使用微表情变化，不使用多个情绪连续跳变。
- 涉及哭泣、崩溃、绝望、诱惑、撒娇等标签时，必须有剧情边界和成年角色边界。

## 来源评估

来源：
- `16个生动+细腻层次感表情提示词分享`，公众号文章 PDF，2026-08-07 本地导出。
- `绝了! 18种情绪+活人感表情，直接拉满AI漫剧质感`，公众号文章 PDF，2026-08-07 本地导出。

结论：两篇都可用，但重复度较高，合并为“表情层次/微表演”词库。

可用点：
- 第一篇偏动态情绪和微表情，覆盖惊讶、恐惧、爆发、困惑、隐忍、释然、紧张、狡黠等。
- 第二篇偏强情绪和“活人感”，覆盖流泪、崩溃、羞怯、冷艳、争吵、不屑、撒娇、失神等。
- 对分镜很有价值：能把“她很伤心”改成可见的眼神、嘴角、眉眼和头部动作。

限制：
- 两篇正文主要是图片层，文字层只能稳定抽取首页说明和页脚 URL。
- 原图人物高度同质化，不能复用脸型、服装和写真风格。
- “欲念诱惑、纯真卖萌、极致撒娇”等标签运行时要改写为成年角色、剧情关系和具体表情，不直接作为泛化审美词。

## 表情字段模板

```text
emotion_primary: [主情绪]
emotion_secondary: [次级心理状态，可空]
eyes: [视线方向、睁眼程度、泪光、聚焦或失焦]
eyebrows: [上扬、压低、皱起、放松、不对称]
mouth: [微张、抿紧、咬唇、嘴角上扬、嘴角下压]
face_muscle: [面颊、鼻翼、下颌、眼眶、额头肌肉状态]
head_pose: [低头、抬头、侧脸、回眸、僵住]
breathing: [屏息、轻呼吸、急促、哽咽、放松]
performance_intensity: [subtle / medium / strong]
continuity_guard: Keep identity, costume, hairstyle, facial proportions, and lighting consistent.
```

## 情绪族谱

| 情绪族 | 合并来源标签 | 可复用表情锚点 | 适用场景 | 风险控制 |
| --- | --- | --- | --- | --- |
| 惊讶与震惊 | 突然惊讶、极度震惊、茫然失措 | 眼睛睁大，瞳孔聚焦或短暂失焦，嘴唇微张，呼吸停顿，手可轻触脸侧 | 突发真相、重逢、发现秘密、被叫住 | 不要和恐惧混写；强震惊只用于剧情爆点 |
| 恐惧与凝固 | 恐惧凝固、紧张屏息 | 眉头上扬并内收，眼神警惕，嘴唇轻启或抿紧，肩颈僵住，呼吸变浅 | 危险逼近、夜路、审问、被威胁 | 避免夸张鬼片脸；H3 中保持身体幅度小 |
| 愤怒与对抗 | 情绪爆发、怒目而视、大声争吵、咬牙坚持 | 眉眼压低，下颌绷紧，鼻翼微张，嘴张开或咬牙，目光直指对方 | 冲突、质问、反击、保护他人 | 不要把所有强势女性都写成怒脸；争吵镜头避免口型过大变形 |
| 困惑与探索 | 困惑探索、突然心动 | 眉头轻皱，视线上移或侧移，头微歪，嘴唇轻启，表情从疑问转为意识到什么 | 误会、发现线索、暧昧瞬间、推理 | 心动要靠眼神和停顿，不靠低龄化害羞 |
| 隐忍与压抑 | 隐忍落泪、咬唇忍哭、委屈忍耐、隐忍侧颜、压抑不满 | 眼眶发红，泪水蓄住或少量滑落，嘴唇抿紧或轻咬，下颌收紧，视线回避 | 忍住委屈、被误解、离别前、强撑体面 | 不要把痛苦写成“美化受虐”；要有剧情原因 |
| 崩溃与绝望 | 崩溃大哭、彻底绝望、心如死灰、极度委屈 | 眉心紧皱，眼泪明显，嘴角下压或张开哭喊，眼神空洞或失控 | 失去亲人、真相崩塌、重大失败 | 强情绪慎用；不要连续多个镜头都崩溃，观众会疲劳 |
| 轻松与大笑 | 放肆大笑、轻松释然、放声大笑 | 眼睛自然眯起，嘴角完全打开，面颊抬起，头部轻仰，肩膀放松 | 误会解除、朋友互动、胜利后释放 | 大笑容易口腔变形，H3 用 medium intensity 更稳 |
| 轻蔑与不屑 | 冷笑轻蔑、不屑斜视、傲娇冷艳 | 单侧嘴角微抬，眼神偏斜，眉尾轻挑，头部微侧或下巴轻抬 | 反击、试探、权力对峙、口是心非 | 不要把反派脸谱化；冷艳要结合身份和情境 |
| 俏皮与亲近 | 狡黠坏笑、古灵精怪、极致撒娇、纯真卖萌 | 眼神明亮，嘴角上扬，头部轻歪，手托脸或轻扶脸侧，表情带试探 | 轻喜剧、熟人互动、亲密关系缓和 | 明确成年；避免幼态化和儿童化恋爱 |
| 羞怯与吸引 | 掩面羞怯、欲念诱惑 | 视线短暂回避，脸颊轻红，嘴唇微张或轻抿，头部侧转，呼吸变慢 | 成年恋爱、暧昧试探、婚恋关系推进 | 不直接写性暗示；用克制、距离和视线表达吸引 |

## H3 微表演写法

轻微情绪变化：

```text
The character starts with a calm neutral expression,
then her eyes slowly lower and her lips press together,
ending in a restrained, almost tearful expression.
Keep the face, hairstyle, costume, and lighting consistent.
```

从惊讶到理解：

```text
The character freezes for a moment with widened eyes,
then slowly relaxes her brows as she realizes the truth.
Her mouth remains slightly open, with a quiet breath.
Keep the head movement subtle and natural.
```

隐忍落泪：

```text
The character keeps her chin slightly lowered,
eyes wet but controlled, lips pressed tight.
One tear slowly rolls down while she holds back stronger emotion.
Keep the body mostly still and the expression restrained.
```

对抗怒意：

```text
The character stares forward with narrowed eyes,
her brows tense and jaw clenched.
She takes a small breath and slightly lifts her chin,
ending in a firm confrontational expression.
```

## 负面约束

```text
no random emotion jump, no overacting, no exaggerated mouth deformation,
no changing face identity, no inconsistent eye direction,
no childish sexualization, no romanticized suffering,
no excessive tears in every scene, no distorted hands near face,
no multiple conflicting emotions in one short shot
```

## OpenDrama 用法

- 角色 bible：为核心人物保存 3 到 5 个稳定表情范围，例如中性、轻笑、隐忍、愤怒、崩溃。
- 分镜生成：先写剧情触发，再写可见表情，不要只写“她很伤心”。
- H3 视频：一个镜头只做一个情绪弧线，例如“平静到泪光”“惊讶到回神”“压抑到抬眼”。
- 古风角色：表情幅度应比现代网感写真更克制，靠眼神、下颌、泪光和头部角度表达。
- 现代短剧：争吵、撒娇、冷笑、崩溃这些高频表情要轮换使用，避免整集都在同一种强情绪。
