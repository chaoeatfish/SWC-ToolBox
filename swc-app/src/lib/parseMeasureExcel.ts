import * as XLSX from "xlsx";

export interface MeasureRow {
  level1: string;
  level2: string;
  level3: string;
  engineering: string;
  plant: string;
  temporary: string;
  engineeringExisting: boolean;
  plantExisting: boolean;
  temporaryExisting: boolean;
}

const COL_KEYWORDS: Record<string, string[]> = {
  level1: ["一级分区", "一级", "分区1"],
  level2: ["二级分区", "二级", "分区2"],
  level3: ["三级分区", "三级", "分区3"],
  engineering: ["工程措施", "工程"],
  plant: ["植物措施", "植物"],
  temporary: ["临时措施", "临时"],
};

export function parseMeasureExcel(file: File): Promise<MeasureRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const merges = sheet["!merges"] || [];
        const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
        const startRow = range.s.r;
        const endRow = range.e.r;
        const startCol = range.s.c;

        const headers: string[] = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = sheet[XLSX.utils.encode_cell({ r: startRow, c })];
          headers.push(cell ? String(cell.v || "").trim() : "");
        }

        const colMap: Record<string, number | undefined> = {};
        for (const [field, keywords] of Object.entries(COL_KEYWORDS)) {
          for (let i = 0; i < headers.length; i++) {
            if (keywords.some((kw) => headers[i].includes(kw))) { colMap[field] = i; break; }
          }
        }

        const mergedValues = new Map<string, string>();
        for (const merge of merges) {
          const topLeftCell = sheet[XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c })];
          const value = topLeftCell ? String(topLeftCell.v || "").trim() : "";
          for (let r = merge.s.r; r <= merge.e.r; r++) {
            for (let c = merge.s.c; c <= merge.e.c; c++) {
              mergedValues.set(`${r}:${c}`, value);
            }
          }
        }

        const rows: MeasureRow[] = [];
        for (let r = startRow + 1; r <= endRow; r++) {
          const getCellValue = (colIdx: number | undefined): string => {
            if (colIdx === undefined) return "";
            const merged = mergedValues.get(`${r}:${startCol + colIdx}`);
            if (merged !== undefined) return merged;
            const cell = sheet[XLSX.utils.encode_cell({ r, c: startCol + colIdx })];
            return cell ? String(cell.v || "").trim() : "";
          };

          // 解析措施字段：逐项检测（主体已有）标记
          // 只有带标记的项才标为主体已有，不整列标记
          const parseField = (text: string): { text: string; existing: boolean } => {
            if (!text) return { text: "", existing: false };
            const parts = text.split(/[、,，;；]/).map(s => s.trim()).filter(Boolean);
            const cleanParts: string[] = [];
            let anyExisting = false;
            for (const part of parts) {
              const hasInline = part.includes("（主体已有）") || part.includes("(主体已有)");
              if (hasInline) anyExisting = true;
              cleanParts.push(part.replace(/[（(]主体已有[）)]/g, "").trim());
            }
            return { text: cleanParts.join("、"), existing: anyExisting };
          };

          const engText = getCellValue(colMap.engineering);
          const plantText = getCellValue(colMap.plant);
          const tempText = getCellValue(colMap.temporary);

          // 逐项检测（主体已有）标记，只标记带后缀的项
          const eng = parseField(engText);
          const plant = parseField(plantText);
          const temp = parseField(tempText);

          const row: MeasureRow = {
            level1: getCellValue(colMap.level1),
            level2: getCellValue(colMap.level2),
            level3: getCellValue(colMap.level3),
            engineering: eng.text,
            plant: plant.text,
            temporary: temp.text,
            engineeringExisting: eng.existing,
            plantExisting: plant.existing,
            temporaryExisting: temp.existing,
          };

          if (row.level1 || row.level2 || row.level3 || row.engineering || row.plant || row.temporary) {
            rows.push(row);
          }
        }

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
