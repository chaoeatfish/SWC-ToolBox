"use client";

import { useState, useEffect } from "react";
import {
  BookmarkSimple,
  FloppyDisk,
  Trash,
  UploadSimple,
  X,
  Check,
} from "@phosphor-icons/react";
import { type GanttItem } from "./types";

export interface GanttTemplate {
  id: string;
  name: string;
  industry: string;
  items: GanttItem[];
  savedAt: string;
}

interface Props {
  currentItems: GanttItem[];
  onLoad: (items: GanttItem[]) => void;
}

const INDUSTRIES = [
  "公路工程",
  "铁路工程",
  "水利工程",
  "电力工程",
  "矿山工程",
  "建筑工程",
  "市政工程",
  "管道工程",
  "其他",
];

const STORAGE_KEY = "swc-gantt-templates";

function loadTemplates(): GanttTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: GanttTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function GanttTemplatePanel({ currentItems, onLoad }: Props) {
  const [templates, setTemplates] = useState<GanttTemplate[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveIndustry, setSaveIndustry] = useState(INDUSTRIES[0]);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setTemplates(loadTemplates());
    setLoaded(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (loaded) saveTemplates(templates);
  }, [templates, loaded]);

  function handleSave() {
    if (!saveName.trim()) return;
    const tpl: GanttTemplate = {
      id: genId(),
      name: saveName.trim(),
      industry: saveIndustry,
      items: JSON.parse(JSON.stringify(currentItems)),
      savedAt: new Date().toLocaleDateString("zh-CN"),
    };
    setTemplates((prev) => [tpl, ...prev]);
    setSaveName("");
    setShowSave(false);
  }

  function handleDelete(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  function handleLoad(tpl: GanttTemplate) {
    onLoad(JSON.parse(JSON.stringify(tpl.items)));
  }

  return (
    <div className="rounded-xl border border-card-border bg-card-bg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <BookmarkSimple size={16} className="text-muted" />
          <h3 className="text-sm font-medium">模板管理</h3>
          <span className="ml-1 rounded-full bg-border px-2 py-0.5 text-[10px] font-medium text-muted">
            {templates.length}
          </span>
        </div>
        <button
          onClick={() => setShowSave(!showSave)}
          className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <FloppyDisk size={13} />
          保存为模板
        </button>
      </div>

      {/* Save form */}
      {showSave && (
        <div className="border-b border-border bg-background/50 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                模板名称
              </label>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="例：高速公路水保模板"
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                行业类别
              </label>
              <select
                value={saveIndustry}
                onChange={(e) => setSaveIndustry(e.target.value)}
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => {
                  setShowSave(false);
                  setSaveName("");
                }}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:bg-accent-light"
              >
                <X size={12} />
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Check size={12} />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template list */}
      <div className="divide-y divide-border">
        {templates.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted">
            暂无保存的模板，点击"保存为模板"将当前甘特图保存
          </div>
        )}
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="flex items-center justify-between px-5 py-3"
          >
            <div className="flex items-center gap-3">
              <BookmarkSimple size={16} weight="fill" className="text-accent" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{tpl.name}</span>
                  <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                    {tpl.industry}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {tpl.items.length} 项措施 · 保存于 {tpl.savedAt}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleLoad(tpl)}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-light hover:text-foreground"
              >
                <UploadSimple size={12} />
                载入
              </button>
              <button
                onClick={() => handleDelete(tpl.id)}
                className="rounded p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
              >
                <Trash size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
