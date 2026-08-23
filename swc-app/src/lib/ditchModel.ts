/**
 * 水力计算 - 排水沟数据模型
 * 支持一个项目内多条排水沟的管理
 */

// ── 单条排水沟 ────────────────────────────────────────────────
export interface DitchRecord {
  id: string;
  name: string;

  // Cp 计算参数
  cpRegion: string;        // 气候区 key
  cpReturnPeriod: string;  // 重现期（年）

  // Ct 计算参数 — 坡面汇流
  m1SurfaceType: string;   // 地表类型 index（对应 M1_ROUGHNESS_TABLE）
  m1: string;              // 地面粗度系数（自动填入，可覆盖）
  slopeFlowLength: string; // Ls 坡面流长度 (m)
  slopeFlowGradient: string; // is 坡面流坡降（小数）

  // Ct 计算参数 — 沟道汇流
  conduitLength: string;   // L 沟（管）段长度 (m)
  conduitSlope: string;    // ig 沟（管）段平均坡度

  // Ct 计算参数 — C60
  C60: string;             // 60min雨力参数

  // 暴雨强度参数
  q5_10: string;
  Cp: string;
  Ct: string;

  // 手动覆盖标记（true = 用户手动编辑过，不再自动覆盖）
  cpManualOverride: boolean;
  ctManualOverride: boolean;

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
  roughnessCategory: string; // index into ROUGHNESS_CATEGORY_OPTIONS
  backfillCoeff: string;
}

export function createDitch(name: string): DitchRecord {
  return {
    id: crypto.randomUUID(),
    name,
    cpRegion: "south", cpReturnPeriod: "5",
    m1SurfaceType: "2", m1: "0.20", slopeFlowLength: "", slopeFlowGradient: "",
    conduitLength: "", conduitSlope: "", C60: "",
    q5_10: "2.2", Cp: "1.0", Ct: "1.0",
    cpManualOverride: false, ctManualOverride: false,
    catchArea: "", areaUnit: "km2", phi: "0.50",
    ditchSlope: "0.003",
    sectionType: "trapezoidal",
    bottomWidth: "0.40", designDepth: "0.40", slopeRatio: "0.5",
    freeboard: "0.20",
    masonryType: "masonry_stone",
    wallThickness: "0.30", baseThickness: "0.15",
    roughness: "0.025", roughnessCategory: "5", backfillCoeff: "1.10",
  };
}

// ── 计算结果（不含输入参数，纯输出） ──────────────────────────
export interface DitchResult {
  // Cp / Ct 推荐值
  cpRecommended: number;
  ctRecommended: number;

  // 汇流历时
  t1: number;          // 坡面汇流历时 (min)
  t2: number;          // 沟道汇流历时 (min)
  t: number;           // 总汇流历时 (min)
  conduitV: number;    // 沟道平均流速估算 (m/s)

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

function migrateDitch(raw: Record<string, unknown>): DitchRecord {
  const defaults = createDitch("");
  return { ...defaults, ...raw } as DitchRecord;
}

export function loadDitches(): DitchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Record<string, unknown>[];
    return arr.map(migrateDitch);
  } catch { return []; }
}

export function saveDitches(ditches: DitchRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ditches));
}
