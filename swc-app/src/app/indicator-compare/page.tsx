"use client";

import { useState, useMemo } from "react";
import {
  GitDiff,
  Download,
  Plus,
  Trash,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";

interface IndicatorRow {
  id: string;
  section: string;        // 条款 (第十六条、第十七条...)
  requirement: string;    // 条款说明
  original: string;       // 原水土保持方案 (手动填入)
  modified: string;       // 变更方案 (手动填入)
  change: string;         // 变化情况 (手动填入)
}

// 53号令各条款对应的变更判断规则（关键词/阈值）
const rules53: Record<string, { label: string; threshold?: number; type: "increase" | "decrease" | "special" }> = {
  "(1)": { label: "涉及重点治理区", type: "special" },
  "(2)": { label: "防治责任范围", threshold: 30, type: "increase" },
  "(3)": { label: "土石方总量", threshold: 30, type: "increase" },
  "(4)": { label: "横向位移超300米", threshold: 30, type: "special" },
  "(5)": { label: "表土剥离量", threshold: 30, type: "decrease" },
  "(6)": { label: "植物措施总面积", threshold: 30, type: "decrease" },
  "(7)": { label: "重要单位工程措施", type: "special" },
  "弃渣(1)": { label: "新设弃渣场", type: "special" },
  "弃渣(2)": { label: "弃渣场等级提高", type: "special" },
  "延期": { label: "方案满3年", type: "special" },
};

const rules14: Record<string, { label: string; threshold?: number; type: "increase" | "decrease" | "special" }> = {
  "(1)": { label: "立项审批", type: "special" },
  "(2)": { label: "涉及重点治理区", type: "special" },
  "(3)": { label: "防治责任范围", threshold: 30, type: "increase" },
  "(4)": { label: "土石方总量", threshold: 30, type: "increase" },
  "(5)": { label: "横向位移超300米", threshold: 20, type: "special" },
  "(6)": { label: "施工道路长度", threshold: 20, type: "increase" },
  "(7)": { label: "桥梁改路堤/隧道改路堑", threshold: 10, type: "special" },
  "(8)": { label: "风机点位变化", threshold: 30, type: "special" },
  "(9)": { label: "新增取土场", type: "special" },
  "措施(1)": { label: "表土剥离量", threshold: 30, type: "decrease" },
  "措施(2)": { label: "植物措施总面积", threshold: 30, type: "decrease" },
  "措施(3)": { label: "工程措施", threshold: 30, type: "decrease" },
  "弃渣(1)": { label: "新设弃渣场(堆渣量≥5万m³或堆高≥5m)", type: "special" },
  "弃渣(2)": { label: "提高弃渣量20%以上", type: "special" },
};

/**
 * 从变化情况文本中提取百分比数字
 */
function extractPercent(text: string): number | null {
  const match = text.match(/[-+]?\d+(?:\.\d+)?%/);
  if (!match) return null;
  return parseFloat(match[0]);
}

/**
 * 自动判断是否涉及一般变更和重大变更
 * - 一般变更: 百分比变化超过阈值但未达到更高标准
 * - 重大变更: 涉及特殊条款（如新设弃渣场、涉及重点治理区等）或百分比变化极大
 */
function judgeChange(
  row: IndicatorRow,
  section: string,
  ruleKey: string,
  rules: Record<string, { label: string; threshold?: number; type: "increase" | "decrease" | "special" }>
): { general: boolean; major: boolean; reason: string } {
  const rule = rules[ruleKey];
  if (!rule) return { general: false, major: false, reason: "" };

  const changeText = row.change || "";
  const percent = extractPercent(changeText);

  // 特殊条款：根据关键词判断
  if (rule.type === "special") {
    // 涉及重点治理区 → 如果原方案和变更方案相同则不涉及
    if (rule.label.includes("重点治理区")) {
      if (row.original === row.modified) return { general: false, major: false, reason: "无变化" };
      return { general: true, major: true, reason: "涉及区域变化" };
    }
    // 新设弃渣场
    if (rule.label.includes("新设弃渣场")) {
      if (changeText.includes("新增") || changeText.includes("新设")) {
        return { general: false, major: true, reason: "新设弃渣场" };
      }
      return { general: false, major: false, reason: "" };
    }
    // 弃渣场等级提高
    if (rule.label.includes("等级提高")) {
      if (changeText.includes("等级提高")) {
        return { general: true, major: false, reason: "弃渣场等级提高" };
      }
      return { general: false, major: false, reason: "" };
    }
    // 横向位移
    if (rule.label.includes("横向位移")) {
      if (percent !== null && percent >= (rule.threshold || 30)) {
        return { general: true, major: false, reason: `横向位移${percent}%` };
      }
      return { general: false, major: false, reason: "" };
    }
    // 桥梁改路堤/隧道改路堑
    if (rule.label.includes("桥梁")) {
      if (percent !== null && percent >= (rule.threshold || 10)) {
        return { general: true, major: false, reason: `${percent}%` };
      }
      return { general: false, major: false, reason: "" };
    }
    // 风机点位变化
    if (rule.label.includes("风机")) {
      if (percent !== null && percent >= (rule.threshold || 30)) {
        return { general: true, major: false, reason: `变化${percent}%` };
      }
      return { general: false, major: false, reason: "" };
    }
    // 方案满3年
    if (rule.label.includes("满3年")) {
      if (changeText.includes("延期")) {
        return { general: true, major: false, reason: "方案延期" };
      }
      return { general: false, major: false, reason: "" };
    }
    // 立项审批
    if (rule.label.includes("立项审批")) {
      if (row.original !== row.modified) {
        return { general: true, major: false, reason: "立项审批变化" };
      }
      return { general: false, major: false, reason: "无变化" };
    }
    // 重要单位工程措施
    if (rule.label.includes("重要单位")) {
      if (changeText.includes("变化") || changeText.includes("降低") || changeText.includes("丧失")) {
        return { general: true, major: true, reason: "功能显著降低" };
      }
      return { general: false, major: false, reason: "" };
    }
    // 新增取土场
    if (rule.label.includes("取土场")) {
      if (changeText.includes("新增") && !changeText.includes("/")) {
        return { general: true, major: false, reason: "新增取土场" };
      }
      return { general: false, major: false, reason: "" };
    }
  }

  // 数值型条款：根据百分比判断
  if (percent !== null && rule.threshold) {
    if (rule.type === "decrease") {
      // 减少类：提取减幅
      const decreaseMatch = changeText.match(/减幅\s*(\d+(?:\.\d+)?)%/);
      if (decreaseMatch) {
        const decreasePercent = parseFloat(decreaseMatch[1]);
        if (decreasePercent >= rule.threshold) {
          return { general: true, major: false, reason: `减幅${decreasePercent}%` };
        }
      }
    } else if (rule.type === "increase") {
      // 增加类
      const increaseMatch = changeText.match(/增幅\s*(\d+(?:\.\d+)?)%/);
      if (increaseMatch) {
        const increasePercent = parseFloat(increaseMatch[1]);
        if (increasePercent >= rule.threshold) {
          return { general: true, major: false, reason: `增幅${increasePercent}%` };
        }
      }
    }
  }

  // 如果原方案和变更方案相同，通常不涉及变更
  if (row.original && row.modified && row.original === row.modified) {
    return { general: false, major: false, reason: "无变化" };
  }

  return { general: false, major: false, reason: "" };
}

const defaultTable53: IndicatorRow[] = [
  { id: "1", section: "第十六条", requirement: "(1) 工程扰动新涉及国家级和省级水土流失重点预防区或者重点治理区", original: "", modified: "", change: "" },
  { id: "2", section: "第十六条", requirement: "(2) 水土流失防治责任范围增加30%以上的", original: "", modified: "", change: "" },
  { id: "3", section: "第十六条", requirement: "(3) 开挖填筑土石方总量增加30%以上的", original: "", modified: "", change: "" },
  { id: "4", section: "第十六条", requirement: "(4) 线型工程山区、丘陵区部分线路横向位移超过300米的长度累计达到该部分线路长度30%以上的", original: "", modified: "", change: "" },
  { id: "5", section: "第十六条", requirement: "(5) 表土剥离量减少30.0%以上的", original: "", modified: "", change: "" },
  { id: "6", section: "第十六条", requirement: "(6) 植物措施总面积减少30%以上的", original: "", modified: "", change: "" },
  { id: "7", section: "第十六条", requirement: "(7) 水土保持重要单位工程措施发生变化，可能导致水土保持功能显著降低或者丧失的", original: "", modified: "", change: "" },
  { id: "8", section: "第十七条", requirement: "新设弃渣场", original: "", modified: "", change: "" },
  { id: "9", section: "第十七条", requirement: "因弃渣量增加导致弃渣场等级提高的", original: "", modified: "", change: "" },
  { id: "10", section: "第十八条", requirement: "水土保持方案自批准之日起满3年，生产建设项目方开工建设的", original: "", modified: "", change: "" },
];

const defaultTable14: IndicatorRow[] = [
  { id: "1", section: "第十七条", requirement: "(1) 需要重新办理立项审批（核准、备案）手续的", original: "", modified: "", change: "" },
  { id: "2", section: "第十七条", requirement: "(2) 涉及国家级和省级水土流失重点预防区或者重点治理区的", original: "", modified: "", change: "" },
  { id: "3", section: "第十七条", requirement: "(3) 水土流失防治责任范围增加30%及以上的", original: "", modified: "", change: "" },
  { id: "4", section: "第十七条", requirement: "(4) 开挖填筑土石方总量增加30%及以上的", original: "", modified: "", change: "" },
  { id: "5", section: "第十七条", requirement: "(5) 线型工程山区、丘陵区部分横向位移超过300米的长度累计达到该工程线路长度20%及以上的", original: "", modified: "", change: "" },
  { id: "6", section: "第十七条", requirement: "(6) 施工道路或伴行道路等长度增加20%及以上的", original: "", modified: "", change: "" },
  { id: "7", section: "第十七条", requirement: "(7) 桥梁改路堤或者隧道改路堑累计长度达到该工程线路总长度10%及以上", original: "", modified: "", change: "" },
  { id: "8", section: "第十七条", requirement: "(8) 风电工程风机点位变化数量超出原设计风机数量30%及以上的", original: "", modified: "", change: "" },
  { id: "9", section: "第十七条", requirement: "(9) 在批准的取土(包括砂、石等)场外新增取土场，且单个在5万立方米及以上的", original: "", modified: "", change: "" },
  { id: "10", section: "第十八条", requirement: "(1) 表土剥离量减少30%及以上的", original: "", modified: "", change: "" },
  { id: "11", section: "第十八条", requirement: "(2) 植物措施总面积减少30%及以上的", original: "", modified: "", change: "" },
  { id: "12", section: "第十八条", requirement: "(3) 水土保持工程措施减少30%及以上的", original: "", modified: "", change: "" },
  { id: "13", section: "第十九条", requirement: "新设弃渣场，单个弃渣场堆渣量在5万立方米及以上或者堆高在5米及以上", original: "", modified: "", change: "" },
  { id: "14", section: "第十九条", requirement: "提高单个弃渣场堆渣量20%及以上", original: "", modified: "", change: "" },
];

export default function IndicatorComparePage() {
  const [activeTab, setActiveTab] = useState<"53" | "14">("53");
  const [table53, setTable53] = useState<IndicatorRow[]>(defaultTable53);
  const [table14, setTable14] = useState<IndicatorRow[]>(defaultTable14);

  const currentTable = activeTab === "53" ? table53 : table14;
  const setCurrentTable = activeTab === "53" ? setTable53 : setTable14;
  const currentRules = activeTab === "53" ? rules53 : rules14;

  // 按条款分组
  const groupedRows = useMemo(() => {
    const groups: { section: string; rows: IndicatorRow[] }[] = [];
    let currentSection = "";
    let currentGroup: IndicatorRow[] = [];

    for (const row of currentTable) {
      if (row.section !== currentSection) {
        if (currentGroup.length > 0) {
          groups.push({ section: currentSection, rows: currentGroup });
        }
        currentSection = row.section;
        currentGroup = [row];
      } else {
        currentGroup.push(row);
      }
    }
    if (currentGroup.length > 0) {
      groups.push({ section: currentSection, rows: currentGroup });
    }
    return groups;
  }, [currentTable]);

  // 提取条款说明中的序号作为规则key
  function getRuleKey(requirement: string): string {
    const match = requirement.match(/^(\(\d+\))/);
    if (match) return match[1];
    if (requirement.includes("弃渣场") && requirement.includes("新设")) return "弃渣(1)";
    if (requirement.includes("弃渣") && requirement.includes("等级")) return "弃渣(2)";
    if (requirement.includes("满3年") || requirement.includes("延期")) return "延期";
    if (requirement.includes("表土剥离")) return "措施(1)";
    if (requirement.includes("植物措施")) return "措施(2)";
    if (requirement.includes("工程措施")) return "措施(3)";
    return requirement.substring(0, 4);
  }

  // 计算每行的变更判断结果
  function getJudgment(row: IndicatorRow) {
    const ruleKey = getRuleKey(row.requirement);
    return judgeChange(row, row.section, ruleKey, currentRules);
  }

  const handleCellChange = (
    id: string,
    field: keyof IndicatorRow,
    value: string
  ) => {
    setCurrentTable((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addRow = (section: string) => {
    const newRow: IndicatorRow = {
      id: Date.now().toString(),
      section,
      requirement: "",
      original: "",
      modified: "",
      change: "",
    };
    setCurrentTable((prev) => [...prev, newRow]);
  };

  const deleteRow = (id: string) => {
    setCurrentTable((prev) => prev.filter((row) => row.id !== id));
  };

  // 统计涉及变更数量
  const stats = useMemo(() => {
    let general = 0;
    let major = 0;
    for (const row of currentTable) {
      const j = getJudgment(row);
      if (j.major) major++;
      else if (j.general) general++;
    }
    return { general, major, total: currentTable.length };
  }, [currentTable, currentRules]);

  const handleExportExcel = () => {
    alert("导出功能开发中");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            指标对比分析
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            水土保持指标对比分析表，自动判断是否涉及一般变更和重大变更
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card-bg px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent-light"
          >
            <Download size={15} />
            导出
          </button>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-card-border bg-card-bg p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
            <GitDiff size={18} weight="duotone" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">指标对比分析表</h2>
            <p className="text-xs text-muted">
              {activeTab === "53" ? "与53号令指标对比" : "与14号文指标对比"}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-lg border border-card-border bg-card-bg p-1">
          <button
            onClick={() => setActiveTab("53")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "53"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            53号令
          </button>
          <button
            onClick={() => setActiveTab("14")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "14"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            14号文
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-card-border bg-card-bg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted w-24">
                条款
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted min-w-[220px]">
                条款说明
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted min-w-[160px]">
                原水土保持方案
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted min-w-[160px]">
                变更方案
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted min-w-[140px]">
                变化情况
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted w-28">
                是否涉及
                <br />
                一般变更
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted w-28">
                是否涉及
                <br />
                重大变更
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted w-16">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {groupedRows.map((group) =>
              group.rows.map((row, rowIndex) => {
                const judgment = getJudgment(row);
                const isFirstRow = rowIndex === 0;
                const rowSpan = group.rows.length;

                return (
                  <tr
                    key={row.id}
                    className={`border-b border-border transition-colors ${
                      judgment.major
                        ? "bg-red-50/70 dark:bg-red-950/30"
                        : judgment.general
                        ? "bg-amber-50/50 dark:bg-amber-950/20"
                        : ""
                    }`}
                  >
                    {/* 条款 - 合并单元格 */}
                    {isFirstRow && (
                      <td
                        rowSpan={rowSpan}
                        className="px-4 py-3 font-medium text-foreground border-r border-border align-top bg-muted/30"
                      >
                        {group.section}
                      </td>
                    )}

                    {/* 条款说明 */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.requirement}
                        onChange={(e) =>
                          handleCellChange(row.id, "requirement", e.target.value)
                        }
                        className="w-full bg-transparent outline-none text-sm"
                        placeholder="条款说明"
                      />
                    </td>

                    {/* 原水土保持方案 */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.original}
                        onChange={(e) =>
                          handleCellChange(row.id, "original", e.target.value)
                        }
                        className="w-full bg-transparent outline-none text-sm placeholder:text-muted/40"
                        placeholder="手动填入"
                      />
                    </td>

                    {/* 变更方案 */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.modified}
                        onChange={(e) =>
                          handleCellChange(row.id, "modified", e.target.value)
                        }
                        className="w-full bg-transparent outline-none text-sm placeholder:text-muted/40"
                        placeholder="手动填入"
                      />
                    </td>

                    {/* 变化情况 */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.change}
                        onChange={(e) =>
                          handleCellChange(row.id, "change", e.target.value)
                        }
                        className="w-full bg-transparent outline-none text-sm"
                        placeholder="变化情况"
                      />
                    </td>

                    {/* 是否涉及一般变更 - 自动判断 */}
                    <td className="px-4 py-3 text-center">
                      {judgment.general ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <CheckCircle size={16} weight="fill" />
                          是
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted">
                          <XCircle size={16} />
                          否
                        </span>
                      )}
                    </td>

                    {/* 是否涉及重大变更 - 自动判断 */}
                    <td className="px-4 py-3 text-center">
                      {judgment.major ? (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                          <CheckCircle size={16} weight="fill" />
                          是
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted">
                          <XCircle size={16} />
                          否
                        </span>
                      )}
                    </td>

                    {/* 操作 */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="text-muted hover:text-red-500 transition-colors"
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add row buttons */}
      <div className="flex flex-wrap gap-2">
        {groupedRows.map((group) => (
          <button
            key={group.section}
            onClick={() => addRow(group.section)}
            className="flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <Plus size={12} />
            {group.section} 添加行
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-6 rounded-xl border border-card-border bg-card-bg p-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500"></div>
          <span className="text-sm text-muted">一般变更</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500"></div>
          <span className="text-sm text-muted">重大变更</span>
        </div>
        <div className="ml-auto text-sm text-muted">
          共 <span className="font-medium text-foreground">{stats.total}</span> 项指标，
          其中涉及一般变更 <span className="font-medium text-amber-600">{stats.general}</span> 项，
          涉及重大变更 <span className="font-medium text-red-600">{stats.major}</span> 项
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-xl border border-card-border bg-card-bg p-4 text-xs text-muted space-y-2">
        <p className="font-medium text-sm text-foreground mb-2">判断规则说明</p>
        <p>• <strong>一般变更</strong>：数值变化超过阈值（如增减30%）、横向位移超标、弃渣场等级提高等</p>
        <p>• <strong>重大变更</strong>：新设弃渣场、涉及重点治理区变化、水土保持功能显著降低等</p>
        <p>• <strong>原水土保持方案</strong>和<strong>变更方案</strong>列需手动填入，系统根据变化情况自动判断变更类型</p>
      </div>
    </div>
  );
}
