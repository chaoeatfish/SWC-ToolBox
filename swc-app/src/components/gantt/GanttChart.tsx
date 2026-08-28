"use client";

import { useState, useCallback, useMemo } from "react";
import { type GanttItem, type MeasureType, daysInMonth } from "./types";

interface ProjectDuration { startYear: number; startMonth: number; endYear: number; endMonth: number; }

interface ColorScheme { mainProject: string; engineering: string; plant: string; temporary: string; }

interface Props {
  items: GanttItem[];
  scale: "month" | "quarter";
  onItemsChange?: (items: GanttItem[]) => void;
  projectDuration?: ProjectDuration;
  onDelete?: (id: string) => void;
  colorScheme?: ColorScheme;
}

const DEFAULT_TYPE_COLORS: Record<MeasureType, string> = {
  "工程措施": "#1e40af",
  "植物措施": "#15803d",
  "临时措施": "#b45309",
};
const DEFAULT_MAIN_COLOR = "#7c3aed";

function getTypeColor(item: GanttItem, scheme?: ColorScheme): string {
  if (item.isMainProject) return scheme?.mainProject ?? DEFAULT_MAIN_COLOR;
  if (item.measureType && scheme) {
    const map: Record<MeasureType, string> = { "工程措施": scheme.engineering, "植物措施": scheme.plant, "临时措施": scheme.temporary };
    return map[item.measureType] ?? "#6b7280";
  }
  return item.measureType && DEFAULT_TYPE_COLORS[item.measureType] ? DEFAULT_TYPE_COLORS[item.measureType] : "#6b7280";
}

function dayOff(sy: number, y: number, m: number, d: number): number {
  let t = 0;
  for (let yy = sy; yy < y; yy++) t += 365 + (yy % 4 === 0 && (yy % 100 !== 0 || yy % 400 === 0) ? 1 : 0);
  for (let mm = 1; mm < m; mm++) t += daysInMonth(y, mm);
  return t + d - 1;
}

function addMonths(y: number, m: number, d: number, delta: number) {
  let nm = m + delta, ny = y;
  while (nm > 12) { nm -= 12; ny++; }
  while (nm < 1) { nm += 12; ny--; }
  return { y: ny, m: nm, d: Math.min(d, daysInMonth(ny, nm)) };
}

// ── 拖拽模式 ──────────────────────────────────────────────────
type DragMode = "move" | "resize-start" | "resize-end";
interface DragState { itemId: string; mode: DragMode; startX: number; origS: { y: number; m: number; d: number }; origE: { y: number; m: number; d: number }; }

export function GanttChart({ items, scale, onItemsChange, projectDuration, onDelete, colorScheme }: Props) {
  const isMonth = scale === "month";
  const cellW = isMonth ? 32 : 64;
  const HANDLE_W = 24;
  const ZONE_W = 100;
  const MEASURE_W = 100;
  const BAR_H = 10;
  const EDGE_W = 6;

  // 行拖拽排序状态
  const [reorderDragId, setReorderDragId] = useState<string | null>(null);
  const [reorderOverId, setReorderOverId] = useState<string | null>(null);

  // 时间列结构：月视图=每月一列，季视图=每季一列
  interface TimeCol { year: number; col: number; label: string; startMonth: number; endMonth: number; }
  const timeCols = useMemo((): TimeCol[] => {
    const dur = projectDuration;
    const sy = dur ? dur.startYear : (items.length > 0 ? Math.min(...items.map(it => it.startYear)) : new Date().getFullYear());
    const sm = dur ? dur.startMonth : 1;
    const ey = dur ? dur.endYear : (items.length > 0 ? Math.max(...items.map(it => it.endYear)) : sy + 1);
    const em = dur ? dur.endMonth : 12;
    const cols: TimeCol[] = [];
    if (isMonth) {
      for (let y = sy; y <= ey; y++) {
        const mStart = y === sy ? sm : 1;
        const mEnd = y === ey ? em : 12;
        for (let m = mStart; m <= mEnd; m++) cols.push({ year: y, col: m, label: String(m), startMonth: m, endMonth: m });
      }
    } else {
      for (let y = sy; y <= ey; y++) {
        for (let q = 1; q <= 4; q++) {
          const qStart = (q - 1) * 3 + 1;
          const qEnd = q * 3;
          if (y === sy && qEnd < sm) continue;
          if (y === ey && qStart > em) continue;
          const clampedStart = y === sy && qStart < sm ? sm : qStart;
          const clampedEnd = y === ey && qEnd > em ? em : qEnd;
          cols.push({ year: y, col: q, label: `Q${q}`, startMonth: clampedStart, endMonth: clampedEnd });
        }
      }
    }
    return cols;
  }, [items, projectDuration, isMonth]);

  const startYear = timeCols.length > 0 ? timeCols[0].year : new Date().getFullYear();
  const totalCols = timeCols.length;

  // 按年分组的列（用于表头）
  const yearGroups = useMemo(() => {
    const map = new Map<number, TimeCol[]>();
    for (const tc of timeCols) {
      const arr = map.get(tc.year) || [];
      arr.push(tc);
      map.set(tc.year, arr);
    }
    return [...map.entries()];
  }, [timeCols]);

  const grouped = useMemo(() => {
    const map = new Map<string, GanttItem[]>();
    for (const it of items) { const arr = map.get(it.zone) || []; arr.push(it); map.set(it.zone, arr); }
    return [...map.entries()];
  }, [items]);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragDx, setDragDx] = useState(0);

  const onDown = useCallback((e: React.MouseEvent, it: GanttItem, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag({ itemId: it.id, mode, startX: e.clientX, origS: { y: it.startYear, m: it.startMonth, d: it.startDay }, origE: { y: it.endYear, m: it.endMonth, d: it.endDay } });
    setDragDx(0);
  }, []);

  const onMove = useCallback((e: React.MouseEvent) => {
    if (drag) setDragDx(e.clientX - drag.startX);
  }, [drag]);

  // 天级精度：每个 cellW 像素 = 平均30.44天
  const avgDaysPerCell = isMonth ? 30.44 : 91.3;

  const onUp = useCallback(() => {
    if (!drag || !onItemsChange) { setDrag(null); return; }
    const dayDelta = Math.round(dragDx / cellW * avgDaysPerCell / 5) * 5; // 5天步距
    if (dayDelta !== 0) {
      const addDays = (y: number, m: number, d: number, delta: number) => {
        const dt = new Date(y, m - 1, d + delta);
        return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
      };
      let newS = drag.origS, newE = drag.origE;
      if (drag.mode === "move") {
        newS = addDays(drag.origS.y, drag.origS.m, drag.origS.d, dayDelta);
        newE = addDays(drag.origE.y, drag.origE.m, drag.origE.d, dayDelta);
      } else if (drag.mode === "resize-start") {
        newS = addDays(drag.origS.y, drag.origS.m, drag.origS.d, dayDelta);
        if (newS.y > newE.y || (newS.y === newE.y && (newS.m > newE.m || (newS.m === newE.m && newS.d > newE.d)))) newS = newE;
      } else {
        newE = addDays(drag.origE.y, drag.origE.m, drag.origE.d, dayDelta);
        if (newE.y < newS.y || (newE.y === newS.y && (newE.m < newS.m || (newE.m === newS.m && newE.d < newS.d)))) newE = newS;
      }
      onItemsChange(items.map(it => it.id === drag.itemId
        ? { ...it, startYear: newS.y, startMonth: newS.m, startDay: newS.d, endYear: newE.y, endMonth: newE.m, endDay: newE.d }
        : it));
    }
    setDrag(null);
    setDragDx(0);
  }, [drag, dragDx, cellW, avgDaysPerCell, items, onItemsChange]);

  // 拖拽中的临时偏移（天）
  const activeDayDelta = drag ? Math.round(dragDx / cellW * avgDaysPerCell / 5) * 5 : 0;

  const stickyTh = (extra?: React.CSSProperties): React.CSSProperties =>
    ({ position: "sticky", top: 0, background: "var(--color-card-bg, #fff)", zIndex: 10, ...extra });

  const thead = useMemo(() => (
    <thead>
      <tr>
        <th rowSpan={3} style={stickyTh({ left: 0, zIndex: 30, width: HANDLE_W, minWidth: HANDLE_W })} />
        <th rowSpan={3} style={stickyTh({ left: HANDLE_W, zIndex: 20, width: ZONE_W, minWidth: ZONE_W })}
          className="border-b border-r border-border px-1.5 py-1 text-center text-[11px] font-medium text-muted">防治分区</th>
        <th rowSpan={3} style={stickyTh({ left: HANDLE_W + ZONE_W, zIndex: 20, width: MEASURE_W, minWidth: MEASURE_W })}
          className="border-b border-r border-border px-1.5 py-1 text-center text-[11px] font-medium text-muted">措施名称</th>
        <th colSpan={totalCols} style={stickyTh()}
          className="border-b border-r border-border bg-accent/10 px-2 py-1 text-center text-[11px] font-semibold text-accent">施工工期</th>
      </tr>
      <tr>
        {yearGroups.map(([y, cols]) => (
          <th key={y} colSpan={cols.length} style={stickyTh()}
            className="border-b border-r border-border bg-accent/5 px-1 py-1 text-center text-[11px] font-semibold text-accent">{y}年</th>
        ))}
      </tr>
      <tr>
        {timeCols.map(tc => (
          <th key={`${tc.year}-${tc.col}`} style={stickyTh({ minWidth: cellW, width: cellW })}
            className="border-b border-r border-border/60 px-0 py-1 text-center text-[10px] text-muted">{tc.label}</th>
        ))}
      </tr>
    </thead>
  ), [yearGroups, timeCols, totalCols, cellW]);

  // 渲染时间列单元格（月视图=1个月，季视图=3个月）
  const renderTimeCell = useCallback((item: GanttItem, tc: { year: number; col: number; startMonth: number; endMonth: number }) => {
    const isD = drag?.itemId === item.id;
    const applyDelta = (oy: number, om: number, od: number) => {
      const dt = new Date(oy, om - 1, od + activeDayDelta);
      return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
    };
    let es = { y: item.startYear, m: item.startMonth, d: item.startDay };
    let ee = { y: item.endYear, m: item.endMonth, d: item.endDay };
    if (isD && drag!.mode === "move") {
      es = applyDelta(drag!.origS.y, drag!.origS.m, drag!.origS.d);
      ee = applyDelta(drag!.origE.y, drag!.origE.m, drag!.origE.d);
    } else if (isD && drag!.mode === "resize-start") {
      es = applyDelta(drag!.origS.y, drag!.origS.m, drag!.origS.d);
    } else if (isD && drag!.mode === "resize-end") {
      ee = applyDelta(drag!.origE.y, drag!.origE.m, drag!.origE.d);
    }

    const so = dayOff(startYear, es.y, es.m, es.d);
    const eo = dayOff(startYear, ee.y, ee.m, ee.d);
    const color = getTypeColor(item, colorScheme);
    const cs = dayOff(startYear, tc.year, tc.startMonth, 1);
    const ce = dayOff(startYear, tc.year, tc.endMonth, 1) + daysInMonth(tc.year, tc.endMonth) - 1;
    const cd = ce - cs + 1;

    if (so > ce || eo < cs) {
      return <td key={`${tc.year}-${tc.col}`} className="border-b border-r border-border/30 px-0 py-1" style={{ minWidth: cellW, width: cellW }} />;
    }

    const bl = so > cs ? ((so - cs) / cd) * 100 : 0;
    const br = eo < ce ? ((ce - eo) / cd) * 100 : 0;
    return (
      <td key={`${tc.year}-${tc.col}`} className="border-b border-r border-border/30 px-0 py-1" style={{ minWidth: cellW, width: cellW }}>
        <div className="relative" style={{ marginLeft: `${bl}%`, marginRight: `${br}%` }}>
          <div onMouseDown={e => onDown(e, item, "resize-start")}
            className="absolute left-0 top-0 bottom-0 cursor-ew-resize z-10"
            style={{ width: EDGE_W }} />
          <div style={{ height: BAR_H, backgroundColor: color, cursor: "grab", opacity: isD && drag!.mode === "move" ? 0.6 : 1, borderRadius: 2 }}
            onMouseDown={e => onDown(e, item, "move")} />
          <div onMouseDown={e => onDown(e, item, "resize-end")}
            className="absolute right-0 top-0 bottom-0 cursor-ew-resize z-10"
            style={{ width: EDGE_W }} />
        </div>
      </td>
    );
  }, [drag, activeDayDelta, startYear, cellW, onDown]);

  return (
    <div className="flex-1 overflow-auto rounded-xl border border-card-border bg-card-bg"
      onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
      <table className="border-collapse" style={{ minWidth: HANDLE_W + ZONE_W + MEASURE_W + totalCols * cellW }}>
        {thead}
        <tbody>
          {grouped.map(([zone, zoneItems]) =>
            zoneItems.map((item, zi) => {
              const isReorderTarget = reorderOverId === item.id && reorderDragId !== item.id;
              return (
                <tr key={item.id} className={`group ${isReorderTarget ? "ring-1 ring-accent ring-inset" : ""}`}
                  draggable
                  onDragStart={() => setReorderDragId(item.id)}
                  onDragOver={e => { e.preventDefault(); setReorderOverId(item.id); }}
                  onDragEnd={() => {
                    if (reorderDragId && reorderOverId && reorderDragId !== reorderOverId && onItemsChange) {
                      const fromIdx = items.findIndex(it => it.id === reorderDragId);
                      const toIdx = items.findIndex(it => it.id === reorderOverId);
                      if (fromIdx >= 0 && toIdx >= 0) {
                        const next = [...items];
                        const [moved] = next.splice(fromIdx, 1);
                        next.splice(toIdx, 0, moved);
                        onItemsChange(next);
                      }
                    }
                    setReorderDragId(null);
                    setReorderOverId(null);
                  }}>
                  {/* 拖拽手柄 */}
                  <td className="sticky left-0 z-30 border-b border-r border-border bg-card-bg px-0.5 py-1 text-center cursor-grab"
                    style={{ width: HANDLE_W, minWidth: HANDLE_W }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-muted/40"><circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/></svg>
                  </td>
                  {/* 防治分区 */}
                  {zi === 0 && (
                    <td rowSpan={zoneItems.length}
                      className="sticky z-20 border-b border-r border-border bg-card-bg px-1.5 py-1 text-[11px] font-medium text-center align-middle"
                      style={{ left: HANDLE_W, width: ZONE_W, minWidth: ZONE_W }}>{zone}</td>
                  )}
                  {/* 措施名称 */}
                  <td className={`sticky z-20 border-b border-r border-border px-1.5 py-1 text-[11px] text-center align-middle group-hover:bg-accent-light/30 ${item.isMainProject ? "bg-accent/5 font-semibold" : "bg-card-bg"}`}
                    style={{ left: HANDLE_W + ZONE_W, width: MEASURE_W, minWidth: MEASURE_W }}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="truncate">{item.measure}</span>
                      {onDelete && (
                        <button onClick={e => { e.stopPropagation(); onDelete(item.id); }}
                          className="opacity-0 group-hover:opacity-100 shrink-0 text-muted hover:text-red-500 transition-opacity"
                          title="删除">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                  {timeCols.map(tc => renderTimeCell(item, tc))}
                </tr>
              );
            })
          )}
          {items.length === 0 && (
            <tr><td colSpan={3 + totalCols} className="px-5 py-12 text-center text-sm text-muted">
              暂无甘特图数据，请从措施体系图导入或手动添加
            </td></tr>
          )}
        </tbody>
      </table>
      <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 rounded-sm" style={{ backgroundColor: colorScheme?.mainProject ?? DEFAULT_MAIN_COLOR }} />
          主体工程
        </div>
        {(["工程措施", "植物措施", "临时措施"] as MeasureType[]).map(type => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 rounded-sm" style={{ backgroundColor: getTypeColor({ measureType: type } as GanttItem, colorScheme) }} />
            {type}
          </div>
        ))}
      </div>
    </div>
  );
}
