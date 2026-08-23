"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { toPng } from "html-to-image";
import * as XLSX from "xlsx";
import { type GanttItem } from "./types";
import { GanttPrintView } from "./GanttPrintView";

/** Export Gantt chart as A4-formatted PNG with table borders */
export async function exportPng(
  items: GanttItem[],
  scale: "month" | "quarter",
  filename: string
) {
  // Create off-screen container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.zIndex = "-1";
  document.body.appendChild(container);

  // Render print view
  const root = createRoot(container);
  root.render(createElement(GanttPrintView, { items, scale }));

  // Wait for render
  await new Promise((r) => setTimeout(r, 300));

  const printEl = container.querySelector("#gantt-print") as HTMLElement;
  if (!printEl) {
    root.unmount();
    document.body.removeChild(container);
    throw new Error("Print element not found");
  }

  const dataUrl = await toPng(printEl, {
    pixelRatio: 3,
    backgroundColor: "#ffffff",
  });

  root.unmount();
  document.body.removeChild(container);

  // Download
  const res = await fetch(dataUrl);
  const blob = await res.blob();

  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const filePath = await save({
      defaultPath: filename,
      filters: [{ name: "PNG 图片", extensions: ["png"] }],
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

/** Export Gantt items as Excel */
export async function exportExcel(items: GanttItem[], filename: string) {
  const header = [
    "防治分区",
    "措施名称",
    "开始年",
    "开始月",
    "开始日",
    "结束年",
    "结束月",
    "结束日",
    "工期(天)",
  ];

  const rows = items.map((it) => {
    const start = new Date(it.startYear, it.startMonth - 1, it.startDay);
    const end = new Date(it.endYear, it.endMonth - 1, it.endDay);
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    return [
      it.zone,
      it.measure,
      it.startYear,
      it.startMonth,
      it.startDay,
      it.endYear,
      it.endMonth,
      it.endDay,
      days,
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [
    { wch: 14 }, { wch: 14 },
    { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "施工进度");

  const xlsxData = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([xlsxData], {
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
