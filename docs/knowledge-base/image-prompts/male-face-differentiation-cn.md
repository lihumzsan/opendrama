# 男主脸型与面部气质差异化词库

## 收录原则

- 男主脸型只作为角色视觉锚点，不用于评价真实演员或判断角色价值。
- 先按角色功能选择脸部气质，再选择 2 到 3 个面部锚点。
- 脸型、眉眼、鼻梁、下颌线、皮肤质感和眼神必须互相一致。
- “禁欲、野性、反派、病弱、少年感”等词必须改写成具体视觉状态和剧情功能。
- 校园、少年、弟弟感等方向默认限定为成年校园或大学线。

## 来源评估

来源：`终于整理好了！60种短剧男主脸型风格提示词`，公众号文章 PDF，2026-08-07 本地导出。

结论：有用，但不建议按 60 个标签逐条运行。改写后收录为男主面部差异化索引。

可用点：
- 数量大，能覆盖现代短剧男主常见脸部气质：商务、清冷、阳光、硬朗、港风、反派、贵公子、文艺、病弱、古装权谋等。
- 适合和已有男主视觉原型、男主发型库组合，解决“所有男主都是同一张精修爱豆脸”的问题。
- 对角色 bible 有价值：可以把脸型作为 `face_profile` 字段长期锁定。

限制：
- PDF 正文主要是图片层，文字层基本不可用；可读页为 1 至 10 页，第 11 页接近空白。
- 60 个标签里存在大量同义或近义方向，直接照单全收会让知识库膨胀且难调用。
- 部分词带强审美或脸谱化倾向，例如“反派、野性、禁欲、病弱、混血”等，运行时需要改写为具体视觉锚点和剧情状态。

## 男主面部字段模板

```text
face_profile: [成熟商务 / 清冷学院 / 阳光治愈 / 野性硬朗 / 港风复古 / 反派权谋 / 文艺书卷 / 病弱破碎 / 古装高位]
face_shape: [长脸 / 窄脸 / 方脸 / 鹅蛋脸 / 菱形脸 / 圆润脸 / 骨相立体]
eyes: [眼型、眼神强度、视线方向]
eyebrows: [剑眉 / 平眉 / 浓眉 / 疏朗眉 / 眉峰锋利]
nose_jaw: [鼻梁、颧骨、下颌线、下巴轮廓]
skin_texture: [干净自然 / 户外粗粝 / 冷白低饱和 / 健康小麦色]
expression_baseline: [克制 / 温和 / 锐利 / 松弛 / 疲惫 / 压迫]
```

## 面部气质归并索引

| 归并类型 | 适用角色 | 可复用面部锚点 | 搭配建议 | 风险控制 |
| --- | --- | --- | --- | --- |
| 成熟商务骨相 | 总裁、律师、顾问、集团继承人、成熟男主 | 偏长脸或窄脸，鼻梁直，下颌线清楚，眉眼克制，表情少 | 三七侧分、低渐层侧背、西装或商务休闲 | 避免所有职场男主都冷白西装脸 |
| 清冷学院脸 | 成年校园、学霸、医生、研究生、冷淡学长 | 鹅蛋脸或窄脸，眉眼清淡，眼距自然，唇线干净，冷静视线 | 微分碎盖、日系中分、白衬衫、针织衫 | 必须成年；不要写未成年人感 |
| 阳光治愈脸 | 运动员、邻家男主、轻喜剧、青春群像 | 圆润或鹅蛋脸，眼神明亮，笑肌自然，轮廓柔和但成年 | 自然短发、短碎纹理、运动外套、卫衣 | 避免幼态化和过度奶气 |
| 野性硬朗脸 | 保镖、刑侦、军警、机车、动作男主 | 方脸或菱形脸，眉骨较强，颧骨清楚，下颌宽，眼神警觉 | 寸头、美式前刺、工装、皮衣、训练服 | 不要把男性气质写成暴力美化 |
| 港风复古脸 | 港风都市、成熟男配、复古商业线、旧爱 | 轮廓立体，浓眉深眼，鼻梁高，唇线清楚，表情松弛或疲惫 | 港风背头、复古侧分、衬衫、皮夹克 | 避免过度滤镜和年代混乱 |
| 贵公子精致脸 | 富家少爷、娱乐圈、豪门联姻、时尚线 | 窄脸或鹅蛋脸，面部干净，眼神疏离，五官精细，皮肤低瑕疵 | 韩式中分、逗号刘海、浅色外套、礼服 | 不要变成通用精修爱豆脸 |
| 反派权谋脸 | 控制型反派、商战对手、古装权臣、夜色人物 | 眉峰锋利，眼神压迫，嘴角克制，脸部阴影更重，下颌线硬 | 侧背、黑色礼服、深色长袍、低角度镜头 | 反派不能只靠长相判断，必须有剧情行为 |
| 文艺书卷脸 | 作家、画家、摄影师、教授、医者 | 脸型清瘦，眉眼柔和，眼神专注，面部低攻击性 | 中分微卷、眼镜、浅色衬衫、书房或窗边光 | 不要把眼镜等同呆板；保持成年感 |
| 病弱破碎脸 | 久病角色、失意旧友、被误解男主、虐恋线 | 低饱和肤色，眼下轻微疲惫，唇色偏淡，脸型偏清瘦，眼神内收 | 柔顺中短发、浅色针织、病房/雨夜/低光 | 不浪漫化疾病；只在剧情需要时使用 |
| 街头叛逆脸 | 乐队、潮牌、夜跑、地下俱乐部、自由职业 | 眉眼更锐，表情松弛不羁，骨相有棱角，皮肤自然真实 | 狼尾、鲻鱼、挑染、宽松外套、耳饰 | 避免黑帮脸谱化和饰品堆叠 |
| 古装高位脸 | 王爷、将军、权臣、仙门掌门、玄幻男主 | 长脸或菱形脸，剑眉，鼻梁直，轮廓锋利，眼神沉稳 | 高冠束发、玄色/白色/甲胄服饰、礼仪姿态 | 不要把现代发型和古装脸混写 |
| 反差温柔脸 | 外冷内热、可靠上司、隐藏身份男主 | 五官清楚但表情柔和，眼神有温度，嘴角克制微笑 | 商务休闲、低渐层侧分、暖色室内光 | 不要同时写“冷酷、温柔、邪魅、阳光” |

## 组合规则

- 男主撞脸时，优先改变 `face_shape + eyebrows + hairstyle`，比增加形容词更有效。
- 现代群像至少保留 3 种脸部轮廓：商务窄脸、阳光鹅蛋脸、硬朗方脸或菱形脸。
- 反派角色用眼神、构图和行为区分，不用“邪恶脸”。
- 病弱、破碎、阴郁可以写，但必须服务剧情，例如久病、创伤、失眠、雨夜重逢；不要作为无原因审美。
- 同一角色跨镜头保持脸部锚点不变，允许表情变，不允许脸型变。

## 推荐提示词片段

成熟商务骨相：

```text
adult Chinese male lead, mature narrow face, straight nose bridge,
clean jawline, restrained sharp eyes, calm composed expression,
natural skin texture, refined professional presence
```

野性硬朗脸：

```text
adult Chinese action male character, strong square jaw,
defined cheekbones, thick straight eyebrows, intense focused eyes,
natural rugged skin texture, controlled alert expression
```

文艺书卷脸：

```text
young adult Chinese intellectual male character,
slender clean face, gentle focused eyes, soft natural eyebrows,
subtle under-eye tiredness, quiet thoughtful expression
```

病弱破碎脸：

```text
adult Chinese male character with a fragile exhausted look,
slender face, pale low-saturation skin, faint shadows under the eyes,
dry lips, restrained sorrowful gaze, realistic but not romanticized illness
```

古装高位脸：

```text
adult Chinese historical male lead, long elegant face,
sharp sword-like eyebrows, straight nose, clear jawline,
deep calm eyes, dignified restrained authority
```

## 负面约束

```text
no same face across male characters, no generic idol face,
no unclear age, no childish male lead, no evil-by-face stereotype,
no disease romanticization, no excessive beauty filter,
no plastic-surgery look, no random ethnicity stereotype,
no changing face shape between frames
```

## OpenDrama 用法

- 角色 bible：新增或补充 `face_profile`、`face_shape`、`eyebrows`、`baseline_expression` 字段。
- 生图：脸部锚点只选 2 到 3 个，再组合发型、服装和镜头，避免 prompt 互相冲突。
- 分镜：情绪变化时只改变表情字段，不改变脸型字段。
- H3 视频：首尾帧中脸型、眉眼、鼻梁和下颌线必须保持一致；只允许眼神、嘴角、头部角度小幅变化。
