// Vue 3 应用
const { createApp } = Vue;

createApp({
    data() {
        return {
            navigation: [],
            currentPath: null,
            currentTitle: '关于这本书',
            renderedContent: '<p>加载中...</p>',
            expandedChapters: [],
            // 在移动端默认折叠侧边栏
            sidebarCollapsed: window.innerWidth <= 768,
            fontSize: parseInt(localStorage.getItem('fontSize') || '14') // 默认14px
        };
    },
    async mounted() {
        // 初始化字体大小
        this.updateFontSize();
        
        // 监听窗口大小变化，在移动端和桌面端之间切换时调整侧边栏状态
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                // 切换到移动端，如果侧边栏展开则折叠
                if (!this.sidebarCollapsed) {
                    this.sidebarCollapsed = true;
                }
            }
        });
        
        // 加载导航数据
        await this.loadNavigation();
        
        // 处理路由（路由处理会设置正确的标题）
        this.handleRouting();
        
        // 如果路由处理没有设置标题（比如是根路径），才使用默认标题
        // 注意：handleRouting 是同步的，但 loadSection 是异步的，所以需要延迟检查
        this.$nextTick(() => {
            // 如果标题还是默认值且当前路径不是根路径，说明路由处理可能有问题
            // 但这里不重置，因为 loadSection 会异步设置标题
        });
        
        // 监听浏览器前进后退
        window.addEventListener('popstate', () => {
            this.handleRouting();
        });
        
        // 配置 Marked
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
    },
    methods: {
        /**
         * 更新页面标题（浏览器标签页标题）
         * 格式：section name - site name
         */
        updatePageTitle(sectionTitle) {
            const siteName = 'AI时代·计算机通识';
            if (sectionTitle) {
                document.title = `${sectionTitle} - ${siteName}`;
            } else {
                document.title = siteName;
            }
        },
        
        async loadNavigation() {
            try {
                // 先尝试从 data 目录加载，如果失败则从根目录加载（向后兼容）
                let response;
                try {
                    response = await fetch('data/navigation.json');
                    if (!response.ok) throw new Error('Not found in data directory');
                } catch (e) {
                    response = await fetch('navigation.json');
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                this.navigation = await response.json();
                
                // 默认展开第一个章节（跳过 page 类型的项目）
                for (let i = 0; i < this.navigation.length; i++) {
                    if (this.navigation[i].type === 'chapter') {
                        this.expandedChapters = [i];
                        break;
                    }
                }
            } catch (error) {
                this.renderedContent = '<p style="color: red;">加载导航数据失败，请检查 navigation.json 或 data/navigation.json 文件是否存在。</p>';
            }
        },
        
        toggleChapter(chapterIndex) {
            const index = this.expandedChapters.indexOf(chapterIndex);
            if (index > -1) {
                this.expandedChapters.splice(index, 1);
            } else {
                this.expandedChapters.push(chapterIndex);
            }
        },
        
        // 安全解码 URL，如果已经是解码后的则直接返回
        safeDecodeURIComponent(str) {
            try {
                // 如果包含编码字符（%），尝试解码
                if (str && str.includes('%')) {
                    return decodeURIComponent(str);
                }
                return str;
            } catch (e) {
                // 如果解码失败，返回原字符串
                return str;
            }
        },
        
        async loadSection(path, title, updateUrl = true) {
            // 在移动端，加载内容后自动关闭侧边栏
            if (window.innerWidth <= 768 && !this.sidebarCollapsed) {
                this.sidebarCollapsed = true;
            }
            
            // 保存原始 path，用于查找 section 和构建文件路径
            const originalPath = path;
            
            // 特殊处理"关于这本书"：跳转到根路径
            let urlPath = path; // URL 路径
            if (path === 'about-this-book' && updateUrl) {
                urlPath = null; // 使用 null 表示根路径
            }
            
            // 检查当前 URL 是否已经是目标路径（避免重复加载）
            const currentUrlPath = this.getCurrentPath();
            const isSamePage = currentUrlPath === (urlPath || null);
            
            // 检查内容是否已经加载（通过检查 renderedContent 是否不是加载状态）
            const isContentLoaded = this.renderedContent && 
                                   !this.renderedContent.includes('加载中') && 
                                   !this.renderedContent.includes('loading') &&
                                   this.currentPath === originalPath;
            
            // 总是设置 currentPath 和 currentTitle，确保导航栏 active 状态正确
            // 这对于页面刷新时特别重要
            // 注意：必须在任何可能提前返回的代码之前设置这些值
            this.currentPath = originalPath; // 使用原始 path 用于导航栏高亮
            this.currentTitle = title;
            this.updatePageTitle(title);
            
            // 更新 URL（不刷新页面），如果 updateUrl 为 false 则不更新
            if (updateUrl) {
                const newUrl = urlPath ? `/${encodeURIComponent(urlPath)}` : '/';
                if (currentUrlPath !== (urlPath || null)) {
                    window.history.pushState({ path: urlPath || 'about-this-book' }, title, newUrl);
                    
                    // 只有在 URL 变化时才发送统计数据
                    // 百度统计：跟踪页面浏览（使用解码后的路径，显示为正常的中文字符）
                    try {
                        if (typeof _hmt !== 'undefined' && _hmt.push) {
                            const decodedPath = urlPath ? this.safeDecodeURIComponent(urlPath) : '/';
                            _hmt.push(['_trackPageview', decodedPath]);
                        }
                    } catch (e) {
                        // 静默处理统计错误
                    }
                    
                    // Google Analytics：跟踪页面浏览（使用解码后的路径，显示为正常的中文字符）
                    try {
                        if (typeof gtag !== 'undefined') {
                            const decodedPath = urlPath ? this.safeDecodeURIComponent(urlPath) : '/';
                            // 使用 config 更新页面信息并发送页面浏览事件
                            gtag('config', 'G-2K4319RJTR', {
                                'page_path': decodedPath,
                                'page_title': title
                            });
                        }
                    } catch (e) {
                        // 静默处理统计错误
                    }
                }
            }
            
            // 如果是同一个页面且内容已加载，不重复加载内容
            if (isSamePage && isContentLoaded) {
                return;
            }
            
            // 显示加载状态
            this.renderedContent = '<div class="loading">加载中...</div>';
            
            // 检查导航数据是否已加载
            if (!this.navigation || this.navigation.length === 0) {
                this.renderedContent = '<p style="color: red;">导航数据未加载，请刷新页面重试。</p>';
                return;
            }
            
            // 确保父章节展开（如果是 section 的话），使用原始 path
            for (let i = 0; i < this.navigation.length; i++) {
                const item = this.navigation[i];
                if (item.type === 'chapter' && item.sections && item.sections.some(s => s.path === originalPath)) {
                    if (!this.expandedChapters.includes(i)) {
                        this.expandedChapters.push(i);
                    }
                    break;
                }
            }
            
            try {
                // 根据原始 path 找到对应的 section，获取章节信息
                let sectionInfo = null;
                for (const item of this.navigation) {
                    if (item.type === 'page' && item.path === originalPath) {
                        // page 类型，直接使用 path
                        sectionInfo = { path: originalPath, chapter: null };
                        break;
                    }
                    if (item.type === 'chapter' && item.sections) {
                        for (const section of item.sections) {
                            if (section.path === originalPath) {
                                // 找到对应的 section，使用章节名称构建实际路径
                                sectionInfo = section;
                                break;
                            }
                        }
                        if (sectionInfo) break;
                    }
                }
                
                if (!sectionInfo) {
                    throw new Error(`未找到路径: ${originalPath}`);
                }
                
                // 构建实际文件路径，使用原始 path
                let actualPath;
                const actualPathForLoading = originalPath;
                
                if (sectionInfo && sectionInfo.chapter) {
                    // 如果有章节信息，使用 章节名称/path.md
                    actualPath = `data/${sectionInfo.chapter}/${actualPathForLoading}.md`;
                } else {
                    // page 类型或没有章节信息，使用根路径
                    // 对于"关于这本书"，path 是 slug，文件在 data/关于这本书.md
                    if (actualPathForLoading === 'about-this-book') {
                        actualPath = 'data/关于这本书.md';
                    } else {
                        // 其他 page 类型，如果 path 包含 .md，直接使用，否则添加 .md
                        actualPath = actualPathForLoading.endsWith('.md') ? `data/${actualPathForLoading}` : `data/${actualPathForLoading}.md`;
                    }
                }
                
                // 加载 Markdown 文件
                let response;
                try {
                    const encodedPath = encodeURI(actualPath);
                    response = await fetch(encodedPath);
                    if (!response.ok) {
                        throw new Error('Not found');
                    }
                } catch (e) {
                    // 向后兼容：尝试不带 .md 扩展名
                    actualPath = actualPath.replace(/\.md$/, '');
                    const encodedPath = encodeURI(actualPath);
                    response = await fetch(encodedPath);
                    if (!response.ok) {
                        throw new Error('Not found');
                    }
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                let markdown = await response.text();
                
                // 使用 marked 渲染 Markdown
                if (typeof marked !== 'undefined') {
                    // 预处理：将 [\square] 转换为标准的 task list 格式
                    markdown = this.convertCheckboxMarkers(markdown);
                    
                    // 在 Markdown 解析前保护数学公式，避免被 Marked 解析器破坏（特别是下划线被解析为斜体）
                    const { markdown: protectedMarkdown, mathPlaceholders } = this.protectMathFormulas(markdown);
                    
                    let html = marked.parse(protectedMarkdown);
                    
                    // 恢复数学公式占位符并转换为 HTML 标签
                    html = this.restoreMathFormulas(html, mathPlaceholders);
                    
                    // 移除自动生成的链接（链接文本和 href 相同的链接）
                    html = this.removeAutoLinks(html);
                    
                    // 移除 h1 标签（因为已经有 pageTitle 了）
                    html = this.removeH1Tags(html);
                    
                    // 处理可能残留的数学公式（作为后备方案）
                    html = this.processMath(html);
                    
                    this.renderedContent = html;
                    
                    // 渲染数学公式
                    this.$nextTick(() => {
                        this.renderMath();
                    });
                } else {
                    this.renderedContent = `<pre>${markdown}</pre>`;
                }
                
                // 滚动到顶部
                const contentEl = document.querySelector('.content');
                if (contentEl) {
                    contentEl.scrollTop = 0;
                }
            } catch (error) {
                this.renderedContent = 
                    `<p style="color: red;">加载内容失败: ${error.message}</p>
                     <p>请检查文件路径: ${originalPath} 或 data/${originalPath}</p>`;
            }
        },
        
        convertCheckboxMarkers(markdown) {
            // 将 [\square] 或 [$\square$] 转换为标准的 Markdown task list 格式 - [ ]
            // 支持多种格式：
            // - [\square] -> - [ ]
            // - [$\square$] -> - [ ] (数学公式格式)
            // - [\Square] -> - [ ]
            // - [\checked] 或 [\checkmark] -> - [x]
            // - [$\checkmark$] -> - [x] (数学公式格式)
            
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
        },
        
        removeAutoLinks(html) {
            // 由于我们已经禁用了 marked 的 autolink 和 url tokenizer，
            // 理论上不应该有自动生成的链接了。
            // 所有链接都应该是用户明确使用 []() 格式标记的，所以不需要移除。
            // 保留此方法以防万一，但不执行任何操作。
            return html;
        },
        
        removeH1Tags(html) {
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
        },
        
        /**
         * 在 Markdown 解析前保护数学公式
         * 将 $...$ 和 $$...$$ 替换为占位符，避免被 Marked 解析器破坏
         */
        protectMathFormulas(markdown) {
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
        },
        
        /**
         * 恢复数学公式占位符并转换为 HTML 标签
         */
        restoreMathFormulas(html, mathPlaceholders) {
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
        },
        
        processMath(html) {
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
        },
        
        renderMath() {
            // 使用 KaTeX 渲染数学公式
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
        },
        
        getCurrentPath() {
            // 从 URL pathname 获取路径
            const pathname = window.location.pathname;
            if (pathname && pathname !== '/' && pathname.length > 1) {
                // 移除开头的斜杠并解码
                return decodeURIComponent(pathname.substring(1));
            }
            return null;
        },
        
        isRootPath() {
            // 判断当前是否是根路径
            const pathname = window.location.pathname;
            return !pathname || pathname === '/';
        },
        
        handleRouting() {
            // 如果导航数据还没加载完成，等待加载完成后再处理路由
            if (!this.navigation || this.navigation.length === 0) {
                // 延迟重试（最多重试10次，避免无限循环）
                if (!this._routingRetryCount) {
                    this._routingRetryCount = 0;
                }
                if (this._routingRetryCount < 10) {
                    this._routingRetryCount++;
                    setTimeout(() => {
                        this.handleRouting();
                    }, 100);
                } else {
                    console.error('路由处理失败：导航数据加载超时');
                    this._routingRetryCount = 0;
                }
                return;
            }
            this._routingRetryCount = 0; // 重置重试计数
            
            // 从 URL pathname 获取路径
            const path = this.getCurrentPath();
            
            if (path) {
                // 在导航中找到对应的 section 或 page
                let found = false;
                for (let i = 0; i < this.navigation.length; i++) {
                    const item = this.navigation[i];
                    // 检查是否是 page 类型
                    if (item.type === 'page' && item.path === path) {
                        // 立即设置 currentPath，确保导航栏 active 状态正确
                        this.currentPath = path;
                        this.currentTitle = item.title;
                        this.updatePageTitle(item.title);
                        // 确保包含该 section 的章节展开（对于 page 类型，不需要展开章节）
                        this.loadSection(path, item.title);
                        found = true;
                        return;
                    }
                    // 检查是否是 chapter 类型中的 section
                    if (item.type === 'chapter' && item.sections) {
                        for (const section of item.sections) {
                            if (section.path === path) {
                                // 立即设置 currentPath，确保导航栏 active 状态正确
                                this.currentPath = path;
                                this.currentTitle = section.title;
                                this.updatePageTitle(section.title);
                                // 确保包含该 section 的章节展开
                                if (!this.expandedChapters.includes(i)) {
                                    this.expandedChapters.push(i);
                                }
                                // 调用 loadSection，传入 updateUrl=true 以确保 URL 正确
                                this.loadSection(path, section.title, true);
                                found = true;
                                return;
                            }
                        }
                    }
                }
                // 如果找不到对应的 section，显示错误信息
                if (!found) {
                    console.warn('未找到路径:', path);
                    console.warn('可用的路径:', this.navigation.map(item => {
                        if (item.type === 'page') return item.path;
                        if (item.type === 'chapter' && item.sections) {
                            return item.sections.map(s => s.path);
                        }
                        return null;
                    }).flat().filter(Boolean));
                    this.currentTitle = '页面未找到';
                    this.updatePageTitle('页面未找到');
                    this.renderedContent = `<p style="color: red;">未找到路径: ${path}</p><p>请检查 URL 是否正确。</p>`;
                }
            } else {
                // 根路径：加载"关于这本书"的内容，但不更新 URL
                for (const item of this.navigation) {
                    if (item.type === 'page' && item.path === 'about-this-book') {
                        // 立即设置 currentPath，确保导航栏 active 状态正确
                        this.currentPath = item.path;
                        this.currentTitle = item.title;
                        this.updatePageTitle(item.title);
                        this.loadSection(item.path, item.title, false);
                        return;
                    }
                }
                // 如果没有找到"关于这本书"，则加载第一个 chapter 的第一个 section
                for (let i = 0; i < this.navigation.length; i++) {
                    const item = this.navigation[i];
                    if (item.type === 'chapter' && item.sections && item.sections.length > 0) {
                        const firstSection = item.sections[0];
                        // 立即设置 currentPath，确保导航栏 active 状态正确
                        this.currentPath = firstSection.path;
                        this.currentTitle = firstSection.title;
                        this.updatePageTitle(firstSection.title);
                        // 确保章节展开
                        if (!this.expandedChapters.includes(i)) {
                            this.expandedChapters.push(i);
                        }
                        this.loadSection(firstSection.path, firstSection.title, false);
                        return;
                    }
                }
                // 如果都没有，则显示空内容
                this.currentTitle = '';
                this.updatePageTitle('');
                this.currentContent = '';
            }
        },
        
        toggleSidebar() {
            this.sidebarCollapsed = !this.sidebarCollapsed;
        },
        
        decreaseFontSize() {
            if (this.fontSize > 10) {
                this.fontSize -= 2;
                this.updateFontSize();
            }
        },
        
        increaseFontSize() {
            if (this.fontSize < 24) {
                this.fontSize += 2;
                this.updateFontSize();
            }
        },
        
        resetFontSize() {
            this.fontSize = 14;
            this.updateFontSize();
        },
        
        updateFontSize() {
            // 保存到 localStorage
            localStorage.setItem('fontSize', this.fontSize.toString());
            // 更新 CSS 变量
            document.documentElement.style.setProperty('--base-font-size', `${this.fontSize}px`);
        }
    }
}).mount('#app');
