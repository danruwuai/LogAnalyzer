/**
 * GUI测试：截图 + mmx图片识别验证UI
 * 运行：node tests/e2e/screenshot-test.js
 */
const { _electron: electron } = require('playwright');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

(async function runScreenshotTest() {
  console.log('启动应用...');
  const app = await electron.launch({
    executablePath: require('electron'),
    args: [path.join(__dirname, '..', '..', 'main.js')],
  });

  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForSelector('.toolbar', { timeout: 10000 });

  // 截取工具栏
  console.log('截取工具栏...');
  const toolbar = page.locator('.toolbar');
  const toolbarShot = path.join(__dirname, 'toolbar.png');
  await toolbar.screenshot({ path: toolbarShot });
  console.log('工具栏截图已保存:', toolbarShot);

  // 截取整个窗口
  console.log('截取整个窗口...');
  const windowShot = path.join(__dirname, 'window.png');
  await page.screenshot({ path: windowShot, fullPage: true });
  console.log('窗口截图已保存:', windowShot);

  await app.close();

  // 用mmx分析截图
  console.log('\n分析工具栏截图...');
  try {
    const result = execSync(`mmx vision "${toolbarShot}"`, { encoding: 'utf-8', timeout: 30000 });
    const parsed = JSON.parse(result);
    const description = parsed.content || '';
    console.log('mmx分析结果:', description.substring(0, 500));

    // 验证UI元素
    const checks = [
      ['LogAnalyzer', description.includes('LogAnalyzer')],
      ['打开文件', description.includes('打开') || description.includes('文件')],
      ['工具栏', description.includes('工具栏') || description.includes('toolbar')],
    ];
    console.log('\n验证结果:');
    checks.forEach(([name, found]) => {
      console.log(`- ${name}: ${found ? '✅' : '❌'}`);
    });
  } catch (error) {
    console.error('mmx分析失败:', error.message);
  }

  console.log('\n测试完成');
})().catch(console.error);
