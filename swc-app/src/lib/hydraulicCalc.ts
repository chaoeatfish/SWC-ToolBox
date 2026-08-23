/**
 * 水力计算 - GB 51018-2014 附录A.4 截排水设计
 */

// ── 断面类型 ──────────────────────────────────────────────────
export type SectionType = "rectangular" | "trapezoidal" | "parabolic";

export const SECTION_TYPES: { key: SectionType; label: string }[] = [
  { key: "rectangular", label: "矩形" },
  { key: "trapezoidal", label: "梯形" },
  { key: "parabolic", label: "抛物线形" },
];

// ── 砌体类型 ──────────────────────────────────────────────────
export type MasonryType = "brick" | "masonry_stone" | "concrete" | "soil" | "grass";

export const MASONRY_OPTIONS: {
  key: MasonryType;
  label: string;
  roughness: number;
  defaultWallThickness: number;
  defaultBaseThickness: number;
  hasMasonry: boolean;
}[] = [
  { key: "brick", label: "砖砌", roughness: 0.015, defaultWallThickness: 0.24, defaultBaseThickness: 0.12, hasMasonry: true },
  { key: "masonry_stone", label: "浆砌石", roughness: 0.025, defaultWallThickness: 0.30, defaultBaseThickness: 0.15, hasMasonry: true },
  { key: "concrete", label: "混凝土", roughness: 0.014, defaultWallThickness: 0.20, defaultBaseThickness: 0.15, hasMasonry: true },
  { key: "soil", label: "土质排水沟", roughness: 0.0225, defaultWallThickness: 0, defaultBaseThickness: 0, hasMasonry: false },
  { key: "grass", label: "种草排水沟", roughness: 0.030, defaultWallThickness: 0, defaultBaseThickness: 0, hasMasonry: false },
];

// ── 糙率参考值（供用户参考） ──────────────────────────────────
export const ROUGHNESS_REFERENCE: { value: number; note: string }[] = [
  { value: 0.010, note: "光滑混凝土" },
  { value: 0.012, note: "混凝土" },
  { value: 0.015, note: "砖砌 / 水泥砂浆抹面" },
  { value: 0.017, note: "浆砌石（光面）" },
  { value: 0.025, note: "浆砌石（毛石）" },
  { value: 0.027, note: "干砌石" },
  { value: 0.030, note: "种草" },
  { value: 0.032, note: "卵石" },
  { value: 0.035, note: "土质（一般）" },
  { value: 0.050, note: "土质（粗糙）" },
];

// ── 汇流速度参考 ──────────────────────────────────────────────
export const FLOW_VELOCITY_TABLE: { surface: string; vMin: number; vMax: number }[] = [
  { surface: "草地", vMin: 0.15, vMax: 0.30 },
  { surface: "耕地", vMin: 0.20, vMax: 0.40 },
  { surface: "荒坡", vMin: 0.30, vMax: 0.50 },
  { surface: "裸露岩石", vMin: 0.50, vMax: 0.80 },
  { surface: "硬化地面", vMin: 0.80, vMax: 1.20 },
];

// ── 径流系数参考表 ────────────────────────────────────────────
export const RUNOFF_COEFFICIENT_TABLE: { surface: string; psi: string }[] = [
  { surface: "沥青混凝土路面", psi: "0.95" },
  { surface: "水泥混凝土路面", psi: "0.90" },
  { surface: "陡峻的山地", psi: "0.75~0.90" },
  { surface: "硬质岩石坡面", psi: "0.70~0.85" },
  { surface: "水稻田、水塘", psi: "0.70~0.80" },
  { surface: "起伏的山地", psi: "0.60~0.80" },
  { surface: "软质岩石坡面", psi: "0.50~0.75" },
  { surface: "细粒土坡面", psi: "0.40~0.65" },
  { surface: "平原草地", psi: "0.40~0.65" },
  { surface: "一般耕地", psi: "0.40~0.60" },
  { surface: "粒料路面", psi: "0.40~0.60" },
  { surface: "落叶林地", psi: "0.35~0.60" },
  { surface: "针叶林地", psi: "0.25~0.50" },
  { surface: "粗粒土坡面", psi: "0.10~0.30" },
  { surface: "粗砂土坡面", psi: "0.10~0.30" },
  { surface: "卵石、块石坡地", psi: "0.08~0.15" },
];

// ── 安全加高选项 ──────────────────────────────────────────────
export const FREEBOARD_OPTIONS = [
  { grade: "1级", value: 0.3 },
  { grade: "2级", value: 0.2 },
  { grade: "3级", value: 0.2 },
];

// ── 回填经验系数 ──────────────────────────────────────────────
export const BACKFILL_COEFF_OPTIONS = [
  { value: 1.00, label: "1.00（不加）" },
  { value: 1.05, label: "1.05" },
  { value: 1.10, label: "1.10" },
  { value: 1.15, label: "1.15" },
  { value: 1.20, label: "1.20" },
];

// ── 糙率分类推荐值（GB 51018-2014 表 A.4.2-2） ───────────────
export const ROUGHNESS_CATEGORY_OPTIONS: { label: string; n: number; display: string }[] = [
  { label: "塑料管(聚氯乙烯)", n: 0.010, display: "0.010" },
  { label: "石棉水泥管", n: 0.012, display: "0.012" },
  { label: "水泥混凝土明沟(预制)", n: 0.012, display: "0.012" },
  { label: "铸铁管", n: 0.015, display: "0.015" },
  { label: "水泥混凝土明沟(抹面)", n: 0.015, display: "0.015" },
  { label: "浆砌石明沟", n: 0.025, display: "0.025" },
  { label: "波纹管", n: 0.027, display: "0.027" },
  { label: "浆砌片石明沟", n: 0.032, display: "0.032" },
  { label: "岩石质明沟", n: 0.035, display: "0.035" },
  { label: "植草皮明沟(v=0.6m/s)", n: 0.035, display: "0.035~0.050" },
  { label: "植草皮明沟(v=1.8m/s)", n: 0.050, display: "0.050~0.090" },
];

// ── 面积单位 ──────────────────────────────────────────────────
export type AreaUnit = "km2" | "hm2";

// ── 地面粗度系数 m1 参考值（GB 51018-2014 表 A.4.2-1） ────────
export const M1_ROUGHNESS_TABLE: { surface: string; m1: number }[] = [
  { surface: "光滑的不透水地面", m1: 0.02 },
  { surface: "光滑的压实地面", m1: 0.10 },
  { surface: "稀疏草地、耕地", m1: 0.20 },
  { surface: "牧草地、草地", m1: 0.40 },
  { surface: "落叶树林", m1: 0.60 },
  { surface: "针叶树林", m1: 0.80 },
];

// ── Cp 重现期转换系数（GB 51018-2014 表 A.4.1-2） ────────────
export type CpRegion = "south" | "north" | "northwest" | "northwest_arid";
export const CP_REGIONS: { key: CpRegion; label: string }[] = [
  { key: "south", label: "海南、广东、广西、云南、贵州、四川东、湖南、湖北、福建、江西、安徽、江苏、浙江、上海、台湾" },
  { key: "north", label: "黑龙江、吉林、辽宁、北京、天津、河北、山西、河南、山东、四川、重庆、西藏" },
  { key: "northwest", label: "内蒙古、陕西、甘肃、宁夏、青海、新疆（非干旱区）" },
  { key: "northwest_arid", label: "内蒙古、陕西、甘肃、宁夏、青海、新疆（干旱区）" },
];
export const CP_TABLE: Record<CpRegion, Record<number, number>> = {
  south:          { 3: 0.86, 5: 1.00, 10: 1.17, 15: 1.27 },
  north:          { 3: 0.83, 5: 1.00, 10: 1.22, 15: 1.36 },
  northwest:      { 3: 0.76, 5: 1.00, 10: 1.34, 15: 1.54 },
  northwest_arid: { 3: 0.71, 5: 1.00, 10: 1.44, 15: 1.72 },
};
export const CP_RETURN_PERIODS = [3, 5, 10, 15];

/** Cp 查表 */
export function cpLookup(region: CpRegion, returnPeriod: number): number {
  return CP_TABLE[region]?.[returnPeriod] ?? 1.0;
}

// ── Ct 降雨历时转换系数（GB 51018-2014 表 A.4.1-3） ──────────
const CT_T_VALUES = [3, 5, 10, 15, 20, 30, 40, 50, 60, 90, 120];
const CT_C60_VALUES = [0.30, 0.35, 0.40, 0.45, 0.50];
const CT_TABLE: number[][] = [
  [1.40, 1.25, 1.00, 0.77, 0.64, 0.50, 0.40, 0.34, 0.30, 0.22, 0.18],
  [1.40, 1.25, 1.00, 0.80, 0.68, 0.55, 0.45, 0.39, 0.35, 0.26, 0.21],
  [1.40, 1.25, 1.00, 0.82, 0.72, 0.59, 0.50, 0.44, 0.40, 0.30, 0.25],
  [1.40, 1.25, 1.00, 0.84, 0.76, 0.63, 0.55, 0.50, 0.45, 0.34, 0.29],
  [1.40, 1.25, 1.00, 0.87, 0.80, 0.68, 0.60, 0.55, 0.50, 0.39, 0.33],
];

/** Ct 双线性插值（C60 × t） */
export function ctBilinearInterp(C60: number, t: number): number {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const c = clamp(C60, CT_C60_VALUES[0], CT_C60_VALUES[CT_C60_VALUES.length - 1]);
  const tt = clamp(t, CT_T_VALUES[0], CT_T_VALUES[CT_T_VALUES.length - 1]);

  // find C60 bracket
  let c0 = 0;
  for (let i = 0; i < CT_C60_VALUES.length - 1; i++) {
    if (c >= CT_C60_VALUES[i]) c0 = i;
  }
  const c1 = Math.min(c0 + 1, CT_C60_VALUES.length - 1);
  const cFrac = c0 === c1 ? 0 : (c - CT_C60_VALUES[c0]) / (CT_C60_VALUES[c1] - CT_C60_VALUES[c0]);

  // find t bracket
  let t0 = 0;
  for (let i = 0; i < CT_T_VALUES.length - 1; i++) {
    if (tt >= CT_T_VALUES[i]) t0 = i;
  }
  const t1 = Math.min(t0 + 1, CT_T_VALUES.length - 1);
  const tFrac = t0 === t1 ? 0 : (tt - CT_T_VALUES[t0]) / (CT_T_VALUES[t1] - CT_T_VALUES[t0]);

  // bilinear
  const ct00 = CT_TABLE[c0][t0];
  const ct01 = CT_TABLE[c0][t1];
  const ct10 = CT_TABLE[c1][t0];
  const ct11 = CT_TABLE[c1][t1];
  const ct0 = ct00 + (ct01 - ct00) * tFrac;
  const ct1 = ct10 + (ct11 - ct10) * tFrac;
  return ct0 + (ct1 - ct0) * cFrac;
}

/** 坡面汇流历时 t1 (min) = 1.445 × (m1 × Ls / √is)^0.467 */
export function slopeConfluenceTime(m1: number, Ls: number, is: number): number {
  if (m1 <= 0 || Ls <= 0 || is <= 0) return 0;
  return 1.445 * Math.pow(m1 * Ls / Math.sqrt(is), 0.467);
}

/** 沟（管）平均流速估算 v (m/s) = 20 × ig^0.6 */
export function conduitVelocity(ig: number): number {
  if (ig <= 0) return 0;
  return 20 * Math.pow(ig, 0.6);
}

/** 沟（管）内汇流历时 t2 (min) = Σ [ li / (60 × vi) ] */
export function conduitConfluenceTime(segments: { length: number; slope: number }[]): number {
  let total = 0;
  for (const seg of segments) {
    const v = conduitVelocity(seg.slope);
    if (seg.length > 0 && v > 0) total += seg.length / (60 * v);
  }
  return total;
}

// ── 计算函数 ──────────────────────────────────────────────────

/** 设计平均降雨强度 q (mm/min) = Cp × Ct × q5,10 */
export function designRainfallIntensity(q5_10: number, Cp: number, Ct: number): number {
  return Cp * Ct * q5_10;
}

/** 设计洪峰流量 Qm (m³/s) = 16.67 × φ × q × F */
/** F 单位由 areaUnit 决定：km² 直接代入，hm² 需 ×0.01 */
export function designPeakFlow(phi: number, q: number, F: number, areaUnit: AreaUnit): number {
  const F_km2 = areaUnit === "km2" ? F : F * 0.01;
  return 16.67 * phi * q * F_km2;
}

/** 谢才系数 C = (1/n) × R^(1/6) */
export function chezyCoefficient(n: number, R: number): number {
  return (1 / n) * Math.pow(R, 1 / 6);
}

/** 断面几何 */
export interface SectionGeometry {
  flowArea: number;
  wetPerimeter: number;
  hydraulicRadius: number;
  topWidth: number;
}

export function sectionGeometry(
  type: SectionType, B: number, H: number, m: number
): SectionGeometry {
  let flowArea: number, wetPerimeter: number, topWidth: number;

  switch (type) {
    case "rectangular":
      flowArea = B * H;
      wetPerimeter = B + 2 * H;
      topWidth = B;
      break;
    case "trapezoidal":
      topWidth = B + 2 * m * H;
      flowArea = (B + topWidth) * H / 2;
      wetPerimeter = B + 2 * H * Math.sqrt(1 + m * m);
      break;
    case "parabolic":
      topWidth = B;
      flowArea = (2 / 3) * B * H;
      wetPerimeter = B + (8 * H * H) / (3 * B);
      break;
  }

  return { flowArea, wetPerimeter, hydraulicRadius: flowArea / wetPerimeter, topWidth };
}

/** 排水流量 Q = A × C × √(R × i) */
export function drainFlow(A: number, C: number, R: number, i: number): number {
  return A * C * Math.sqrt(R * i);
}

/** 流速 V = C × √(R × i) */
export function flowVelocity(C: number, R: number, i: number): number {
  return C * Math.sqrt(R * i);
}

// ── 工程量 ────────────────────────────────────────────────────

export interface SectionQuantities {
  excavationArea: number;     // 开挖面积 m²
  masonryVolume: number;      // 砌体体积 m³/m
  plasteringArea: number;     // 抹面面积 m²/m
  excavationVolume: number;   // 土方开挖量 m³/m
  backfillVolume: number;     // 土方回填量 m³/m = (开挖 - 砌体) × 回填系数
  outerTopWidth: number;      // 外口宽 m
  outerDepth: number;         // 外深度 m
}

export function sectionQuantities(
  type: SectionType,
  B: number, H: number, m: number,
  wallThickness: number, baseThickness: number,
  backfillCoeff: number
): SectionQuantities {
  const t = wallThickness;
  const tb = baseThickness;
  const outerB = B + 2 * t;
  const outerH = H + t + tb;

  let excavationArea: number;
  let outerTopWidth: number;

  switch (type) {
    case "rectangular":
      excavationArea = outerB * outerH;
      outerTopWidth = outerB;
      break;
    case "trapezoidal":
      outerTopWidth = outerB + 2 * m * outerH;
      excavationArea = (outerB + outerTopWidth) * outerH / 2;
      break;
    case "parabolic":
      outerTopWidth = outerB;
      excavationArea = (2 / 3) * outerB * outerH;
      break;
  }

  const inner = sectionGeometry(type, B, H, m);
  const netExcavation = t > 0 ? excavationArea - inner.flowArea : 0;

  return {
    excavationArea,
    masonryVolume: t > 0 ? netExcavation : 0,
    plasteringArea: inner.wetPerimeter,
    excavationVolume: excavationArea,
    backfillVolume: netExcavation > 0 ? (excavationArea - netExcavation) * backfillCoeff : 0,
    outerTopWidth,
    outerDepth: outerH,
  };
}
