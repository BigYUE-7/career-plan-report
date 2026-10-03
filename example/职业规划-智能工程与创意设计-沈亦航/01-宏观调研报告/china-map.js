/* china-map.js — 中国市级色块地图插件（career-plan-report skill 资产，v1.3）
 * 数据源：阿里云 DataV.GeoAtlas（国标边界；含台湾省/港澳/三沙市/九段线，疆域完整合规）
 * 依赖：echarts；china-city-geo.js（市级边界）；china-province-geo.js（省级边界，省界深色线）
 * 渲染：SVG 真矢量 + 4 级分档配色；layoutCenter/layoutSize 锁定地理比例（不随容器拉伸）
 * 图层：市级色块（剪影无边框）+ 省界深色线 + 城市名引导线（拉到图外，同边自动错开）
 * 容器：插件自动按 opts.aspect（默认 '1.5 / 1'）设定宽高比
 * 部署：china-map.js + china-city-geo.js + china-province-geo.js 三件一起复制到报告同目录
 * 用法：
 *   ChinaMap.render('容器div的id', {
 *     data: [ { name:'杭州市', value:5, tag:'...' }, ... ],  // value 驱动色块深浅
 *     highlight: ['杭州市','郑州市'],        // 色块描边 + 引导线出图注名
 *     unit: '岗位热度', title: '...',        // 图例文案 / 地图内标题（可选）
 *     leader: false,                          // 关闭引导线（默认开）
 *     aspect: '1.5 / 1', aspectScale: 1       // 容器宽高比 / 地理纵横比（可选）
 *   });
 * 合规自检（每次重建数据后必做）：台湾省/香港/澳门在列、三沙市在列、九段线(100000_JD)保留
 */
(function (global) {
  'use strict';
  function scriptDir() {
    var s = document.currentScript;
    return s ? s.src.substring(0, s.src.lastIndexOf('/')) : '.';
  }
  function loadGeo(g, name, url) {
    if (g[name] && g[name].features) { return Promise.resolve(g[name]); }
    return fetch(url).then(function (r) { return r.json(); });
  }
  /* ---- 引导线几何计算（v1.3）---- */
  function geomBbox(geom, bb) {
    function walk(coords) {
      if (typeof coords[0] === 'number') {
        if (coords[0] < bb.lonMin) bb.lonMin = coords[0];
        if (coords[0] > bb.lonMax) bb.lonMax = coords[0];
        if (coords[1] < bb.latMin) bb.latMin = coords[1];
        if (coords[1] > bb.latMax) bb.latMax = coords[1];
      } else { for (var i = 0; i < coords.length; i++) walk(coords[i]); }
    }
    walk(geom.coordinates);
  }
  function featureCenter(f) {
    var bb = { lonMin: 999, lonMax: -999, latMin: 999, latMax: -999 };
    geomBbox(f.geometry, bb);
    return [(bb.lonMin + bb.lonMax) / 2, (bb.latMin + bb.latMax) / 2];
  }
  function collectionBbox(features) {
    var bb = { lonMin: 999, lonMax: -999, latMin: 999, latMax: -999 };
    features.forEach(function (f) { geomBbox(f.geometry, bb); });
    return bb;
  }
  function stagger(arr, key, gap) {
    arr.sort(function (a, b) { return a[key] - b[key]; });
    for (var i = 1; i < arr.length; i++) {
      if (arr[i][key] - arr[i - 1][key] < gap) { arr[i][key] = arr[i - 1][key] + gap; }
    }
    return arr;
  }
  function buildLeaders(features, names, bb) {
    var mLon = (bb.lonMax - bb.lonMin) * 0.02 + 1.2;
    var mLat = (bb.latMax - bb.latMin) * 0.02 + 1.0;
    var EX = 1.2, midLon = (bb.lonMin + bb.lonMax) / 2;
    var horiz = [], vert = [];
    names.forEach(function (n) {
      var f = null;
      for (var i = 0; i < features.length; i++) { if (features[i].properties && features[i].properties.name === n) { f = features[i]; break; } }
      if (!f) { return; }
      var c = featureCenter(f);
      // 选最近的图边（南边是九段线海域，除非城市真正贴着南边否则不用）
      var dN = bb.latMax + mLat - c[1], dS = c[1] - (bb.latMin - mLat);
      var dE = bb.lonMax + mLon - c[0], dW = c[0] - (bb.lonMin - mLon);
      var cand = [['E', dE], ['W', dW], ['N', dN]];
      if (dS < 8) { cand.push(['S', dS]); }
      cand.sort(function (a, b) { return a[1] - b[1]; });
      var e = cand[0][0], p = { name: n, cx: c[0], cy: c[1] };
      if (e === 'E') { p.x = bb.lonMax + mLon + EX; p.y = c[1]; p.edge = 'V'; }
      else if (e === 'W') { p.x = bb.lonMin - mLon - EX; p.y = c[1]; p.edge = 'V'; }
      else if (e === 'N') { p.x = c[0]; p.y = bb.latMax + mLat + EX * 0.8; p.edge = 'H'; }
      else { p.x = c[0]; p.y = bb.latMin - mLat - EX * 0.8; p.edge = 'H'; }
      (p.edge === 'H' ? horiz : vert).push(p);
    });
    // 同边防重叠：图上/下边的按经度拉开，图左/右边的按纬度拉开
    stagger(horiz, 'x', 4.2);
    stagger(vert, 'y', 3.2);
    var lines = [], labels = [];
    horiz.concat(vert).forEach(function (p) {
      lines.push({ coords: [[p.cx, p.cy], [p.x, p.y]] });
      labels.push({
        value: [p.x, p.y], name: p.name,
        label: { position: p.edge === 'V' ? (p.x > midLon ? 'right' : 'left') : 'top' }
      });
    });
    return { lines: lines, labels: labels };
  }

  function render(containerId, opts) {
    opts = opts || {};
    var ech = opts.echarts || global.echarts;
    var el = document.getElementById(containerId);
    if (!el || !ech) { return Promise.reject(new Error('container or echarts missing')); }
    // 容器比例：强制规定宽高比，避免外部布局把地图拉伸
    el.style.height = 'auto';
    el.style.aspectRatio = opts.aspect || '1.5 / 1';
    el.style.maxWidth = '100%';
    var dir = scriptDir();
    // 数据加载：优先内嵌（file:// 唯一可靠方式），否则 fetch
    return Promise.all([
      loadGeo(global, 'CHINA_CITY_GEO', dir + '/china-city-geo.json'),
      loadGeo(global, 'CHINA_PROVINCE_GEO', dir + '/china-province-geo.json')
    ]).then(function (geos) {
      ech.registerMap('china-city', geos[0]);
      ech.registerMap('china-province', geos[1]);
      var data = opts.data || [];
      var maxV = 0;
      data.forEach(function (d) { if (d.value > maxV) maxV = d.value; });
      if (opts.valueRange) { maxV = opts.valueRange[1]; }
      var hl = {};
      var hlNames = [];
      (opts.highlight || []).forEach(function (n) { hl[n] = 1; hlNames.push(n); });
      var seriesData = data.map(function (d) {
        return {
          name: d.name, value: d.value, tag: d.tag || '',
          itemStyle: hl[d.name] ? { borderColor: '#5b1518', borderWidth: 1 } : undefined
        };
      });
      // 4 级分档配色（可被 opts.pieces 覆盖）：色块分级清晰、便于快速读图
      var pieces = opts.pieces || (function (m) {
        var q = Math.max(m / 4, 0.25);
        return [
          { gt: 3 * q, lte: m, label: '高' },
          { gt: 2 * q, lte: 3 * q },
          { gt: 1 * q, lte: 2 * q },
          { gt: 0, lte: 1 * q }
        ];
      })(maxV || 1);
      var COLORS4 = ['#8f1d22', '#c05a42', '#e5a089', '#f6ddd3'];   // 深 → 浅（与 pieces 顺序 高→低 对齐）
      var visualPieces = pieces.map(function (p, i) {
        return {
          gt: p.gt, lte: p.lte, min: p.min, max: p.max,
          label: p.label || (i === 0 ? '高' : i === 3 ? '低' : ''),
          color: p.color || COLORS4[Math.min(i, 3)]
        };
      });
      var chart = ech.init(el, null, { renderer: 'svg' });   // SVG 渲染：真矢量，PDF 导出不糊
      // 布局：layoutCenter/layoutSize 锁定地理比例（left/right/top/bottom 会强行填满导致拉伸）
      // layoutSize 88%：给图外引导线标签留出边距
      var layout = {
        zoom: 1,
        aspectScale: opts.aspectScale || 1,
        layoutCenter: ['50%', '52%'],
        layoutSize: '88%'
      };
      // 引导线（把高亮城市名拉出图外）
      var leader = { lines: [], labels: [] };
      if (opts.leader !== false && hlNames.length) {
        leader = buildLeaders(geos[0].features, hlNames, collectionBbox(geos[0].features));
      }
      chart.setOption({
        animation: false,
        title: opts.title ? {
          text: opts.title, left: 'center', top: 6,
          textStyle: { color: opts.titleColor || '#8f1d22', fontSize: 15, fontWeight: 600 }
        } : undefined,
        tooltip: {
          trigger: 'item',
          formatter: function (p) {
            if (!p.data || p.data.value === undefined) { return p.name; }
            return p.name + '<br/>' + (opts.unit || '数值') + '：<b>' + p.data.value + '</b>' +
              (p.data.tag ? '<br/>' + p.data.tag : '');
          }
        },
        // geo 组件：仅为引导线系列提供地理坐标系（与色块层同布局，视觉被上层覆盖，无副作用）
        geo: [{
          map: 'china-city', roam: false, silent: true,
          zoom: layout.zoom, aspectScale: layout.aspectScale,
          layoutCenter: layout.layoutCenter, layoutSize: layout.layoutSize,
          label: { show: false },
          emphasis: { disabled: true }, select: { disabled: true },
          itemStyle: { areaColor: 'rgba(0,0,0,0)', borderColor: 'rgba(0,0,0,0)', borderWidth: 0 }
        }],
        visualMap: {
          type: 'piecewise',
          pieces: visualPieces,
          seriesIndex: 0,               // 只作用于市级色块层
          left: 10, bottom: 14,
          itemWidth: 18, itemHeight: 12, itemGap: 5,
          text: opts.unit ? [opts.unit, ''] : undefined,
          textStyle: { fontSize: 11, color: '#6b6b6b' }
        },
        series: [
          {   // 第 1 层：市级色块（极简剪影；城市名改由引导线出图标注）
            type: 'map', map: 'china-city', roam: false,
            zoom: layout.zoom, aspectScale: layout.aspectScale,
            layoutCenter: layout.layoutCenter, layoutSize: layout.layoutSize,
            label: { show: false },
            itemStyle: { areaColor: '#f4efe8', borderColor: '#f4efe8', borderWidth: 0 },
            emphasis: { label: { show: true, fontSize: 9 }, itemStyle: { areaColor: '#b3323a' } },
            select: { disabled: true },
            data: seriesData
          },
          {   // 第 2 层：省界深色线（透明填充，silent 不挡悬停）
            type: 'map', map: 'china-province', roam: false, silent: true,
            zoom: layout.zoom, aspectScale: layout.aspectScale,
            layoutCenter: layout.layoutCenter, layoutSize: layout.layoutSize,
            label: { show: false },
            itemStyle: { areaColor: 'rgba(0,0,0,0)', borderColor: '#5a4f46', borderWidth: 0.7 },
            emphasis: { disabled: true },
            select: { disabled: true },
            data: []
          },
          {   // 第 3 层：城市名引导线（直线拉出图外）
            type: 'lines', coordinateSystem: 'geo', silent: true, z: 5,
            lineStyle: { color: '#8a7f75', width: 0.9, opacity: 0.9, curveness: 0 },
            data: leader.lines
          },
          {   // 第 4 层：图外城市名标签（引导线端点）
            type: 'scatter', coordinateSystem: 'geo', silent: true, z: 6,
            symbolSize: 0.1,
            label: {
              show: true, formatter: '{b}', fontSize: 9.5, fontWeight: 600,
              color: '#4a3f35', distance: 2
            },
            labelLayout: { hideOverlap: true },
            data: leader.labels
          }
        ]
      });
      global.__charts = global.__charts || [];
      chart.__chinaMap = true;   // 标记：打印/resize 时不能套用普通图表的固定高度（layoutSize 按容器短边 88% 布局，强制 300px 会溢出裁切）
      global.__charts.push(chart);
      // 打印自适应：恢复为容器实际尺寸（容器有 aspect-ratio，宽随纸面、高随比例，地图完整重排）
      global.addEventListener('beforeprint', function () {
        try { chart.resize({ width: 'auto', height: 'auto' }); } catch (e) {}
      });
      return chart;
    });
  }
  global.ChinaMap = { render: render };
})(window);
