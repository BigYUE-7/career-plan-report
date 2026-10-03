# china-map 市级色块地图插件（稳定可复用资产）

> 用途：在 02 宏观报告（区域分布章节）或 03 规划书中，把地区分析以**中国地图市级色块**直观呈现。

## 文件构成

```text
assets/china-map/
├── china-map.js               ← 插件核心 v1.2（部署到报告同目录）
├── china-city-geo.js          ← 市级边界·内嵌版（3.3MB，window.CHINA_CITY_GEO）
├── china-province-geo.js      ← 省级边界·内嵌版（570KB，window.CHINA_PROVINCE_GEO，省界深色线用）
├── china-city-geo.json / china-province-geo.json  ← http 环境备用
└── build-geo.py               ← 重建脚本（含 build_province()，重建后自动产出市/省两套）
```

## Agent 部署步骤

1. 把 `china-map.js`、`china-city-geo.js`、`china-province-geo.js` **三个文件一起**复制到报告 HTML 同目录（file:// 协议下 fetch 被浏览器拦截，必须用内嵌 `.js` 版）。
2. HTML 头部按序引入：`echarts.min.js` → `china-city-geo.js` → `china-province-geo.js` → `china-map.js`。
3. 调用（完整参数见 china-map.js 头注释）：

```html
<div id="mapRegion" style="height:420px"></div>
<script>
ChinaMap.render('mapRegion', {
  data: [
    { name: '杭州市', value: 5, tag: '横店·古装集群，竖屏剧组 4016 个/年' },
    { name: '郑州市', value: 4, tag: '"竖店"，月产约 500 部' },
    { name: '西安市', value: 4, tag: '内容供给中心，600+ 公司' },
    { name: '青岛市', value: 3, tag: '北方影视之都' },
    { name: '北京市', value: 3, tag: '平台方/头部公司' }
  ],
  highlight: ['杭州市', '郑州市', '西安市', '青岛市', '北京市'],
  unit: '岗位热度', title: '影视岗位区域分布（市级）'
});
</script>
```

## 规则

- **value 是分析判断的量化**（如岗位热度 1-5），必须有正文表格/文字支撑，禁止无依据赋值。
- 与既有图表并存时：地图呈现空间格局，表格保留精确数字与来源，二者互补不互替。
- **引导线（v1.3 起）**：高亮城市名由直线拉出图外（buildLeaders 自动选最近的边：北/东优先，南边九段线海域避开），同边自动错开防重叠；`opts.leader:false` 可关闭。：必须用 `layoutCenter + layoutSize` 锁定地理比例——map 系列在 `left/right/top/bottom` 布局下会**强行填满矩形导致拉伸**（实测踩坑）；容器比例由插件强制 `opts.aspect`（默认 '1.5 / 1'）接管。
- **图层结构**：第 1 层市级色块（无边框网格线，融为剪影）+ 第 2 层省界深色线（透明填充、silent:true 不挡悬停）；visualMap 必须 `seriesIndex: 0` 只作用于色块层。
- **渲染样式**：SVG 真矢量；visualMap 4 级 piecewise，`COLORS4` 按 **深→浅** 排列与 pieces 顺序（高→低）对齐——**曾因颜色方向接反导致高值城市近乎白色不可见，改动 pieces/颜色时必须截图验证最高值城市是否为最深色**。
- 城市名只在 highlight 列表中的城市常显，字号 8（避免大字压图）。
- PDF 导出沿用既有链路（animation:false 已内置；--virtual-time-budget=30000）。
- 图下必须加注："底图数据：阿里云 DataV.GeoAtlas（国标边界），检索日期 YYYY-MM-DD；审图号：地图仅用于研究展示"。

## 合规红线（每次使用必须自检）

1. **疆域完整**：台湾省、香港特别行政区、澳门特别行政区、三沙市（南海诸岛）必须在地图上呈现；九段线要素（adcode `100000_JD`）必须保留——数据已内置，但**重建 build-geo.py 后必须重跑自检**（脚本头注释有清单）。
2. 禁止改用 Google Maps / Apple Maps / Bing 海外版 / OpenStreetMap / Mapbox 等非合规地图源；在线交互地图需求走腾讯地图 GL JS（见 geo-map-compliance-guard）。
3. 本插件为**离线静态渲染**（ECharts + 官方边界 GeoJSON），不调用任何在线地图服务、不携带任何 API key。
4. 不标注军事禁区、涉密坐标；不采集/公开个人位置数据。
