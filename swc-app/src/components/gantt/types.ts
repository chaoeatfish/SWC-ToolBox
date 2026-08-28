"use client";

export type MeasureType = "工程措施" | "植物措施" | "临时措施";

export interface GanttItem {
  id: string;
  zone: string;
  measure: string;
  measureType?: MeasureType;
  isMainProject?: boolean;
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

export const DEFAULT_ITEMS: GanttItem[] = [];

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
