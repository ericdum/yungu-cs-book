import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 如果部署在子目录，取消下面的注释并设置正确的 base 路径
    // base: '/your-subdirectory/'
  }
});

