/* 临时测试脚本：验证 questionnaire-core.js 的解析与序列化逻辑 */
var fs = require("fs");
var path = require("path");
var QCore = require("./questionnaire-core.js");

var tplPath = path.join(__dirname, "..", "references", "questionnaire-template.md");
var md = fs.readFileSync(tplPath, "utf8");
var model = QCore.parseTemplate(md);

console.log("=== parseTemplate ===");
console.log("title:", JSON.stringify(model.title));
console.log("meta count:", model.meta.length);
console.log("questions:", model.questions.length);
model.questions.forEach(function (q) {
  console.log("  [" + q.index + "] " + q.title + " | type=" + q.type + " req=" + q.required + " key=" + q.key + " opts=" + q.options.length + (q.tip ? " tip=" + q.tip : ""));
});

// 模拟答案
var answers = {
  "Q1 专业与年级": { type: "text", text: "智能工程与创意设计，大二" },
  "Q2 硬技能自评": { type: "multi", selected: ["嵌入式/单片机", "AIGC工具链"], scores: { "嵌入式/单片机": "2", "AIGC工具链": "4" }, other: "会一点 Python" },
  "Q3 实践经历": { type: "multi", selected: ["学科/双创竞赛获奖", "个人作品集/自媒体"], scores: {}, other: "" },
  "Q4 意向城市": { type: "multi", selected: ["深圳-广州（珠三角）"], scores: {}, other: "想去苏州" },
  "Q5 意向方向": { type: "multi", selected: ["交互/UX设计", "产品经理"], scores: {}, other: "" },
  "Q6 毕业后核心约束": { type: "single", selected: ["可接受深造2-3年"], scores: {}, other: "" },
  "Q7 成绩与学校层次": { type: "text", text: "专业前30%，双一流" },
  "Q8 协作偏好": { type: "single", selected: ["混合"], scores: {}, other: "" },
  "Q9 风险偏好": { type: "single", selected: ["适度冒险（高成长行业）"], scores: {}, other: "" }
};

console.log("\n=== validate ===");
console.log("missing:", JSON.stringify(QCore.validate(model, answers)));

console.log("\n=== serializeFilled (前 40 行) ===");
var filled = QCore.serializeFilled(model, answers, "2026-09-15 18:40");
console.log(filled.split("\r\n").slice(0, 40).join("\n"));

console.log("\n=== toJson (Q2 部分) ===");
var json = QCore.toJson(model, answers, "2026-09-15 18:40");
console.log(JSON.stringify(json.answers[1], null, 2));

console.log("\n=== 边界：空答案 validate（应报所有必填缺失） ===");
console.log(JSON.stringify(QCore.validate(model, {})));

console.log("\nALL TESTS DONE");
