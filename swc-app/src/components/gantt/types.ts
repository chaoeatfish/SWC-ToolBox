"use client";

export interface GanttItem {
  id: string;
  zone: string;
  measure: string;
  startYear: number;
  startMonth: number;
  startDay: number;
  endYear: number;
  endMonth: number;
  endDay: number;
  color: string;
}

export const DEFAULT_COLORS = [
  "#0d9488", // teal
  "#2563eb", // blue
  "#d97706", // amber
  "#dc2626", // red
  "#7c3aed", // violet
  "#059669", // emerald
  "#db2777", // pink
  "#ea580c", // orange
];

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export const DEFAULT_ITEMS: GanttItem[] = [
  {
    id: "1",
    zone: "主体工程区",
    measure: "表土剥离",
    startYear: 2025,
    startMonth: 3,
    startDay: 10,
    endYear: 2025,
    endMonth: 6,
    endDay: 20,
    color: DEFAULT_COLORS[0],
  },
  {
    id: "2",
    zone: "主体工程区",
    measure: "临时拦挡",
    startYear: 2025,
    startMonth: 4,
    startDay: 1,
    endYear: 2025,
    endMonth: 9,
    endDay: 15,
    color: DEFAULT_COLORS[1],
  },
  {
    id: "3",
    zone: "取土场区",
    measure: "截排水沟",
    startYear: 2025,
    startMonth: 6,
    startDay: 5,
    endYear: 2025,
    endMonth: 12,
    endDay: 31,
    color: DEFAULT_COLORS[2],
  },
  {
    id: "4",
    zone: "弃渣场区",
    measure: "挡渣墙",
    startYear: 2025,
    startMonth: 5,
    startDay: 15,
    endYear: 2026,
    endMonth: 3,
    endDay: 10,
    color: DEFAULT_COLORS[3],
  },
  {
    id: "5",
    zone: "弃渣场区",
    measure: "植被恢复",
    startYear: 2026,
    startMonth: 4,
    startDay: 1,
    endYear: 2026,
    endMonth: 10,
    endDay: 30,
    color: DEFAULT_COLORS[4],
  },
  {
    id: "6",
    zone: "施工便道区",
    measure: "排水设施",
    startYear: 2025,
    startMonth: 7,
    startDay: 20,
    endYear: 2026,
    endMonth: 1,
    endDay: 5,
    color: DEFAULT_COLORS[5],
  },
];

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
