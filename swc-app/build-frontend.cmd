@echo off
setlocal
REM 使用系统 Node.js（而非 DSH 包装的 Electron node）运行 Next.js 生产构建，
REM 因为 DSH 包装 node 无法捕获 tsc 子进程的 piped stdio 输出。
"C:\Program Files\nodejs\node.exe" node_modules/next/dist/bin/next build
exit /b %errorlevel%
