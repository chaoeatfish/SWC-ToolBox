import type { GanttItem, MeasureType } from "@/components/gantt/types";
import { DEFAULT_COLORS, generateId, daysInMonth } from "@/components/gantt/types";

// ── 导入配置 ──────────────────────────────────────────────────
export interface ImportConfig {
  durations: Record<MeasureType, number>; // 各类型默认工期（月）
  order: MeasureType[];                   // 施工顺序
  startYear: number;                      // 排期起始年
  startMonth: number;                     // 排期起始月
}

export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
  durations: { "工程措施": 6, "临时措施": 3, "植物措施": 4 },
  order: ["工程措施", "临时措施", "植物措施"],
  startYear: new Date().getFullYear(),
  startMonth: 1,
};

// ── 措施体系图数据结构（与 parseMeasureExcel 的 MeasureRow 对应）──
interface MeasureRowData {
  level1: string;
  level2: string;
  level3: string;
  engineering: string;
  plant: string;
  temporary: string;
}

// ── 从 localStorage 读取措施体系图数据 ─────────────────────────
const MEASURE_ROWS_KEY = "swc-measure-rows";

export function loadMeasureRows(): MeasureRowData[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(MEASURE_ROWS_KEY) || "[]");
  } catch {
    return [];
  }
}

// ── 导入 + 智能合并 ───────────────────────────────────────────
export function importFromMeasureSystem(
  existingItems: GanttItem[],
  config: ImportConfig = DEFAULT_IMPORT_CONFIG,
): { items: GanttItem[]; newCount: number } {
  const rows = loadMeasureRows();
  if (rows.length === 0) return { items: existingItems, newCount: 0 };

  // 展开所有措施项为扁平列表
  type FlatItem = { zone: string; measure: string; type: MeasureType };
  const flatItems: FlatItem[] = [];

  for (const row of rows) {
    const zone = [row.level1, row.level2, row.level3].filter(Boolean).join("-") || "未分类";
    const addItems = (text: string, type: MeasureType) => {
      if (!text) return;
      for (const name of text.split("、").map(s => s.trim()).filter(Boolean)) {
        flatItems.push({ zone, measure: name, type });
      }
    };
    addItems(row.engineering, "工程措施");
    addItems(row.plant, "植物措施");
    addItems(row.temporary, "临时措施");
  }

  // 按施工顺序排序：类型顺序 → 同类型内保持原始顺序
  const typeOrder = new Map(config.order.map((t, i) => [t, i]));
  flatItems.sort((a, b) => (typeOrder.get(a.type) ?? 99) - (typeOrder.get(b.type) ?? 99));

  // 智能合并：已有同名+同分区的保留时序，新增的自动排期
  const existingMap = new Map<string, GanttItem>();
  for (const item of existingItems) {
    existingMap.set(`${item.zone}|${item.measure}`, item);
  }

  const result: GanttItem[] = [];
  let newCount = 0;

  // 按措施类型计算基准起始月（工程→临时→植物，各类型同期开始）
  const typeBaseMap = new Map<MeasureType, { y: number; m: number }>();
  let baseY = config.startYear;
  let baseM = config.startMonth;
  for (const mt of config.order) {
    typeBaseMap.set(mt, { y: baseY, m: baseM });
    const dur = config.durations[mt] || 4;
    let nm = baseM + dur;
    let ny = baseY;
    while (nm > 12) { nm -= 12; ny++; }
    baseY = ny;
    baseM = nm;
  }

  for (const fi of flatItems) {
    const key = `${fi.zone}|${fi.measure}`;
    const existing = existingMap.get(key);

    if (existing) {
      result.push({ ...existing, measureType: fi.type });
    } else {
      const base = typeBaseMap.get(fi.type) ?? { y: config.startYear, m: config.startMonth };
      const duration = config.durations[fi.type] || 4;
      let endMonth = base.m + duration - 1;
      let endYear = base.y;
      while (endMonth > 12) { endMonth -= 12; endYear++; }

      result.push({
        id: generateId(),
        zone: fi.zone,
        measure: fi.measure,
        measureType: fi.type,
        startYear: base.y,
        startMonth: base.m,
        startDay: 1,
        endYear,
        endMonth,
        endDay: daysInMonth(endYear, endMonth),
        color: DEFAULT_COLORS[newCount % DEFAULT_COLORS.length],
      });
      newCount++;
    }
  }

  return { items: result, newCount };
}

// ── localStorage 持久化 ───────────────────────────────────────
const ITEMS_KEY = "swc-gantt-items";

export function loadGanttItems(): GanttItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveGanttItems(items: GanttItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

// ── 导入配置持久化 ────────────────────────────────────────────
const CONFIG_KEY = "swc-gantt-import-config";

export function loadImportConfig(): ImportConfig {
  if (typeof window === "undefined") return DEFAULT_IMPORT_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_IMPORT_CONFIG;
    return { ...DEFAULT_IMPORT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_IMPORT_CONFIG;
  }
}

export function saveImportConfig(config: ImportConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// ── 总工期控制 ────────────────────────────────────────────────
export interface ProjectDuration {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

const DURATION_KEY = "swc-gantt-duration";

export function loadProjectDuration(): ProjectDuration {
  if (typeof window === "undefined") {
    const y = new Date().getFullYear();
    return { startYear: y, startMonth: 1, endYear: y + 2, endMonth: 12 };
  }
  try {
    const raw = localStorage.getItem(DURATION_KEY);
    if (!raw) {
      const y = new Date().getFullYear();
      return { startYear: y, startMonth: 1, endYear: y + 2, endMonth: 12 };
    }
    return JSON.parse(raw);
  } catch {
    const y = new Date().getFullYear();
    return { startYear: y, startMonth: 1, endYear: y + 2, endMonth: 12 };
  }
}

export function saveProjectDuration(d: ProjectDuration) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DURATION_KEY, JSON.stringify(d));
}

// ── 配色方案 ──────────────────────────────────────────────────
export interface ColorScheme {
  mainProject: string;
  engineering: string;
  plant: string;
  temporary: string;
}

const COLOR_KEY = "swc-gantt-colors";

export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  mainProject: "#7c3aed",
  engineering: "#1e40af",
  plant: "#15803d",
  temporary: "#b45309",
};

export function loadColorScheme(): ColorScheme {
  if (typeof window === "undefined") return DEFAULT_COLOR_SCHEME;
  try {
    const raw = localStorage.getItem(COLOR_KEY);
    if (!raw) return DEFAULT_COLOR_SCHEME;
    return { ...DEFAULT_COLOR_SCHEME, ...JSON.parse(raw) };
  } catch { return DEFAULT_COLOR_SCHEME; }
}

export function saveColorScheme(c: ColorScheme) {
  if (typeof window === "undefined") return;
  localStorage.setItem(COLOR_KEY, JSON.stringify(c));
}

// 根据总工期裁剪条目，确保不超出工期范围
export function clipItemsToDuration(items: GanttItem[], dur: ProjectDuration): GanttItem[] {
  const startOff = dur.startYear * 12 + dur.startMonth;
  const endOff = dur.endYear * 12 + dur.endMonth;
  return items.map(it => {
    const itemStart = it.startYear * 12 + it.startMonth;
    const itemEnd = it.endYear * 12 + it.endMonth;
    if (itemEnd < startOff || itemStart > endOff) return it; // 完全在范围外，保留（不显示）
    let { startYear: sy, startMonth: sm, startDay: sd } = it;
    let { endYear: ey, endMonth: em, endDay: ed } = it;
    if (itemStart < startOff) { sy = dur.startYear; sm = dur.startMonth; sd = 1; }
    if (itemEnd > endOff) { ey = dur.endYear; em = dur.endMonth; ed = daysInMonth(ey, em); }
    return { ...it, startYear: sy, startMonth: sm, startDay: sd, endYear: ey, endMonth: em, endDay: ed };
  });
}
