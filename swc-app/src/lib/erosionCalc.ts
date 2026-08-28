import * as XLSX from "xlsx";

// ── 领域枚举（为后续公式匹配 / UI 下拉预留）──────────────────────
export const DISTURB_LEVEL2 = ["一般扰动地表", "工程开挖面", "工程堆积体"] as const;
export type DisturbLevel2 = (typeof DISTURB_LEVEL2)[number];

export const DISTURB_LEVEL3: Record<DisturbLevel2, readonly string[]> = {
  "一般扰动地表": ["植被破坏型", "地表翻扰型"],
  "工程开挖面": ["上方无来水", "上方有来水"],
  "工程堆积体": ["上方无来水", "上方有来水"],
};

export const LAND_TYPES = [
  "耕地",
  "园地",
  "林地",
  "草地",
  "交通运输用地",
  "水域及水利设施用地",
  "其他土地",
] as const;
export type LandType = (typeof LAND_TYPES)[number];

// ── 三级预测单元 ───────────────────────────────────────────────
export interface ErosionUnit {
  id: string;
  level1: string; // 一级分区（防治分区）
  level2: string; // 扰动二级分类
  level3: string; // 扰动三级分类
  landType: string; // 占地类型
  area: number; // 面积(hm²)
  constructionArea: number; // 施工期面积(hm²)
  recoveryArea: number; // 自然恢复期面积(hm²)
  slope: number; // 坡度θ(°)
  slopeLength: number; // 投影坡长λ(m)
  cover: number; // 植被覆盖度(%)
  R: number; // 降雨侵蚀力因子
  K: number; // 土壤可蚀性因子
}

// ── 模板列（下载与导入共用）────────────────────────────────────
export const TEMPLATE_HEADERS = [
  "一级分区",
  "二级扰动分类",
  "三级扰动分类",
  "占地类型",
  "面积(hm²)",
  "施工期面积(hm²)",
  "自然恢复期面积(hm²)",
  "坡度θ(°)",
  "投影坡长λ(m)",
  "植被覆盖度(%)",
  "R",
  "K",
] as const;

const EXAMPLE_ROW = [
  "防治分区1",
  "一般扰动地表",
  "植被破坏型",
  "林地",
  2.5,
  1.5,
  1.0,
  15,
  50,
  60,
  3500,
  0.007,
];

// ── 模板下载 ───────────────────────────────────────────────────
export async function downloadErosionTemplate(filename = "流失量预测单元模板.xlsx") {
  const ws = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS], EXAMPLE_ROW]);
  ws["!cols"] = [
    { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
    { wch: 10 }, { wch: 14 }, { wch: 16 },
    { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 8 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "预测单元");
  const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const filePath = await save({
      defaultPath: filename,
      filters: [{ name: "Excel 文件", extensions: ["xlsx"] }],
    });
    if (filePath) {
      const { writeFile } = await import("@tauri-apps/plugin-fs");
      const buffer = await blob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(buffer));
    }
  } catch {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ── 导入解析 ───────────────────────────────────────────────────
type FieldKey =
  | "level1" | "level2" | "level3" | "landType"
  | "area" | "constructionArea" | "recoveryArea"
  | "slope" | "slopeLength" | "cover" | "R" | "K";

// 去掉表头里括号内单位后再匹配
const norm = (h: string) => String(h).replace(/[（(].*?[）)]/g, "").trim();

// 顺序即优先级：命中首个匹配字段后 break
const FIELD_MATCHERS: { key: FieldKey; match: (h: string) => boolean }[] = [
  { key: "level1", match: (h) => h.includes("一级") || h.includes("防治分区") },
  { key: "level2", match: (h) => h.includes("二级") },
  { key: "level3", match: (h) => h.includes("三级") },
  { key: "landType", match: (h) => h.includes("占地") || h.includes("用地") || h.includes("土地利用") },
  { key: "constructionArea", match: (h) => h.includes("施工") && h.includes("面积") },
  { key: "recoveryArea", match: (h) => h.includes("恢复") && h.includes("面积") },
  { key: "area", match: (h) => h.includes("面积") && !h.includes("施工") && !h.includes("恢复") },
  { key: "slope", match: (h) => h.includes("坡度") || h.includes("θ") },
  { key: "slopeLength", match: (h) => h.includes("坡长") || h.includes("λ") },
  { key: "cover", match: (h) => h.includes("覆盖") },
  { key: "R", match: (h) => h === "R" || h.includes("降雨侵蚀力") },
  { key: "K", match: (h) => h === "K" || h.includes("可蚀性") },
];

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/[,，\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function normalizeLevel2(v: string): string {
  if (!v) return "";
  return DISTURB_LEVEL2.find((d) => v.includes(d)) ?? v;
}

export function parseErosionExcel(file: File): Promise<ErosionUnit[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const merges = sheet["!merges"] || [];
        const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
        const startRow = range.s.r;

        const headers: string[] = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = sheet[XLSX.utils.encode_cell({ r: startRow, c })];
          headers.push(norm(cell ? String(cell.v ?? "") : ""));
        }

        // 列定位
        const colMap: Partial<Record<FieldKey, number>> = {};
        for (let i = 0; i < headers.length; i++) {
          if (!headers[i]) continue;
          for (const f of FIELD_MATCHERS) {
            if (colMap[f.key] === undefined && f.match(headers[i])) {
              colMap[f.key] = i;
              break;
            }
          }
        }

        // 合并单元格值向下/向右填充
        const merged = new Map<string, string>();
        for (const m of merges) {
          const v = String(sheet[XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c })]?.v ?? "").trim();
          for (let r = m.s.r; r <= m.e.r; r++) {
            for (let c = m.s.c; c <= m.e.c; c++) {
              merged.set(`${r}:${c}`, v);
            }
          }
        }

        const units: ErosionUnit[] = [];
        for (let r = startRow + 1; r <= range.e.r; r++) {
          const text = (key: FieldKey) => {
            const c = colMap[key];
            if (c === undefined) return "";
            const m = merged.get(`${r}:${c}`);
            if (m !== undefined) return m;
            return String(sheet[XLSX.utils.encode_cell({ r, c })]?.v ?? "").trim();
          };

          const level1 = text("level1");
          const level2 = normalizeLevel2(text("level2"));
          const level3 = text("level3");
          const landType = text("landType");

          if (!level1 && !level2 && !level3 && !landType && !text("area")) continue;

          units.push({
            id: crypto.randomUUID(),
            level1,
            level2,
            level3,
            landType,
            area: num(text("area")),
            constructionArea: num(text("constructionArea")),
            recoveryArea: num(text("recoveryArea")),
            slope: num(text("slope")),
            slopeLength: num(text("slopeLength")),
            cover: num(text("cover")),
            R: num(text("R")),
            K: num(text("K")),
          });
        }
        resolve(units);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── 导入校验（供后续"问题行高亮"复用）──────────────────────────
export interface ErosionIssue {
  row: number; // 1-based 行号
  message: string;
}

export function validateUnits(units: ErosionUnit[]): ErosionIssue[] {
  const issues: ErosionIssue[] = [];
  units.forEach((u, i) => {
    if (u.area <= 0) issues.push({ row: i + 1, message: "面积缺失" });
    if (u.cover > 100) issues.push({ row: i + 1, message: "覆盖度超过 100%" });
    if (u.slopeLength > 100) issues.push({ row: i + 1, message: "坡长超过 100m" });
  });
  return issues;
}
