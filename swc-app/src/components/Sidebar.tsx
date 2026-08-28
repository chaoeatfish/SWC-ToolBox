"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  ChartLineUp,
  TreeStructure,
  Drop,
} from "@phosphor-icons/react";

const navItems = [
  { href: "/", label: "工作台", icon: House },
  { href: "/progress", label: "进度图", icon: ChartLineUp },
  { href: "/hydraulic-calc", label: "水力计算", icon: Drop },
  { href: "/measure-system", label: "措施体系图", icon: TreeStructure },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-sidebar-bg border-r border-border">
      {/* Logo / App name */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
          SW
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-sidebar-fg">
          SWC Toolbox
        </span>
      </div>

      {/* Nav */}
      <nav className="mt-4 flex-1 px-3">
        <ul className="flex flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent/10 text-accent font-semibold"
                      : "text-sidebar-fg/70 hover:bg-black/5 hover:text-sidebar-fg"
                  }`}
                >
                  <Icon
                    size={20}
                    weight={active ? "fill" : "regular"}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-5 py-4">
        <p className="text-xs text-sidebar-fg/40">v0.1.0</p>
      </div>
    </aside>
  );
}
