const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testLogAnalyzer() {
  console.log('正在连接到调试端口9222...');
  
  const screenshotDir = path.join(__dirname, 'screenshots', 'v131-test');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  try {
    // 通过CDP连接到运行中的Electron应用
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('CDP连接成功！');
    
    const contexts = browser.contexts();
    console.log(`上下文数量: ${contexts.length}`);
    
    if (contexts.length === 0) {
      console.error('没有找到浏览器上下文');
      await browser.close();
      return;
    }
    
    const context = contexts[0];
    const pages = context.pages();
    console.log(`页面数量: ${pages.length}`);
    
    let page = pages[0];
    if (!page && pages.length === 0) {
      console.log('等待页面创建...');
      page = await context.waitForEvent('page', { timeout: 10000 });
    }
    
    if (!page) {
      console.error('没有找到页面');
      await browser.close();
      return;
    }
    
    console.log(`当前URL: ${page.url()}`);
    console.log('等待页面加载...');
    
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    await page.waitForTimeout(2000); // 额外等待渲染
    
    // 截图1: 启动界面
    const screenshot1 = path.join(screenshotDir, '01-startup.png');
    await page.screenshot({ path: screenshot1 });
    console.log(`截图已保存: ${screenshot1}`);
    
    // 检查页面内容
    const bodyHTML = await page.innerHTML('body');
    console.log(`页面内容长度: ${bodyHTML.length} 字符`);
    
    // 检查是否有空白页面特征
    const hasContent = bodyHTML.length > 100;
    console.log(`页面有内容: ${hasContent}`);
    
    // 查找常见元素
    const rootEl = await page.$('#root');
    console.log(`#root元素存在: ${rootEl !== null}`);
    
    // 查找工具栏
    const toolbar = await page.$('.toolbar, [class*="toolbar"]');
    console.log(`工具栏存在: ${toolbar !== null}`);
    
    // 查找空状态或主内容
    const emptyState = await page.$('.empty-state, [class*="empty"]');
    console.log(`空状态存在: ${emptyState !== null}`);
    
    // 截图2: 主界面详情
    const screenshot2 = path.join(screenshotDir, '02-main-interface.png');
    await page.screenshot({ path: screenshot2, fullPage: true });
    console.log(`主界面截图已保存: ${screenshot2}`);
    
    // 测试拖拽区域
    const dropZone = await page.$('.drop-zone, [class*="drop"], [class*="drag"]');
    console.log(`拖拽区域存在: ${dropZone !== null}`);
    
    if (dropZone) {
      const isVisible = await dropZone.isVisible();
      console.log(`拖拽区域可见: ${isVisible}`);
      const boundingBox = await dropZone.boundingBox();
      console.log(`拖拽区域位置: ${JSON.stringify(boundingBox)}`);
    }
    
    // 截图3: 拖拽区域
    const screenshot3 = path.join(screenshotDir, '03-dropzone.png');
    await page.screenshot({ path: screenshot3 });
    console.log(`拖拽区域截图已保存: ${screenshot3}`);
    
    // 检查菜单（通过键盘快捷键测试）
    console.log('测试菜单快捷键 F1...');
    await page.keyboard.press('F1');
    await page.waitForTimeout(1000);
    const screenshot4 = path.join(screenshotDir, '04-after-f1.png');
    await page.screenshot({ path: screenshot4 });
    console.log(`F1后截图已保存: ${screenshot4}`);
    
    // 测试Ctrl+O（打开文件）
    console.log('测试快捷键 Ctrl+O...');
    await page.keyboard.press('Control+o');
    await page.waitForTimeout(1000);
    const screenshot5 = path.join(screenshotDir, '05-after-ctrl-o.png');
    await page.screenshot({ path: screenshot5 });
    console.log(`Ctrl+O后截图已保存: ${screenshot5}`);
    
    // 等待并再次检查应用状态
    await page.waitForTimeout(2000);
    const finalScreenshot = path.join(screenshotDir, '06-final-state.png');
    await page.screenshot({ path: finalScreenshot });
    console.log(`最终状态截图已保存: ${finalScreenshot}`);
    
    // 获取页面标题
    const title = await page.title();
    console.log(`页面标题: ${title}`);
    
    // 检查是否有错误
    const hasError = bodyHTML.includes('error') || bodyHTML.includes('Error');
    console.log(`页面包含错误: ${hasError}`);
    
    console.log('\n========== 测试总结 ==========');
    console.log(`页面有内容: ${hasContent}`);
    console.log(`#root元素存在: ${rootEl !== null}`);
    console.log(`工具栏存在: ${toolbar !== null}`);
    console.log(`拖拽区域存在: ${dropZone !== null}`);
    console.log(`页面包含错误: ${hasError}`);
    console.log('========== 测试完成 ==========');
    
    await browser.close();
    
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error(error.stack);
    
    // 尝试截图保存错误状态
    try {
      const errorScreenshot = path.join(screenshotDir, 'error-state.png');
      // 如果page还存在，尝试截图
      console.log(`错误状态截图应保存至: ${errorScreenshot}`);
    } catch (e) {
      // ignore
    }
  }
}

testLogAnalyzer();
