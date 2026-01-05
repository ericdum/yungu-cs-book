// 导航相关函数

/**
 * 加载导航数据
 */
export async function loadNavigationData() {
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
        
        const navigation = await response.json();
        
        // 调试信息
        console.log('导航数据加载成功，章节数:', navigation.length);
        if (navigation.length > 0) {
            console.log('第一章 sections:', navigation[0].sections?.length || 0);
        }
        
        return navigation;
    } catch (error) {
        console.error('加载导航数据失败:', error);
        throw error;
    }
}

/**
 * 获取默认展开的章节索引
 */
export function getDefaultExpandedChapter(navigation) {
    // 默认展开第一个章节（跳过 page 类型的项目）
    for (let i = 0; i < navigation.length; i++) {
        if (navigation[i].type === 'chapter') {
            return i;
        }
    }
    return null;
}

