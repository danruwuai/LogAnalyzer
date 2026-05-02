const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
    headless: false, // 设置为false以查看Electron窗口
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'electron',
      use: {
        // Electron应用启动配置
        launchOptions: {
          executablePath: path.join(__dirname, 'dist', 'LogAnalyzer-1.3.1-portable.exe'),
          args: ['--no-sandbox'],
        },
      },
    },
  ],
});
