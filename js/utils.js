// 工具函数

/**
 * 安全解码 URL，如果已经是解码后的则直接返回
 */
export function safeDecodeURIComponent(str) {
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
}

/**
 * 从 URL pathname 获取路径
 */
export function getCurrentPath() {
    const pathname = window.location.pathname;
    if (pathname && pathname !== '/' && pathname.length > 1) {
        // 移除开头的斜杠并解码
        return decodeURIComponent(pathname.substring(1));
    }
    return null;
}

