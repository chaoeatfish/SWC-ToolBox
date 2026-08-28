"use client";

import { useState, useRef, useEffect } from "react";
import {
  TreeStructure,
  Upload,
  Download,
  FileXls,
  Eye,
  Trash,
  BookmarkSimple,
  FolderOpen,
} from "@phosphor-icons/react";
import { parseMeasureExcel, type MeasureRow } from "@/lib/parseMeasureExcel";
import { generateDrawioXml, downloadDrawio } from "@/lib/generateDrawio";

interface MeasureTemplate {
  id: string;
  name: string;
  rows: MeasureRow[];
  createdAt: string;
}

const TEMPLATE_KEY = "swc-measure-templates";

function loadTemplates(): MeasureTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(TEMPLATE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveTemplates(templates: MeasureTemplate[]) {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
}

export default function MeasureSystemPage() {
  const [rows, setRows] = useState<MeasureRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // 持久化 rows 到 localStorage（供进度图导入使用）
  useEffect(() => {
    if (rows.length > 0) {
      localStorage.setItem("swc-measure-rows", JSON.stringify(rows));
    }
  }, [rows]);
  const [templates, setTemplates] = useState<MeasureTemplate[]>(loadTemplates);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showTemplateList, setShowTemplateList] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setLoading(true);
    try {
      const data = await parseMeasureExcel(file);
      if (data.length === 0) {
        setError("未从 Excel 中读取到有效数据，请检查列名是否包含：一级分区、二级分区、三级分区、工程措施、植物措施、临时措施");
      } else {
        setRows(data);
        setFileName(file.name);
      }
    } catch (err) {
      setError("文件解析失败：" + (err as Error).message);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (rows.length === 0) return;
    const xml = generateDrawioXml(rows);
    await downloadDrawio(xml);
  };

  const handleClear = () => {
    setRows([]);
    setFileName("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || rows.length === 0) return;
    const tpl: MeasureTemplate = {
      id: crypto.randomUUID(),
      name: templateName.trim(),
      rows,
      createdAt: new Date().toISOString(),
    };
    const next = [...templates, tpl];
    setTemplates(next);
    saveTemplates(next);
    setTemplateName("");
    setShowSaveDialog(false);
  };

  const handleLoadTemplate = (tpl: MeasureTemplate) => {
    setRows(tpl.rows);
    setFileName(`模板: ${tpl.name}`);
    setError("");
    setShowTemplateList(false);
  };

  const handleDeleteTemplate = (id: string) => {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next);
    saveTemplates(next);
  };

  // 统计层级（去空值、去重）
  const uniqueLevel1 = new Set(rows.map((r) => r.level1).filter(Boolean));
  const uniqueLevel2 = new Set(rows.map((r) => r.level2).filter(Boolean));
  const uniqueLevel3 = new Set(rows.map((r) => r.level3).filter(Boolean));
  const stats = {
    level1: uniqueLevel1.size,
    level2: uniqueLevel2.size,
    level3: uniqueLevel3.size,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">措施体系图</h1>
        <p className="mt-1.5 text-sm text-muted">
          导入 Excel 措施体系表，自动生成 Draw.io 措施体系框图
        </p>
      </div>

      {/* Upload area */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-card-border bg-card-bg p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
            <TreeStructure size={18} weight="duotone" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">措施体系图生成</h2>
            <p className="text-xs text-muted">
              {rows.length > 0
                ? `已加载 ${rows.length} 行数据 · ${fileName}`
                : "请导入 Excel 体系表"}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card-bg px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent-light disabled:opacity-50"
          >
            <Upload size={15} />
            {loading ? "解析中..." : "导入 Excel"}
          </button>
          <button
            onClick={() => setShowTemplateList(!showTemplateList)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card-bg px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent-light"
          >
            <FolderOpen size={15} />
            模板
            {templates.length > 0 && (
              <span className="ml-1 rounded-full bg-accent/10 px-1.5 text-xs text-accent">
                {templates.length}
              </span>
            )}
          </button>
          {rows.length > 0 && (
            <>
              <button
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card-bg px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent-light"
              >
                <BookmarkSimple size={15} />
                保存为模板
              </button>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80"
              >
                <Download size={15} />
                生成 .drawio
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card-bg px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash size={15} />
                清除
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Save template dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-96 rounded-xl border border-card-border bg-card-bg p-6 shadow-xl">
            <h3 className="text-base font-semibold">保存为模板</h3>
            <p className="mt-1 text-xs text-muted">
              将当前导入的措施体系表保存为模板，后续可快速加载使用
            </p>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
              placeholder="输入模板名称"
              className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setShowSaveDialog(false); setTemplateName(""); }}
                className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-foreground"
              >
                取消
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
                className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template list dropdown */}
      {showTemplateList && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowTemplateList(false)} />
          <div className="absolute right-8 top-32 z-40 w-80 rounded-xl border border-card-border bg-card-bg shadow-lg">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold">已保存模板</h3>
            </div>
            {templates.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">
                暂无模板，导入数据后可保存为模板
              </div>
            ) : (
              <ul className="max-h-64 overflow-y-auto">
                {templates.map((tpl) => (
                  <li
                    key={tpl.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-accent/5 transition-colors"
                  >
                    <button
                      onClick={() => handleLoadTemplate(tpl)}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-medium">{tpl.name}</p>
                      <p className="text-xs text-muted">
                        {tpl.rows.length} 行 ·{" "}
                        {new Date(tpl.createdAt).toLocaleDateString("zh-CN")}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="p-1 text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Instructions - show when no data */}
      {rows.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-border bg-card-bg p-8 text-center">
          <FileXls size={48} className="mx-auto text-muted/40" />
          <h3 className="mt-4 text-sm font-semibold">导入 Excel 措施体系表</h3>
          <p className="mt-2 text-xs text-muted max-w-md mx-auto">
            Excel 表应包含以下列：<strong>一级分区</strong>、<strong>二级分区</strong>、
            <strong>三级分区</strong>、<strong>工程措施</strong>、<strong>植物措施</strong>、
            <strong>临时措施</strong>。
            系统将自动识别层级关系，生成 Draw.io 格式的措施体系框图。
          </p>
          <button
            onClick={() => inputRef.current?.click()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80"
          >
            <Upload size={15} />
            选择文件
          </button>
        </div>
      )}

      {/* Data preview */}
      {rows.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "一级分区", value: stats.level1, color: "bg-slate-500" },
              { label: "二级分区", value: stats.level2, color: "bg-blue-500" },
              { label: "三级分区", value: stats.level3, color: "bg-sky-400" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-3 rounded-xl border border-card-border bg-card-bg p-3"
              >
                <div className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                <div>
                  <p className="text-xs text-muted">{s.label}</p>
                  <p className="text-lg font-semibold">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto rounded-xl border border-card-border bg-card-bg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted text-xs">
                    #
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted text-xs">
                    一级分区
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted text-xs">
                    二级分区
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted text-xs">
                    三级分区
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted text-xs">
                    工程措施
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted text-xs">
                    植物措施
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted text-xs">
                    临时措施
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-muted text-xs">{i + 1}</td>
                    <td className="px-3 py-2">{row.level1}</td>
                    <td className="px-3 py-2">{row.level2}</td>
                    <td className="px-3 py-2">{row.level3}</td>
                    <td className="px-3 py-2">
                      {row.engineering && (
                        <span className="inline-block rounded bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 dark:bg-amber-900/30 dark:text-amber-400">
                          {row.engineering}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.plant && (
                        <span className="inline-block rounded bg-green-100 text-green-800 text-xs px-1.5 py-0.5 dark:bg-green-900/30 dark:text-green-400">
                          {row.plant}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.temporary && (
                        <span className="inline-block rounded bg-violet-100 text-violet-800 text-xs px-1.5 py-0.5 dark:bg-violet-900/30 dark:text-violet-400">
                          {row.temporary}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Generate hint */}
          <div className="flex items-center gap-3 rounded-xl border border-card-border bg-card-bg p-4">
            <Eye size={18} className="text-muted" />
            <p className="text-sm text-muted">
              预览无误后，点击 <strong>生成 .drawio</strong> 按钮下载文件，用 Draw.io 打开即可查看和编辑体系框图。
            </p>
          </div>
        </>
      )}
    </div>
  );
}
