@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo 找不到 npm。请先安装 Node.js，并重新打开此窗口。
  pause
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo 请先在此项目目录执行 npm ci，安装依赖后再启动。
  pause
  exit /b 1
)

echo 正在启动动迹 MotionTrace，浏览器会自动打开。
echo 使用期间请保留此窗口。停止服务可按 Ctrl+C。
call npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort --open
set "motiontrace_exit=%errorlevel%"
if not "%motiontrace_exit%"=="0" (
  echo 启动失败。请查看上方提示；如果 5173 端口被占用，请关闭之前的服务窗口。
  pause
)
exit /b %motiontrace_exit%
