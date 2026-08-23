"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Drop, Download, Plus, Trash, PencilSimple, List, X } from "@phosphor-icons/react";
import {
  SECTION_TYPES, MASONRY_OPTIONS, FLOW_VELOCITY_TABLE,
  RUNOFF_COEFFICIENT_TABLE, FREEBOARD_OPTIONS, BACKFILL_COEFF_OPTIONS,
  ROUGHNESS_REFERENCE, designRainfallIntensity, designPeakFlow,
  chezyCoefficient, drainFlow, flowVelocity, sectionGeometry,
  sectionQuantities, type SectionType, type MasonryType, type AreaUnit,
} from "@/lib/hydraulicCalc";
import {
  createDitch, loadDitches, saveDitches,
  type DitchRecord, type DitchResult,
} from "@/lib/ditchModel";

export default function HydraulicCalcPage() {
  const [ditches, setDitches] = useState<DitchRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadDitches();
    setDitches(saved);
    if (saved.length > 0) setActiveId(saved[0].id);
  }, []);
  const [showOverview, setShowOverview] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const active = ditches.find((d) => d.id === activeId) ?? null;

  const updateDitch = useCallback((id: string, patch: Partial<DitchRecord>) => {
    setDitches((prev) => {
      const next = prev.map((d) => d.id === id ? { ...d, ...patch } : d);
      saveDitches(next);
      return next;
    });
  }, []);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const d = createDitch(newName.trim());
    const next = [...ditches, d];
    setDitches(next);
    saveDitches(next);
    setActiveId(d.id);
    setNewName("");
    setShowNewDialog(false);
  };

  const handleDelete = (id: string) => {
    const next = ditches.filter((d) => d.id !== id);
    setDitches(next);
    saveDitches(next);
    if (activeId === id) setActiveId(next.length > 0 ? next[0].id : null);
  };

  const handleRename = (id: string) => {
    if (!renameValue.trim()) return;
    updateDitch(id, { name: renameValue.trim() });
    setRenamingId(null);
  };

  // ── 选择砌体自动填入 ──────────────────────────────────────
  const handleMasonryChange = (key: MasonryType) => {
    if (!active) return;
    const opt = MASONRY_OPTIONS.find((m) => m.key === key)!;
    updateDitch(active.id, {
      masonryType: key,
      wallThickness: String(opt.defaultWallThickness),
      baseThickness: String(opt.defaultBaseThickness),
      roughness: String(opt.roughness),
    });
  };

  // ── 计算单条沟渠结果 ──────────────────────────────────────
  const calcResult = useCallback((d: DitchRecord): DitchResult | null => {
    const F = parseFloat(d.catchArea) || 0;
    const psi = parseFloat(d.phi) || 0;
    const q5 = parseFloat(d.q5_10) || 0;
    const cp = parseFloat(d.Cp) || 0;
    const ct = parseFloat(d.Ct) || 0;
    const i = parseFloat(d.ditchSlope) || 0;
    const B = parseFloat(d.bottomWidth) || 0;
    const h = parseFloat(d.designDepth) || 0;
    const m_val = parseFloat(d.slopeRatio) || 0;
    const n = parseFloat(d.roughness) || 0;
    const t = parseFloat(d.wallThickness) || 0;
    const tb = parseFloat(d.baseThickness) || 0;
    const fb = parseFloat(d.freeboard) || 0;
    const k = parseFloat(d.backfillCoeff) || 1;

    if (F <= 0 || B <= 0 || h <= 0 || i <= 0 || n <= 0) return null;

    const q = designRainfallIntensity(q5, cp, ct);
    const Qm = designPeakFlow(psi, q, F, d.areaUnit);
    const geo = sectionGeometry(d.sectionType, B, h, m_val);
    const C = chezyCoefficient(n, geo.hydraulicRadius);
    const v = flowVelocity(C, geo.hydraulicRadius, i);
    const Q = drainFlow(geo.flowArea, C, geo.hydraulicRadius, i);
    const H = h + fb;
    const geoT = sectionGeometry(d.sectionType, B, H, m_val);
    const qty = sectionQuantities(d.sectionType, B, H, m_val, t, tb, k);

    return {
      q, Qm,
      A: geo.flowArea, X: geo.wetPerimeter, R: geo.hydraulicRadius,
      C, v, Q, pass: Q >= Qm,
      H, topWidth: geoT.topWidth,
      masonryVol: qty.masonryVolume, plasterArea: qty.plasteringArea,
      excavVol: qty.excavationVolume, backfillVol: qty.backfillVolume,
      outerW: qty.outerTopWidth, outerD: qty.outerDepth,
    };
  }, []);

  const activeResult = active ? calcResult(active) : null;

  // ── 所有沟渠结果汇总 ──────────────────────────────────────
  const overview = useMemo(() => {
    return ditches.map((d) => ({ ditch: d, result: calcResult(d) }));
  }, [ditches, calcResult]);

  const p = (v: number | string, d = 4) => Number(v).toFixed(d).replace(/\.?0+$/, "");

  // ── 导出 Excel ──────────────────────────────────────────────
  const handleExport = async () => {
    const XLSX = await import("xlsx");

    // Sheet 1: 排水沟计算参数表
    const paramRows = overview.map(({ ditch: d, result: r }, i) => ({
      "序号": i + 1,
      "排水沟名称": d.name,
      "断面类型": SECTION_TYPES.find(s => s.key === d.sectionType)?.label ?? d.sectionType,
      "沟宽B(m)": d.bottomWidth,
      "设计水深h(m)": d.designDepth,
      "安全加高Δh(m)": d.freeboard,
      "沟深H(m)": r ? p(r.H) : "-",
      "边坡比": d.sectionType === "trapezoidal" ? `1:${d.slopeRatio}` : "/",
      "纵坡i": d.ditchSlope,
      "糙率n": d.roughness,
      "砌体类型": MASONRY_OPTIONS.find(m => m.key === d.masonryType)?.label ?? d.masonryType,
      "壁厚(m)": d.wallThickness,
      "底板厚(m)": d.baseThickness,
      "汇水面积F": `${d.catchArea} ${d.areaUnit === "km2" ? "km²" : "hm²"}`,
      "径流系数φ": d.phi,
      "q5,10(mm/min)": d.q5_10,
      "Cp": d.Cp,
      "Ct": d.Ct,
      "过水面积A(m²)": r ? p(r.A) : "-",
      "湿周X(m)": r ? p(r.X) : "-",
      "水力半径R(m)": r ? p(r.R) : "-",
      "流速v(m/s)": r ? p(r.v) : "-",
      "排水流量Q(m³/s)": r ? p(r.Q, 6) : "-",
      "设计流量Qm(m³/s)": r ? p(r.Qm, 6) : "-",
      "过流验算": r ? (r.pass ? "满足" : "不满足") : "-",
    }));

    // Sheet 2: 排水沟单位工程量表
    const qtyRows = overview.map(({ ditch: d, result: r }, i) => ({
      "序号": i + 1,
      "排水沟名称": d.name,
      "沟深H(m)": r ? p(r.H) : "-",
      "砌体类型": MASONRY_OPTIONS.find(m => m.key === d.masonryType)?.label ?? d.masonryType,
      "回填系数k": d.backfillCoeff,
      "砌体体积(m³/m)": r ? p(r.masonryVol) : "-",
      "抹面面积(m²/m)": r ? p(r.plasterArea) : "-",
      "土方开挖量(m³/m)": r ? p(r.excavVol) : "-",
      "土方回填量(m³/m)": r ? p(r.backfillVol) : "-",
      "外口宽(m)": r ? p(r.outerW) : "-",
      "外深度(m)": r ? p(r.outerD) : "-",
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(paramRows);
    const ws2 = XLSX.utils.json_to_sheet(qtyRows);

    // 设置列宽
    ws1["!cols"] = Object.keys(paramRows[0] || {}).map(() => ({ wch: 16 }));
    ws2["!cols"] = Object.keys(qtyRows[0] || {}).map(() => ({ wch: 16 }));

    XLSX.utils.book_append_sheet(wb, ws1, "排水沟计算参数表");
    XLSX.utils.book_append_sheet(wb, ws2, "排水沟单位工程量表");

    XLSX.writeFile(wb, "排水沟水力计算.xlsx");
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] -mt-8 -mx-8">
      {/* 左侧：沟渠列表 */}
      <div className="w-56 shrink-0 border-r border-border bg-card-bg flex flex-col">
        <div className="flex items-center justify-between px-3 py-3 border-b border-border">
          <span className="text-xs font-semibold text-muted">排水沟列表</span>
          <div className="flex gap-1">
            <button onClick={() => setShowOverview(!showOverview)}
              className="p-1 text-muted hover:text-foreground transition-colors" title="总览">
              <List size={14} />
            </button>
            <button onClick={() => setShowNewDialog(true)}
              className="p-1 text-muted hover:text-accent transition-colors" title="新建">
              <Plus size={14} />
            </button>
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto">
          {ditches.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-muted">
              暂无排水沟，点击 + 新建
            </li>
          )}
          {ditches.map((d) => {
            const r = calcResult(d);
            const isActive = d.id === activeId;
            return (
              <li key={d.id}>
                {renamingId === d.id ? (
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(d.id)}
                      className="flex-1 min-w-0 rounded border border-accent bg-background px-1.5 py-0.5 text-xs outline-none"
                      autoFocus />
                    <button onClick={() => handleRename(d.id)} className="text-accent text-xs">✓</button>
                    <button onClick={() => setRenamingId(null)} className="text-muted text-xs">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setActiveId(d.id)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      isActive ? "bg-accent/10 text-accent font-medium" : "text-foreground hover:bg-muted/30"
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="truncate">{d.name}</span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                        <span onClick={(e) => { e.stopPropagation(); setRenamingId(d.id); setRenameValue(d.name); }}
                          className="p-0.5 text-muted hover:text-foreground cursor-pointer">
                          <PencilSimple size={11} />
                        </span>
                        <span onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                          className="p-0.5 text-muted hover:text-red-500 cursor-pointer">
                          <Trash size={11} />
                        </span>
                      </div>
                    </div>
                    {r && (
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                        <span>{d.bottomWidth}×{d.designDepth}m</span>
                        <span className={r.pass ? "text-green-600" : "text-red-600"}>
                          {r.pass ? "✓" : "✗"}
                        </span>
                      </div>
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {/* 新建对话框 */}
        {showNewDialog && (
          <div className="border-t border-border p-3">
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="排水沟名称" className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent"
              autoFocus />
            <div className="flex gap-1 mt-1.5">
              <button onClick={handleCreate} className="flex-1 rounded bg-accent px-2 py-1 text-xs text-white">创建</button>
              <button onClick={() => { setShowNewDialog(false); setNewName(""); }}
                className="rounded px-2 py-1 text-xs text-muted">取消</button>
            </div>
          </div>
        )}
      </div>

      {/* 右侧：详情 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-6 space-y-5">
          {!active ? (
            <div className="text-center py-20">
              <Drop size={48} className="mx-auto text-muted/30" />
              <p className="mt-4 text-sm text-muted">左侧新建排水沟开始计算</p>
            </div>
          ) : showOverview ? (
            /* ── 总览表格 ────────────────────────────────── */
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">排水沟总览</h1>
                  <p className="mt-1 text-sm text-muted">共 {ditches.length} 条排水沟</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExport}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80">
                    <Download size={15} /> 导出 Excel
                  </button>
                  <button onClick={() => setShowOverview(false)}
                    className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
                    <X size={14} /> 返回
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-card-border bg-card-bg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/50">
                      {["名称", "断面", "沟宽B", "水深h", "加高", "沟深H", "纵坡i", "糙率n",
                        "砌体", "面积A", "湿周X", "半径R", "流速v", "流量Q", "设计Qm", "验算",
                        "砌体量", "抹面", "开挖", "回填"].map((h) => (
                        <th key={h} className="px-2 py-2 text-left font-medium text-muted whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overview.map(({ ditch: d, result: r }) => (
                      <tr key={d.id} className="border-b border-border hover:bg-accent/5 cursor-pointer"
                        onClick={() => { setActiveId(d.id); setShowOverview(false); }}>
                        <td className="px-2 py-2 font-medium">{d.name}</td>
                        <td className="px-2 py-2">{SECTION_TYPES.find(s => s.key === d.sectionType)?.label}</td>
                        <td className="px-2 py-2 font-mono">{d.bottomWidth}</td>
                        <td className="px-2 py-2 font-mono">{d.designDepth}</td>
                        <td className="px-2 py-2 font-mono">{d.freeboard}</td>
                        <td className="px-2 py-2 font-mono">{r ? p(r.H) : "-"}</td>
                        <td className="px-2 py-2 font-mono">{d.ditchSlope}</td>
                        <td className="px-2 py-2 font-mono">{d.roughness}</td>
                        <td className="px-2 py-2">{MASONRY_OPTIONS.find(m => m.key === d.masonryType)?.label}</td>
                        <td className="px-2 py-2 font-mono">{r ? p(r.A) : "-"}</td>
                        <td className="px-2 py-2 font-mono">{r ? p(r.X) : "-"}</td>
                        <td className="px-2 py-2 font-mono">{r ? p(r.R) : "-"}</td>
                        <td className="px-2 py-2 font-mono">{r ? p(r.v) : "-"}</td>
                        <td className="px-2 py-2 font-mono">{r ? p(r.Q, 6) : "-"}</td>
                        <td className="px-2 py-2 font-mono">{r ? p(r.Qm, 6) : "-"}</td>
                        <td className="px-2 py-2">
                          {r && (r.pass
                            ? <span className="text-green-600 font-medium">✓</span>
                            : <span className="text-red-600 font-medium">✗</span>
                          )}
                        </td>
                        <td className="px-2 py-2 font-mono">{r ? p(r.masonryVol) : "-"}</td>
                        <td className="px-2 py-2 font-mono">{r ? p(r.plasterArea) : "-"}</td>
                        <td className="px-2 py-2 font-mono">{r ? p(r.excavVol) : "-"}</td>
                        <td className="px-2 py-2 font-mono">{r ? p(r.backfillVol) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* ── 单条沟渠详情 ────────────────────────────── */
            <>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">{active.name}</h1>
                  <p className="mt-1 text-sm text-muted">GB 51018-2014 附录A.4 截排水设计</p>
                </div>
                <button onClick={handleExport}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80">
                  <Download size={15} />
                  导出 Excel
                </button>
              </div>

              {/* Block 1: 暴雨强度参数 */}
              <Section title="暴雨强度参数" formula="q = Cp × Ct × q5,10">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <NumField label="q5,10" unit="mm/min" value={active.q5_10} onChange={(v) => updateDitch(active.id, { q5_10: v })}
                    hint="湖南取2.0~2.4" />
                  <NumField label="Cp" value={active.Cp} onChange={(v) => updateDitch(active.id, { Cp: v })}
                    hint="重现期转换系数" />
                  <NumField label="Ct" value={active.Ct} onChange={(v) => updateDitch(active.id, { Ct: v })}
                    hint="降雨历时转换系数" />
                </div>
                {activeResult && <ResultRow label="q" value={`${p(activeResult.q)} mm/min`} />}
              </Section>

              {/* Block 2: 汇水区域 */}
              <Section title="汇水区域参数" formula="Qm = 16.67 × φ × q × F">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>汇水面积 F（单位选择）</Label>
                    <div className="flex gap-2 mt-1">
                      <input type="number" step="any" value={active.catchArea}
                        onChange={(e) => updateDitch(active.id, { catchArea: e.target.value })}
                        className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent tabular-nums" />
                      <select value={active.areaUnit}
                        onChange={(e) => updateDitch(active.id, { areaUnit: e.target.value as AreaUnit })}
                        className="w-20 shrink-0 rounded-lg border border-border bg-background px-2 py-2 text-sm font-medium outline-none focus:border-accent text-center">
                        <option value="km2">km²</option>
                        <option value="hm2">hm²</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>地表类型</Label>
                    <select
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        if (idx >= 0) updateDitch(active.id, { phi: RUNOFF_COEFFICIENT_TABLE[idx].psi.split("~")[0] });
                      }}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                    >
                      <option value={-1}>-- 选择地表类型自动填入参考值 --</option>
                      {RUNOFF_COEFFICIENT_TABLE.map((r, i) => (
                        <option key={r.surface} value={i}>{r.surface}（φ = {r.psi}）</option>
                      ))}
                    </select>
                  </div>
                  <NumField label="径流系数 φ" value={active.phi} onChange={(v) => updateDitch(active.id, { phi: v })}
                    hint="手动填入，参考上方地表类型" />
                </div>
                {activeResult && <ResultRow label="Qm" value={`${p(activeResult.Qm, 6)} m³/s`} highlight />}
              </Section>

              {/* Block 3: 排水沟断面设计 */}
              <Section title="排水沟断面设计">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                  <NumField label="沟底纵坡 i" value={active.ditchSlope} onChange={(v) => updateDitch(active.id, { ditchSlope: v })}
                    hint="3/1000~5/1000" />
                </div>
                <Label>断面类型</Label>
                <div className="flex flex-wrap gap-2 mt-1 mb-4">
                  {SECTION_TYPES.map((st) => (
                    <button key={st.key} onClick={() => updateDitch(active.id, { sectionType: st.key as SectionType })}
                      className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
                        active.sectionType === st.key ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:text-foreground"
                      }`}>{st.label}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                  <NumField label="沟宽 B" unit="m" value={active.bottomWidth} onChange={(v) => updateDitch(active.id, { bottomWidth: v })} />
                  <NumField label="设计水深 h" unit="m" value={active.designDepth} onChange={(v) => updateDitch(active.id, { designDepth: v })} />
                  {active.sectionType === "trapezoidal" && (
                    <div>
                      <Label>边坡比</Label>
                      <select value={active.slopeRatio} onChange={(e) => updateDitch(active.id, { slopeRatio: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
                        <option value="0.25">1:0.25</option><option value="0.5">1:0.5</option>
                        <option value="0.75">1:0.75</option><option value="1.0">1:1.0</option>
                        <option value="1.25">1:1.25</option><option value="1.5">1:1.5</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <Label>安全加高 Δh</Label>
                    <select value={active.freeboard} onChange={(e) => updateDitch(active.id, { freeboard: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
                      {FREEBOARD_OPTIONS.map((o) => <option key={o.grade} value={o.value}>{o.value}m（{o.grade}）</option>)}
                    </select>
                  </div>
                </div>
                <Label>砌体类型</Label>
                <div className="flex flex-wrap gap-2 mt-1 mb-4">
                  {MASONRY_OPTIONS.map((mo) => (
                    <button key={mo.key} onClick={() => handleMasonryChange(mo.key)}
                      className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
                        active.masonryType === mo.key ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:text-foreground"
                      }`}>{mo.label}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <NumField label="壁厚" unit="m" value={active.wallThickness} onChange={(v) => updateDitch(active.id, { wallThickness: v })} />
                  <NumField label="底板厚" unit="m" value={active.baseThickness} onChange={(v) => updateDitch(active.id, { baseThickness: v })} />
                  <NumField label="糙率 n" value={active.roughness} onChange={(v) => updateDitch(active.id, { roughness: v })} />
                  <div>
                    <Label>回填经验系数 k</Label>
                    <select value={active.backfillCoeff} onChange={(e) => updateDitch(active.id, { backfillCoeff: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
                      {BACKFILL_COEFF_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs"><thead><tr className="border-b border-border">
                    <th className="py-1 text-left font-medium text-muted">糙率 n</th>
                    {ROUGHNESS_REFERENCE.map((r) => <th key={r.value} className="py-1 text-center font-medium text-muted">{r.value}</th>)}
                  </tr></thead><tbody><tr>
                    <td className="py-1 text-muted">对应</td>
                    {ROUGHNESS_REFERENCE.map((r) => <td key={r.value} className="py-1 text-center text-muted">{r.note}</td>)}
                  </tr></tbody></table>
                </div>
              </Section>

              {/* Block 4: 计算结果 */}
              <Section title="计算结果">
                {!activeResult ? (
                  <p className="text-sm text-muted py-4">请填写上方所有必填参数</p>
                ) : (
                  <div className="space-y-4">
                    <div className={`rounded-lg border p-4 ${
                      activeResult.pass ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">流量校核</span>
                        <span className={`text-sm font-bold ${activeResult.pass ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                          Q = {p(activeResult.Q, 6)} {activeResult.pass ? "≥" : "<"} Qm = {p(activeResult.Qm, 6)} m³/s
                          {activeResult.pass ? " ✓" : " ✗ 需加大断面"}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-sm font-semibold">排水沟排水流量计算表</h4>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm"><tbody>
                        <tr className="border-b border-border"><Td>沟宽 B</Td><Td mono>{p(activeResult.topWidth)} m</Td>
                          <Td>设计水深 h</Td><Td mono>{active.designDepth} m</Td></tr>
                        <tr className="border-b border-border"><Td>安全加高 Δh</Td><Td mono>{active.freeboard} m</Td>
                          <Td>沟深 H</Td><Td mono>{p(activeResult.H)} m</Td></tr>
                        <tr className="border-b border-border"><Td>纵坡 i</Td><Td mono>{active.ditchSlope}</Td>
                          <Td>糙率 n</Td><Td mono>{active.roughness}</Td></tr>
                        <tr className="border-b border-border"><Td>过水面积 A</Td><Td mono>{p(activeResult.A)} m²</Td>
                          <Td>湿周 X</Td><Td mono>{p(activeResult.X)} m</Td></tr>
                        <tr className="border-b border-border"><Td>水力半径 R</Td><Td mono>{p(activeResult.R)} m</Td>
                          <Td>流速 v</Td><Td mono>{p(activeResult.v)} m/s</Td></tr>
                        <tr><Td>排水流量 Q</Td><Td mono>{p(activeResult.Q, 6)} m³/s</Td>
                          <Td>设计流量 Qm</Td><Td mono>{p(activeResult.Qm, 6)} m³/s</Td></tr>
                      </tbody></table>
                    </div>

                    <h4 className="text-sm font-semibold">单位延米工程量（H = {p(activeResult.H)} m）</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {MASONRY_OPTIONS.find((m) => m.key === active.masonryType)?.hasMasonry && (
                        <RCard label="砌体体积" value={`${p(activeResult.masonryVol)} m³/m`} accent />
                      )}
                      <RCard label="抹面面积" value={`${p(activeResult.plasterArea)} m²/m`} />
                      <RCard label="土方开挖量" value={`${p(activeResult.excavVol)} m³/m`} />
                      <RCard label="土方回填量" value={`${p(activeResult.backfillVol)} m³/m`} />
                      <RCard label="外口宽" value={`${p(activeResult.outerW)} m`} />
                      <RCard label="外深度" value={`${p(activeResult.outerD)} m`} />
                    </div>
                  </div>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 子组件 ────────────────────────────────────────────────────

function Section({ title, formula, children }: { title: string; formula?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-card-border bg-card-bg p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {formula && <span className="text-xs text-muted font-mono">{formula}</span>}
      </div>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs text-muted">{children}</label>;
}

function NumField({ label, unit, value, onChange, hint }: {
  label: string; unit?: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <div>
      <Label>{label}{unit && <span className="ml-1 text-muted/60">({unit})</span>}</Label>
      <input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 tabular-nums" />
      {hint && <p className="mt-0.5 text-xs text-muted/50">{hint}</p>}
    </div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm font-medium font-mono ${highlight ? "text-accent" : ""}`}>{value}</span>
    </div>
  );
}

function RCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "border-accent/30 bg-accent/5" : "border-border bg-background"}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={`px-3 py-2 ${mono ? "font-mono" : "text-muted"}`}>{children}</td>;
}
