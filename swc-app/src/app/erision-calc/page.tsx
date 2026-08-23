"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Calculator,
  Leaf,
  Drop,
  Wind,
  Info,
} from "@phosphor-icons/react";

const models = [
  { id: "usle", name: "USLE 通用土壤流失方程", icon: Leaf },
  { id: "rcls", name: "径流场实测法", icon: Drop },
  { id: "wind", name: "风力侵蚀模型", icon: Wind },
];

export default function ErisionCalcPage() {
  const [selectedModel, setSelectedModel] = useState("usle");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          水土流失量计算
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          选择计算模型，输入参数，获取预测结果
        </p>
      </div>

      {/* Model selector */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => setSelectedModel(model.id)}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
              selectedModel === model.id
                ? "border-accent bg-accent-light shadow-sm"
                : "border-card-border bg-card-bg hover:border-accent/30"
            }`}
          >
            <model.icon
              size={20}
              weight="duotone"
              className={
                selectedModel === model.id ? "text-accent" : "text-muted"
              }
            />
            <span className="text-sm font-medium">{model.name}</span>
          </button>
        ))}
      </div>

      {/* Input form */}
      <motion.div
        key={selectedModel}
        className="rounded-xl border border-card-border bg-card-bg p-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="mb-5 text-sm font-medium">计算参数</h2>

        {selectedModel === "usle" && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                降雨侵蚀力因子 R
              </label>
              <input
                type="number"
                placeholder="例：350.5"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
              <p className="mt-1 flex items-center gap-1 text-xs text-muted/70">
                <Info size={11} />
                MJ·mm/(hm²·h·a)
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                土壤可蚀性因子 K
              </label>
              <input
                type="number"
                placeholder="例：0.032"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
              <p className="mt-1 flex items-center gap-1 text-xs text-muted/70">
                <Info size={11} />
                t·h/(MJ·mm)
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                坡长因子 L
              </label>
              <input
                type="number"
                placeholder="例：1.25"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                坡度因子 S
              </label>
              <input
                type="number"
                placeholder="例：0.85"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                植被覆盖因子 C
              </label>
              <input
                type="number"
                placeholder="例：0.15"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                水保措施因子 P
              </label>
              <input
                type="number"
                placeholder="例：0.5"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
          </div>
        )}

        {selectedModel === "rcls" && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                径流深 (mm)
              </label>
              <input
                type="number"
                placeholder="例：125.3"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                含沙量 (kg/m³)
              </label>
              <input
                type="number"
                placeholder="例：3.2"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                集水面积 (hm²)
              </label>
              <input
                type="number"
                placeholder="例：50.0"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
          </div>
        )}

        {selectedModel === "wind" && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                风速 (m/s)
              </label>
              <input
                type="number"
                placeholder="例：6.5"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                地表粗糙度
              </label>
              <input
                type="number"
                placeholder="例：0.05"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                土壤含水量 (%)
              </label>
              <input
                type="number"
                placeholder="例：12.5"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button className="flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90">
            <Calculator size={15} />
            计算
          </button>
          <button className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-accent-light">
            重置
          </button>
        </div>
      </motion.div>

      {/* Result area (placeholder) */}
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <Calculator size={32} className="mx-auto text-muted/30" />
        <p className="mt-3 text-sm text-muted">
          填写参数后点击计算，结果将在此显示
        </p>
      </div>
    </div>
  );
}
