"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ChartLineUp,
  Calculator,
  GitDiff,
  TreeStructure,
  Table,
  Drop,
  Clock,
  ArrowRight,
} from "@phosphor-icons/react";

const tools = [
  {
    href: "/project-profile",
    title: "项目建设特性表",
    desc: "管理项目建设特性数据，为各功能模块提供基础数据",
    icon: Table,
    color: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
  },
  {
    href: "/progress",
    title: "进度图",
    desc: "生成项目施工进度甘特图，跟踪各阶段完成情况",
    icon: ChartLineUp,
    color: "bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400",
  },
  {
    href: "/hydraulic-calc",
    title: "水力计算",
    desc: "排水沟断面水力计算，支持矩形、梯形、抛物线形断面",
    icon: Drop,
    color: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  },
  {
    href: "/erision-calc",
    title: "流失量计算",
    desc: "水土流失量预测计算，支持多种计算模型",
    icon: Calculator,
    color: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
  },
  {
    href: "/indicator-compare",
    title: "指标对比分析",
    desc: "水土保持指标对比分析，支持53号令和14号文指标对比",
    icon: GitDiff,
    color: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  },
  {
    href: "/measure-system",
    title: "措施体系图",
    desc: "导入Excel体系表，自动生成Draw.io措施体系框图",
    icon: TreeStructure,
    color: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  },
];

const recentItems = [
  { name: "某高速公路项目进度图", time: "2 小时前" },
  { name: "开发区水土流失量计算", time: "昨天" },
  { name: "河道整治工程进度图", time: "3 天前" },
];

export default function Home() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          工作台
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          水土保持报告编制工具箱
        </p>
      </div>

      {/* Tool cards */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-muted">工具</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.href}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={tool.href}
                className="group block rounded-xl border border-card-border bg-card-bg p-5 transition-all hover:border-accent/30 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${tool.color}`}
                  >
                    <tool.icon size={22} weight="duotone" />
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </div>
                <h3 className="mt-3.5 text-[15px] font-semibold">
                  {tool.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {tool.desc}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-muted">最近使用</h2>
        <div className="divide-y divide-border rounded-xl border border-card-border bg-card-bg">
          {recentItems.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between px-5 py-3.5"
            >
              <span className="text-sm font-medium">{item.name}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Clock size={13} />
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
