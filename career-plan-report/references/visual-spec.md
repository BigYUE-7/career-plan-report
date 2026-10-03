# 视觉规范（visual-spec）

> 本文件是 industry-policy-report skill 的视觉规范，生成报告 HTML 时必须遵守。
> 设计总纲：**以信息为主纲，海报要美观，但美观服务于信息。**

---

## 1. 配色体系

### 1.1 核心色

| 用途 | 颜色 | 参考色值 |
|------|------|----------|
| 章节标题条 / 封面主标题 | 深红底 + 白色字 | 底 `#8B1A1A`，字 `#FFFFFF` |
| 积极信息 / 数据上涨 | 红色系（中国惯例：涨红） | `#C0392B` |
| 消极信息 / 数据下跌 | 深绿底 + 白色或浅色字 | 底 `#1E5631`，字 `#FFFFFF` |
| 非权威实时消息 | 灰色，或暖浅红 + 深色字体 | 灰 `#9E9E9E`；暖浅红底 `#F5C6C6` + 字 `#5A2A2A` |
| 正文 / 中性背景 | 深灰字 + 米白背景 | 字 `#2B2B2B`，底 `#FAF7F2` |
| 辅助线 / 分隔 | 浅灰 | `#D9D2C7` |

### 1.2 表格与趋势图

- **多用红绿对比**：上涨/利好用红，下跌/利空用绿（遵守中国股票市场红涨绿跌惯例）。
- 折线图双线对比时：主线深红，对比线深绿，坐标轴与网格浅灰。
- 柱状图同一指标跨期对比：本期深红，上期浅灰或浅红。

### 1.3 来源三级标注

| 权威级 | 视觉处理 | 示例来源 |
|--------|----------|----------|
| 权威 | 正常展示，可加"官方"小标签 | 政府网站、统计部门、行业协会、主流媒体 |
| 普通 | 正常展示，仅列来源 | 一般媒体、研究机构 |
| 非权威 | 灰色文字 或 暖浅红底 + 深色字，**必须**加"非权威来源"角标 | 自媒体、论坛、未经证实的爆料 |

---

## 2. 版式规则

- **数据优先用图表**，其次表格，最后才是长文字。
- 关键事件与时间 → **线性节点时间轴**（水平或垂直，节点圆点 + 时间标签 + 事件短句）。
- 每个章节有深红底白字的标题条，章节内留白充足。
- 摘要放最前，来源清单放最后；正文结论必须能对应到来源编号 `[S1]` `[S2]`…
- 报告整体信息密度高但分区清晰：一屏一个主题。

---

## 3. 图表技术

- 统一用 **ECharts**，不引入 Python 绘图脚本。**加载策略（v0.2.0）**：首选本地 `echarts.min.js`（skill `assets/` 目录已内置，生成报告时复制到报告目录），CDN 仅作兜底（顺序：staticfile.net → bootcdn，jsdelivr 国内不可靠勿用）。
- **所有图表 option 必须设置 `animation: false`**：headless 导出 PDF 时动画会停在第一帧导致图表空白。
- 每个 ECharts 实例必须有对应的 HTML 容器 div；初始化函数带元素缺失守卫，加载失败时在容器内显示灰色提示文字。
- 图表下方必须有来源注：`数据来源：[S3] 国家统计局，2025`。
- 图表配色引用上方 1.1 / 1.2 的色值，不使用 ECharts 默认彩色系。
- 时间轴可用 ECharts timeline 或纯 CSS 节点图，任选其一，保持全篇一致。

---

## 4. PDF 导出

### 4.1 配色方案（导出时可选）

| 方案 | data-theme | 用途 |
|------|-----------|------|
| 标准红 | `standard-red`（默认） | 屏幕阅读、展示 |
| 沉稳蓝灰 | `print-blue` | 打印友好（深红替换为深蓝 `#1F3A5F`，其余不变） |

HTML 模板通过 `<body data-theme="…">` 切换，CSS 变量控制。

### 4.2 打印样式

- `@media print` 中隐藏交互元素（主题切换按钮等）。
- 图表容器固定宽高，避免打印时塌陷。
- 页面分节，`break-inside: avoid` 用于卡片与图表。

### 4.3 导出命令（Windows / Edge）

```powershell
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"  # 不存在则用 C:\Program Files\... 路径
$html = "F:\...\report.html"
$uri  = ([System.Uri] $html).AbsoluteUri   # 处理中文路径必须转 AbsoluteUri

# 导出 PDF：必须带虚拟时间预算，等待 ECharts 画布绘制完成
& $edge --headless --disable-gpu --no-pdf-header-footer `
  --virtual-time-budget=15000 --run-all-compositor-stages-before-draw `
  --print-to-pdf="report.pdf" $uri

# 可选：先整页截图验证 HTML 渲染，再导 PDF
& $edge --headless --disable-gpu --hide-scrollbars --window-size=1000,9000 `
  --virtual-time-budget=8000 --screenshot="_verify.png" $uri
```

导出后检查清单：
- [ ] PDF 体积 > 300KB（含图表；若仅几十 KB 说明图表未渲染，禁止交付）
- [ ] 图表未截断、深色文字可读、页数合理
- [ ] bash 环境不可用（coreutils 缺失等）时改用 PowerShell，不要反复重试 bash
