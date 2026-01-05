// 统计分析相关函数

/**
 * 发送百度统计数据
 */
export function trackBaiduAnalytics(title) {
    try {
        if (typeof _hmt !== 'undefined' && _hmt.push) {
            // 百度统计使用title作为页面路径标识
            _hmt.push(['_trackPageview', `/${title}`]);
            console.log('百度统计已发送:', title);
        }
    } catch (e) {
        console.error('百度统计发送失败:', e);
    }
}

/**
 * 发送 Google Analytics 数据
 */
export function trackGoogleAnalytics(title) {
    try {
        if (typeof gtag !== 'undefined') {
            // 使用 config 更新页面信息并发送页面浏览事件，确保使用title
            gtag('config', 'G-2K4319RJTR', {
                'page_path': `/${title}`,
                'page_title': title
            });
            console.log('Google Analytics 已发送:', title);
        }
    } catch (e) {
        console.error('Google Analytics 发送失败:', e);
    }
}

/**
 * 发送所有统计数据
 */
export function trackPageView(title) {
    trackBaiduAnalytics(title);
    trackGoogleAnalytics(title);
}

