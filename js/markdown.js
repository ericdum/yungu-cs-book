// Markdown 处理相关函数

/**
 * 将 [\square] 或 [$\square$] 转换为标准的 Markdown task list 格式
 * 支持多种格式：
 * - [\square] -> - [ ]
 * - [$\square$] -> - [ ] (数学公式格式)
 * - [\Square] -> - [ ]
 * - [\checked] 或 [\checkmark] -> - [x]
 * - [$\checkmark$] -> - [x] (数学公式格式)
 */
export function convertCheckboxMarkers(markdown) {
    // 先处理数学公式格式（必须在处理普通格式之前）
    markdown = markdown.replace(/\[\$\\square\$\]/gi, '[ ]');
    markdown = markdown.replace(/\[\$\\checkmark\$\]/gi, '[x]');
    markdown = markdown.replace(/\[\$\\checked\$\]/gi, '[x]');
    
    // 处理普通格式
    markdown = markdown.replace(/\[\\square\]/gi, '[ ]');
    markdown = markdown.replace(/\[\\Square\]/gi, '[ ]');
    markdown = markdown.replace(/\[\\checked\]/gi, '[x]');
    markdown = markdown.replace(/\[\\checkmark\]/gi, '[x]');
    
    // 如果行首已经有 - 或 *，则只替换 [\square] 部分（保持列表格式）
    markdown = markdown.replace(/^(\s*[-*]\s+)\[\\square\]/gim, '$1[ ]');
    markdown = markdown.replace(/^(\s*[-*]\s+)\[\\Square\]/gim, '$1[ ]');
    markdown = markdown.replace(/^(\s*[-*]\s+)\[\$\\square\$\]/gim, '$1[ ]');
    markdown = markdown.replace(/^(\s*[-*]\s+)\[\\checked\]/gim, '$1[x]');
    markdown = markdown.replace(/^(\s*[-*]\s+)\[\\checkmark\]/gim, '$1[x]');
    markdown = markdown.replace(/^(\s*[-*]\s+)\[\$\\checkmark\$\]/gim, '$1[x]');
    
    // 如果行首没有列表标记，但以 [\square] 或 [$\square$] 开头，添加列表标记
    markdown = markdown.replace(/^(\s*)\[\$\\square\$\]/gim, '$1- [ ]');
    markdown = markdown.replace(/^(\s*)\[\\square\]/gim, '$1- [ ]');
    markdown = markdown.replace(/^(\s*)\[\$\\checkmark\$\]/gim, '$1- [x]');
    markdown = markdown.replace(/^(\s*)\[\\checkmark\]/gim, '$1- [x]');
    
    return markdown;
}

/**
 * 移除自动生成的链接
 * 由于我们已经禁用了 marked 的 autolink 和 url tokenizer，
 * 理论上不应该有自动生成的链接了。
 * 所有链接都应该是用户明确使用 []() 格式标记的，所以不需要移除。
 * 保留此方法以防万一，但不执行任何操作。
 */
export function removeAutoLinks(html) {
    return html;
}

/**
 * 移除 h1 标签（因为已经有 pageTitle 了）
 */
export function removeH1Tags(html) {
    // 创建一个临时 DOM 元素来解析 HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 查找所有 h1 标签并移除
    const h1Tags = tempDiv.querySelectorAll('h1');
    h1Tags.forEach(h1 => {
        // 将 h1 替换为空的文本节点（完全移除）
        h1.parentNode.removeChild(h1);
    });
    
    return tempDiv.innerHTML;
}

/**
 * 在 Markdown 解析前保护数学公式
 * 将 $...$ 和 $$...$$ 替换为占位符，避免被 Marked 解析器破坏
 */
export function protectMathFormulas(markdown) {
    const mathPlaceholders = [];
    let placeholderIndex = 0;
    
    // 处理块级公式 $$...$$（必须先处理，因为包含行内公式）
    // 使用非贪婪匹配，并支持换行
    markdown = markdown.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
        // 使用特殊标记作为占位符，避免被 Marked 转义
        const placeholder = `[MATH_BLOCK_${placeholderIndex}]`;
        mathPlaceholders.push({ type: 'block', formula: formula.trim() });
        placeholderIndex++;
        return placeholder;
    });
    
    // 处理行内公式 $...$
    // 使用非贪婪匹配，但不匹配换行符（行内公式不应该包含换行）
    markdown = markdown.replace(/\$([^$\n]+?)\$/g, (match, formula) => {
        // 跳过已经被保护的块级公式占位符
        if (match.includes('MATH_BLOCK_')) {
            return match;
        }
        // 使用特殊标记作为占位符，避免被 Marked 转义
        const placeholder = `[MATH_INLINE_${placeholderIndex}]`;
        mathPlaceholders.push({ type: 'inline', formula: formula.trim() });
        placeholderIndex++;
        return placeholder;
    });
    
    return { markdown, mathPlaceholders };
}

/**
 * 恢复数学公式占位符并转换为 HTML 标签
 */
export function restoreMathFormulas(html, mathPlaceholders) {
    // 按索引从大到小处理，避免索引冲突
    for (let index = mathPlaceholders.length - 1; index >= 0; index--) {
        const item = mathPlaceholders[index];
        if (item.type === 'block') {
            // 尝试多种可能的占位符格式（Marked 可能会转义或修改）
            const placeholders = [
                `[MATH_BLOCK_${index}]`,
                `<!--MATH_BLOCK_${index}-->`,
                `&lt;!--MATH_BLOCK_${index}--&gt;`,
                `__MATH_BLOCK_${index}__`
            ];
            const replacement = `<div class="math-block">${item.formula}</div>`;
            placeholders.forEach(placeholder => {
                html = html.split(placeholder).join(replacement);
            });
        } else {
            // 尝试多种可能的占位符格式
            const placeholders = [
                `[MATH_INLINE_${index}]`,
                `<!--MATH_INLINE_${index}-->`,
                `&lt;!--MATH_INLINE_${index}--&gt;`,
                `__MATH_INLINE_${index}__`
            ];
            const replacement = `<span class="math-inline">${item.formula}</span>`;
            placeholders.forEach(placeholder => {
                html = html.split(placeholder).join(replacement);
            });
        }
    }
    return html;
}

/**
 * 处理数学公式
 * 将 $...$ 和 $$...$$ 转换为对应的 HTML 标签
 * 注意：此函数现在主要用于处理 HTML 中残留的公式（如果保护机制失败）
 */
export function processMath(html) {
    // 处理可能残留的行内公式 $...$（作为后备方案）
    // 只处理不在 HTML 标签中的公式
    html = html.replace(/\$([^$<>\n]+?)\$/g, (match, formula) => {
        // 检查是否已经在 HTML 标签中（通过检查前后是否有标签）
        const matchIndex = html.indexOf(match);
        const beforeMatch = html.substring(Math.max(0, matchIndex - 50), matchIndex);
        const afterMatch = html.substring(matchIndex + match.length, Math.min(html.length, matchIndex + match.length + 50));
        
        // 如果前后有 math-inline 或 math-block 标签，说明已经被处理过了
        if (beforeMatch.includes('math-inline') || beforeMatch.includes('math-block') ||
            afterMatch.includes('math-inline') || afterMatch.includes('math-block')) {
            return match;
        }
        
        return `<span class="math-inline">${formula.trim()}</span>`;
    });
    
    // 处理可能残留的块级公式 $$...$$（作为后备方案）
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
        // 检查是否已经在 HTML 标签中
        const matchIndex = html.indexOf(match);
        const beforeMatch = html.substring(Math.max(0, matchIndex - 50), matchIndex);
        const afterMatch = html.substring(matchIndex + match.length, Math.min(html.length, matchIndex + match.length + 50));
        
        if (beforeMatch.includes('math-inline') || beforeMatch.includes('math-block') ||
            afterMatch.includes('math-inline') || afterMatch.includes('math-block')) {
            return match;
        }
        
        return `<div class="math-block">${formula.trim()}</div>`;
    });
    
    return html;
}

/**
 * 使用 KaTeX 渲染数学公式
 */
export function renderMath() {
    const contentBody = document.getElementById('contentBody');
    if (!contentBody) return;
    
    // 首先使用 renderMathInElement 处理残留的 $...$ 格式公式
    if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(contentBody, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\[', right: '\\]', display: true},
                {left: '\\(', right: '\\)', display: false}
            ],
            throwOnError: false
        });
    }
    
    // 手动渲染 .math-inline 和 .math-block 标签中的公式
    if (typeof katex !== 'undefined') {
        // 处理行内公式
        const inlineElements = contentBody.querySelectorAll('.math-inline');
        inlineElements.forEach(element => {
            try {
                const formula = element.textContent.trim();
                if (formula && !element.querySelector('.katex')) {
                    // 如果还没有被渲染，则渲染
                    katex.render(formula, element, {
                        throwOnError: false,
                        displayMode: false
                    });
                }
            } catch (e) {
                console.warn('KaTeX 渲染错误:', e, element.textContent);
            }
        });
        
        // 处理块级公式
        const blockElements = contentBody.querySelectorAll('.math-block');
        blockElements.forEach(element => {
            try {
                const formula = element.textContent.trim();
                if (formula && !element.querySelector('.katex')) {
                    // 如果还没有被渲染，则渲染
                    katex.render(formula, element, {
                        throwOnError: false,
                        displayMode: true
                    });
                }
            } catch (e) {
                console.warn('KaTeX 渲染错误:', e, element.textContent);
            }
        });
    }
}

/**
 * 配置 Marked
 */
export function configureMarked() {
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true,
            highlight: function(code, lang) {
                // 代码高亮可以在这里添加
                return code;
            }
        });
        
        // 禁用自动链接功能，只保留明确使用 []() 格式的链接
        marked.use({
            tokenizer: {
                // 覆盖 autolink tokenizer，返回 null 以禁用自动链接
                autolink() {
                    return null;
                },
                url() {
                    return null;
                }
            }
        });
    }
}

