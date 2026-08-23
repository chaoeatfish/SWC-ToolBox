import type { MeasureRow } from "./parseMeasureExcel";

// ── 节点样式预设 ──────────────────────────────────────────────
const STYLES = {
  level1:
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#1e3a5f;fontColor=#ffffff;strokeColor=#0f2440;fontSize=14;fontStyle=1;arcSize=12;shadow=1;",
  level2:
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#2563eb;fontColor=#ffffff;strokeColor=#1d4ed8;fontSize=12;fontStyle=1;arcSize=10;shadow=1;",
  level3:
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#60a5fa;fontColor=#1e3a5f;strokeColor=#3b82f6;fontSize=11;fontStyle=1;arcSize=8;",
  measure_eng:
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#f59e0b;fontColor=#78350f;strokeColor=#d97706;fontSize=10;arcSize=8;",
  measure_plant:
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#22c55e;fontColor=#14532d;strokeColor=#16a34a;fontSize=10;arcSize=8;",
  measure_temp:
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#a78bfa;fontColor=#3b0764;strokeColor=#8b5cf6;fontSize=10;arcSize=8;",
  edge: "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#94a3b8;strokeWidth=1.5;curved=0;",
  container:
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#f8fafc;strokeColor=#cbd5e1;strokeWidth=2;dashed=1;arcSize=6;fontSize=12;fontStyle=1;fontColor=#475569;verticalAlign=top;align=center;spacingTop=4;",
} as const;

// ── 布局常量 ──────────────────────────────────────────────────
const BOX_W = 150;
const BOX_H = 40;
const GAP_X = 30;
const GAP_Y = 20;
const CONTAINER_PAD = 20;
const MEASURE_COL_W = 130;
const MEASURE_GAP = 12;

interface Node {
  id: string;
  label: string;
  style: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Edge {
  id: string;
  source: string;
  target: string;
}

/**
 * 将 Excel 数据行转为 Draw.io XML
 *
 * 布局策略（自顶向下树形）：
 *   Level1 (顶层)
 *     └─ Level2
 *          └─ Level3
 *               ├─ 工程措施
 *               ├─ 植物措施
 *               └─ 临时措施
 */
export function generateDrawioXml(rows: MeasureRow[]): string {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let cellId = 2; // 0=root, 1=defaultLayer

  const nextId = () => String(cellId++);

  // ── 构建层级树 ────────────────────────────────────────────
  // level1 -> level2 -> level3 -> measures
  const tree = new Map<
    string,
    Map<string, Map<string, { eng: string[]; plant: string[]; temp: string[] }>>
  >();

  for (const row of rows) {
    const l1 = row.level1 || "未分类";
    const l2 = row.level2 || "未分类";
    const l3 = row.level3 || "未分类";

    if (!tree.has(l1)) tree.set(l1, new Map());
    const l2Map = tree.get(l1)!;
    if (!l2Map.has(l2)) l2Map.set(l2, new Map());
    const l3Map = l2Map.get(l2)!;
    if (!l3Map.has(l3)) l3Map.set(l3, { eng: [], plant: [], temp: [] });
    const measures = l3Map.get(l3)!;

    if (row.engineering && !measures.eng.includes(row.engineering))
      measures.eng.push(row.engineering);
    if (row.plant && !measures.plant.includes(row.plant))
      measures.plant.push(row.plant);
    if (row.temporary && !measures.temp.includes(row.temporary))
      measures.temp.push(row.temporary);
  }

  // ── 计算布局 ──────────────────────────────────────────────
  // 计算每个 l3 节点下方措施列的总宽度
  function measuresWidth(m: { eng: string[]; plant: string[]; temp: string[] }) {
    const cols = [m.eng, m.plant, m.temp].filter((c) => c.length > 0);
    if (cols.length === 0) return BOX_W;
    return cols.length * MEASURE_COL_W + (cols.length - 1) * MEASURE_GAP;
  }

  // 自顶向下布局
  let globalY = 0;
  const l1Ids = new Map<string, string>();
  const l2Ids = new Map<string, string>();
  const l3Ids = new Map<string, string>();

  // 每个 l1 的总宽度（用于整体居中，这里先计算再布局）
  // 简化策略：逐层向下，每层宽度由子节点决定

  for (const [l1, l2Map] of tree) {
    const l1Id = nextId();
    l1Ids.set(l1, l1Id);

    // 收集该 l1 下所有 l2 子树宽度
    const l2Layouts: { name: string; width: number }[] = [];
    for (const [l2, l3Map] of l2Map) {
      let l2Width = 0;
      for (const [, measures] of l3Map) {
        const w = measuresWidth(measures);
        l2Width += w + GAP_X;
      }
      l2Width = Math.max(l2Width - GAP_X, BOX_W);
      l2Layouts.push({ name: l2, width: l2Width });
    }

    // l1 总宽度
    let l1Width = 0;
    for (const l of l2Layouts) l1Width += l.width + GAP_X;
    l1Width = Math.max(l1Width - GAP_X, BOX_W);

    // 放置 l1
    const l1X = 0; // 后续统一平移
    const l1Y = globalY;
    nodes.push({
      id: l1Id,
      label: l1,
      style: STYLES.level1,
      x: l1X,
      y: l1Y,
      w: l1Width,
      h: BOX_H,
    });

    let l2X = l1X;
    const l2Y = l1Y + BOX_H + GAP_Y;

    for (const l2Layout of l2Layouts) {
      const l2 = l2Layout.name;
      const l2Id = nextId();
      l2Ids.set(`${l1}/${l2}`, l2Id);

      nodes.push({
        id: l2Id,
        label: l2,
        style: STYLES.level2,
        x: l2X,
        y: l2Y,
        w: l2Layout.width,
        h: BOX_H,
      });
      edges.push({
        id: nextId(),
        source: l1Id,
        target: l2Id,
      });

      // l3 节点
      const l3Map = l2Map.get(l2)!;
      let l3X = l2X;
      const l3Y = l2Y + BOX_H + GAP_Y;

      for (const [l3, measures] of l3Map) {
        const l3Id = nextId();
        const l3Key = `${l1}/${l2}/${l3}`;
        l3Ids.set(l3Key, l3Id);

        const mw = measuresWidth(measures);

        nodes.push({
          id: l3Id,
          label: l3,
          style: STYLES.level3,
          x: l3X,
          y: l3Y,
          w: mw,
          h: BOX_H,
        });
        edges.push({
          id: nextId(),
          source: l2Id,
          target: l3Id,
        });

        // 措施节点（三列）
        const mY = l3Y + BOX_H + GAP_Y;
        const cols: { items: string[]; style: string; label: string }[] = [];
        if (measures.eng.length)
          cols.push({ items: measures.eng, style: STYLES.measure_eng, label: "工程措施" });
        if (measures.plant.length)
          cols.push({ items: measures.plant, style: STYLES.measure_plant, label: "植物措施" });
        if (measures.temp.length)
          cols.push({ items: measures.temp, style: STYLES.measure_temp, label: "临时措施" });

        let mx = l3X;
        for (const col of cols) {
          // 每列一个容器
          const containerId = nextId();
          const containerH = col.items.length * (BOX_H + 8) + CONTAINER_PAD + 24;

          nodes.push({
            id: containerId,
            label: col.label,
            style: STYLES.container,
            x: mx,
            y: mY,
            w: MEASURE_COL_W,
            h: containerH,
          });
          edges.push({
            id: nextId(),
            source: l3Id,
            target: containerId,
          });

          // 容器内各措施
          let iy = mY + 28;
          for (const item of col.items) {
            const itemId = nextId();
            nodes.push({
              id: itemId,
              label: item,
              style: col.style,
              x: mx + 6,
              y: iy,
              w: MEASURE_COL_W - 12,
              h: BOX_H - 8,
            });
            edges.push({
              id: nextId(),
              source: containerId,
              target: itemId,
            });
            iy += BOX_H;
          }

          mx += MEASURE_COL_W + MEASURE_GAP;
        }

        l3X += mw + GAP_X;
      }

      l2X += l2Layout.width + GAP_X;
    }

    // 更新 globalY：找到该子树最深的 y
    const maxY = Math.max(...nodes.filter((n) => n.y > l1Y).map((n) => n.y + n.h));
    globalY = maxY + GAP_Y * 3;
  }

  // ── 生成 XML ──────────────────────────────────────────────
  const escXml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" type="device">
  <diagram id="swc-measure-system" name="措施体系图">
    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1200" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
`;

  for (const node of nodes) {
    xml += `        <mxCell id="${node.id}" value="${escXml(node.label)}" style="${node.style}" vertex="1" parent="1">
          <mxGeometry x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" as="geometry" />
        </mxCell>\n`;
  }

  for (const edge of edges) {
    xml += `        <mxCell id="${edge.id}" value="" style="${STYLES.edge}" edge="1" source="${edge.source}" target="${edge.target}" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>\n`;
  }

  xml += `      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

  return xml;
}

/**
 * 触发浏览器下载 .drawio 文件
 */
export function downloadDrawio(xml: string, filename = "措施体系图.drawio") {
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
