const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1, // 增加重试次数
  workers: 1,
  timeout: 120000, // 全局超时120秒
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
    headless: false, // 设置为false以查看Electron窗口
    screenshot: 'only-on-failure',
    actionTimeout: 30000, // 操作超时30秒
    navigationTimeout: 30000, // 导航超时30秒
  },
  projects: [
    {
      name: 'electron',
      use: {
        // Electron应用启动配置
        launchOptions: {
          executablePath: path.join(__dirname, 'dist', 'LogAnalyzer-1.3.2-portable.exe'),
          // 添加必要的启动参数
          args: ['--no-sandbox', '--disable-gpu'],
          timeout: 60000, // Electron启动超时60秒
        },
      },
    },
  ],
});
