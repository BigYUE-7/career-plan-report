---
name: career-plan-report
description: 职业发展双报告生成器（长期可复用工具，正式版）。报告链：01 宏观《XX领域职业能力调研报告》——产业—职业生态分析（M1~M11：产业结构/产业链上下游/企业生态/岗位生态/技能变化/区域分布/政策锚点/上下游传导分析/人才链/职业进入路径），六类底座信息随报告一体沉淀为 14 节 底座结论.md，不做独立前置产出；02 微观《个人职业规划书》——个人职业决策分析：MD 问卷唯一真源（8 信息层 19 题：通用骨架 + 行业静态预设选项合并，禁止运行时生成/改写选项）+ question-bank 静态题库（common/ 通用补问 + industries/ 行业静态资产；提交后按信息缺口从中挑选已有问题补问 3~8 题，不生成新题）+ questionnaire.hta 读取 MD 渲染交互界面（选项+自定义回答，打分空值自动对话补录），提交后写回「已填写 MD」+「answers-auto.json」供 agent 直接读取 → 能力画像（自述即依据：逐项附用户自述依据+置信度，禁止要求证明材料）→ 职业方向探索（候选矩阵+四航道）→ 目标岗位画像 → 人岗匹配与能力缺口矩阵 → 职业选择决策（why A / why not B / if blocked）→ 3-5年路径 → 90天行动计划 → 备选路线树。每个职业规划独立项目文件夹管理，结束前检查报告链完整性并提示是否继续。触发词：职业能力调研报告、个人职业规划书、职业规划、能力画像、3-5年职业发展路径。
version: 1.3.1
---

# 职业发展双报告生成器 (career-plan-report)

## 定位

**长期可复用的职业规划工具**（正式版 v1.0.0：无任何外部赛事耦合，专注报告内容本身）。

两大核心产出（宏观/微观并列，无先后依赖）：

```text
行业与政策检索（底座结论随做随沉淀）──→ 01 宏观：《XX领域职业能力调研报告》
问卷采集 → 画像 → 决策分析 ──────────→ 02 微观：《个人职业规划书》
```

- **数据底座不再是独立文件夹/阶段**（v1.0.0 起）：三类检索结论（区域分布、赛道热度、政策锚点）随宏观报告一体完成，沉淀为 `<项目>/01-宏观调研报告/底座结论.md`，供微观阶段直接复用。
- 02 是**个人职业决策分析**，不是资料汇编：AI 先理解用户是谁，再对照现实世界需要什么，回答"为什么选这个、为什么不选那个、走不通怎么办"，最后给出从今天开始怎么走。

**两条设计原则（v1.2.0 固化，全 skill 生效）**：

- **问卷选项是静态知识资产**：行业预设（`question-bank/industries/`）与通用题库（`question-bank/common/`）在设计阶段完成多维覆盖；运行时只负责"选行业 → 原样合并 → 一次性定稿 MD"，**禁止运行时生成、改写或实时编辑选项**；信息不足时从题库中**挑选已有问题**对话补问，不生成新题新选项。MD 一次性定稿：省算力、省时间、可复用、可追溯。
- **自述即依据**：本 skill 的目标是获得足以支持职业判断的个人信息，不是收集证明材料。能力画像依据 = 用户自述 + 问卷回答 + 对话补充 + 已知经历；**禁止要求用户上传或出示证书、截图、代码仓库等证明材料**；能力评分标注置信度（高/中/低）。分析比证明更重要。

## Skill 自身结构（按需加载，禁止全量塞入上下文）

```text
career-plan-report/
├── SKILL.md                        ← 本文件：只管决策与路由
├── workflows/
│   ├── macro.md                    ← 01 宏观报告执行流程（产业—职业生态 M1~M11 + 14 节底座，一体完成）
│   └── micro.md                    ← 02 微观规划书执行流程（B1~B12，个人职业决策分析）
├── references/
│   ├── print-rules.md              ← 打印/PDF 样式规范 + 导出按钮标配 + 页眉页脚消除（生成 HTML 时读）
│   ├── questionnaire-template.md   ← 基础问卷骨架（v1.2.0：8 信息层 19 题；Q2/Q4/Q5 选项槽位由行业静态预设原样填入；B2 生成模板时读）
│   ├── question-bank/              ← 静态题库（v1.2.0：common/ 通用补问 interest/work-style-deep/career-awareness/evidence + industries/ 行业静态资产 ai；运行时只选题、不改题不生成题）
│   ├── visual-spec.md              ← 视觉规范
│   └── competition-rules.md        ← 【历史存档】旧版备赛核对规则，正式版不加载、不引用
├── templates/
│   ├── plan-template.html          ← 规划书 HTML 骨架（含导出 PDF 按钮）
│   └── ai-usage-record-template.md ← AI 使用记录模板（可选：仅用户要求留痕/说明书时启用）
└── assets/
    ├── echarts.min.js              ← 本地 ECharts
    ├── china-map/                  ← 中国市级色块地图插件（SVG 矢量+4级分档+锁比例+省界线+引导线出图注名）
    │   ├── china-map.js            ← 插件核心
    │   ├── china-city-geo.js       ← 内嵌边界数据（file:// 下唯一可靠加载方式）
    │   ├── china-city-geo.json     ← 同源 JSON（http 部署用）
    │   ├── build-geo.py            ← 重建脚本（DataV.GeoAtlas 源，建议每年重跑+自检）
    │   └── README.md               ← 用法与合规红线
    ├── questionnaire.hta           ← 问卷交互壳（UTF-8 BOM）
    ├── questionnaire-core.js       ← QCore 解析/序列化核心（UTF-8 BOM）
    └── test-core.js                ← Node 自测脚本
```

## 项目文件夹结构（产出物，必须遵守，v1.0.0 起）

```text
职业规划-<专业简称>[-姓名]/          ← 默认建在当前工作目录，用户可指定
├── 01-宏观调研报告/                 ← 《XX领域职业能力调研报告》
│   ├── 底座结论.md                  ← 产业—职业生态底座（14 节：行业边界/产业结构/上中下游/企业生态/岗位生态/技能/区域/政策/传导链/进入路径）
│   ├── report.html                  ← 报告正文（含导出 PDF 按钮）
│   └── (echarts.min.js / china-map 系列等本地资源)
├── 02-个人规划书/                   ← 《个人职业规划书》
│   ├── report.html
│   └── (echarts.min.js 等本地资源)
├── 00-问卷模板.md                   ← 问卷唯一真源（通用骨架 + 行业静态预设选项一次性合并定稿，之后不再修改）
├── questionnaire.hta                ← 问卷交互壳（读取 00-问卷模板.md 渲染）
├── questionnaire-core.js            ← QCore（HTA 与 Node 通用）
├── 00-问卷与画像.md                 ← 问卷记录、行业预设来源、画像自述依据与置信度、清单溯源
├── 00-问卷模板-已填写.md            ← 用户提交后自动生成
└── answers-auto.json                ← 同一次提交的结构化版
```

- 文件夹已存在 → 先扫描已有产出，**询问复用还是另建，禁止静默覆盖**。
- **旧版结构兼容**（01-行业分析 / 02-宏观调研报告 / 03-个人规划书）：扫描到旧结构时向用户说明 v1.0.0 新结构，询问沿用旧结构继续还是迁移合并；两种都允许，**禁止静默改名或移动**。
- 用户未给姓名则用"职业规划-<专业简称>"命名；同名文件夹已存在时追加日期后缀。

## Trigger

当用户要求：做职业能力调研报告 / 个人职业规划书 / 职业规划 / 能力画像 / 3-5 年职业发展路径 / 行业就业分析。

不要用于：与职业规划无关的纯政策分析（直接用 industry-policy-report）；简历撰写；面试辅导。

## Input

| 输入项 | 必需 | 说明 |
|--------|------|------|
| 专业 | 是 | 如"智能工程与创意设计" |
| 本次目标 | 询问确认 | 01/02 中做哪些（未指明时按报告链顺序建议，见 Decision Rules） |
| 用户能力信息 | 微观必需 | 通过内置问卷采集（选项+自定义），无需用户预先准备 |
| 项目文件夹 | 否 | 默认 `职业规划-<专业简称>/` |

## Workflow

### Step 0 项目初始化（每次必做）

- Purpose: 建立或复用项目文件夹，确定报告链缺口。
- Action: 确定专业简称 → 创建/定位 `职业规划-<专业简称>[-姓名]/` → Glob 扫描 01/02 已有产出（含旧版结构识别）→ 向用户展示报告链现状（✅/⬜）并确认本次目标。
- 可选启用：用户要求 AI 使用留痕或《AI工具辅助使用情况说明书》→ 把 `templates/ai-usage-record-template.md` 复制为 `<项目>/00-AI工具使用记录.md`（已存在则续写，禁止覆盖），并在后续每个阶段追加记录（版本/时间必须来自真实系统信息，查不到写"待补充"，禁止编造）；未要求则不做。
- Output: 项目路径 + 本次目标。
- Completion Condition: 文件夹确定、目标确认。

### Step 0.5 路由到执行流程（必须先 Read 再执行）

按本次目标 Read 对应 workflow 文件并**完整执行其中步骤**，禁止凭记忆执行：

| 本次目标 | 加载 |
|----------|------|
| 01 宏观调研报告 | `workflows/macro.md` |
| 02 微观规划书 | `workflows/micro.md` |
| 生成 AI 使用说明书（可选） | 读 `<项目>/00-AI工具使用记录.md` → 生成《AI工具辅助使用情况说明书》 |

### Step C 报告链检查与结束提示（每次对话必做，不可省略）

- Action: 对照报告链检查 01/02 产出状态；`00-问卷与画像.md` 是否已落盘。
- 提示格式：`✅ 01-宏观调研报告 ｜ ⬜ 02-个人规划书 → 是否继续生成 02-个人规划书？`
- 用户拒绝 → 记录在案并正常结束，不重复纠缠。
- Completion Condition: 提示已给出（无论用户是否继续）。

## Decision Rules

- Condition: 用户未指明做哪类报告 → Action: 展示报告链现状，**默认按 01→02 顺序建议**，请用户确认 → Reason: 01 的底座结论供 02 机会清单直接复用。
- Condition: 用户只要微观规划 → Action: 提示"建议先做 01 宏观报告以支撑机会清单"，用户拒绝则跳过（底座结论在微观阶段补齐最小集）→ Reason: 顺序为建议而非强制，用户明确要求优先。
- Condition: 项目文件夹已存在且有旧产出（含旧版三文件夹结构）→ Action: 询问复用/另建/迁移，禁止覆盖或静默改名 → Reason: 独立文件夹是打包管理单位。
- Condition: 企业或岗位无法溯源 → Action: 删除该条 → Reason: 编造企业名零容忍。
- Condition: 某城市检索不到对口岗位 → Action: 如实缩减并说明 → Reason: 禁止凑数。
- Condition: 机会与画像匹配度低 → Action: 保留并归入四级分层（见 workflows/micro.md B11）→ Reason: 真实规划必须包含"不适合"的判断。
- Condition: 微观结论与宏观报告冲突 → Action: 以微观个性化数据为准，报告内说明 → Reason: 规划书服务于具体的人。
- Condition: AI 工具版本/时间查不到（仅留痕模式启用时） → Action: 写"待补充" → Reason: 真实性优先于完整性，禁止编造。

## Tools

复用 industry-policy-report 全部工具：WebSearch/WebFetch、Read/Glob/Write/Edit、AskUserQuestion（对话提问）、本地 ECharts（assets/echarts.min.js）、Edge headless（PowerShell）、present_files。问卷工具：`references/questionnaire-template.md`（MD 题目模板骨架）、`assets/questionnaire.hta`（交互壳，双击即用）、`assets/questionnaire-core.js`（QCore 解析/序列化核心，HTA 与 Node 通用，可用 Node 自测）。地图工具：`assets/china-map/`（中国市级色块地图插件，SVG 真矢量、4 级分档、layoutCenter 锁比例不拉伸、省界深色线图层、高亮城市名引导线拉出图外，离线渲染、PDF 友好；用法与合规红线见 assets/china-map/README.md；区域分布章节优先使用）。**PDF 导出按钮与页眉页脚消除**：每份 report.html 必须内置"导出 PDF"按钮，样式与打印规则一律按 `references/print-rules.md`（@page margin:0 消除每页文件路径页脚）。

## Validation

**结构**：文件夹结构与命名符合 v1.0.0 规范（或经用户确认的旧版结构）、模板章节完整、雷达图/表格渲染正常。
**图表渲染硬校验（每次生成后必做，2026-10-01 补充）**：用无头浏览器实测并计数——`msedge --headless --dump-dom "file:///<报告>.html" | grep -oE "<canvas|<svg" | wc -l`，数量必须等于设计图表数（含地图 1 个 `<svg>`、含封面 1 个 `<svg>`）；不相等即视为未通过。常见致命错因：① 全局变量笔误（如图表库是 `echarts`，写成插件内部的 `ech.` 别名）→ 整段初始化中断、**所有图表全空**；② 地图版本只引了 `china-city-geo.js` 而漏 `china-province-geo.js`（v1.2+ 双图层插件需要两个全局变量，缺一即走 fetch、`file://` 下被 CORS 拦截 → 地图空白）。**仅"文件已生成"不等于通过，必须计数验证。** 生成后另做一次**成对审计**：所有含 `ChinaMap.render` 的 HTML 必须同时含 `china-province-geo.js` 引用（`grep -l "ChinaMap.render" *.html` 与 `grep -l "china-province-geo" *.html` 两个结果集应一致）。
**模板沿用约定（2026-10-01 补充）**：报告 HTML 的图表骨架**直接逐字沿用 `templates/plan-template.html`**。该模板 `mk()` 已内置四项保障——① `echarts.init`（不是插件内部别名 `ech.`）② `animation:false` ③ `window.__charts` 登记 ④ `resize`/`beforeprint` 统一重排（地图走 `__chinaMap` 分支恢复实际尺寸，避免压高后被裁掉南方城市）。**禁止自行精简改写该函数**——历次空白图表均源于手写简化版。地图为可选块，模板 `<head>` 顶部已附 4 段式引入注释（echarts → china-city-geo → china-province-geo → china-map），需要时照抄、不需要时整块删除。
**交付形态：默认只交付 HTML 并 present_files 预览，不主动导出 PDF**（HTML 交互图表效果远好于 PDF）；用户明确要求时才导 PDF。
**HTML 报告标配**：整页艺术封面 `.print-cover`（PDF 打印第 1 页为正式封面，米白底+主题色内联 SVG 线描花卉+右下角年份标题，见 print-rules.md 第 3 节）；内置"导出 PDF"按钮（print 时隐藏）；打印 CSS 符合 print-rules.md（@page margin:0，无页眉页脚空间）。
**PDF 质量规则（仅用户要求导出时）**：PDF 可正常打开、图表完整渲染、字体正常、分页合理，**无空白页、无资源丢失、每页底部无文件路径等页眉页脚**。文件体积只作异常信号参考，不得为凑体积塞内容。
**问卷**：`00-问卷模板.md` + `questionnaire.hta` + `questionnaire-core.js` 三件套齐备且均为 UTF-8 BOM；模板 MD 能被 QCore 正确解析（可用 Node 自测：`node -e "require('./questionnaire-core.js').parseTemplate(require('fs').readFileSync('00-问卷模板.md','utf8'))"`）。
**行为**：画像为依据表（能力/得分/自述依据+置信度）且逐项有依据；扩展清单 ≥15 条且抽查 3 条可溯源；核心机会 5~8 条且每条含匹配度/缺口/补齐行动；"慎入"+"不建议"合计 ≥2 条；宏观报告覆盖产业链上下游/岗位生态表/传导分析；结束提示已执行。
**失败处理**：修复复验最多 2 轮，仍失败如实报告。

## Constraints

- 禁止编造企业名、岗位名、薪酬数据、用户能力评分；问卷选项一律来自静态题库与行业预设，运行时禁止生成或改写选项。
- 能力评分逐项附**自述依据**与置信度（高/中/低）；禁止要求用户提供证明材料作为评分或分析前提。
- 招聘信息注明检索日期（时效性强）。
- 机会清单宜多不宜少，但每条必须可溯源；来源不足宁少勿假。
- 非权威来源视觉降级（复用 visual-spec.md 三级标注）。
- 生成报告 HTML 时遵守 `references/print-rules.md`（含导出按钮与页眉页脚规则）。
- **每次对话结束前必须执行 Step C 报告链检查**，不可省略。
- 规划书不构成唯一建议；重大决策提示用户与家人/导师商议。
