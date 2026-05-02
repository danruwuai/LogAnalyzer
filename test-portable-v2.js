const { _electron: electron } = require('playwright');
const path = require('path');

(async () => {
  console.log('连接到已运行的 LogAnalyzer-1.3.0-portable...');
  try {
    // 尝试连接到已经运行的Electron实例（需要调试端口，但可能未开启）
    // 替代方案：直接启动并截图
    const app = await electron.launch({
      executablePath: path.join('D:', 'Projects', 'LogAnalyzer', 'dist', 'LogAnalyzer-1.3.0-portable.exe'),
      timeout: 30000, // 增加超时
      env: { ELECTRON_ENABLE_LOGGING: '1' } // 开启日志
    });
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
    await page.waitForSelector('.toolbar', { timeout: 10000 });
    console.log('✅ 应用启动成功，工具栏已加载');

    // 截图验证
    const screenshotPath = 'portable-ui.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`截图已保存: ${screenshotPath}`);

    // mmx识别
    const { execSync } = require('child_process');
    const mmxOutput = execSync(`mmx vision "${screenshotPath}"`, { encoding: 'utf-8', timeout: 30000 });
    const result = JSON.parse(mmxOutput);
    const description = result.content || '';
    console.log('\nmmx识别结果（前500字）:', description.substring(0, 500));

    // 验证关键修复点
    const checks = [
      ['空白界面修复', !description.includes('空白') && !description.includes('blank')],
      ['菜单响应', description.includes('工具栏') || description.includes('toolbar')],
      ['打开按钮', description.includes('打开')],
    ];
    console.log('\n修复验证结果:');
    checks.forEach(([name, pass]) => console.log(`- ${name}: ${pass ? '✅' : '❌'}`));

    await app.close();
  } catch (e) {
    console.error('测试失败:', e.message);
    // 尝试手动截图（如果进程还在）
    console.log('尝试手动截图...');
  }
})();
