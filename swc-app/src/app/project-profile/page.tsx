"use client";

import { useState, useCallback } from "react";
import {
  Table,
  Plus,
  Trash,
  PencilSimple,
  CheckCircle,
  XCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  COLUMN_DEFS,
  createEmptyRow,
  createEmptyProfile,
  validateBalance,
  getColumnTotal,
  type ProfileRow,
  type ProjectProfile,
} from "@/lib/projectProfile";

const STORAGE_KEY = "swc-project-profiles";

function loadProfiles(): ProjectProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProfiles(profiles: ProjectProfile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export default function ProjectProfilePage() {
  const [profiles, setProfiles] = useState<ProjectProfile[]>(loadProfiles);
  const [activeId, setActiveId] = useState<string | null>(
    profiles.length > 0 ? profiles[0].id : null
  );
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");

  const activeProfile = profiles.find((p) => p.id === activeId) ?? null;

  const updateProfile = useCallback(
    (updater: (p: ProjectProfile) => ProjectProfile) => {
      setProfiles((prev) => {
        const next = prev.map((p) =>
          p.id === activeId ? updater({ ...p, updatedAt: new Date().toISOString() }) : p
        );
        saveProfiles(next);
        return next;
      });
    },
    [activeId]
  );

  const handleCreate = () => {
    if (!newName.trim()) return;
    const profile = createEmptyProfile(newName.trim());
    profile.rows.push(createEmptyRow()); // 默认一行
    const next = [...profiles, profile];
    setProfiles(next);
    saveProfiles(next);
    setActiveId(profile.id);
    setNewName("");
    setShowNewDialog(false);
  };

  const handleDelete = (id: string) => {
    const next = profiles.filter((p) => p.id !== id);
    setProfiles(next);
    saveProfiles(next);
    if (activeId === id) {
      setActiveId(next.length > 0 ? next[0].id : null);
    }
  };

  const handleCellChange = (rowId: string, key: string, value: string) => {
    if (!activeProfile) return;
    updateProfile((p) => ({
      ...p,
      rows: p.rows.map((r) =>
        r.id === rowId ? { ...r, values: { ...r.values, [key]: value } } : r
      ),
    }));
  };

  const handleAddRow = () => {
    if (!activeProfile) return;
    updateProfile((p) => ({
      ...p,
      rows: [...p.rows, createEmptyRow()],
    }));
  };

  const handleDeleteRow = (rowId: string) => {
    if (!activeProfile) return;
    updateProfile((p) => ({
      ...p,
      rows: p.rows.filter((r) => r.id !== rowId),
    }));
  };

  const handleNameChange = (name: string) => {
    if (!activeProfile) return;
    updateProfile((p) => ({ ...p, name }));
  };

  // 按 group 分组列
  const groups = COLUMN_DEFS.reduce(
    (acc, col) => {
      const g = col.group ?? "其他";
      if (!acc[g]) acc[g] = [];
      acc[g].push(col);
      return acc;
    },
    {} as Record<string, typeof COLUMN_DEFS>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            项目建设特性表
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            管理项目建设特性数据，为各功能模块提供基础数据支撑
          </p>
        </div>
        <button
          onClick={() => setShowNewDialog(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80"
        >
          <Plus size={15} />
          新建特性表
        </button>
      </div>

      {/* New profile dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-96 rounded-xl border border-card-border bg-card-bg p-6 shadow-xl">
            <h3 className="text-base font-semibold">新建项目建设特性表</h3>
            <p className="mt-1 text-xs text-muted">
              输入特性表名称，后续功能模块将通过此名称引用数据
            </p>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="例：XX高速公路项目特性表"
              className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewDialog(false);
                  setNewName("");
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-foreground"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile tabs */}
      {profiles.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setActiveId(p.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeId === p.id
                    ? "bg-accent text-white"
                    : "border border-border bg-card-bg text-muted hover:text-foreground"
                }`}
              >
                {p.name}
              </button>
              {activeId === p.id && (
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-muted hover:text-red-500 transition-colors p-1"
                  title="删除此特性表"
                >
                  <Trash size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No profiles */}
      {profiles.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card-bg p-12 text-center">
          <Table size={48} className="mx-auto text-muted/40" />
          <h3 className="mt-4 text-sm font-semibold">暂无特性表</h3>
          <p className="mt-2 text-xs text-muted max-w-md mx-auto">
            项目建设特性表是各功能模块的基础数据来源。创建后可在此管理防治分区、土石方等核心数据。
          </p>
          <button
            onClick={() => setShowNewDialog(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80"
          >
            <Plus size={15} />
            新建特性表
          </button>
        </div>
      )}

      {/* Active profile editor */}
      {activeProfile && (
        <div className="space-y-4">
          {/* Name editor */}
          <div className="flex items-center gap-3 rounded-xl border border-card-border bg-card-bg p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <Table size={18} weight="duotone" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted">特性表名称</label>
              <div className="mt-0.5 flex items-center gap-2">
                <input
                  type="text"
                  value={activeProfile.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm font-semibold outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
                <PencilSimple size={14} className="text-muted/40" />
              </div>
            </div>
            <div className="text-xs text-muted text-right shrink-0">
              {activeProfile.rows.length} 行
              <br />
              {new Date(activeProfile.updatedAt).toLocaleString("zh-CN")}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-card-border bg-card-bg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border bg-muted/50">
                  <th className="px-2 py-2.5 text-center font-medium text-muted text-xs w-8">
                    #
                  </th>
                  {Object.entries(groups).map(([group, cols]) => (
                    <th
                      key={group}
                      colSpan={cols.length}
                      className="px-2 py-2.5 text-center font-medium text-muted text-xs border-l border-border"
                    >
                      {group}
                    </th>
                  ))}
                  <th className="px-2 py-2.5 text-center font-medium text-muted text-xs border-l border-border w-12">
                    平衡
                  </th>
                  <th className="px-2 py-2.5 text-center font-medium text-muted text-xs w-10">
                    操作
                  </th>
                </tr>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-2 py-2" />
                  {Object.entries(groups).map(([group, cols]) =>
                    cols.map((col, ci) => (
                      <th
                        key={col.key}
                        className={`px-2 py-2 text-left font-medium text-muted text-xs ${
                          ci === 0 ? "border-l border-border" : ""
                        }`}
                      >
                        {col.label}
                        {col.unit && (
                          <span className="ml-0.5 text-muted/60">
                            ({col.unit})
                          </span>
                        )}
                      </th>
                    ))
                  )}
                  <th className="px-2 py-2 border-l border-border" />
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {activeProfile.rows.map((row, ri) => {
                  const balance = validateBalance(
                    Object.fromEntries(
                      COLUMN_DEFS.filter((c) => c.type === "number").map((c) => [
                        c.key,
                        parseFloat(row.values[c.key]) || 0,
                      ])
                    )
                  );

                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-border transition-colors ${
                        !balance.valid
                          ? "bg-red-50/50 dark:bg-red-950/20"
                          : ""
                      }`}
                    >
                      <td className="px-2 py-1.5 text-center text-xs text-muted">
                        {ri + 1}
                      </td>
                      {Object.entries(groups).map(([group, cols]) =>
                        cols.map((col, ci) => (
                          <td
                            key={col.key}
                            className={`px-2 py-1.5 ${
                              ci === 0 ? "border-l border-border" : ""
                            }`}
                          >
                            <input
                              type={col.type === "number" ? "number" : "text"}
                              step={col.type === "number" ? "any" : undefined}
                              value={row.values[col.key] ?? ""}
                              onChange={(e) =>
                                handleCellChange(row.id, col.key, e.target.value)
                              }
                              className="w-full bg-transparent outline-none text-sm tabular-nums placeholder:text-muted/30"
                              placeholder={col.type === "number" ? "0" : ""}
                            />
                          </td>
                        ))
                      )}
                      {/* 平衡校验 */}
                      <td className="px-2 py-1.5 text-center border-l border-border">
                        {balance.valid ? (
                          <CheckCircle
                            size={16}
                            className="inline text-green-500"
                            weight="fill"
                          />
                        ) : (
                          <span
                            className="inline-flex items-center gap-0.5 text-xs text-red-500"
                            title={balance.message}
                          >
                            <WarningCircle size={14} />
                            {balance.diff > 0 ? "+" : ""}
                            {balance.diff}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="text-muted hover:text-red-500 transition-colors"
                        >
                          <Trash size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {/* 合计行 */}
                {activeProfile.rows.length > 1 && (
                  <tr className="border-t-2 border-border bg-muted/30 font-medium">
                    <td className="px-2 py-2 text-center text-xs text-muted">
                      合计
                    </td>
                    {Object.entries(groups).map(([group, cols]) =>
                      cols.map((col, ci) => (
                        <td
                          key={col.key}
                          className={`px-2 py-2 tabular-nums ${
                            ci === 0 ? "border-l border-border" : ""
                          }`}
                        >
                          {col.type === "number"
                            ? getColumnTotal(activeProfile.rows, col.key)
                                .toFixed(4)
                                .replace(/\.?0+$/, "")
                            : ""}
                        </td>
                      ))
                    )}
                    {/* 合计行平衡校验 */}
                    <td className="px-2 py-2 text-center border-l border-border">
                      {(() => {
                        const totals: Record<string, number> = {};
                        for (const col of COLUMN_DEFS) {
                          if (col.type === "number") {
                            totals[col.key] = getColumnTotal(
                              activeProfile.rows,
                              col.key
                            );
                          }
                        }
                        const b = validateBalance(totals);
                        return b.valid ? (
                          <CheckCircle
                            size={16}
                            className="inline text-green-500"
                            weight="fill"
                          />
                        ) : (
                          <span className="text-xs text-red-500">
                            {b.message}
                          </span>
                        );
                      })()}
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add row */}
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <Plus size={12} />
            添加行
          </button>

          {/* Formula hint */}
          <div className="rounded-xl border border-card-border bg-card-bg p-4 text-xs text-muted space-y-1.5">
            <p className="font-medium text-sm text-foreground">
              平衡校验公式
            </p>
            <p className="font-mono">
              土石方开挖 - 土石方回填 = 项目自身利用方 + 综合利用方 + 弃方
            </p>
            <p>
              每行数据自动校验，不平衡时显示红色高亮及差值。合计行同样校验。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
