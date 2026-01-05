@echo off
REM Windows 启动脚本 - 使用 Vite
echo 正在启动 OpenBook 开发服务器...
echo.

cd /d "%~dp0"

REM 检查是否已安装依赖
if not exist "node_modules" (
    echo 首次运行，正在安装依赖...
    if exist "%ProgramFiles%\nodejs\npm.cmd" (
        call npm install
    ) else (
        echo 错误: 未找到 npm，请先安装 Node.js
        pause
        exit /b 1
    )
)

REM 启动 Vite 开发服务器
if exist "%ProgramFiles%\nodejs\npm.cmd" (
    call npm run dev
) else (
    echo 错误: 未找到 npm
    pause
    exit /b 1
)

