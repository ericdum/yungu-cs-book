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
            sidebarCollapsed: false,
            fontSize: parseInt(localStorage.getItem('fontSize') || '14') // 默认14px
        };
    },
    async mounted() {
        // 初始化字体大小
        this.updateFontSize();
        
        // 加载导航数据
        await this.loadNavigation();
        
        // 处理路由
        this.handleRouting();
        
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
        async loadNavigation() {
            try {
                // 先尝试从 data 目录加载，如果失败则从根目录加载（向后兼容）
                let response;
                try {
                    response = await fetch('data/navigation.json');
                    if (!response.ok) throw new Error('Not found in data directory');
                } catch (e) {
                    console.log('尝试从根目录加载 navigation.json...');
                    response = await fetch('navigation.json');
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                this.navigation = await response.json();
                
                // 调试信息
                console.log('导航数据加载成功，章节数:', this.navigation.length);
                if (this.navigation.length > 0) {
                    console.log('第一章 sections:', this.navigation[0].sections?.length || 0);
                }
                
                // 默认展开第一个章节（跳过 page 类型的项目）
                for (let i = 0; i < this.navigation.length; i++) {
                    if (this.navigation[i].type === 'chapter') {
                        this.expandedChapters = [i];
                        break;
                    }
                }
            } catch (error) {
                console.error('加载导航数据失败:', error);
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
        
        async loadSection(path, title) {
            this.currentTitle = title;
            this.currentPath = path;
            
            // 更新 URL（不刷新页面）
            const newUrl = `#${encodeURIComponent(path)}`;
            if (window.location.hash !== newUrl) {
                window.history.pushState({ path }, title, newUrl);
            }
            
            // 显示加载状态
            this.renderedContent = '<div class="loading">加载中...</div>';
            
            // 确保父章节展开（如果是 section 的话）
            for (let i = 0; i < this.navigation.length; i++) {
                const item = this.navigation[i];
                if (item.type === 'chapter' && item.sections && item.sections.some(s => s.path === path)) {
                    if (!this.expandedChapters.includes(i)) {
                        this.expandedChapters.push(i);
                    }
                    break;
                }
            }
            
            try {
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
                
                let markdown = await response.text();
                
                // 使用 marked 渲染 Markdown
                if (typeof marked !== 'undefined') {
                    // 预处理：将 [\square] 转换为标准的 task list 格式
                    markdown = this.convertCheckboxMarkers(markdown);
                    
                    let html = marked.parse(markdown);
                    
                    // 移除自动生成的链接（链接文本和 href 相同的链接）
                    html = this.removeAutoLinks(html);
                    
                    // 移除 h1 标签（因为已经有 pageTitle 了）
                    html = this.removeH1Tags(html);
                    
                    // 处理数学公式
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
                document.querySelector('.content').scrollTop = 0;
            } catch (error) {
                console.error('加载内容失败:', error);
                this.renderedContent = 
                    `<p style="color: red;">加载内容失败: ${error.message}</p>
                     <p>请检查文件路径: ${path} 或 data/${path}</p>`;
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
        
        processMath(html) {
            // 处理行内公式 $...$
            html = html.replace(/\$([^$]+)\$/g, (match, formula) => {
                return `<span class="math-inline">${formula}</span>`;
            });
            
            // 处理块级公式 $$...$$
            html = html.replace(/\$\$([^$]+)\$\$/g, (match, formula) => {
                return `<div class="math-block">${formula}</div>`;
            });
            
            return html;
        },
        
        renderMath() {
            // 使用 KaTeX 渲染数学公式
            if (typeof renderMathInElement !== 'undefined') {
                const contentBody = document.getElementById('contentBody');
                if (contentBody) {
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
            }
        },
        
        handleRouting() {
            // 从 URL hash 获取路径
            const hash = window.location.hash;
            if (hash && hash.length > 1) {
                const path = decodeURIComponent(hash.substring(1));
                
                // 在导航中找到对应的 section 或 page
                for (const item of this.navigation) {
                    // 检查是否是 page 类型
                    if (item.type === 'page' && item.path === path) {
                        this.loadSection(path, item.title);
                        return;
                    }
                    // 检查是否是 chapter 类型中的 section
                    if (item.type === 'chapter' && item.sections) {
                        for (const section of item.sections) {
                            if (section.path === path) {
                                this.loadSection(path, section.title);
                                return;
                            }
                        }
                    }
                }
            } else {
                // 默认加载第一个 page 或第一个 section
                if (this.navigation.length > 0) {
                    const firstItem = this.navigation[0];
                    // 如果是 page 类型
                    if (firstItem.type === 'page') {
                        this.loadSection(firstItem.path, firstItem.title);
                    } 
                    // 如果是 chapter 类型
                    else if (firstItem.type === 'chapter' && firstItem.sections && firstItem.sections.length > 0) {
                        const firstSection = firstItem.sections[0];
                        this.loadSection(firstSection.path, firstSection.title);
                    }
                }
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
