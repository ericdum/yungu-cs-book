import { cp, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const distDir = 'dist';
const dataDir = 'data';
const imagesDir = 'images';
const htaccessFile = '.htaccess';

async function copyAssets() {
  try {
    // 检查 dist 目录是否存在
    if (!existsSync(distDir)) {
      console.error(`错误: ${distDir} 目录不存在，请先运行 npm run build`);
      process.exit(1);
    }

    // 复制 data 目录
    if (existsSync(dataDir)) {
      console.log(`正在复制 ${dataDir} 目录...`);
      await cp(dataDir, join(distDir, dataDir), { recursive: true });
      console.log(`✓ ${dataDir} 目录已复制到 ${distDir}`);
    } else {
      console.warn(`警告: ${dataDir} 目录不存在`);
    }

    // 复制 images 目录
    if (existsSync(imagesDir)) {
      console.log(`正在复制 ${imagesDir} 目录...`);
      await cp(imagesDir, join(distDir, imagesDir), { recursive: true });
      console.log(`✓ ${imagesDir} 目录已复制到 ${distDir}`);
    } else {
      console.warn(`警告: ${imagesDir} 目录不存在`);
    }

    // 复制 .htaccess 文件（如果存在）
    if (existsSync(htaccessFile)) {
      console.log(`正在复制 ${htaccessFile} 文件...`);
      await cp(htaccessFile, join(distDir, htaccessFile));
      console.log(`✓ ${htaccessFile} 文件已复制到 ${distDir}`);
    }

    // 复制 favicon.ico 文件（如果存在）
    const faviconFile = 'favicon.ico';
    if (existsSync(faviconFile)) {
      console.log(`正在复制 ${faviconFile} 文件...`);
      await cp(faviconFile, join(distDir, faviconFile));
      console.log(`✓ ${faviconFile} 文件已复制到 ${distDir}`);
    }

    // 复制 libs 目录（本地依赖库）
    const libsDir = 'libs';
    if (existsSync(libsDir)) {
      console.log(`正在复制 ${libsDir} 目录...`);
      await cp(libsDir, join(distDir, libsDir), { recursive: true });
      console.log(`✓ ${libsDir} 目录已复制到 ${distDir}`);
    } else {
      console.warn(`警告: ${libsDir} 目录不存在`);
    }

    // 修复构建后的 index.html，确保 KaTeX CSS 链接存在
    const distIndexHtml = join(distDir, 'index.html');
    if (existsSync(distIndexHtml)) {
      let html = await readFile(distIndexHtml, 'utf-8');
      // 检查是否缺少 KaTeX CSS 链接
      if (!html.includes('libs/katex/katex.min.css')) {
        // 在 KaTeX 注释后添加 CSS 链接
        html = html.replace(
          /<!-- KaTeX for math rendering -->\s*<script defer src="libs\/katex\/katex\.min\.js">/,
          '<!-- KaTeX for math rendering -->\n    <link rel="stylesheet" href="libs/katex/katex.min.css">\n    <script defer src="libs/katex/katex.min.js">'
        );
        await writeFile(distIndexHtml, html, 'utf-8');
        console.log('✓ 已修复 index.html 中的 KaTeX CSS 链接');
      }
    }

    console.log('✓ 所有资源文件已复制完成');
  } catch (error) {
    console.error('复制文件时出错:', error);
    process.exit(1);
  }
}

copyAssets();

