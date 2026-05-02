const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'LogAnalyzer',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  // 错误监听：捕获空白界面原因
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ 页面加载失败:', errorCode, errorDescription);
    fs.appendFileSync(path.join(__dirname, 'error.log'), `[${new Date().toISOString()}] did-fail-load: ${errorCode} ${errorDescription}\n`);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('❌ 渲染进程崩溃:', details);
    fs.appendFileSync(path.join(__dirname, 'error.log'), `[${new Date().toISOString()}] render-process-gone: ${JSON.stringify(details)}\n`);
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    const levelName = ['verbose', 'info', 'warning', 'error'][level] || 'unknown';
    if (level >= 2) { // 只记录warning和error
      fs.appendFileSync(path.join(__dirname, 'error.log'), `[${new Date().toISOString()}] [${levelName}] ${message}\n`);
    }
  });

  // Menu
  const menu = Menu.buildFromTemplate([
    {
      label: '文件',
      submenu: [
        { label: '打开文件', accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('menu:openFile') },
        { type: 'separator' },
        { label: '导出筛选方案', click: () => mainWindow.webContents.send('menu:exportFilters') },
        { label: '导入筛选方案', click: () => mainWindow.webContents.send('menu:importFilters') },
        { type: 'separator' },
        { label: '退出', accelerator: 'Alt+F4', click: () => app.quit() },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '筛选面板', accelerator: 'CmdOrCtrl+1', click: () => mainWindow.webContents.send('menu:switchTab', 'filter') },
        { label: '图表', accelerator: 'CmdOrCtrl+2', click: () => mainWindow.webContents.send('menu:switchTab', 'chart') },
        { label: '注释', accelerator: 'CmdOrCtrl+3', click: () => mainWindow.webContents.send('menu:switchTab', 'annotations') },
        { label: '配置', accelerator: 'CmdOrCtrl+4', click: () => mainWindow.webContents.send('menu:switchTab', 'config') },
        { type: 'separator' },
        { label: '开发者工具', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() },
      ],
    },
    {
      label: '帮助',
      submenu: [
        { label: '快捷键', accelerator: 'F1', click: () => mainWindow.webContents.send('menu:help') },
        { type: 'separator' },
        { label: '关于', click: () => dialog.showMessageBox(mainWindow, { title: 'LogAnalyzer', message: 'LogAnalyzer v1.0\n基于 Electron + React + ECharts', type: 'info' }) },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  // Debug log (only in dev mode)
  const isDev = process.argv.includes('--dev') || !app.isPackaged;
  if (isDev) {
    const logPath = path.join(__dirname, 'renderer-debug.log');
    fs.writeFileSync(logPath, '', 'utf-8');
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      const levelName = ['verbose', 'info', 'warning', 'error'][level] || 'unknown';
      fs.appendFileSync(logPath, `[${levelName}] ${message} (${sourceId}:${line})\n`, 'utf-8');
    });
  }

  // 加载 webpack 打包后的 index.html
  // 根据打包状态选择不同的路径策略
  let indexPath;
  
  if (app.isPackaged) {
    // 打包后：使用 app.getAppPath() 获取正确路径
    // app.getAppPath() 返回 app.asar 的路径，Electron 的 fs 模块支持直接读取 asar 内部文件
    const appPath = app.getAppPath();
    indexPath = path.join(appPath, 'dist', 'index.html');
    console.log('📦 打包模式，加载路径:', indexPath);
  } else {
    // 开发环境：使用 __dirname
    indexPath = path.join(__dirname, 'dist', 'index.html');
    console.log('🔧 开发模式，加载路径:', indexPath);
  }
  
  // 如果文件不存在，记录错误
  if (!fs.existsSync(indexPath)) {
    const errorMsg = `index.html not found at: ${indexPath}`;
    console.error('❌', errorMsg);
    fs.appendFileSync(path.join(__dirname, 'error.log'), `[${new Date().toISOString()}] ${errorMsg}\n`);
    // 尝试备用路径
    const fallbackPath = path.join(process.resourcesPath, 'dist', 'index.html');
    console.log('🔄 尝试备用路径:', fallbackPath);
    if (fs.existsSync(fallbackPath)) {
      indexPath = fallbackPath;
    }
  }
  
  console.log('✅ 最终加载路径:', indexPath);
  mainWindow.loadFile(indexPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Auto-load demo if available
    const ispLogPath = path.join(__dirname, 'isp_log.txt');
    if (fs.existsSync(ispLogPath)) {
      setTimeout(() => {
        mainWindow.webContents.send('auto-load-file', ispLogPath);
        setTimeout(() => {
          mainWindow.webContents.send('configure-extractors', {
            xAxisMode: 'data',
            xAxisField: 'seqNum',
            extractors: [
              { name: 'seqNum', regex: 'seqNum\\s*=\\s*(\\d+)', color: '#cba6f7' },
              { name: 'meanLuma', regex: 'meanLuma=([\\d.]+)', color: '#89b4fa' },
              { name: 'wMeanLuma', regex: 'wMeanLuma=([\\d.]+)', color: '#a6e3a1' },
              { name: 'objectMeanLuma', regex: 'objectMeanLuma\\s*=\\s*([\\d.]+)', color: '#f9e2af' },
              { name: 'cur_luma', regex: 'cur_luma\\s*=\\s*([\\d.]+)', color: '#f38ba8' },
              { name: 'isConverge', regex: 'isConverge=(\\d+)', color: '#fab387' },
            ],
          });
        }, 1000);
      }, 500);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.disableHardwareAcceleration();

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// --- IPC Handlers ---

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Log Files', extensions: ['log', 'txt', 'csv', 'json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// Open multiple files
ipcMain.handle('dialog:openFiles', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Log Files', extensions: ['log', 'txt', 'csv', 'json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled) return null;
  return result.filePaths;
});

ipcMain.handle('file:readStream', async (event, filePath) => {
  try {
    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });
    let lineNum = 0;
    const CHUNK_SIZE = 500;
    let chunk = [];
    for await (const line of rl) {
      lineNum++;
      chunk.push({ num: lineNum, text: line });
      if (chunk.length >= CHUNK_SIZE) {
        event.sender.send('file:chunk', { lines: chunk, totalLines: lineNum, fileSize });
        chunk = [];
      }
    }
    if (chunk.length > 0) {
      event.sender.send('file:chunk', { lines: chunk, totalLines: lineNum, fileSize });
    }
    event.sender.send('file:done', { totalLines: lineNum, fileSize, filePath });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:readFull', async (_, filePath) => {
  try {
    const stat = await fs.promises.stat(filePath);
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB limit
    if (stat.size > MAX_SIZE) {
      return { success: false, error: `文件过大 (${(stat.size / 1024 / 1024).toFixed(1)}MB)，请使用流式加载或选择小于 50MB 的文件` };
    }
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n').map((text, i) => ({ num: i + 1, text }));
    return { success: true, lines, totalLines: lines.length, fileSize: stat.size, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('annotations:save', async (_, { filePath, annotations }) => {
  try {
    const annoPath = filePath + '.annotations.json';
    await fs.promises.writeFile(annoPath, JSON.stringify(annotations, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('annotations:load', async (_, filePath) => {
  try {
    const annoPath = filePath + '.annotations.json';
    const exists = await fs.promises.access(annoPath).then(() => true).catch(() => false);
    if (exists) {
      const data = await fs.promises.readFile(annoPath, 'utf-8');
      try {
        return { success: true, annotations: JSON.parse(data) };
      } catch {
        return { success: true, annotations: {}, parseWarning: '注释文件格式已损坏，已重置' };
      }
    }
    return { success: true, annotations: {} };
  } catch (err) {
    return { success: false, error: err.message };
  }
});


ipcMain.handle('chart:saveImage', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'chart.png',
    filters: [
      { name: 'PNG Image', extensions: ['png'] },
      { name: 'SVG Image', extensions: ['svg'] },
    ],
  });
  if (result.canceled) return null;
  return result.filePath;
});

ipcMain.handle('export:csv', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'data.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (result.canceled) return null;
  return result.filePath;
});

ipcMain.handle('export:saveCSV', async (_, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Filter file save (.logfilter)
ipcMain.handle('filters:save', async (_, config) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'filter.logfilter',
    filters: [
      { name: 'Filter File', extensions: ['logfilter'] },
    ],
  });
  if (result.canceled) return { success: false, error: 'Canceled' };
  try {
    await fs.promises.writeFile(result.filePath, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Filter file load (.logfilter)
ipcMain.handle('filters:load', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Filter File', extensions: ['logfilter'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled) return { success: false, error: 'Canceled' };
  try {
    const data = await fs.promises.readFile(result.filePaths[0], 'utf-8');
    const config = JSON.parse(data);
    return { success: true, config };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Handle file drop - extract paths from drag event data
ipcMain.handle('file:getDroppedPaths', async (event, { uriList, fileNames }) => {
  const paths = [];
  
  // Method 1: Parse text/uri-list
  if (uriList) {
    const uris = uriList.split('\n')
      .map(u => u.trim())
      .filter(u => u && !u.startsWith('#') && u.startsWith('file://'));
    
    for (const uri of uris) {
      try {
        let path = decodeURIComponent(uri);
        // Remove file:// or file:/// prefix
        if (path.startsWith('file:///')) {
          path = path.slice(8);
        } else if (path.startsWith('file://')) {
          path = path.slice(7);
        }
        // On Windows, remove leading slash if present (e.g., /C:/ -> C:/)
        if (/^\/[A-Za-z]:/.test(path)) {
          path = path.slice(1);
        }
        paths.push(path);
      } catch (err) {
        console.error('Failed to parse URI:', uri, err);
      }
    }
  }
  
  // Method 2: If uri-list failed, try to use fileNames (but we need full paths)
  // This is a fallback - in most cases uri-list should work
  if (paths.length === 0 && fileNames && fileNames.length > 0) {
    console.warn('Could not extract paths from uri-list, file names:', fileNames);
  }
  
  return { paths };
});

