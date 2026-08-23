"use client";

import { Gear, Monitor, Moon, Sun, Palette } from "@phosphor-icons/react";

const settingsSections = [
  {
    title: "外观",
    items: [
      {
        label: "主题",
        desc: "跟随系统 / 浅色 / 深色",
        icon: Palette,
        control: "select" as const,
      },
      {
        label: "语言",
        desc: "界面语言设置",
        icon: Monitor,
        control: "select" as const,
      },
    ],
  },
  {
    title: "计算",
    items: [
      {
        label: "默认精度",
        desc: "小数位数",
        icon: Gear,
        control: "input" as const,
      },
      {
        label: "自动保存",
        desc: "计算结果自动保存到本地",
        icon: Gear,
        control: "toggle" as const,
      },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">设置</h1>
        <p className="mt-1.5 text-sm text-muted">应用偏好设置</p>
      </div>

      {settingsSections.map((section) => (
        <div
          key={section.title}
          className="rounded-xl border border-card-border bg-card-bg"
        >
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-medium">{section.title}</h2>
          </div>
          <div className="divide-y divide-border">
            {section.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className="text-muted" />
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted">{item.desc}</p>
                  </div>
                </div>
                {item.control === "toggle" && (
                  <div className="flex h-6 w-11 cursor-pointer items-center rounded-full bg-accent p-0.5">
                    <div className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform translate-x-5" />
                  </div>
                )}
                {item.control === "select" && (
                  <div className="h-9 w-32 rounded-lg border border-border bg-background" />
                )}
                {item.control === "input" && (
                  <div className="h-9 w-24 rounded-lg border border-border bg-background" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
