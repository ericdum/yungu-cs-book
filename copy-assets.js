import { cp } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const distDir = 'dist';
const dataDir = 'data';
const imagesDir = 'images';

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

    console.log('✓ 所有资源文件已复制完成');
  } catch (error) {
    console.error('复制文件时出错:', error);
    process.exit(1);
  }
}

copyAssets();

