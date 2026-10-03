# -*- coding: utf-8 -*-
"""
china-city-geo.json 构建脚本（career-plan-report skill / china-map 插件）
数据源：阿里云 DataV.GeoAtlas（https://geo.datav.aliyun.com/areas_v3/bound/）
  - {adcode}_full.json = 该行政区的下一级边界（省级→地级市）
  - 100000_JD = 九段线要素（合规必需，原样保留）
用法：python build-geo.py  （输出同目录 china-city-geo.json）
注意：边界数据随民政部区划调整更新，建议每年重建一次；重建后须自检：
  ① 台湾省/香港/澳门在列且名称规范 ② 三沙市（南海诸岛）在列 ③ 九段线要素保留
"""
import json, os, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = "https://geo.datav.aliyun.com/areas_v3/bound/{}.json"

def fetch(adcode, retries=3):
    url = SRC.format(adcode)
    for i in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            if i == retries - 1:
                raise
            time.sleep(2)

def main():
    prov = fetch("100000_full")
    features, seen, errors = [], {}, []
    jd = None
    for f in prov["features"]:
        p = f["properties"]
        if p.get("adcode") == "100000_JD":   # 九段线
            jd = f
            continue
        adcode, pname = str(p["adcode"]), p["name"]
        # 直辖市与港澳：市级图上整域一块（不拆区）
        if adcode in ("110000", "120000", "310000", "500000", "810000", "820000"):
            gp = dict(p)
            gp["province"] = pname
            features.append({"type": "Feature", "properties": gp, "geometry": f["geometry"]})
            sys.stderr.write("single-region %s\n" % pname)
            continue
        try:
            sub = fetch(adcode + "_full")
        except Exception as e:
            # 无下一级数据（如台湾省）→ 退回省级行政区本身，保证疆域完整（合规必需）
            if "404" in str(e):
                gp = dict(p)
                gp["province"] = pname
                features.append({"type": "Feature", "properties": gp, "geometry": f["geometry"]})
                sys.stderr.write("fallback province %s\n" % pname)
                continue
            errors.append((pname, str(e)))
            continue
        for g in sub["features"]:
            gp = dict(g["properties"])
            name = gp.get("name", "")
            if not name:
                continue
            # 重名处理：全国范围内同名（如"市辖区"/省直辖县级）加省名前缀
            key = name
            if key in seen or name in ("市辖区", "县", "省直辖县级行政区划", "自治区直辖县级行政区划"):
                name = pname + "·" + name
            gp["name"] = name
            gp["province"] = pname
            seen[name] = True
            features.append({"type": "Feature", "properties": gp, "geometry": g["geometry"]})
        sys.stderr.write("ok %s (%d)\n" % (pname, len(features)))
        time.sleep(0.3)
    if jd is not None:
        features.append(jd)   # 九段线置末尾，ECharts geo 正常渲染
    out = {"type": "FeatureCollection", "features": features}
    dst = os.path.join(HERE, "china-city-geo.json")
    with open(dst, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    # 同时生成内嵌式 JS（file:// 协议下 fetch 被浏览器拦截，报告 HTML 用 <script> 方式加载）
    with open(os.path.join(HERE, "china-city-geo.js"), "w", encoding="utf-8") as fh:
        fh.write("/* 中国市级边界数据（由 build-geo.py 自动生成，勿手改）\n")
        fh.write("   数据源：阿里云 DataV.GeoAtlas，含台湾省/港澳/三沙市/九段线 */\n")
        fh.write("window.CHINA_CITY_GEO = ")
        fh.write(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
        fh.write(";")
    print("features:", len(features), "| size:", os.path.getsize(dst), "bytes")
    if errors:
        print("ERRORS:", errors)

if __name__ == "__main__":
    main()
    build_province()

def build_province():
    """省级边界（china-province-geo.js）：省界深色线图层的数据源，v1.2 新增。
    直接整包下载 100000_full（35 要素，含台湾省/港澳/九段线），无需加工。"""
    prov = fetch("100000_full")
    names = [f["properties"].get("name", "") for f in prov["features"]]
    # 合规自检
    assert "台湾省" in names and "香港特别行政区" in names and "澳门特别行政区" in names, "疆域自检失败：台湾/港澳缺失"
    assert any("JD" in str(f["properties"].get("adcode", "")) for f in prov["features"]), "疆域自检失败：九段线缺失"
    dst = os.path.join(HERE, "china-province-geo.json")
    with open(dst, "w", encoding="utf-8") as fh:
        json.dump(prov, fh, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(HERE, "china-province-geo.js"), "w", encoding="utf-8") as fh:
        fh.write("/* 中国省级边界数据（由 build-geo.py 自动生成，勿手改）\n")
        fh.write("   数据源：阿里云 DataV.GeoAtlas，含台湾省/港澳/九段线；用于省界深色线图层 */\n")
        fh.write("window.CHINA_PROVINCE_GEO = ")
        fh.write(json.dumps(prov, ensure_ascii=False, separators=(",", ":")))
        fh.write(";")
    print("province features:", len(prov["features"]), "| size:", os.path.getsize(dst), "bytes")
