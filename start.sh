#!/bin/bash
# 启动 Vite 开发服务器来查看 OpenBook 网站

echo "正在启动 OpenBook 开发服务器..."
echo ""

cd "$(dirname "$0")"

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "首次运行，正在安装依赖..."
    if command -v npm &> /dev/null; then
        npm install
    elif command -v yarn &> /dev/null; then
        yarn install
    else
        echo "错误: 未找到 npm 或 yarn，请先安装 Node.js"
        exit 1
    fi
fi

# 启动 Vite 开发服务器
if command -v npm &> /dev/null; then
    npm run dev
elif command -v yarn &> /dev/null; then
    yarn dev
else
    echo "错误: 未找到 npm 或 yarn"
    exit 1
fi
