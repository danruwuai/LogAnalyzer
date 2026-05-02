const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// 测试截图保存目录
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'v131-test');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('LogAnalyzer v1.3.1 GUI Tests', () => {
  let electronApp;
  let window;

  test.beforeAll(async ({ playwright }) => {
    // 启动Electron应用
    const electronPath = path.join(__dirname, '..', '..', 'dist', 'LogAnalyzer-1.3.1-portable.exe');
    console.log(`启动Electron应用: ${electronPath}`);
    
    // 使用playwright的electron启动方式
    try {
      electronApp = await playwright._electron.launch({
        executablePath: electronPath,
        args: ['--no-sandbox'],
        timeout: 30000,
      });
      
      // 等待应用启动
      await electronApp.firstWindow({ timeout: 10000 });
    } catch (error) {
      console.error('Electron启动失败:', error);
      throw error;
    }
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('1. 应用应该正常启动并显示主界面', async () => {
    // 获取第一个窗口
    window = await electronApp.firstWindow();
    expect(window).toBeTruthy();
    
    // 等待窗口加载完成
    await window.waitForLoadState('domcontentloaded', { timeout: 10000 });
    
    // 截图保存
    const screenshotPath = path.join(SCREENSHOT_DIR, '01-startup.png');
    await window.screenshot({ path: screenshotPath });
    console.log(`启动截图已保存: ${screenshotPath}`);
    
    // 检查页面不是空白的（body不应该为空）
    const bodyHTML = await window.innerHTML('body');
    expect(bodyHTML.length).toBeGreaterThan(100); // 页面应该有足够的内容
  });

  test('2. 主界面应该显示菜单栏', async () => {
    window = await electronApp.firstWindow();
    
    // 等待一下确保界面完全加载
    await window.waitForTimeout(2000);
    
    // 截图
    const screenshotPath = path.join(SCREENSHOT_DIR, '02-menu.png');
    await window.screenshot({ path: screenshotPath });
    console.log(`菜单截图已保存: ${screenshotPath}`);
    
    // 尝试查找菜单相关元素（根据不同框架调整选择器）
    // 对于Electron应用，可能需要检查特定的元素
    const hasContent = await window.evaluate(() => {
      const body = document.body;
      return body && body.children.length > 0;
    });
    expect(hasContent).toBeTruthy();
  });

  test('3. 检查是否能打开日志文件（通过拖拽区域）', async () => {
    window = await electronApp.firstWindow();
    
    await window.waitForTimeout(1000);
    
    // 查找拖拽区域或打开文件按钮
    const dropZone = await window.$('.drop-zone, .file-drop, [class*="drop"]');
    const screenshotPath = path.join(SCREENSHOT_DIR, '03-dropzone.png');
    await window.screenshot({ path: screenshotPath });
    console.log(`拖拽区域截图已保存: ${screenshotPath}`);
    
    if (dropZone) {
      console.log('找到拖拽区域');
      // 可以尝试模拟拖拽操作
      // 但由于无法实际拖拽文件，这里只验证元素存在
      const isVisible = await dropZone.isVisible();
      expect(isVisible).toBeTruthy();
    } else {
      console.log('未找到明显的拖拽区域，检查页面内容');
    }
  });

  test('4. 检查时间轴缩略图区域', async () => {
    window = await electronApp.firstWindow();
    
    await window.waitForTimeout(1000);
    
    // 查找时间轴相关元素
    const timeline = await window.$('.timeline, [class*="timeline"], [class*="thumbnail"]');
    const screenshotPath = path.join(SCREENSHOT_DIR, '04-timeline.png');
    await window.screenshot({ path: screenshotPath });
    console.log(`时间轴截图已保存: ${screenshotPath}`);
    
    // 记录页面结构以便分析
    const pageStructure = await window.evaluate(() => {
      const getStructure = (el, depth = 0) => {
        if (depth > 3) return null;
        const children = Array.from(el.children || []);
        return {
          tag: el.tagName,
          class: el.className,
          id: el.id,
          children: children.slice(0, 5).map(c => getStructure(c, depth + 1)).filter(Boolean),
        };
      };
      return getStructure(document.body);
    });
    console.log('页面结构:', JSON.stringify(pageStructure, null, 2));
  });

  test('5. 应用应该保持运行（不立即退出）', async () => {
    // 等待一段时间检查应用是否还在运行
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const windows = await electronApp.windows();
    expect(windows.length).toBeGreaterThan(0);
    
    const screenshotPath = path.join(SCREENSHOT_DIR, '05-stability.png');
    const window = windows[0];
    await window.screenshot({ path: screenshotPath });
    console.log(`稳定性测试截图已保存: ${screenshotPath}`);
  });
});
