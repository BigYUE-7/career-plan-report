/* ============================================================
   questionnaire-core.js
   问卷 MD 与答案 MD 的解析 / 序列化核心（纯 ES5，无 DOM、无 ActiveX）
   - 可被 HTA 引入：<script src="questionnaire-core.js"></script>  → 全局 QCore
   - 可被 Node 引入：require('./questionnaire-core.js')            → 用于自动化测试
   ============================================================ */
var QCore = (function () {

  var VALID_TYPES = { "text": 1, "single": 1, "multi": 1 };

  function trim(s) { return String(s == null ? "" : s).replace(/^\s+|\s+$/g, ""); }

  function stripBom(s) {
    if (s && s.charCodeAt(0) === 0xFEFF) { return s.substring(1); }
    return s;
  }

  /* ---------- 解析模板 MD ---------- */
  function parseTemplate(mdText) {
    var text = stripBom(String(mdText == null ? "" : mdText));
    var lines = text.split(/\r?\n/);
    var model = { title: "", meta: [], questions: [], raw: lines };
    var cur = null;
    var inComment = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var t = trim(line);

      // 多行 HTML 注释：<!-- ... --> 内的内容全部忽略
      if (inComment) {
        if (t.indexOf("-->") >= 0) { inComment = false; }
        continue;
      }
      if (t.indexOf("<!--") === 0) {
        if (t.indexOf("-->") < 0) { inComment = true; }
        continue;
      }
      // 行内注释：<!-- ... --> 之前的内容保留，之后丢弃
      var ci = t.indexOf("<!--");
      if (ci >= 0) {
        if (t.indexOf("-->", ci) < 0) { inComment = true; }
        t = trim(t.substring(0, ci));
        if (t === "") { continue; }
      }

      if (t.indexOf("# ") === 0 && model.title === "" && model.questions.length === 0) {
        model.title = trim(t.substring(2));
        continue;
      }
      if (t.indexOf("## ") === 0) {
        cur = parseHeader(trim(t.substring(3)), model.questions.length + 1);
        model.questions.push(cur);
        continue;
      }
      if (!cur) {
        if (t.indexOf("- ") === 0 && t.indexOf("：") > 0) {
          var kv = t.substring(2);
          var p = kv.indexOf("：");
          model.meta.push({ key: trim(kv.substring(0, p)), value: trim(kv.substring(p + 1)), raw: line });
        } else if (t !== "" && t.indexOf("<!--") !== 0) {
          model.meta.push({ key: "", value: "", raw: line });
        }
        continue;
      }
      // 题目内部
      if (t.indexOf("提示：") === 0 || t.indexOf("提示:") === 0) {
        cur.tip = trim(t.substring(3));
        continue;
      }
      if (t.indexOf("> ") === 0) {
        cur.tip = cur.tip ? (cur.tip + " " + trim(t.substring(2))) : trim(t.substring(2));
        continue;
      }
      if (t.indexOf("- ") === 0 || t.indexOf("- [ ] ") === 0 || t.indexOf("- [x] ") === 0) {
        var optText = t.substring(2).replace(/^\[[ xX]\]\s*/, "");
        var parts = optText.split("|");
        var name = trim(parts[0]);
        var flag = parts.length > 1 ? trim(parts[1]) : "";
        if (name !== "") {
          cur.options.push({ name: name, score: (flag === "score"), raw: line });
        }
        continue;
      }
      if (t.indexOf("<!--") === 0 || t === "") { continue; }
      // 其余非空行视作补充提示
      cur.tip = cur.tip ? (cur.tip + " " + t) : t;
    }
    return model;
  }

  function parseHeader(headerText, index) {
    var parts = headerText.split("|");
    var title = trim(parts[0]);
    var type = parts.length > 1 ? trim(parts[1]).toLowerCase() : "";
    var flags = [];
    for (var i = 2; i < parts.length; i++) { flags.push(trim(parts[i])); }
    var isQuestion = !!VALID_TYPES[type];
    return {
      index: index,
      no: title,
      title: title,
      type: isQuestion ? type : "note",
      raw_type: type,
      required: hasFlag(flags, "必填"),
      key: hasFlag(flags, "关键"),
      flags: flags,
      tip: "",
      options: [],
      headerRaw: "## " + headerText
    };
  }

  function hasFlag(flags, f) {
    for (var i = 0; i < flags.length; i++) { if (flags[i] === f) { return true; } }
    return false;
  }

  /* ---------- 序列化已填写 MD ---------- */
  // answers: { "Q1 专业与年级": {type:"text", text:"...", other:"" },
  //            "Q2 硬技能自评": {type:"multi", selected:["嵌入式/单片机"], scores:{"嵌入式/单片机":"2"}, other:"..." } }
  function serializeFilled(model, answers, stamp) {
    var out = [];
    var usedQ = {};

    for (var i = 0; i < model.meta.length; i++) {
      var m = model.meta[i];
      if (m.key === "" && m.value === "") { out.push(m.raw); continue; }
      out.push(m.raw);
    }
    if (stamp) { out.push("- 提交时间：" + stamp); }

    if (model.title) { out.splice(0, 0, "# " + model.title + "（已填写）", ""); }

    for (var q = 0; q < model.questions.length; q++) {
      var item = model.questions[q];
      var key = item.title;
      var a = answers[key] || {};
      usedQ[key] = true;

      out.push("");
      out.push(item.headerRaw);
      if (item.tip) { out.push("提示：" + item.tip); }

      if (item.type === "note") { continue; }

      if (item.type === "text") {
        out.push("");
        out.push("**作答**：" + (a.text ? a.text : "（未填写）"));
        continue;
      }

      for (var o = 0; o < item.options.length; o++) {
        var op = item.options[o];
        var chosen = isChosen(a.selected, op.name);
        var line = "- [" + (chosen ? "x" : " ") + "] " + op.name;
        if (op.score) {
          var sc = chosen && a.scores && a.scores[op.name] ? a.scores[op.name] : "";
          if (sc) { line += " | " + sc + "分"; }
        }
        out.push(line);
      }
      var summary = summarize(a, item);
      out.push("其他：" + (a.other ? a.other : "无"));
      out.push("");
      out.push("**作答**：" + summary);
    }
    return out.join("\r\n");
  }

  function isChosen(list, name) {
    if (!list) { return false; }
    for (var i = 0; i < list.length; i++) { if (list[i] === name) { return true; } }
    return false;
  }

  function summarize(a, item) {
    if (item.type === "text") { return a.text ? a.text : "（未填写）"; }
    var picked = [];
    if (a.selected) {
      for (var i = 0; i < a.selected.length; i++) {
        var n = a.selected[i];
        var sc = a.scores && a.scores[n] ? a.scores[n] : "";
        picked.push(sc ? (n + "(" + sc + "分)") : n);
      }
    }
    var s = picked.length ? picked.join("、") : "（未选择）";
    if (a.other) { s += "；其他：" + a.other; }
    return s;
  }

  /* ---------- 生成结构化 JSON（供 agent 稳定解析） ---------- */
  function toJson(model, answers, stamp) {
    var list = [];
    for (var i = 0; i < model.questions.length; i++) {
      var item = model.questions[i];
      if (item.type === "note") { continue; }
      var a = answers[item.title] || {};
      var entry = {
        question: item.title,
        type: item.type,
        required: !!item.required,
        key: !!item.key
      };
      if (item.type === "text") {
        entry.answer = a.text ? a.text : "";
      } else {
        entry.selected = a.selected ? a.selected : [];
        entry.scores = {};
        for (var k in (a.scores || {})) {
          if (a.scores.hasOwnProperty && a.scores.hasOwnProperty(k)) { entry.scores[k] = a.scores[k]; }
        }
        entry.other = a.other ? a.other : "";
        entry.summary = summarize(a, item);
      }
      list.push(entry);
    }
    return {
      source_template: model.title,
      submitted_at: stamp || "",
      meta: model.meta,
      answers: list
    };
  }

  function validate(model, answers) {
    var missing = [];
    for (var i = 0; i < model.questions.length; i++) {
      var item = model.questions[i];
      if (item.type === "note" || !item.required) { continue; }
      var a = answers[item.title] || {};
      var filled = false;
      if (item.type === "text") { filled = !!(a.text && trim(a.text) !== ""); }
      else { filled = !!((a.selected && a.selected.length > 0) || (a.other && trim(a.other) !== "")); }
      if (!filled) { missing.push(item.title); }
    }
    return missing;
  }

  var api = {
    parseTemplate: parseTemplate,
    serializeFilled: serializeFilled,
    toJson: toJson,
    validate: validate,
    trim: trim,
    stripBom: stripBom
  };
  return api;
})();

if (typeof module !== "undefined" && module.exports) { module.exports = QCore; }
