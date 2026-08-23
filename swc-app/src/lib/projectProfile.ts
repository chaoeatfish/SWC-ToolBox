/**
 * 项目建设特性表 - 数据模型
 *
 * 设计原则：
 * 1. 列定义与数据分离，新增字段只需在 COLUMN_DEFS 中添加
 * 2. 每个特性表有唯一 ID 和名称，供其他功能模块引用
 * 3. 支持公式列（自动计算）和手动输入列
 * 4. 支持数据校验规则
 */

// ── 列定义 ────────────────────────────────────────────────────
export interface ColumnDef {
  key: string;
  label: string;
  unit?: string;
  type: "text" | "number";
  /** 是否为公式自动计算列 */
  computed?: boolean;
  /** 公式：返回计算值，参数为当前行数据 */
  formula?: (row: Record<string, number>) => number;
  /** 校验：返回 null 表示通过，否则返回错误信息 */
  validate?: (row: Record<string, number>) => string | null;
  /** 列分组标签 */
  group?: string;
  /** 是否默认隐藏（可由用户开启） */
  hidden?: boolean;
}

/**
 * 内置列定义
 * 新增字段只需在此数组末尾追加即可，不影响已有数据
 */
export const COLUMN_DEFS: ColumnDef[] = [
  {
    key: "zone",
    label: "防治分区",
    type: "text",
    group: "基本信息",
  },
  {
    key: "area",
    label: "占地面积",
    unit: "hm²",
    type: "number",
    group: "占地",
  },
  {
    key: "excavation",
    label: "土石方开挖",
    unit: "万m³",
    type: "number",
    group: "土石方",
  },
  {
    key: "backfill",
    label: "土石方回填",
    unit: "万m³",
    type: "number",
    group: "土石方",
  },
  {
    key: "selfUse",
    label: "项目自身利用方",
    unit: "万m³",
    type: "number",
    group: "利用方",
  },
  {
    key: "comprehensiveUse",
    label: "综合利用方",
    unit: "万m³",
    type: "number",
    group: "利用方",
  },
  {
    key: "waste",
    label: "弃方",
    unit: "万m³",
    type: "number",
    group: "弃方",
  },
];

// ── 校验公式 ──────────────────────────────────────────────────
// 土石方开挖 - 土石方回填 = 项目自身利用方 + 综合利用方 + 弃方
// 即：excavation - backfill - selfUse - comprehensiveUse - waste ≈ 0
const BALANCE_TOLERANCE = 0.001; // 允许误差

export function validateBalance(
  row: Record<string, number>
): { valid: boolean; diff: number; message: string } {
  const excavation = row.excavation ?? 0;
  const backfill = row.backfill ?? 0;
  const selfUse = row.selfUse ?? 0;
  const comprehensiveUse = row.comprehensiveUse ?? 0;
  const waste = row.waste ?? 0;

  const diff =
    Math.round((excavation - backfill - selfUse - comprehensiveUse - waste) * 10000) / 10000;

  if (Math.abs(diff) <= BALANCE_TOLERANCE) {
    return { valid: true, diff: 0, message: "平衡" };
  }
  return {
    valid: false,
    diff,
    message: diff > 0 ? `少计 ${diff} 万m³` : `多计 ${Math.abs(diff)} 万m³`,
  };
}

// ── 行数据 ────────────────────────────────────────────────────
export interface ProfileRow {
  id: string;
  values: Record<string, string>; // 所有列的值，数字列存为字符串
}

// ── 特性表实例 ────────────────────────────────────────────────
export interface ProjectProfile {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  rows: ProfileRow[];
  /** 用户新增的自定义列（预留） */
  customColumns?: ColumnDef[];
}

// ── 工具函数 ──────────────────────────────────────────────────
export function createEmptyRow(): ProfileRow {
  const values: Record<string, string> = {};
  for (const col of COLUMN_DEFS) {
    values[col.key] = "";
  }
  return { id: crypto.randomUUID(), values };
}

export function createEmptyProfile(name: string): ProjectProfile {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rows: [],
  };
}

export function getAllColumns(profile: ProjectProfile): ColumnDef[] {
  return [...COLUMN_DEFS, ...(profile.customColumns ?? [])];
}

// ── 汇总计算 ──────────────────────────────────────────────────
export function getColumnTotal(
  rows: ProfileRow[],
  key: string
): number {
  return rows.reduce((sum, row) => {
    const v = parseFloat(row.values[key]);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
}
