"use client";

import { type GanttItem, daysInMonth } from "./types";

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

export function GanttChart({ items, scale }: Props) {
  const years = getYears(items);
  const startYear = years[0];
  const isMonth = scale === "month";
  const colsPerYear = isMonth ? 12 : 4;
  const zones = [...new Set(items.map((it) => it.zone))];

  const ZONE_W = 130;
  const MEASURE_W = 130;
  const LEFT_W = ZONE_W + MEASURE_W;

  const cellW = isMonth ? 36 : 72;

  return (
    <div className="overflow-x-auto rounded-xl border border-card-border bg-card-bg">
      <table
        className="border-collapse"
        style={{ minWidth: LEFT_W + years.length * colsPerYear * cellW }}
      >
        <thead>
          <tr>
            <th
              rowSpan={3}
              className="sticky left-0 z-20 border-b border-r border-border bg-card-bg px-3 py-2 text-center text-xs font-medium text-muted"
              style={{ width: ZONE_W, minWidth: ZONE_W }}
            >
              防治分区
            </th>
            <th
              rowSpan={3}
              className="sticky z-20 border-b border-r border-border bg-card-bg px-3 py-2 text-center text-xs font-medium text-muted"
              style={{ left: ZONE_W, width: MEASURE_W, minWidth: MEASURE_W }}
            >
              措施名称
            </th>
            <th
              colSpan={years.length * colsPerYear}
              className="border-b border-r border-border bg-accent/10 px-2 py-2 text-center text-xs font-semibold text-accent"
            >
              施工工期
            </th>
          </tr>
          <tr>
            {years.map((y) => (
              <th
                key={y}
                colSpan={colsPerYear}
                className="border-b border-r border-border bg-accent/5 px-2 py-2 text-center text-xs font-semibold text-accent"
              >
                {y}年
              </th>
            ))}
          </tr>
          <tr>
            {years.flatMap((y) =>
              Array.from({ length: colsPerYear }, (_, i) => (
                <th
                  key={`${y}-${i + 1}`}
                  className="border-b border-r border-border/60 px-0 py-1.5 text-center text-[10px] font-normal text-muted"
                  style={{ minWidth: cellW, width: cellW }}
                >
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
                <tr key={item.id} className="group">
                  {zIdx === 0 ? (
                    <td
                      rowSpan={zoneItems.length}
                      className="sticky left-0 z-20 border-b border-r border-border bg-card-bg px-3 py-2 text-sm font-medium align-top"
                      style={{ width: ZONE_W, minWidth: ZONE_W }}
                    >
                      {zone}
                    </td>
                  ) : null}

                  <td
                    className="sticky z-20 border-b border-r border-border bg-card-bg px-3 py-2 text-sm group-hover:bg-accent-light/30"
                    style={{ left: ZONE_W, width: MEASURE_W, minWidth: MEASURE_W }}
                  >
                    {item.measure}
                  </td>

                  {isMonth
                    ? years.flatMap((y) =>
                        Array.from({ length: 12 }, (_, mi) => {
                          const m = mi + 1;
                          const cd = daysInMonth(y, m);
                          const cellStart = dayOffset(startYear, y, m, 1);
                          const cellEnd = cellStart + cd - 1;

                          if (sOff > cellEnd || eOff < cellStart) {
                            return <td key={`${y}-${m}`} className="border-b border-r border-border/40 px-0 py-2" style={{ minWidth: cellW, width: cellW }} />;
                          }

                          const barLeft = sOff > cellStart ? ((sOff - cellStart) / cd) * 100 : 0;
                          const barRight = eOff < cellEnd ? ((cellEnd - eOff) / cd) * 100 : 0;

                          return (
                            <td key={`${y}-${m}`} className="border-b border-r border-border/40 px-0 py-2" style={{ minWidth: cellW, width: cellW }}>
                              <div style={{ backgroundColor: item.color, height: "1.5pt", marginLeft: `${barLeft}%`, marginRight: `${barRight}%` }} />
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
                            return <td key={`${y}-q${qi + 1}`} className="border-b border-r border-border/40 px-0 py-2" style={{ minWidth: cellW, width: cellW }} />;
                          }

                          const barLeft = sOff > qCellStart ? ((sOff - qCellStart) / qd) * 100 : 0;
                          const barRight = eOff < qCellEnd ? ((qCellEnd - eOff) / qd) * 100 : 0;

                          return (
                            <td key={`${y}-q${qi + 1}`} className="border-b border-r border-border/40 px-0 py-2" style={{ minWidth: cellW, width: cellW }}>
                              <div style={{ backgroundColor: item.color, height: "1.5pt", marginLeft: `${barLeft}%`, marginRight: `${barRight}%` }} />
                            </td>
                          );
                        })
                      )}
                </tr>
              );
            });
          })}

          {items.length === 0 && (
            <tr>
              <td
                colSpan={2 + years.length * colsPerYear}
                className="px-5 py-12 text-center text-sm text-muted"
              >
                暂无甘特图数据，请在下方控制面板中添加
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
