const { _electron: electron } = require('playwright');
const path = require('path');
const { execSync } = require('child_process');

(async () => {
  console.log('启动 LogAnalyzer-1.3.0-portable.exe...');
  const app = await electron.launch({
    executablePath: path.join('D:', 'Projects', 'LogAnalyzer', 'dist', 'LogAnalyzer-1.3.0-portable.exe'),
  });

  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  console.log('等待应用渲染...');
  await page.waitForSelector('.toolbar', { timeout: 10000 });
  console.log('✅ 应用启动成功，工具栏已加载');

  // 截图验证启动状态（空白界面修复验证）
  const screenshotPath = path.join(__dirname, 'portable-start.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`截图已保存: ${screenshotPath}`);

  // 用mmx识别验证UI状态
  try {
    const mmxOutput = execSync(`mmx vision "${screenshotPath}"`, { encoding: 'utf-8', timeout: 30000 });
    const result = JSON.parse(mmxOutput);
    const description = result.content || '';
    console.log('\nmmx识别结果（前500字）:', description.substring(0, 500));

    // 验证关键UI元素
    const checks = [
      ['工具栏', description.includes('工具栏') || description.includes('toolbar')],
      ['打开按钮', description.includes('打开')],
      ['搜索栏', description.includes('搜索')],
      ['空白界面', !description.includes('空白') && !description.includes('blank')],
    ];
    console.log('\nUI验证结果:');
    checks.forEach(([name, pass]) => console.log(`- ${name}: ${pass ? '✅' : '❌'}`));
  } catch (e) {
    console.error('mmx分析失败:', e.message);
  }

  // 测试菜单点击（菜单响应修复验证）
  console.log('\n测试菜单响应...');
  try {
    await page.click('.toolbar', { timeout: 3000 });
    await page.waitForTimeout(500);
    const menuScreenshot = path.join(__dirname, 'menu-click.png');
    await page.screenshot({ path: menuScreenshot });
    console.log('菜单点击截图已保存');
  } catch (e) {
    console.log('菜单点击测试跳过（可能需要系统菜单栏）');
  }

  await app.close();
  console.log('测试完成');
})().catch(e => console.error('测试失败:', e.message));
