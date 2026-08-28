"use client";

import { useState, useEffect, useCallback } from "react";
import { ChartLineUp, Download, Image, FileXls, ArrowDown, Gear, Plus, Trash, FloppyDisk } from "@phosphor-icons/react";
import { GanttChart } from "@/components/gantt/GanttChart";
import { GanttTemplatePanel } from "@/components/gantt/GanttTemplatePanel";
import { exportPng, exportExcel } from "@/components/gantt/export";
import { type GanttItem, DEFAULT_ITEMS, type MeasureType, generateId, daysInMonth, DEFAULT_COLORS } from "@/components/gantt/types";
import {
  importFromMeasureSystem, loadGanttItems, saveGanttItems,
  loadImportConfig, saveImportConfig, loadMeasureRows,
  loadProjectDuration, saveProjectDuration,
  loadColorScheme, saveColorScheme,
  type ImportConfig, type ProjectDuration, type ColorScheme,
  DEFAULT_IMPORT_CONFIG, DEFAULT_COLOR_SCHEME,
} from "@/lib/progressImport";

export default function ProgressPage() {
  const [items, setItems] = useState<GanttItem[]>([]);
  const [scale, setScale] = useState<"month" | "quarter">("month");
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importConfig, setImportConfig] = useState<ImportConfig>(DEFAULT_IMPORT_CONFIG);
  const [duration, setDuration] = useState<ProjectDuration>({ startYear: 2025, startMonth: 1, endYear: 2027, endMonth: 12 });
  const [colorScheme, setColorScheme] = useState<ColorScheme>(DEFAULT_COLOR_SCHEME);
  const [showSettings, setShowSettings] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // 新增条目表单
  const [form, setForm] = useState({ zone: "", measure: "", measureType: "工程措施" as MeasureType, isMainProject: false, startYear: 2025, startMonth: 1, endYear: 2025, endMonth: 6 });

  useEffect(() => {
    const saved = loadGanttItems();
    if (saved) setItems(saved);
    setImportConfig(loadImportConfig());
    setDuration(loadProjectDuration());
    setColorScheme(loadColorScheme());
  }, []);

  useEffect(() => { saveGanttItems(items); }, [items]);
  useEffect(() => { saveImportConfig(importConfig); }, [importConfig]);
  useEffect(() => { saveProjectDuration(duration); }, [duration]);
  useEffect(() => { saveColorScheme(colorScheme); }, [colorScheme]);

  const handleImport = useCallback(() => {
    const rows = loadMeasureRows();
    if (rows.length === 0) { setImportMsg("未检测到措施体系图数据，请先在措施体系图页面导入 Excel"); setTimeout(() => setImportMsg(null), 3000); return; }
    const config = { ...importConfig, startYear: duration.startYear, startMonth: duration.startMonth };
    const { items: merged, newCount } = importFromMeasureSystem(items, config);
    setItems(merged);
    setImportMsg(newCount > 0 ? `导入完成，新增 ${newCount} 项` : "所有措施已存在，无新增");
    setTimeout(() => setImportMsg(null), 3000);
  }, [items, importConfig, duration]);

  const handleAdd = () => {
    if (!form.zone.trim() || !form.measure.trim()) return;
    const colorMap: Record<MeasureType, string> = { "工程措施": "#1e40af", "植物措施": "#15803d", "临时措施": "#b45309" };
    const newItem: GanttItem = {
      id: generateId(), zone: form.zone, measure: form.measure, measureType: form.measureType,
      isMainProject: form.isMainProject || undefined,
      startYear: form.startYear, startMonth: form.startMonth, startDay: 1,
      endYear: form.endYear, endMonth: form.endMonth, endDay: daysInMonth(form.endYear, form.endMonth),
      color: form.isMainProject ? "#6b7280" : colorMap[form.measureType],
    };
    // 主体工程插入到分区最前，其他按类型排序
    let insertIdx = items.length;
    if (form.isMainProject) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].zone === form.zone) { insertIdx = i; break; }
      }
    } else {
      const typeOrder: Record<MeasureType, number> = { "工程措施": 0, "临时措施": 1, "植物措施": 2 };
      const newOrder = typeOrder[form.measureType] ?? 99;
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].zone === form.zone) {
          const itemOrder = items[i].isMainProject ? -1 : (typeOrder[items[i].measureType!] ?? 99);
          if (itemOrder <= newOrder) { insertIdx = i + 1; break; }
          insertIdx = i;
        }
      }
    }
    const next = [...items];
    next.splice(insertIdx, 0, newItem);
    setItems(next);
    setShowAddForm(false);
    setForm({ zone: "", measure: "", measureType: "工程措施", isMainProject: false, startYear: 2025, startMonth: 1, endYear: 2025, endMonth: 6 });
  };

  const handleDelete = (id: string) => setItems(items.filter(it => it.id !== id));

  async function handleExportPng() {
    setExporting(true); setShowExport(false);
    try { await exportPng(items, scale, "施工进度甘特图.png"); } catch (e) { console.error(e); }
    setExporting(false);
  }
  async function handleExportExcel() {
    setExporting(true); setShowExport(false);
    try { await exportExcel(items, "施工进度数据.xlsx"); } catch (e) { console.error(e); }
    setExporting(false);
  }

  const MT_LABELS: Record<MeasureType, string> = { "工程措施": "工程", "临时措施": "临时", "植物措施": "植物" };
  const years = Array.from({ length: 16 }, (_, i) => 2020 + i);

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] -mt-8 -mx-8">
      {/* ── 顶部工具栏（固定） ─────────────────────────────── */}
      <div className="shrink-0 px-6 pt-5 pb-3 space-y-3 border-b border-border bg-background">
        {/* 第一行：标题 + 操作按钮 */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">进度图</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 rounded-lg border border-border bg-card-bg px-3 py-1.5 text-xs font-medium hover:bg-accent-light transition-colors">
              <Plus size={13} /> 添加条目
            </button>
            <button onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1 rounded-lg border border-border bg-card-bg px-3 py-1.5 text-xs font-medium hover:bg-accent-light transition-colors">
              <FloppyDisk size={13} /> 模板
            </button>
            <button onClick={handleImport}
              className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/80 transition-colors">
              <ArrowDown size={13} /> 从措施体系图导入
            </button>
            <button onClick={() => setShowSettings(!showSettings)}
              className="rounded-lg border border-border bg-card-bg p-1.5 hover:bg-accent-light transition-colors">
              <Gear size={13} />
            </button>
            <div className="relative">
              <button onClick={() => setShowExport(!showExport)} disabled={exporting}
                className="flex items-center gap-1 rounded-lg border border-border bg-card-bg px-3 py-1.5 text-xs font-medium hover:bg-accent-light disabled:opacity-50">
                <Download size={13} /> {exporting ? "..." : "导出"}
              </button>
              {showExport && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExport(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-card-bg shadow-lg">
                    <button onClick={handleExportPng} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent-light"><Image size={13} className="text-muted" /> 导出 PNG</button>
                    <button onClick={handleExportExcel} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent-light"><FileXls size={13} className="text-muted" /> 导出 Excel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 第二行：总工期 + 视图切换 */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-[11px] font-semibold text-muted">总工期</span>
          <div className="flex items-center gap-1">
            <select value={duration.startYear} onChange={e => setDuration({ ...duration, startYear: +e.target.value })} className="rounded border border-border bg-background px-1.5 py-0.5 text-xs outline-none focus:border-accent">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={duration.startMonth} onChange={e => setDuration({ ...duration, startMonth: +e.target.value })} className="rounded border border-border bg-background px-1.5 py-0.5 text-xs outline-none focus:border-accent">
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}月</option>)}
            </select>
          </div>
          <span className="text-muted text-[11px]">至</span>
          <div className="flex items-center gap-1">
            <select value={duration.endYear} onChange={e => setDuration({ ...duration, endYear: +e.target.value })} className="rounded border border-border bg-background px-1.5 py-0.5 text-xs outline-none focus:border-accent">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={duration.endMonth} onChange={e => setDuration({ ...duration, endMonth: +e.target.value })} className="rounded border border-border bg-background px-1.5 py-0.5 text-xs outline-none focus:border-accent">
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}月</option>)}
            </select>
          </div>
          <span className="text-[11px] text-muted">
            共 {Math.max(0, (duration.endYear - duration.startYear) * 12 + duration.endMonth - duration.startMonth + 1)} 月
          </span>
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-card-border bg-card-bg p-0.5">
            <button onClick={() => setScale("month")} className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${scale === "month" ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}>月</button>
            <button onClick={() => setScale("quarter")} className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${scale === "quarter" ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}>季度</button>
          </div>
          <span className="text-[11px] text-muted">{items.length} 项</span>
        </div>

        {/* 导入提示 */}
        {importMsg && <div className="rounded border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs text-accent">{importMsg}</div>}

        {/* 导入设置面板 */}
        {showSettings && (
          <div className="rounded-lg border border-card-border bg-card-bg p-4 space-y-3">
            <h3 className="text-xs font-semibold">导入设置</h3>
            <div className="grid grid-cols-3 gap-3">
              {(["工程措施", "临时措施", "植物措施"] as MeasureType[]).map(mt => (
                <div key={mt}>
                  <label className="text-[11px] text-muted">{mt} 工期（月）</label>
                  <input type="number" min={1} max={24} step={1} value={importConfig.durations[mt]}
                    onChange={e => setImportConfig({ ...importConfig, durations: { ...importConfig.durations, [mt]: +e.target.value || 1 } })}
                    className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 配色方案 */}
        {showSettings && (
          <div className="rounded-lg border border-card-border bg-card-bg p-4">
            <h3 className="text-xs font-semibold mb-3">配色方案</h3>
            <div className="flex items-center gap-4 flex-wrap">
              {([
                { key: "mainProject" as const, label: "主体工程" },
                { key: "engineering" as const, label: "工程措施" },
                { key: "plant" as const, label: "植物措施" },
                { key: "temporary" as const, label: "临时措施" },
              ]).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <input type="color" value={colorScheme[key]}
                    onChange={e => setColorScheme({ ...colorScheme, [key]: e.target.value })}
                    className="w-7 h-7 rounded border border-border cursor-pointer" />
                  <span className="text-[11px] text-muted">{label}</span>
                </div>
              ))}
              <button onClick={() => setColorScheme(DEFAULT_COLOR_SCHEME)}
                className="ml-2 text-[11px] text-muted hover:text-foreground underline">重置</button>
            </div>
          </div>
        )}

        {/* 添加条目表单 */}
        {showAddForm && (
          <div className="rounded-lg border border-card-border bg-card-bg p-4">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div><label className="text-[11px] text-muted">分区</label><input value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} placeholder="如：主体工程区" className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent" /></div>
              <div><label className="text-[11px] text-muted">措施</label><input value={form.measure} onChange={e => setForm({ ...form, measure: e.target.value })} placeholder="如：表土剥离" className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent" /></div>
              <div><label className="text-[11px] text-muted">类型</label>
                <select value={form.measureType} onChange={e => setForm({ ...form, measureType: e.target.value as MeasureType })} className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent">
                  <option value="工程措施">工程</option><option value="临时措施">临时</option><option value="植物措施">植物</option>
                </select>
                <label className="flex items-center gap-1 mt-1 cursor-pointer">
                  <input type="checkbox" checked={form.isMainProject} onChange={e => setForm({ ...form, isMainProject: e.target.checked })} className="rounded" />
                  <span className="text-[11px] text-muted">主体工程</span>
                </label>
              </div>
              <div><label className="text-[11px] text-muted">开始</label>
                <div className="flex gap-1 mt-0.5">
                  <select value={form.startYear} onChange={e => setForm({ ...form, startYear: +e.target.value })} className="w-full rounded border border-border bg-background px-1 py-1 text-xs outline-none">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                  <select value={form.startMonth} onChange={e => setForm({ ...form, startMonth: +e.target.value })} className="w-16 rounded border border-border bg-background px-1 py-1 text-xs outline-none">{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select>
                </div>
              </div>
              <div><label className="text-[11px] text-muted">结束</label>
                <div className="flex gap-1 mt-0.5">
                  <select value={form.endYear} onChange={e => setForm({ ...form, endYear: +e.target.value })} className="w-full rounded border border-border bg-background px-1 py-1 text-xs outline-none">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                  <select value={form.endMonth} onChange={e => setForm({ ...form, endMonth: +e.target.value })} className="w-16 rounded border border-border bg-background px-1 py-1 text-xs outline-none">{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select>
                </div>
              </div>
              <div className="flex items-end"><button onClick={handleAdd} className="w-full rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/80">添加</button></div>
            </div>
          </div>
        )}
      </div>

      {/* ── 甘特图主体（图表自管理滚动） ─────────────────── */}
      <div className="flex-1 flex flex-col px-6 py-4 min-h-0">
        <GanttChart items={items} scale={scale} onItemsChange={setItems} projectDuration={duration} onDelete={handleDelete} colorScheme={colorScheme} />
      </div>

      {/* ── 模板面板（条件显示） ──────────────────────────── */}
      {showTemplates && (
        <div className="shrink-0 border-t border-border bg-background px-6 py-4 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">模板管理</h3>
            <button onClick={() => setShowTemplates(false)} className="text-muted hover:text-foreground text-xs">关闭</button>
          </div>
          <GanttTemplatePanel currentItems={items} onLoad={setItems} />
        </div>
      )}
    </div>
  );
}
