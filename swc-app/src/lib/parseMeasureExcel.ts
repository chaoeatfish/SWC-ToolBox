import * as XLSX from "xlsx";

export interface MeasureRow {
  level1: string; // 一级分区
  level2: string; // 二级分区
  level3: string; // 三级分区
  engineering: string; // 工程措施
  plant: string; // 植物措施
  temporary: string; // 临时措施
}

/**
 * 解析 Excel 文件，提取措施体系表数据
 */
export function parseMeasureExcel(file: File): Promise<MeasureRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
          defval: "",
        });

        const rows: MeasureRow[] = json.map((row) => {
          // 尝试匹配列名（支持多种可能的列名）
          const findCol = (keywords: string[]) => {
            for (const key of Object.keys(row)) {
              for (const kw of keywords) {
                if (key.includes(kw)) return String(row[key] || "").trim();
              }
            }
            return "";
          };

          return {
            level1: findCol(["一级分区", "一级", "分区1"]),
            level2: findCol(["二级分区", "二级", "分区2"]),
            level3: findCol(["三级分区", "三级", "分区3"]),
            engineering: findCol(["工程措施", "工程"]),
            plant: findCol(["植物措施", "植物"]),
            temporary: findCol(["临时措施", "临时"]),
          };
        });

        // 过滤掉全空行
        const filtered = rows.filter(
          (r) =>
            r.level1 || r.level2 || r.level3 || r.engineering || r.plant || r.temporary
        );

        resolve(filtered);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
