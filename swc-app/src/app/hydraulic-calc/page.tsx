"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Drop, Download, Plus, Trash, PencilSimple, List, X } from "@phosphor-icons/react";
import {
  SECTION_TYPES, MASONRY_OPTIONS, FLOW_VELOCITY_TABLE,
  RUNOFF_COEFFICIENT_TABLE, FREEBOARD_OPTIONS, BACKFILL_COEFF_OPTIONS,
  designRainfallIntensity, designPeakFlow,
  chezyCoefficient, drainFlow, flowVelocity, sectionGeometry,
  sectionQuantities, type SectionType, type MasonryType, type AreaUnit,
  M1_ROUGHNESS_TABLE, CP_REGIONS, CP_RETURN_PERIODS, cpLookup,
  ctBilinearInterp, slopeConfluenceTime, conduitVelocity, conduitConfluenceTime,
  type CpRegion, ROUGHNESS_CATEGORY_OPTIONS,
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
    const wt = parseFloat(d.wallThickness) || 0;
    const tb = parseFloat(d.baseThickness) || 0;
    const fb = parseFloat(d.freeboard) || 0;
    const k = parseFloat(d.backfillCoeff) || 1;

    if (F <= 0 || B <= 0 || h <= 0 || i <= 0 || n <= 0) return null;

    // Cp 推荐值
    const cpRec = cpLookup(d.cpRegion as CpRegion, parseInt(d.cpReturnPeriod) || 5);

    // 坡面汇流历时 t1
    const m1Val = parseFloat(d.m1) || 0;
    const Ls = parseFloat(d.slopeFlowLength) || 0;
    const is_ = parseFloat(d.slopeFlowGradient) || 0;
    const t1 = slopeConfluenceTime(m1Val, Ls, is_);

    // 沟道汇流历时 t2（公式 A.4.2-2 + A.4.2-5）
    const conduitL = parseFloat(d.conduitLength) || 0;
    const conduitIg = parseFloat(d.conduitSlope) || 0;
    const conduitV = conduitVelocity(conduitIg);
    const t2 = conduitConfluenceTime([{ length: conduitL, slope: conduitIg }]);
    const t_total = t1 + t2;

    // Ct 推荐值（双线性插值）
    const c60 = parseFloat(d.C60) || 0;
    const ctRec = (c60 > 0 && t_total > 0) ? ctBilinearInterp(c60, t_total) : 0;

    const q = designRainfallIntensity(q5, cp, ct);
    const Qm = designPeakFlow(psi, q, F, d.areaUnit);
    const geo = sectionGeometry(d.sectionType, B, h, m_val);
    const C = chezyCoefficient(n, geo.hydraulicRadius);
    const v = flowVelocity(C, geo.hydraulicRadius, i);
    const Q = drainFlow(geo.flowArea, C, geo.hydraulicRadius, i);
    const H = h + fb;
    const geoT = sectionGeometry(d.sectionType, B, H, m_val);
    const qty = sectionQuantities(d.sectionType, B, H, m_val, wt, tb, k);

    return {
      cpRecommended: cpRec, ctRecommended: ctRec,
      t1, t2, t: t_total, conduitV,
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

  // ── 必填字段检查 ──────────────────────────────────────────
  const getMissingFields = useCallback((d: DitchRecord): string[] => {
    const missing: string[] = [];
    if (!d.catchArea || parseFloat(d.catchArea) <= 0) missing.push("汇水面积 F");
    if (!d.phi || parseFloat(d.phi) <= 0) missing.push("径流系数 φ");
    if (!d.q5_10 || parseFloat(d.q5_10) <= 0) missing.push("q5,10");
    if (!d.Cp || parseFloat(d.Cp) <= 0) missing.push("Cp");
    if (!d.Ct || parseFloat(d.Ct) <= 0) missing.push("Ct");
    if (!d.ditchSlope || parseFloat(d.ditchSlope) <= 0) missing.push("沟底纵坡 i");
    if (!d.bottomWidth || parseFloat(d.bottomWidth) <= 0) missing.push("沟宽 B");
    if (!d.designDepth || parseFloat(d.designDepth) <= 0) missing.push("设计水深 h");
    if (!d.roughness || parseFloat(d.roughness) <= 0) missing.push("糙率 n");
    return missing;
  }, []);

  // ── 应用推荐值 ────────────────────────────────────────────
  const applyCpRecommend = () => {
    if (!active || !activeResult) return;
    updateDitch(active.id, { Cp: String(activeResult.cpRecommended), cpManualOverride: false });
  };
  const applyCtRecommend = () => {
    if (!active || !activeResult) return;
    updateDitch(active.id, { Ct: activeResult.ctRecommended.toFixed(4), ctManualOverride: false });
  };

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
      "排水沟类别": d.roughnessCategory !== "-1" ? ROUGHNESS_CATEGORY_OPTIONS[Number(d.roughnessCategory)]?.label ?? "/" : "/",
      "砌体类型": MASONRY_OPTIONS.find(m => m.key === d.masonryType)?.label ?? d.masonryType,
      "壁厚(m)": d.wallThickness,
      "底板厚(m)": d.baseThickness,
      "汇水面积F": `${d.catchArea} ${d.areaUnit === "km2" ? "km²" : "hm²"}`,
      "径流系数φ": d.phi,
      "地面粗度系数m1": d.m1,
      "坡面流长度Ls(m)": d.slopeFlowLength,
      "坡面流坡降is": d.slopeFlowGradient,
      "坡面汇流历时t1(min)": r && r.t1 > 0 ? p(r.t1, 2) : "-",
      "沟段长度L(m)": d.conduitLength,
      "沟段坡度ig": d.conduitSlope,
      "沟道平均流速v(m/s)": r && r.conduitV > 0 ? p(r.conduitV, 2) : "-",
      "沟道汇流历时t2(min)": r && r.t2 > 0 ? p(r.t2, 2) : "-",
      "总汇流历时t(min)": r && r.t > 0 ? p(r.t, 2) : "-",
      "C60": d.C60,
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
                    className={`group w-full text-left px-3 py-2 text-sm transition-colors ${
                      isActive ? "bg-accent/10 text-accent font-medium" : "text-foreground hover:bg-muted/30"
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="truncate">{d.name}</span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <div className="px-6 py-5 space-y-4">
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

              {/* Anchor nav */}
              <nav className="sticky top-0 z-10 -mx-8 px-8 py-2 bg-background/90 backdrop-blur border-b border-border">
                <div className="flex gap-1 overflow-x-auto">
                  {[
                    { id: "sec-cp", label: "Cp" },
                    { id: "sec-ct", label: "Ct" },
                    { id: "sec-rain", label: "暴雨强度" },
                    { id: "sec-catch", label: "汇水区域" },
                    { id: "sec-ditch", label: "断面设计" },
                    { id: "sec-result", label: "计算结果" },
                  ].map((s) => (
                    <a key={s.id} href={`#${s.id}`}
                      className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-muted/50 transition-colors">
                      {s.label}
                    </a>
                  ))}
                </div>
              </nav>

              {/* Block 0a: Cp 计算 */}
              <div id="sec-cp">
              <Section title="Cp 重现期转换系数" formula="查表 A.4.1-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>气候区</Label>
                    <select value={active.cpRegion}
                      title={CP_REGIONS.find(r => r.key === active.cpRegion)?.label}
                      onChange={(e) => updateDitch(active.id, { cpRegion: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
                      {CP_REGIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>重现期 P（年）</Label>
                    <select value={active.cpReturnPeriod}
                      onChange={(e) => updateDitch(active.id, { cpReturnPeriod: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
                      {CP_RETURN_PERIODS.map((p_) => <option key={p_} value={p_}>{p_} 年</option>)}
                    </select>
                  </div>
                </div>
                {activeResult && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-muted">推荐 Cp</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium font-mono text-accent">{p(activeResult.cpRecommended, 2)}</span>
                      {!active.cpManualOverride && (
                        <button onClick={applyCpRecommend}
                          className="rounded border border-accent/30 px-2 py-0.5 text-xs text-accent hover:bg-accent/10 transition-colors">
                          采用
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Section>
              </div>

              {/* Block 0b: Ct 计算 */}
              <div id="sec-ct">
              <Section title="Ct 降雨历时转换系数" formula="t = t1 + t2 → 查表 A.4.1-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 坡面汇流 */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-foreground border-l-2 border-accent pl-2">坡面汇流历时 t1</h4>
                    <div>
                      <Label>地表类型</Label>
                      <select value={active.m1SurfaceType}
                        onChange={(e) => {
                          const idx = Number(e.target.value);
                          updateDitch(active.id, {
                            m1SurfaceType: e.target.value,
                            m1: idx >= 0 ? String(M1_ROUGHNESS_TABLE[idx].m1) : "",
                          });
                        }}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
                        <option value={-1}>-- 选择地表类型 --</option>
                        {M1_ROUGHNESS_TABLE.map((r, i) => (
                          <option key={r.surface} value={i}>{r.surface}（m₁ = {r.m1}）</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <NumField label="m₁" value={active.m1} onChange={(v) => updateDitch(active.id, { m1: v })}
                        hint="粗度系数" min={0.01} max={1} step={0.01} />
                      <NumField label="Ls" unit="m" value={active.slopeFlowLength}
                        onChange={(v) => updateDitch(active.id, { slopeFlowLength: v })}
                        hint="坡面流长度" placeholder="如 50" min={1} max={10000} step={1} />
                      <NumField label="is" value={active.slopeFlowGradient}
                        onChange={(v) => updateDitch(active.id, { slopeFlowGradient: v })}
                        hint="坡面流坡降" placeholder="如 0.05" min={0.001} max={1} step={0.001} />
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-muted">t1 = 1.445 × (m₁ × Ls / √is)^0.467</span>
                      <span className="text-sm font-medium font-mono">
                        {activeResult && activeResult.t1 > 0 ? `${p(activeResult.t1, 2)} min` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* 沟道汇流 + 汇总 */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-foreground border-l-2 border-accent pl-2">沟道汇流历时 t2</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <NumField label="L" unit="m" value={active.conduitLength}
                        onChange={(v) => updateDitch(active.id, { conduitLength: v })}
                        hint="沟（管）段长度" placeholder="如 100" min={1} max={10000} step={1} />
                      <NumField label="ig" value={active.conduitSlope}
                        onChange={(v) => updateDitch(active.id, { conduitSlope: v })}
                        hint="平均坡度" placeholder="如 0.01" min={0.001} max={1} step={0.001} />
                    </div>
                    {activeResult && activeResult.conduitV > 0 && (
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-muted">v = 20 × ig^0.6</span>
                        <span className="text-sm font-medium font-mono">{p(activeResult.conduitV, 2)} m/s</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-muted">t2 = L / (60 × v)</span>
                      <span className="text-sm font-medium font-mono">
                        {activeResult && activeResult.t2 > 0 ? `${p(activeResult.t2, 2)} min` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-muted">t = t1 + t2</span>
                      <span className="text-sm font-medium font-mono">
                        {activeResult && activeResult.t > 0 ? `${p(activeResult.t, 2)} min` : "—"}
                      </span>
                    </div>
                    <hr className="border-border" />
                    <h4 className="text-xs font-semibold text-foreground border-l-2 border-accent pl-2">Ct 查表</h4>
                    <NumField label="C60" value={active.C60}
                      onChange={(v) => updateDitch(active.id, { C60: v })}
                      hint="60min雨力参数，湖南取0.30~0.50" placeholder="如 0.40" min={0.1} max={0.8} step={0.01} />
                    {activeResult && activeResult.ctRecommended > 0 && (
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-muted">推荐 Ct（双线性插值）</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium font-mono text-accent">{p(activeResult.ctRecommended, 4)}</span>
                          {!active.ctManualOverride && (
                            <button onClick={applyCtRecommend}
                              className="rounded border border-accent/30 px-2 py-0.5 text-xs text-accent hover:bg-accent/10 transition-colors">
                              采用
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Section>
              </div>

              {/* Block 1: 暴雨强度参数 */}
              <div id="sec-rain">
              <Section title="暴雨强度参数" formula="q = Cp × Ct × q5,10">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <NumField label="q5,10" unit="mm/min" value={active.q5_10} onChange={(v) => updateDitch(active.id, { q5_10: v })}
                    hint="湖南取2.0~2.4" min={0.1} max={10} step={0.1} />
                  <NumField label="Cp" value={active.Cp} onChange={(v) => updateDitch(active.id, { Cp: v, cpManualOverride: true })}
                    hint={activeResult ? `推荐: ${p(activeResult.cpRecommended, 2)}` : "重现期转换系数"} min={0.3} max={3} step={0.01} />
                  <NumField label="Ct" value={active.Ct} onChange={(v) => updateDitch(active.id, { Ct: v, ctManualOverride: true })}
                    hint={activeResult && activeResult.ctRecommended > 0 ? `推荐: ${p(activeResult.ctRecommended, 4)}` : "降雨历时转换系数"} min={0.05} max={2} step={0.01} />
                  <div /> {/* placeholder for alignment */}
                </div>
                {activeResult && <ResultRow label="q" value={`${p(activeResult.q)} mm/min`} />}
              </Section>
              </div>

              {/* Block 2: 汇水区域 */}
              <div id="sec-catch">
              <Section title="汇水区域参数" formula="Qm = 16.67 × φ × q × F">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>汇水面积 F（单位选择）</Label>
                    <div className="flex gap-2 mt-1">
                      <input type="number" step={active.areaUnit === "km2" ? 0.001 : 0.01}
                        min={0.001} max={10000} value={active.catchArea}
                        placeholder={active.areaUnit === "km2" ? "如 0.5" : "如 50"}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v !== "" && parseFloat(v) >= 0) updateDitch(active.id, { catchArea: v });
                          else if (v === "") updateDitch(active.id, { catchArea: v });
                        }}
                        className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent tabular-nums placeholder:text-muted/30" />
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
                    hint="手动填入，参考上方地表类型" min={0.01} max={0.99} step={0.01} />
                </div>
                {activeResult && <ResultRow label="Qm" value={`${p(activeResult.Qm, 6)} m³/s`} highlight />}
              </Section>
              </div>

              {/* Block 3: 排水沟断面设计 */}
              <div id="sec-ditch">
              <Section title="排水沟断面设计">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                  <NumField label="沟底纵坡 i" value={active.ditchSlope} onChange={(v) => updateDitch(active.id, { ditchSlope: v })}
                    hint="3/1000~5/1000" min={0.001} max={0.1} step={0.001} />
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
                  <NumField label="沟宽 B" unit="m" value={active.bottomWidth} onChange={(v) => updateDitch(active.id, { bottomWidth: v })}
                    min={0.1} max={10} step={0.05} />
                  <NumField label="设计水深 h" unit="m" value={active.designDepth} onChange={(v) => updateDitch(active.id, { designDepth: v })}
                    min={0.1} max={5} step={0.05} />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>排水沟类别</Label>
                    <select value={active.roughnessCategory}
                      title={Number(active.roughnessCategory) >= 0
                        ? `${ROUGHNESS_CATEGORY_OPTIONS[Number(active.roughnessCategory)]?.label}（n = ${ROUGHNESS_CATEGORY_OPTIONS[Number(active.roughnessCategory)]?.display}）`
                        : undefined}
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        updateDitch(active.id, {
                          roughnessCategory: e.target.value,
                          roughness: idx >= 0 ? String(ROUGHNESS_CATEGORY_OPTIONS[idx].n) : active.roughness,
                        });
                      }}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
                      <option value={-1}>-- 选择类别自动推荐 --</option>
                      {ROUGHNESS_CATEGORY_OPTIONS.map((r, i) => (
                        <option key={r.label} value={i}>{r.label}（n = {r.display}）</option>
                      ))}
                    </select>
                  </div>
                  <NumField label="糙率 n" value={active.roughness} onChange={(v) => updateDitch(active.id, { roughness: v })}
                    min={0.005} max={0.1} step={0.001} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <NumField label="壁厚" unit="m" value={active.wallThickness} onChange={(v) => updateDitch(active.id, { wallThickness: v })}
                    min={0} max={2} step={0.01} />
                  <NumField label="底板厚" unit="m" value={active.baseThickness} onChange={(v) => updateDitch(active.id, { baseThickness: v })}
                    min={0} max={2} step={0.01} />
                  <div>
                    <Label>回填经验系数 k</Label>
                    <select value={active.backfillCoeff} onChange={(e) => updateDitch(active.id, { backfillCoeff: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
                      {BACKFILL_COEFF_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

              </Section>
              </div>

              {/* Block 4: 计算结果 */}
              <div id="sec-result">
              <Section title="计算结果">
                {!activeResult ? (
                  <div className="py-4">
                    <p className="text-sm text-muted mb-3">以下必填参数尚未填写，填完后自动计算：</p>
                    <div className="flex flex-wrap gap-2">
                      {getMissingFields(active).map((f) => (
                        <span key={f} className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                          <span className="font-medium">✗</span> {f}
                        </span>
                      ))}
                    </div>
                  </div>
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

                    <h4 className="text-sm font-semibold">汇流历时与暴雨强度</h4>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm"><tbody>
                        <tr className="border-b border-border"><Td>坡面汇流历时 t1</Td><Td mono>{activeResult.t1 > 0 ? `${p(activeResult.t1, 2)} min` : "—"}</Td>
                          <Td>沟道汇流历时 t2</Td><Td mono>{activeResult.t2 > 0 ? `${p(activeResult.t2, 2)} min` : "—"}</Td></tr>
                        <tr className="border-b border-border"><Td>总汇流历时 t</Td><Td mono>{activeResult.t > 0 ? `${p(activeResult.t, 2)} min` : "—"}</Td>
                          <Td>降雨历时转换系数 Ct</Td><Td mono>{activeResult.ctRecommended > 0 ? p(activeResult.ctRecommended, 4) : "—"}</Td></tr>
                        <tr className="border-b border-border"><Td>重现期转换系数 Cp</Td><Td mono>{p(activeResult.cpRecommended, 2)}</Td>
                          <Td>暴雨强度 q</Td><Td mono>{p(activeResult.q)} mm/min</Td></tr>
                        <tr><Td>设计洪峰流量 Qm</Td><Td mono>{p(activeResult.Qm, 6)} m³/s</Td>
                          <Td>径流系数 φ</Td><Td mono>{active.phi}</Td></tr>
                      </tbody></table>
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {MASONRY_OPTIONS.find((m) => m.key === active.masonryType)?.hasMasonry && (
                        <RCard label="砌体体积" value={`${p(activeResult.masonryVol)} m³/m`} accent />
                      )}
                      <RCard label="抹面面积" value={`${p(activeResult.plasterArea)} m²/m`} />
                      <RCard label="土方开挖量" value={`${p(activeResult.excavVol)} m³/m`} />
                      <RCard label="土方回填量" value={`${p(activeResult.backfillVol)} m³/m`} />
                      <RCard label="外口宽" value={`${p(activeResult.outerW)} m`} />
                      <RCard label="外深度" value={`${p(activeResult.outerD)} m`} />
                    </div>
                    <div className="flex justify-end pt-2">
                      <button onClick={handleExport}
                        className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80">
                        <Download size={15} /> 导出 Excel
                      </button>
                    </div>
                  </div>
                )}
              </Section>
              </div>
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
    <section className="rounded-xl border border-card-border bg-card-bg p-4">
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

function NumField({ label, unit, value, onChange, hint, placeholder, min, max, step }: {
  label: string; unit?: string; value: string; onChange: (v: string) => void; hint?: string;
  placeholder?: string; min?: number; max?: number; step?: number;
}) {
  return (
    <div>
      <Label>{label}{unit && <span className="ml-1 text-muted/60">({unit})</span>}</Label>
      <input type="number" value={value}
        min={min} max={max} step={step ?? 0.01}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "" || v === "-") { onChange(v); return; }
          const n = parseFloat(v);
          if (isNaN(n)) return;
          if (min !== undefined && n < min) return;
          if (max !== undefined && n > max) return;
          onChange(v);
        }}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 tabular-nums placeholder:text-muted/30" />
      {hint && <p className="mt-0.5 text-[11px] leading-tight text-muted/70">{hint}</p>}
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
