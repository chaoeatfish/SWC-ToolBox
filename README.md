# SWC-ToolBox — 水土保持工具箱

供个人使用的水土保持报告编制工具箱，基于 Next.js 16 + React 19 + Tailwind CSS 4 构建，通过 Tauri 2 打包为桌面应用。

功能需求和验收标准见 [PRD.md](PRD.md)。

## 启动

```bash
cd swc-app
pnpm install
pnpm dev
```

浏览器访问 http://localhost:3000

## 构建桌面版

```bash
cd swc-app
pnpm tauri build
```

产物：`swc-app/src-tauri/target/release/swc-app.exe`

## 功能概览（v0.1.0）

| 模块 | 路由 | 说明 | 状态 |
|------|------|------|------|
| 工作台 | `/` | 核心模块入口 | 完成 |
| 进度图 | `/progress` | 施工进度甘特图 | 完成 |
| 水力计算 | `/hydraulic-calc` | 排水沟水力计算（GB 51018-2014） | UI 完成，计算待接入 |
| 措施体系图 | `/measure-system` | Excel 导入 → Draw.io 框图 | 完成 |

降级模块（侧边栏隐藏，路由可直接访问）：项目建设特性表、流失量计算、指标对比分析、设置。

## 技术栈

- **前端**: Next.js 16 (App Router) + React 19
- **样式**: Tailwind CSS 4
- **图标**: @phosphor-icons/react
- **动画**: motion (framer-motion)
- **Excel**: xlsx
- **桌面**: Tauri 2

## 项目结构

```
.
├── PRD.md                          # 产品需求文档（功能清单 + 验收标准）
├── AGENTS.md                       # AI agent 开发指南（代码约定 + 架构模式）
├── docs/                           # 设计文档与规范参考
│   ├── 水力计算流程.md
│   ├── hydraulic-calc-spec.md
│   └── reference/                  # 规范数据（xlsx, docx, png）
└── swc-app/                        # 主应用
    ├── src/
    │   ├── app/                    # Next.js App Router 页面
    │   ├── components/             # 可复用组件
    │   └── lib/                    # 业务逻辑与数据模型
    └── src-tauri/                  # Tauri 桌面应用配置
```

## 开发阶段

当前版本：**v0.1.0**。下一个目标：Phase 1.5 — 进度图智能化（措施体系图导入 + 自动排期）。详细进度见 [PRD.md](PRD.md)。
