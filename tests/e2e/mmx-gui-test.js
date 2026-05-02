/**
 * GUI测试 - 使用mmx图片理解验证UI
 * 运行：node tests/e2e/mmx-gui-test.js
 */
const { _electron: electron } = require('playwright');
const path = require('path');
const { execSync } = require('child_process');

(async function runTest() {
  console.log('启动Electron应用...');
  const electronApp = await electron.launch({
    executablePath: require('electron'),
    args: [path.join(__dirname, '..', '..', 'main.js')],
  });

  const page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(3000); // 等待应用完全渲染

  console.log('截图...');
  const screenshotPath = path.join(__dirname, 'screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`截图已保存: ${screenshotPath}`);

  console.log('使用mmx分析截图...');
  try {
    const output = execSync(`mmx vision "${screenshotPath}"`, { encoding: 'utf-8', timeout: 30000 });
    console.log('mmx分析结果:');
    console.log(output);

    // 简单验证：检查输出中是否包含预期UI元素
    const uiElements = ['LogAnalyzer', '打开文件', 'empty-state', 'toolbar'];
    console.log('\nUI元素验证:');
    uiElements.forEach(element => {
      const found = output.toLowerCase().includes(element.toLowerCase());
      console.log(`- ${element}: ${found ? '✅ 找到' : '❌ 未找到'}`);
    });

  } catch (error) {
    console.error('mmx分析失败:', error.message);
  }

  await electronApp.close();
  console.log('测试完成');
})().catch(console.error);
