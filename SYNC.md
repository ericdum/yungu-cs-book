# OpenBook 静态网站

这是将 LaTeX 讲义转换为 Markdown 格式并展示为 Vue 静态网站的目录。

## 文件结构

- `index.html` - 主页面
- `app.js` - Vue 应用逻辑
- `styles.css` - 样式文件
- `data/` - 数据目录（所有内容文件）
  - `navigation.json` - 导航结构（自动生成）
  - `[章节名]/` - 各章节目录，包含转换后的 Markdown 文件
  - `images/` - 图片资源目录

## 使用方法

### 1. 转换 LaTeX 文件

当更新了 `chapters/` 目录中的 `.tex` 文件后，运行转换脚本：

#### 方法一：使用 npm 命令（推荐）

```bash
npm run convert
```

#### 方法二：直接运行 Python 脚本

```bash
python3 tools/tex_to_markdown.py elegantbook-cn.tex openbook/
```

#### 方法三：转换后自动启动开发服务器

```bash
npm run convert:watch
```

这个脚本会：
- 读取主 LaTeX 文件 (`elegantbook-cn.tex`)
- 解析章节结构
- 将所有 `.tex` 文件转换为 Markdown 格式
- 按 section 拆分为独立的 `.md` 文件
- 将所有内容文件（包括 Markdown、图片、导航文件）放到 `data/` 目录
- 生成 `data/navigation.json` 导航文件

### 2. 查看网站

**重要：由于浏览器的 CORS 安全策略，不能直接双击打开 `index.html` 文件。必须使用开发服务器。**

#### 方法一：使用提供的启动脚本（推荐）

**macOS/Linux:**
```bash
cd openbook
./start.sh
```

**Windows:**
```cmd
cd openbook
start.bat
```

脚本会自动：
1. 检查并安装依赖（首次运行）
2. 启动 Vite 开发服务器
3. 自动在浏览器中打开网站

#### 方法二：手动启动

**使用 npm:**
```bash
cd openbook
npm install  # 首次运行需要
npm run dev
```

**使用 yarn:**
```bash
cd openbook
yarn install  # 首次运行需要
yarn dev
```

服务器会在 `http://localhost:8000` 启动，并自动打开浏览器。

**注意：** 
- 如果直接打开 `index.html` 文件，会遇到 CORS 错误，无法加载 `navigation.json` 和其他 Markdown 文件。
- 需要先安装 Node.js (https://nodejs.org/)

## 转换脚本功能

转换脚本 (`tools/tex_to_markdown.py`) 支持以下 LaTeX 格式：

- ✅ 章节标题 (`\section`, `\subsection` 等)
- ✅ 文本格式 (`\textbf`, `\textit`, `\texttt` 等)
- ✅ 列表 (`enumerate`, `itemize`)
- ✅ 表格 (`tabular` 环境)
- ✅ 数学公式 (`$...$`, `$$...$$`, `equation`, `align` 等)
- ✅ 提示框 (`tcolorbox` 环境)
- ✅ 图片 (`\includegraphics`)
- ✅ 代码块 (`minted` 环境)
- ✅ 引用 (`\cite`)
- ✅ 转义字符 (`\%`, `\_`, `\&` 等)

## 注意事项

1. **每次更新 tex 文件后都要重新运行转换脚本**
   - 使用 `npm run convert` 或 `python3 tools/tex_to_markdown.py elegantbook-cn.tex openbook/`
2. **图片路径**：确保图片文件在正确的位置（通常是 `images/` 目录）
3. **中文路径**：所有文件路径都支持中文，浏览器会自动处理编码

## 技术栈

- Vue 3 (CDN)
- Vite - 开发服务器和构建工具
- Marked.js - Markdown 渲染
- KaTeX - 数学公式渲染

## 开发服务器

本项目使用 Vite 作为开发服务器，提供：
- 快速的热模块替换 (HMR)
- 自动打开浏览器
- 优化的开发体验

## 构建生产版本

如果需要构建生产版本：

```bash
npm run build
```

构建后的文件会在 `dist/` 目录中。
