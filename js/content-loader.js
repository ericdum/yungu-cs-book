// 内容加载相关函数

import { convertCheckboxMarkers, removeAutoLinks, removeH1Tags, processMath, renderMath, protectMathFormulas, restoreMathFormulas } from './markdown.js';

/**
 * 加载 Markdown 文件内容
 */
export async function loadMarkdownFile(path) {
    // 加载 Markdown 文件（先尝试从 data 目录加载，失败则从根目录加载）
    let response;
    let actualPath;
    try {
        actualPath = `data/${path}`;
        const encodedPath = encodeURI(actualPath);
        response = await fetch(encodedPath);
        if (!response.ok) throw new Error('Not found in data directory');
    } catch (e) {
        // 向后兼容：如果 data 目录不存在，从根目录加载
        console.log(`从根目录加载: ${path}`);
        actualPath = path;
        const encodedPath = encodeURI(actualPath);
        response = await fetch(encodedPath);
    }
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.text();
}

/**
 * 处理并渲染 Markdown 内容
 */
export function processMarkdownContent(markdown) {
    if (typeof marked === 'undefined') {
        return `<pre>${markdown}</pre>`;
    }
    
    // 预处理：将 [\square] 转换为标准的 task list 格式
    markdown = convertCheckboxMarkers(markdown);
    
    // 在 Markdown 解析前保护数学公式，避免被 Marked 解析器破坏（特别是下划线被解析为斜体）
    const { markdown: protectedMarkdown, mathPlaceholders } = protectMathFormulas(markdown);
    
    let html = marked.parse(protectedMarkdown);
    
    // 恢复数学公式占位符并转换为 HTML 标签
    html = restoreMathFormulas(html, mathPlaceholders);
    
    // 移除自动生成的链接（链接文本和 href 相同的链接）
    html = removeAutoLinks(html);
    
    // 移除 h1 标签（因为已经有 pageTitle 了）
    html = removeH1Tags(html);
    
    // 处理可能残留的数学公式（作为后备方案）
    html = processMath(html);
    
    return html;
}

/**
 * 渲染数学公式（需要在 DOM 更新后调用）
 */
export function renderMathAfterUpdate() {
    // 使用 Vue 的 $nextTick 或 setTimeout 确保 DOM 已更新
    setTimeout(() => {
        renderMath();
    }, 0);
}

