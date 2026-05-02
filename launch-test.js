const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 创建日志目录
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 启动应用
const exePath = path.join(__dirname, 'dist', 'LogAnalyzer-1.3.1-portable.exe');
const logFile = path.join(logDir, 'launch-test.log');
const errorFile = path.join(logDir, 'launch-error.log');

console.log(`启动应用: ${exePath}`);

// 创建进程
const app = spawn(exePath, [], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

// 记录输出
let stdoutData = '';
let stderrData = '';

app.stdout.on('data', (data) => {
  const text = data.toString();
  stdoutData += text;
  console.log(`[STDOUT] ${text}`);
});

app.stderr.on('data', (data) => {
  const text = data.toString();
  stderrData += text;
  console.log(`[STDERR] ${text}`);
});

// 保存日志
const saveLog = (content, filename) => {
  try {
    fs.writeFileSync(path.join(logDir, filename), content, 'utf8');
    console.log(`日志已保存到: ${path.join(logDir, filename)}`);
  } catch (err) {
    console.error(`保存日志失败: ${err.message}`);
  }
};

app.on('close', (code, signal) => {
  console.log(`进程退出，代码: ${code}, 信号: ${signal}`);
  saveLog(stdoutData, 'launch-test.log');
  saveLog(stderrData, 'launch-error.log');
  
  // 记录测试结果
  const result = {
    timestamp: new Date().toISOString(),
    exitCode: code,
    exitSignal: signal,
    stdout: stdoutData,
    stderr: stderrData,
    success: code === 0,
    hasError: stderrData.includes('error') || stderrData.includes('Error') || stderrData.includes('ERROR')
  };
  
  const resultFile = path.join(logDir, 'test-result.json');
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
  console.log(`测试结果已保存到: ${resultFile}`);
  
  console.log('\n========== 测试总结 ==========');
  console.log(`退出代码: ${code}`);
  console.log(`是否有错误: ${result.hasError}`);
  console.log(`是否成功: ${result.success}`);
  console.log('==============================');
  
  process.exit(code);
});

// 设置超时
setTimeout(() => {
  console.log('超时，终止进程');
  app.kill('SIGTERM');
  
  // 等待一下再强制终止
  setTimeout(() => {
    app.kill('SIGKILL');
  }, 1000);
}, 30000); // 30秒超时