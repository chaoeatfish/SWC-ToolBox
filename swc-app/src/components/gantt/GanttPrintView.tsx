"use client";

import { type GanttItem, type MeasureType, daysInMonth } from "./types";

const TYPE_COLORS: Record<MeasureType, string> = {
  "工程措施": "#1e40af",
  "植物措施": "#15803d",
  "临时措施": "#b45309",
};
function getTypeColor(item: GanttItem): string {
  return item.measureType && TYPE_COLORS[item.measureType] ? TYPE_COLORS[item.measureType] : "#6b7280";
}

interface Props {
  items: GanttItem[];
  scale: "month" | "quarter";
}

function getYears(items: GanttItem[]): number[] {
  if (items.length === 0) return [2025, 2026];
  const min = Math.min(...items.map((it) => it.startYear));
  const max = Math.max(...items.map((it) => it.endYear));
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function dayOffset(startYear: number, year: number, month: number, day: number): number {
  let total = 0;
  for (let y = startYear; y < year; y++) {
    for (let m = 1; m <= 12; m++) total += daysInMonth(y, m);
  }
  for (let m = 1; m < month; m++) {
    total += daysInMonth(year, m);
  }
  total += day - 1;
  return total;
}

const A4_W = 714;
const ZONE_W = 90;
const MEASURE_W = 80;
const LEFT_W = ZONE_W + MEASURE_W;

const TH_STYLE: React.CSSProperties = {
  border: "1px solid #333",
  padding: "4px 2px",
  fontSize: "9px",
  fontFamily: "SimSun, serif",
  textAlign: "center",
  backgroundColor: "#f0f0f0",
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const TD_STYLE: React.CSSProperties = {
  border: "1px solid #333",
  padding: "3px 4px",
  fontSize: "9px",
  fontFamily: "SimSun, serif",
  whiteSpace: "nowrap",
};

const TD_CENTER: React.CSSProperties = {
  ...TD_STYLE,
  textAlign: "center",
};

export function GanttPrintView({ items, scale }: Props) {
  const years = getYears(items);
  const startYear = years[0];
  const isMonth = scale === "month";
  const colsPerYear = isMonth ? 12 : 4;
  const totalCols = years.length * colsPerYear;
  const zones = [...new Set(items.map((it) => it.zone))];
  const cellW = Math.max(isMonth ? 18 : 40, (A4_W - LEFT_W) / totalCols);

  return (
    <div
      id="gantt-print"
      style={{
        width: `${A4_W}px`,
        padding: "30px 40px",
        backgroundColor: "#fff",
        fontFamily: "SimSun, serif",
        color: "#000",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <div style={{ fontSize: "16px", fontWeight: "bold", letterSpacing: "2px" }}>
          水土保持措施施工进度表
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th rowSpan={3} style={{ ...TH_STYLE, width: ZONE_W, minWidth: ZONE_W }}>
              防治分区
            </th>
            <th rowSpan={3} style={{ ...TH_STYLE, width: MEASURE_W, minWidth: MEASURE_W }}>
              措施名称
            </th>
            <th colSpan={totalCols} style={TH_STYLE}>
              施工工期
            </th>
          </tr>
          <tr>
            {years.map((y) => (
              <th key={y} colSpan={colsPerYear} style={{ ...TH_STYLE, backgroundColor: "#e8e8e8" }}>
                {y}年
              </th>
            ))}
          </tr>
          <tr>
            {years.flatMap((y) =>
              Array.from({ length: colsPerYear }, (_, i) => (
                <th key={`${y}-${i + 1}`} style={{ ...TH_STYLE, fontSize: "8px" }}>
                  {isMonth ? i + 1 : `Q${i + 1}`}
                </th>
              ))
            )}
          </tr>
        </thead>

        <tbody>
          {zones.map((zone) => {
            const zoneItems = items.filter((it) => it.zone === zone);
            return zoneItems.map((item, zIdx) => {
              const sOff = dayOffset(startYear, item.startYear, item.startMonth, item.startDay);
              const eOff = dayOffset(startYear, item.endYear, item.endMonth, item.endDay);

              return (
                <tr key={item.id}>
                  {zIdx === 0 ? (
                    <td rowSpan={zoneItems.length} style={{ ...TD_STYLE, fontWeight: "bold", verticalAlign: "top" }}>
                      {zone}
                    </td>
                  ) : null}
                  <td style={TD_STYLE}>{item.measure}</td>

                  {isMonth
                    ? years.flatMap((y) =>
                        Array.from({ length: 12 }, (_, mi) => {
                          const m = mi + 1;
                          const cd = daysInMonth(y, m);
                          const cellStart = dayOffset(startYear, y, m, 1);
                          const cellEnd = cellStart + cd - 1;

                          if (sOff > cellEnd || eOff < cellStart) {
                            return <td key={`${y}-${m}`} style={TD_CENTER} />;
                          }

                          const barLeft = sOff > cellStart ? ((sOff - cellStart) / cd) * 100 : 0;
                          const barRight = eOff < cellEnd ? ((cellEnd - eOff) / cd) * 100 : 0;

                          return (
                            <td key={`${y}-${m}`} style={{ ...TD_CENTER, padding: "3px 0" }}>
                              <div style={{ backgroundColor: getTypeColor(item), height: "2px", marginLeft: `${barLeft}%`, marginRight: `${barRight}%` }} />
                            </td>
                          );
                        })
                      )
                    : years.flatMap((y) =>
                        Array.from({ length: 4 }, (_, qi) => {
                          const qStartMonth = qi * 3 + 1;
                          const qEndMonth = qi * 3 + 3;
                          const qCellStart = dayOffset(startYear, y, qStartMonth, 1);
                          const qCellEnd = dayOffset(startYear, y, qEndMonth, 1) + daysInMonth(y, qEndMonth) - 1;
                          const qd = qCellEnd - qCellStart + 1;

                          if (sOff > qCellEnd || eOff < qCellStart) {
                            return <td key={`${y}-q${qi + 1}`} style={TD_CENTER} />;
                          }

                          const barLeft = sOff > qCellStart ? ((sOff - qCellStart) / qd) * 100 : 0;
                          const barRight = eOff < qCellEnd ? ((qCellEnd - eOff) / qd) * 100 : 0;

                          return (
                            <td key={`${y}-q${qi + 1}`} style={{ ...TD_CENTER, padding: "3px 0" }}>
                              <div style={{ backgroundColor: getTypeColor(item), height: "2px", marginLeft: `${barLeft}%`, marginRight: `${barRight}%` }} />
                            </td>
                          );
                        })
                      )}
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
