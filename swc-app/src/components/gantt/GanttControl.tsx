"use client";

import { useState, useMemo } from "react";
import { Plus, PencilSimple, Trash, Check, X, CaretUp, CaretDown } from "@phosphor-icons/react";
import { type GanttItem, DEFAULT_COLORS, generateId, daysInMonth } from "./types";

interface Props {
  items: GanttItem[];
  onChange: (items: GanttItem[]) => void;
}

const YEARS = [2024, 2025, 2026, 2027, 2028];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function EmptyForm(): Omit<GanttItem, "id"> {
  return {
    zone: "",
    measure: "",
    startYear: 2025,
    startMonth: 1,
    startDay: 1,
    endYear: 2025,
    endMonth: 6,
    endDay: 30,
    color: DEFAULT_COLORS[0],
  };
}

function DateSelector({
  label,
  year,
  month,
  day,
  onChange,
}: {
  label: string;
  year: number;
  month: number;
  day: number;
  onChange: (y: number, m: number, d: number) => void;
}) {
  const days = useMemo(() => daysInMonth(year, month), [year, month]);
  const dayOptions = Array.from({ length: days }, (_, i) => i + 1);

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      <div className="flex gap-1">
        <select
          value={year}
          onChange={(e) => onChange(Number(e.target.value), month, day)}
          className="w-[72px] rounded-lg border border-border bg-card-bg px-1.5 py-2 text-sm outline-none focus:border-accent"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => onChange(year, Number(e.target.value), day)}
          className="w-[60px] rounded-lg border border-border bg-card-bg px-1.5 py-2 text-sm outline-none focus:border-accent"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}月
            </option>
          ))}
        </select>
        <select
          value={Math.min(day, days)}
          onChange={(e) => onChange(year, month, Number(e.target.value))}
          className="w-[60px] rounded-lg border border-border bg-card-bg px-1.5 py-2 text-sm outline-none focus:border-accent"
        >
          {dayOptions.map((d) => (
            <option key={d} value={d}>
              {d}日
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function GanttControl({ items, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EmptyForm());
  const [isAdding, setIsAdding] = useState(false);

  function handleAdd() {
    setIsAdding(true);
    setEditingId(null);
    setForm(EmptyForm());
  }

  function handleEdit(item: GanttItem) {
    setEditingId(item.id);
    setIsAdding(false);
    setForm({
      zone: item.zone,
      measure: item.measure,
      startYear: item.startYear,
      startMonth: item.startMonth,
      startDay: item.startDay,
      endYear: item.endYear,
      endMonth: item.endMonth,
      endDay: item.endDay,
      color: item.color,
    });
  }

  function handleSave() {
    if (!form.zone.trim() || !form.measure.trim()) return;

    // Clamp days to valid range
    const safeForm = {
      ...form,
      startDay: Math.min(form.startDay, daysInMonth(form.startYear, form.startMonth)),
      endDay: Math.min(form.endDay, daysInMonth(form.endYear, form.endMonth)),
    };

    if (isAdding) {
      onChange([...items, { ...safeForm, id: generateId() }]);
      setIsAdding(false);
    } else if (editingId) {
      onChange(
        items.map((it) =>
          it.id === editingId ? { ...safeForm, id: editingId } : it
        )
      );
      setEditingId(null);
    }
    setForm(EmptyForm());
  }

  function handleCancel() {
    setIsAdding(false);
    setEditingId(null);
    setForm(EmptyForm());
  }

  function handleDelete(id: string) {
    onChange(items.filter((it) => it.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setForm(EmptyForm());
    }
  }

  function handleMove(id: string, direction: "up" | "down") {
    const idx = items.findIndex((it) => it.id === id);
    if (idx === -1) return;
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  function fmtDate(y: number, m: number, d: number) {
    return `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}`;
  }

  const showForm = isAdding || editingId !== null;

  return (
    <div className="rounded-xl border border-card-border bg-card-bg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h3 className="text-sm font-medium">甘特图内容控制</h3>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={13} />
          新增
        </button>
      </div>

      {/* Edit form */}
      {showForm && (
        <div className="border-b border-border bg-background/50 p-5">
          {/* Row 1: zone + measure */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                防治分区
              </label>
              <input
                value={form.zone}
                onChange={(e) => setForm({ ...form, zone: e.target.value })}
                placeholder="例：主体工程区"
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                措施名称
              </label>
              <input
                value={form.measure}
                onChange={(e) =>
                  setForm({ ...form, measure: e.target.value })
                }
                placeholder="例：表土剥离"
                className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
          </div>

          {/* Row 2: start date + end date */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateSelector
              label="开始日期"
              year={form.startYear}
              month={form.startMonth}
              day={form.startDay}
              onChange={(y, m, d) =>
                setForm({ ...form, startYear: y, startMonth: m, startDay: d })
              }
            />
            <DateSelector
              label="结束日期"
              year={form.endYear}
              month={form.endMonth}
              day={form.endDay}
              onChange={(y, m, d) =>
                setForm({ ...form, endYear: y, endMonth: m, endDay: d })
              }
            />
          </div>

          {/* Row 3: color + actions */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted">
                甘特图颜色
              </span>
              <div className="flex gap-1.5">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${
                      form.color === c
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-accent-light"
              >
                <X size={12} />
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!form.zone.trim() || !form.measure.trim()}
                className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Check size={12} />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item list */}
      <div className="divide-y divide-border">
        {items.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted">
            暂无数据，点击"新增"添加甘特图条目
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between px-5 py-3 transition-colors ${
              editingId === item.id ? "bg-accent-light/50" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-8 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div>
                <span className="text-sm font-medium">{item.measure}</span>
                <span className="ml-2 text-xs text-muted">{item.zone}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="mr-2 font-mono text-xs text-muted">
                {fmtDate(item.startYear, item.startMonth, item.startDay)} -{" "}
                {fmtDate(item.endYear, item.endMonth, item.endDay)}
              </span>
              <button
                onClick={() => handleMove(item.id, "up")}
                disabled={items.indexOf(item) === 0}
                className="rounded p-1 text-muted transition-colors hover:bg-accent-light hover:text-foreground disabled:opacity-25"
              >
                <CaretUp size={14} />
              </button>
              <button
                onClick={() => handleMove(item.id, "down")}
                disabled={items.indexOf(item) === items.length - 1}
                className="rounded p-1 text-muted transition-colors hover:bg-accent-light hover:text-foreground disabled:opacity-25"
              >
                <CaretDown size={14} />
              </button>
              <button
                onClick={() => handleEdit(item)}
                className="rounded p-1 text-muted transition-colors hover:bg-accent-light hover:text-foreground"
              >
                <PencilSimple size={14} />
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="rounded p-1 text-muted transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
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
