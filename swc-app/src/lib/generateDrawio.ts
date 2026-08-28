import type { MeasureRow } from "./parseMeasureExcel";

// ── 样式 ──────────────────────────────────────────────────────
const FONT = "fontFamily=仿宋;";
const S = {
  root: `rounded=0;whiteSpace=wrap;html=1;${FONT}fontSize=14;fontStyle=1;fillColor=#ffffff;fontColor=#000000;strokeColor=#000000;strokeWidth=1;verticalAlign=middle;align=center;`,
  level: `rounded=0;whiteSpace=wrap;html=1;${FONT}fontSize=12;fillColor=#ffffff;fontColor=#000000;strokeColor=#000000;strokeWidth=1;verticalAlign=middle;align=center;`,
  mtype: `rounded=0;whiteSpace=wrap;html=1;${FONT}fontSize=11;fontStyle=1;fillColor=#ffffff;fontColor=#000000;strokeColor=#000000;strokeWidth=1;verticalAlign=middle;align=center;`,
  item: `rounded=0;whiteSpace=wrap;html=1;${FONT}fontSize=10;fillColor=#ffffff;fontColor=#000000;strokeColor=#000000;strokeWidth=1;verticalAlign=middle;align=left;spacingLeft=4;`,
  itemEx: `rounded=0;whiteSpace=wrap;html=1;${FONT}fontSize=10;fontStyle=2;fillColor=#ffffff;fontColor=#666666;strokeColor=#999999;strokeWidth=1;verticalAlign=middle;align=left;spacingLeft=4;`,
  edgeH: `endArrow=none;html=1;rounded=0;strokeColor=#000000;strokeWidth=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;`,
  note: `text;html=1;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=仿宋;fontSize=9;fontStyle=2;fontColor=#666666;`,
} as const;

// ── 布局常量 ──────────────────────────────────────────────────
const ROOT_W = 20;
const ROOT_H = 110;
const LVL_W = 80;
const LVL_H = 28;
const MT_W = 65;
const MT_H = 18;
const ITEM_H = 18;
const ITEM_MAX_W = 250; // 动态调整，见 renderGroup
const CHAR_W = 14;
const CHAR_W_EN = 7;
const ITEM_GAP = 2;
const LINE_GAP = 2;
const MT_GAP = 6;
const GROUP_GAP = 10;
const X_GAP = 40;

// ── 工具 ──────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function tw(text: string): number {
  let w = 0; for (const ch of text) w += ch.charCodeAt(0) > 127 ? CHAR_W : CHAR_W_EN; return w;
}

// ── 功能分组（隐式，仅影响排列顺序）──────────────────────────
const GROUP_ORDER = [
  { re: /排水沟|截水沟|截排水沟|排水管|排水渠|急流槽|沉沙池|消力池|导水槽|过路涵|暗沟|排水/, label: "排水" },
  { re: /挡渣墙|拦渣坝|拦挡坝|谷坊|挡土墙|护坡|护岸|护脚|防冲|护堤|挡墙/, label: "挡护" },
  { re: /表土剥离|表土回覆|土地整治|覆土|客土|平整/, label: "土方" },
  { re: /植草|种草|撒播|喷播|绿化|栽植|造林|铺草皮|挂网|骨架|框格|锚杆|喷混|生态/, label: "绿化" },
  { re: /苫盖|拦挡|铺垫|临时|围堰/, label: "临时" },
];

function groupKey(name: string): number {
  for (let i = 0; i < GROUP_ORDER.length; i++) {
    if (GROUP_ORDER[i].re.test(name)) return i;
  }
  return GROUP_ORDER.length;
}

type Item = { name: string; existing: boolean };

// 按功能分组排列，返回分组后的行
function arrangeItems(items: Item[], maxW = ITEM_MAX_W): Item[][] {
  const groups = new Map<number, Item[]>();
  for (const it of items) {
    const gk = groupKey(it.name);
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk)!.push(it);
  }
  const lines: Item[][] = [];
  for (const [, groupItems] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    let cur: Item[] = [];
    let curW = 0;
    for (const it of groupItems) {
      const w = tw(it.name) + 16;
      if (cur.length > 0 && curW + w > maxW) { lines.push(cur); cur = []; curW = 0; }
      cur.push(it); curW += w;
    }
    if (cur.length) lines.push(cur);
  }
  return lines;
}

function measureTypeHeight(items: Item[], maxW = ITEM_MAX_W): number {
  const lineCount = arrangeItems(items, maxW).length;
  const itemsH = lineCount * ITEM_H + (lineCount - 1) * LINE_GAP;
  return MT_H + MT_GAP + itemsH;
}

// ── 树结构 ────────────────────────────────────────────────────
type Measures = { eng: Item[]; plant: Item[]; temp: Item[] };
type L3Map = Map<string, Measures>;
type L2Map = Map<string, L3Map>;
type Tree = Map<string, L2Map>;

function parseItems(raw: string): Item[] {
  if (!raw) return [];
  return raw.split(/[、,，;；]/).map(s => s.trim()).filter(Boolean).map(name => {
    const hasMarker = name.includes("（主体已有）") || name.includes("(主体已有)");
    const clean = name.replace(/[（(]主体已有[）)]/g, "").trim();
    return { name: clean, existing: hasMarker };
  });
}

function buildTree(rows: MeasureRow[]): Tree {
  const t: Tree = new Map();
  for (const r of rows) {
    const l1 = r.level1 || "未分类";
    const l2 = r.level2 || "";
    const l3 = r.level3 || "";
    if (!t.has(l1)) t.set(l1, new Map());
    const l2m = t.get(l1)!;
    const l2k = l2 || "__leaf__";
    if (!l2m.has(l2k)) l2m.set(l2k, new Map());
    const l3m = l2m.get(l2k)!;
    const l3k = l3 || "__leaf__";
    if (!l3m.has(l3k)) l3m.set(l3k, { eng: [], plant: [], temp: [] });
    const m = l3m.get(l3k)!;
    for (const it of parseItems(r.engineering)) if (!m.eng.some(e => e.name === it.name)) m.eng.push(it);
    for (const it of parseItems(r.plant)) if (!m.plant.some(e => e.name === it.name)) m.plant.push(it);
    for (const it of parseItems(r.temporary)) if (!m.temp.some(e => e.name === it.name)) m.temp.push(it);
  }
  return t;
}

function getLeaf(l3m: L3Map): Measures {
  if (l3m.size === 1) { const [k, v] = [...l3m.entries()][0]; if (k === "__leaf__") return v; }
  const m: Measures = { eng: [], plant: [], temp: [] };
  for (const [, v] of l3m) {
    for (const it of v.eng) if (!m.eng.some(e => e.name === it.name)) m.eng.push(it);
    for (const it of v.plant) if (!m.plant.some(e => e.name === it.name)) m.plant.push(it);
    for (const it of v.temp) if (!m.temp.some(e => e.name === it.name)) m.temp.push(it);
  }
  return m;
}

// ── 生成 XML ──────────────────────────────────────────────────
export function generateDrawioXml(rows: MeasureRow[]): string {
  const nodes: { id: string; v: string; s: string; x: number; y: number; w: number; h: number }[] = [];
  const edges: { id: string; src: string; tgt: string; s: string }[] = [];
  let cid = 2;
  const nid = () => String(cid++);
  const tree = buildTree(rows);
  let hasEx = false;

  // 措施项可用宽度（根据层级的 bx 计算）
  const PAGE_RIGHT = 827 - 30;
  const itemXOffset = MT_W + 16;
  function availW(bx: number) { return PAGE_RIGHT - (bx + itemXOffset) - 10; }

  // 措施类型组高度
  function measuresHeight(m: Measures, aw: number): number {
    const heights = [m.eng, m.plant, m.temp].filter(c => c.length > 0).map(c => measureTypeHeight(c, aw));
    return heights.length ? heights.reduce((a, b) => a + b, 0) + (heights.length - 1) * MT_GAP : LVL_H;
  }

  function branchH(l2m: L2Map, aw: number): number {
    const hs: number[] = [];
    for (const [, l3m] of l2m) {
      if (l3m.size === 1 && [...l3m.keys()][0] === "__leaf__") hs.push(measuresHeight(getLeaf(l3m), aw));
      else { let h = 0; for (const [, m] of l3m) h += measuresHeight(m, aw) + GROUP_GAP; hs.push(Math.max(h - GROUP_GAP, LVL_H)); }
    }
    return hs.length ? hs.reduce((a, b) => a + b, 0) + (hs.length - 1) * GROUP_GAP : LVL_H;
  }

  // 渲染措施组（工程措施/植物措施/临时措施，各类型内按功能分组排列）
  function renderGroup(m: Measures, bx: number, by: number, parentId: string) {
    const types: { label: string; items: Item[] }[] = [];
    if (m.eng.length) types.push({ label: "工程措施", items: m.eng });
    if (m.plant.length) types.push({ label: "植物措施", items: m.plant });
    if (m.temp.length) types.push({ label: "临时措施", items: m.temp });
    if (types.length === 0) return;

    for (const it of [...m.eng, ...m.plant, ...m.temp]) if (it.existing) hasEx = true;

    const itemX = bx + itemXOffset;
    const localAvailW = PAGE_RIGHT - itemX - 10;

    let cy = by;
    const gap = MT_GAP; // 头与项之间的间距

    for (const mt of types) {
      const lines = arrangeItems(mt.items, localAvailW);

      // 统一宽度
      const lineTexts = lines.map(line => line.map(it => it.name).join("、"));
      const maxLineW = Math.max(...lineTexts.map(t => tw(t) + 16), 80);
      const uniformW = Math.min(maxLineW, localAvailW);

      // 措施项区域
      const itemsH = lineTexts.length * ITEM_H + (lineTexts.length - 1) * LINE_GAP;
      // 头垂直居中于措施项区域（项从 cy+gap 开始，中心在 cy+gap+itemsH/2）
      const mtY = cy + gap + itemsH / 2 - MT_H / 2;
      const mtId = nid();
      nodes.push({ id: mtId, v: mt.label, s: S.mtype, x: bx, y: mtY, w: MT_W, h: MT_H });
      edges.push({ id: nid(), src: parentId, tgt: mtId, s: S.edgeH });

      // 措施项从 cy + gap 开始（与头不重叠）
      let iy = cy + gap;
      for (let li = 0; li < lineTexts.length; li++) {
        const hasExisting = lines[li].every(it => it.existing);
        const iId = nid();
        nodes.push({ id: iId, v: lineTexts[li], s: hasExisting ? S.itemEx : S.item, x: itemX, y: iy, w: uniformW, h: ITEM_H });
        edges.push({ id: nid(), src: mtId, tgt: iId, s: S.edgeH });
        iy += ITEM_H + LINE_GAP;
      }
      cy += MT_H + gap + itemsH + MT_GAP;
    }
  }

  // ── 主布局 ──────────────────────────────────────────────────
  const rid = nid();
  let gy = 40;
  const l1bx = 30 + ROOT_W + X_GAP;
  const l2bx = l1bx + LVL_W + X_GAP;
  const l3bx = l2bx + LVL_W + X_GAP;
  const l1aw = availW(l1bx);
  const l2aw = availW(l2bx);
  const l3aw = availW(l3bx);

  const bhs: number[] = [];
  for (const [, l2m] of tree) bhs.push(branchH(l2m, l1aw));
  const totalH = bhs.reduce((a, b) => a + b, 0) + (bhs.length - 1) * GROUP_GAP;

  nodes.push({ id: rid, v: "防治措施体系", s: S.root, x: 30, y: gy + totalH / 2 - ROOT_H / 2, w: ROOT_W, h: ROOT_H });

  let idx = 0;
  for (const [l1, l2m] of tree) {
    const bh = bhs[idx];
    const l1id = nid();
    nodes.push({ id: l1id, v: l1, s: S.level, x: l1bx, y: gy + bh / 2 - LVL_H / 2, w: LVL_W, h: LVL_H });
    edges.push({ id: nid(), src: rid, tgt: l1id, s: S.edgeH });

    const hasL2 = l2m.size > 1 || (l2m.size === 1 && [...l2m.keys()][0] !== "__leaf__");
    if (!hasL2) {
      renderGroup(getLeaf(l2m.get("__leaf__") || new Map()), l2bx, gy, l1id);
    } else {
      let l2y = gy;
      for (const [l2, l3m] of l2m) {
        const l2h = branchH(new Map([[l2, l3m]]), l2aw);
        const l2id = nid();
        nodes.push({ id: l2id, v: l2, s: S.level, x: l2bx, y: l2y + l2h / 2 - LVL_H / 2, w: LVL_W, h: LVL_H });
        edges.push({ id: nid(), src: l1id, tgt: l2id, s: S.edgeH });

        const hasL3 = l3m.size > 1 || (l3m.size === 1 && [...l3m.keys()][0] !== "__leaf__");
        if (!hasL3) {
          renderGroup(getLeaf(l3m), l3bx, l2y, l2id);
        } else {
          let l3y = l2y;
          for (const [l3, m] of l3m) {
            const mh = measuresHeight(m, l3aw);
            const l3x = l3bx;
            const l3id = nid();
            nodes.push({ id: l3id, v: l3, s: S.level, x: l3x, y: l3y + mh / 2 - LVL_H / 2, w: LVL_W, h: LVL_H });
            edges.push({ id: nid(), src: l2id, tgt: l3id, s: S.edgeH });
            renderGroup(m, l3x + LVL_W + X_GAP, l3y, l3id);
            l3y += mh + GROUP_GAP;
          }
        }
        l2y += l2h + GROUP_GAP;
      }
    }
    gy += bh + GROUP_GAP;
    idx++;
  }

  if (hasEx) {
    nodes.push({ id: nid(), v: "注：斜体灰色项为主体工程已列措施，其余为本方案新增措施", s: S.note, x: 30, y: gy + 16, w: 650, h: 20 });
  }

  const xml = [
    ...nodes.map(n => `<mxCell id="${n.id}" value="${esc(n.v)}" style="${n.s}" vertex="1" parent="1"><mxGeometry x="${Math.round(n.x)}" y="${Math.round(n.y)}" width="${Math.round(n.w)}" height="${Math.round(n.h)}" as="geometry" /></mxCell>`),
    ...edges.map(e => `<mxCell id="${e.id}" style="${e.s}" edge="1" source="${e.src}" target="${e.tgt}" parent="1"><mxGeometry relative="1" as="geometry" /></mxCell>`),
  ].join("\n        ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" type="device">
  <diagram id="swc-measure-system" name="措施体系图">
    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        ${xml}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

export async function downloadDrawio(xml: string, filename = "措施体系图.drawio") {
  const blob = new Blob([xml], { type: "application/xml" });
  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const filePath = await save({
      defaultPath: filename,
      filters: [{ name: "Draw.io 文件", extensions: ["drawio"] }],
    });
    if (filePath) {
      const { writeFile } = await import("@tauri-apps/plugin-fs");
      const buffer = await blob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(buffer));
    }
  } catch {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}
