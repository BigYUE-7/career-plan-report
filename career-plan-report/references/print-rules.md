# 打印/PDF 样式规范（v1.0.0）

生成报告 HTML（01 宏观 / 02 规划书通用）时，`@media print` 必须包含以下规则。

## 1. 消除每页页眉/页脚的文件路径（v1.0.0 起，必做）

浏览器打印时每页底部的 `file:///...` 路径、页码等来自**页边距区域**——只要页边距有空间，浏览器就会往里画页眉页脚。解决方案（双保险）：

```css
@media print {
  /* 边距设为 0：浏览器没有页边距空间，不再绘制页眉/页脚（URL、日期、标题全部消失） */
  @page { size: A4; margin: 0; }
  /* 纸张边距改由 body 内边距承担，正文不贴边 */
  body { padding: 14mm 12mm; max-width: none; background: #fff; }
}
```

- **禁止**再写 `@page { margin: 14mm 12mm }` 这类非零页边距（会留出页眉页脚绘制空间）。
- 按钮提示文案中提醒用户：打印对话框中**取消勾选"页眉和页脚"**（Edge/Chrome 会记住该设置，之后导出不再出现）。即使忘记取消，margin:0 也已让其无处绘制。

## 2. 工具栏标配（v1.1.0 起，每份报告必含：主题切换 + 导出 PDF）

```html
<div class="toolbar">
  <button onclick="toggleTheme()">切换配色</button>
  <button onclick="window.print()">导出 PDF（对话框中选"另存为 PDF"，边距选"无"，取消勾选"页眉和页脚"）</button>
</div>
```

```css
.toolbar { text-align: center; margin: 30px 0 10px; }   /* 或 fixed 右上角，二选一 */
@media print { .toolbar { display: none; } }            /* 打印时隐藏按钮本身 */
```

**主题切换机制（v1.1.0 固化：红/蓝/绿/橙四色循环）**：报告主色一律走 CSS 变量（如 `--blue`/`--c-title-bar` + 封面渐变变量），定义四个主题的数据主题值；按钮循环切换：

```css
:root, body[data-theme="blue"] { --blue:#1d3a8f; /* ...报告全部主色变量，默认主题 */ }
body[data-theme="red"]    { --blue:#8f1d22; /* 换一组主色变量 */ }
body[data-theme="green"]  { --blue:#1e6f50; }
body[data-theme="orange"] { --blue:#b35a1d; }
```

```js
var THEMES = ['blue','red','green','orange'];
function toggleTheme(){
  var cur = document.body.dataset.theme || 'blue';
  document.body.dataset.theme = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
}
```

- 四个主题都用**深色系**（打印不发灰），任一主题下直接打印均可；图表配色不必跟随切换，但须在四个主题下都可读。
- **报告必须把主色定义为 CSS 变量**（含封面渐变），禁止把主题色硬编码散落在各处样式里——这是切换按钮生效的前提。

```js
// 打印前重排：普通图表压到 300px；china-map 地图例外——它的 layoutSize 按容器短边 88% 布局，
// 强制 300px 会让地图溢出 SVG 被裁（南方城市消失），必须恢复容器实际尺寸完整重排
window.addEventListener('beforeprint', function(){
  (window.__charts||[]).forEach(function(c){
    if (c.__chinaMap) { c.resize({width:'auto',height:'auto'}); }
    else { c.resize({width:'auto',height:300}); }
  });
});
// 所有图表经 mk() 创建并登记到 window.__charts（地图由 ChinaMap.render 自动登记并自带 __chinaMap 标记与 beforeprint 自适应）
function mk(id, opt){ var el=document.getElementById(id); if(!el) return;
  var c=echarts.init(el); c.setOption(opt); (window.__charts=window.__charts||[]).push(c); }
// 以上是最小规范；含「echarts 缺失降级提示 + DOMContentLoaded 包装」的完整版见 templates/plan-template.html。
// 生成报告时以模板写法为准并逐字沿用——禁止自行简化（历次空白图表均源于手写简化版）。
```

地图容器在打印样式中限宽，防止占满整页并配合重排：`#mapBox { width: 88%; margin: 0 auto; }`（放在 @media print 内）。

## 3. 整页艺术封面（v1.3.0 起，必做——PDF 打印第 1 页为正式封面）

在 `.page` 内、原渐变横幅 `.cover` **之前**插入 `.print-cover` 整页封面节（屏幕预览可见，打印独占第 1 页）。视觉规范：米白纸底 `#FBF9F4` + 大量留白 + 主题色细线描艺术图案（**内联 SVG，颜色全部用主题 CSS 变量** `var(--blue)`/`var(--blue-2)`，随四套主题自动变色，禁止外部图片）；版式仿正式年报封面——左上楷体系列标签、右上印章、中部大面积线描花卉、右下角年份（Georgia）+ 报告名（宋体加粗大字号）+ 副标题 + 元信息。

```css
.print-cover { position:relative; overflow:hidden; background:#FBF9F4; border-radius:16px; margin:14px 0 26px; aspect-ratio:210/297; display:flex; flex-direction:column; box-shadow:0 4px 24px rgba(0,0,0,.08); }
.print-cover .pc-top { display:flex; justify-content:space-between; align-items:center; padding:36px 42px 0; }
.print-cover .pc-series { font-family:"KaiTi","STKaiti",serif; font-size:15px; letter-spacing:3px; color:var(--blue); border-bottom:2px solid var(--blue); padding-bottom:6px; }
.print-cover .pc-seal { width:38px; height:38px; background:#B23A32; color:#fff; border-radius:6px; display:flex; align-items:center; justify-content:center; font-family:"KaiTi","STKaiti",serif; font-size:20px; }
.print-cover .pc-art { position:absolute; left:50%; top:42%; transform:translate(-50%,-50%); width:80%; }
.print-cover .pc-bottom { margin-top:auto; padding:0 42px 42px; text-align:right; }
.print-cover .pc-rule { height:2px; background:linear-gradient(90deg,transparent,var(--blue)); margin-bottom:18px; margin-left:32%; }
.print-cover .pc-year { font-size:32px; font-weight:bold; color:var(--blue); font-family:Georgia,"Times New Roman",serif; letter-spacing:3px; }
.print-cover .pc-title { font-family:"SimSun","STSong",serif; font-weight:bold; font-size:36px; letter-spacing:8px; color:var(--ink); margin:6px 0 12px; }
.print-cover .pc-sub { font-size:15px; color:#5a564c; letter-spacing:1px; }
.print-cover .pc-meta { font-size:12.5px; color:#8a8578; margin-top:14px; line-height:1.9; }
```

打印规则（放 `@media print` 内）——负 margin 逃出 body 内边距实现**全出血**，高度精确 297mm 后强制分页；原渐变横幅 `.cover` **保留**在打印第 2 页（用户确认不隐藏，仅去圆角），与封面页各司其职：

```css
@media print {
  .print-cover { margin:-14mm -12mm 0; width:calc(100% + 24mm); aspect-ratio:auto; height:297mm; border-radius:0; box-shadow:none; break-after:page; page-break-after:always; }
  .cover { border-radius:0; }
}
```

线描花卉 SVG 写法要点：`<defs>` 定义一片花瓣 `<path d="M0 0 C -40 -34 -46 -100 0 -138 C 46 -100 40 -34 0 0 Z"/>`，用 `<use href="#id" transform="translate(400 400) rotate(a) scale(s)"/>` 旋转复制出 3~4 环（外环 10 瓣 scale 1.5 / 错位描边环 scale 1.34 / 中环 8 瓣 scale 0.98 / 内环 scale 0.6，fill-opacity 5%~14% 递进）+ 花蕊短线 + 两条下垂枝线 + 虚线大圆衬底。**id 每份报告要唯一**（如 `pcPetal01`）。

**验证必做**：Edge headless 导 PDF 后用 pymupdf 渲染第 1、2 页检查——第 1 页封面完整无裁切、第 2 页直接是正文（无空白页）、标题不溢出换行（长标题 15 字用 30~36px + letter-spacing 5~8px 可容纳）。

## 4. 其余打印规则（沿用）

```css
@media print {
  h2.section { margin: 24px 0 14px; break-after: avoid; }
  .card { box-shadow: none; margin-bottom: 10px; break-inside: avoid; }
  .chart { height: 300px; break-inside: avoid; }
  .timeline { break-inside: avoid; }
  table.data { break-inside: auto; }
  table.data tr { break-inside: avoid; }
  a { color: inherit; text-decoration: none; }
  #mapBox { width: 88%; margin: 0 auto; }
}
```

要点：卡片去阴影、`break-inside:avoid` 防整块下移；标题 `break-after:avoid` 防与内容分离；图表打印降高到 300px；表格允许整体跨页、行级禁止截断。

**PDF 质量规则**：PDF 可正常打开、图表完整渲染、字体正常、分页合理，无空白页、无资源丢失、**每页无页眉页脚文件路径**。文件体积只作异常信号参考（如异常小的空壳 PDF），**不得为凑体积向报告塞内容**。
