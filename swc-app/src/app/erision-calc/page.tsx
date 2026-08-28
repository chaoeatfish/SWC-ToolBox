"use client";

import { useRef, useState } from "react";
import {
  Download,
  Upload,
  FileXls,
  Warning,
  Trash,
} from "@phosphor-icons/react";
import {
  downloadErosionTemplate,
  parseErosionExcel,
  validateUnits,
  type ErosionUnit,
} from "@/lib/erosionCalc";

const COLUMNS: { label: string; key: keyof ErosionUnit }[] = [
  { label: "一级分区", key: "level1" },
  { label: "二级扰动分类", key: "level2" },
  { label: "三级扰动分类", key: "level3" },
  { label: "占地类型", key: "landType" },
  { label: "面积(hm²)", key: "area" },
  { label: "施工期面积(hm²)", key: "constructionArea" },
  { label: "自然恢复期面积(hm²)", key: "recoveryArea" },
  { label: "坡度(°)", key: "slope" },
  { label: "坡长(m)", key: "slopeLength" },
  { label: "覆盖度(%)", key: "cover" },
  { label: "R", key: "R" },
  { label: "K", key: "K" },
];

// R/K 未填写时为 0，预览显示占位符
const cell = (u: ErosionUnit, key: keyof ErosionUnit) => {
  const v = u[key];
  if ((key === "R" || key === "K") && v === 0) return "—";
  return v as string | number;
};

export default function ErisionCalcPage() {
  const [units, setUnits] = useState<ErosionUnit[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setLoading(true);
    try {
      const data = await parseErosionExcel(file);
      if (data.length === 0) {
        setError("未读取到有效数据，请下载模板后按列填写");
      } else {
        setUnits(data);
        setFileName(file.name);
      }
    } catch (err) {
      setError("文件解析失败：" + (err as Error).message);
    }
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDownload = async () => {
    setDownloading(true);
    await downloadErosionTemplate();
    setDownloading(false);
  };

  const handleClear = () => {
    setUnits([]);
    setFileName("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const issues = validateUnits(units);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">流失量计算</h1>
        <p className="mt-1.5 text-sm text-muted">
          依据 SL 773-2018，导入三级预测单元进行坡面水蚀流失量测算
        </p>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-3 rounded-xl border border-card-border bg-card-bg p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
          <FileXls size={18} weight="duotone" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">预测单元导入</h2>
          <p className="text-xs text-muted">
            {units.length > 0
              ? `已加载 ${units.length} 行 · ${fileName}`
              : "下载标准模板，填写后导入"}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card-bg px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent-light disabled:opacity-50"
          >
            <Download size={15} />
            {downloading ? "生成中..." : "下载模板"}
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Upload size={15} />
            {loading ? "解析中..." : "导入 Excel"}
          </button>
          {units.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card-bg px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash size={15} />
              清除
            </button>
          )}
        </div>
      </div>

      {/* 错误 */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 导入校验提示 */}
      {units.length > 0 && issues.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <Warning size={18} className="shrink-0" />
          <div>
            {issues.map((it) => (
              <p key={`${it.row}-${it.message}`}>
                第 {it.row} 行：{it.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {units.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-border bg-card-bg p-8 text-center">
          <FileXls size={48} className="mx-auto text-muted/40" />
          <h3 className="mt-4 text-sm font-semibold">导入预测单元表</h3>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted">
            先下载标准模板，按列填写：<strong>三级预测单元</strong>（一级分区、
            二级扰动分类、三级扰动分类）、<strong>占地类型</strong>、
            <strong>面积</strong>及坡度、坡长、覆盖度、R、K 等参数列。
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

      {/* 预览表 */}
      {units.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-card-border bg-card-bg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted">#</th>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map((u, i) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-xs text-muted">{i + 1}</td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="whitespace-nowrap px-3 py-2">
                      {cell(u, c.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
