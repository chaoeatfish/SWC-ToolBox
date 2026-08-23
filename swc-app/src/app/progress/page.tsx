"use client";

import { useState } from "react";
import {
  ChartLineUp,
  Download,
  Image,
  FileXls,
} from "@phosphor-icons/react";
import { GanttChart } from "@/components/gantt/GanttChart";
import { GanttControl } from "@/components/gantt/GanttControl";
import { GanttTemplatePanel } from "@/components/gantt/GanttTemplatePanel";
import { exportPng, exportExcel } from "@/components/gantt/export";
import { type GanttItem, DEFAULT_ITEMS } from "@/components/gantt/types";

export default function ProgressPage() {
  const [items, setItems] = useState<GanttItem[]>(DEFAULT_ITEMS);
  const [scale, setScale] = useState<"month" | "quarter">("month");
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExportPng() {
    setExporting(true);
    setShowExport(false);
    try {
      await exportPng(items, scale, "施工进度甘特图.png");
    } catch (e) {
      console.error("PNG export failed:", e);
    }
    setExporting(false);
  }

  async function handleExportExcel() {
    setExporting(true);
    setShowExport(false);
    try {
      await exportExcel(items, "施工进度数据.xlsx");
    } catch (e) {
      console.error("Excel export failed:", e);
    }
    setExporting(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">进度图</h1>
          <p className="mt-1.5 text-sm text-muted">
            水土保持措施施工进度甘特图
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowExport(!showExport)}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card-bg px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent-light disabled:opacity-50"
          >
            <Download size={15} />
            {exporting ? "导出中..." : "导出"}
          </button>

          {/* Export dropdown */}
          {showExport && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowExport(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-card-bg shadow-lg">
                <button
                  onClick={handleExportPng}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent-light"
                >
                  <Image size={15} className="text-muted" />
                  导出为 PNG 图片
                </button>
                <button
                  onClick={handleExportExcel}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent-light"
                >
                  <FileXls size={15} className="text-muted" />
                  导出为 Excel 表格
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scale toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-card-border bg-card-bg p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
            <ChartLineUp size={18} weight="duotone" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">施工进度甘特图</h2>
            <p className="text-xs text-muted">
              {items.length} 项措施 · {scale === "month" ? "按月" : "按季度"}展示
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-lg border border-card-border bg-card-bg p-1">
          <button
            onClick={() => setScale("month")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              scale === "month"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            月
          </button>
          <button
            onClick={() => setScale("quarter")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              scale === "quarter"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            季度
          </button>
        </div>
      </div>

      {/* Gantt chart */}
      <GanttChart items={items} scale={scale} />

      {/* Control panel */}
      <GanttControl items={items} onChange={setItems} />

      {/* Template panel */}
      <GanttTemplatePanel currentItems={items} onLoad={setItems} />
    </div>
  );
}
