# JavaScript 模块说明

本目录包含拆分后的 JavaScript 模块文件。

## 文件结构

- **utils.js** - 工具函数
  - `safeDecodeURIComponent()` - 安全解码 URL
  - `getCurrentPath()` - 从 URL 获取当前路径

- **markdown.js** - Markdown 处理相关函数
  - `convertCheckboxMarkers()` - 转换复选框标记
  - `removeAutoLinks()` - 移除自动链接
  - `removeH1Tags()` - 移除 h1 标签
  - `processMath()` - 处理数学公式
  - `renderMath()` - 渲染数学公式
  - `configureMarked()` - 配置 Marked 库

- **navigation.js** - 导航相关函数
  - `loadNavigationData()` - 加载导航数据
  - `getDefaultExpandedChapter()` - 获取默认展开的章节

- **analytics.js** - 统计分析相关函数
  - `trackBaiduAnalytics()` - 发送百度统计数据
  - `trackGoogleAnalytics()` - 发送 Google Analytics 数据
  - `trackPageView()` - 发送所有统计数据

- **content-loader.js** - 内容加载相关函数
  - `loadMarkdownFile()` - 加载 Markdown 文件
  - `processMarkdownContent()` - 处理并渲染 Markdown 内容
  - `renderMathAfterUpdate()` - 在 DOM 更新后渲染数学公式

## 主文件

- **app.js** - Vue 3 主应用文件，导入并使用上述模块

## 使用说明

所有模块使用 ES6 模块语法（`import`/`export`），通过 Vite 构建工具处理。

