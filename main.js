const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Open DevTools in development to capture errors
  mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Log console messages to file for debugging
  const logPath = path.join(__dirname, 'renderer-debug.log');
  fs.writeFileSync(logPath, '', 'utf-8'); // Clear old log
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levelName = ['verbose','info','warning','error'][level] || 'unknown';
    fs.appendFileSync(logPath, `[${levelName}] ${message} (${sourceId}:${line})\n`, 'utf-8');
  });

  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Auto-load isp_log.txt
    const ispLogPath = path.join(__dirname, 'isp_log.txt');
    if (fs.existsSync(ispLogPath)) {
      setTimeout(() => {
        mainWindow.webContents.send('auto-load-file', ispLogPath);
        
        // Configure extractors
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
            ]
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
  if (mainWindow === null) createWindow();
});

// --- IPC Handlers ---

// Open file dialog
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

// Read file stream - returns chunks of lines
ipcMain.handle('file:readStream', async (event, filePath) => {
  try {
    const stat = fs.statSync(filePath);
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

// Read file fully (for smaller files)
ipcMain.handle('file:readFull', async (_, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map((text, i) => ({ num: i + 1, text }));
    const stat = fs.statSync(filePath);
    return { success: true, lines, totalLines: lines.length, fileSize: stat.size, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Save annotations
ipcMain.handle('annotations:save', async (_, { filePath, annotations }) => {
  try {
    const annoPath = filePath + '.annotations.json';
    fs.writeFileSync(annoPath, JSON.stringify(annotations, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Load annotations
ipcMain.handle('annotations:load', async (_, filePath) => {
  try {
    const annoPath = filePath + '.annotations.json';
    if (fs.existsSync(annoPath)) {
      const data = fs.readFileSync(annoPath, 'utf-8');
      return { success: true, annotations: JSON.parse(data) };
    }
    return { success: true, annotations: {} };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Save chart as image (handled in renderer, this is for file save)
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

// Export CSV
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
