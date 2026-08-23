/**
 * 水力计算 - 排水沟数据模型
 * 支持一个项目内多条排水沟的管理
 */

// ── 单条排水沟 ────────────────────────────────────────────────
export interface DitchRecord {
  id: string;
  name: string;

  // 暴雨强度参数
  q5_10: string;
  Cp: string;
  Ct: string;

  // 汇水区域
  catchArea: string;
  areaUnit: "km2" | "hm2";
  phi: string;

  // 排水沟参数
  ditchSlope: string;

  // 断面
  sectionType: "rectangular" | "trapezoidal" | "parabolic";
  bottomWidth: string;
  designDepth: string;
  slopeRatio: string;
  freeboard: string;

  // 砌体
  masonryType: "brick" | "masonry_stone" | "concrete" | "soil" | "grass";
  wallThickness: string;
  baseThickness: string;
  roughness: string;
  backfillCoeff: string;
}

export function createDitch(name: string): DitchRecord {
  return {
    id: crypto.randomUUID(),
    name,
    q5_10: "2.2", Cp: "1.0", Ct: "1.0",
    catchArea: "", areaUnit: "km2", phi: "0.50",
    ditchSlope: "0.003",
    sectionType: "trapezoidal",
    bottomWidth: "0.40", designDepth: "0.40", slopeRatio: "0.5",
    freeboard: "0.20",
    masonryType: "masonry_stone",
    wallThickness: "0.30", baseThickness: "0.15",
    roughness: "0.025", backfillCoeff: "1.10",
  };
}

// ── 计算结果（不含输入参数，纯输出） ──────────────────────────
export interface DitchResult {
  q: number;           // 暴雨强度 mm/min
  Qm: number;          // 设计洪峰流量 m³/s

  A: number;           // 过水面积 m²
  X: number;           // 湿周 m
  R: number;           // 水力半径 m
  C: number;           // 谢才系数
  v: number;           // 流速 m/s
  Q: number;           // 排水流量 m³/s
  pass: boolean;       // Q >= Qm

  H: number;           // 沟深（含加高）m
  topWidth: number;    // 口宽 m

  masonryVol: number;  // 砌体 m³/m
  plasterArea: number; // 抹面 m²/m
  excavVol: number;    // 开挖 m³/m
  backfillVol: number; // 回填 m³/m
  outerW: number;      // 外口宽 m
  outerD: number;      // 外深度 m
}

// ── 存储 ──────────────────────────────────────────────────────
const STORAGE_KEY = "swc-hydraulic-ditches";

export function loadDitches(): DitchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

export function saveDitches(ditches: DitchRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ditches));
}
