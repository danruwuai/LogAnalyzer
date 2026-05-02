const { contextBridge, ipcRenderer } = require('electron');

const api = {
  // Dialog
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openFiles: () => ipcRenderer.invoke('dialog:openFiles'),

  // File reading
  readStream: (filePath) => ipcRenderer.invoke('file:readStream', filePath),
  readFull: (filePath) => ipcRenderer.invoke('file:readFull', filePath),

  // Stream events
  onChunk: (callback) => ipcRenderer.on('file:chunk', (_, data) => callback(data)),
  onDone: (callback) => ipcRenderer.on('file:done', (_, data) => callback(data)),

  // Auto-load file (for demo)
  onAutoLoadFile: (callback) => ipcRenderer.on('auto-load-file', (_, filePath) => callback(filePath)),
  onConfigureExtractors: (callback) => ipcRenderer.on('configure-extractors', (_, config) => callback(config)),

  // Menu events
  onMenuOpenFile: (callback) => ipcRenderer.on('menu:openFile', () => callback()),
  onMenuSwitchTab: (callback) => ipcRenderer.on('menu:switchTab', (_, tab) => callback(tab)),
  onMenuHelp: (callback) => ipcRenderer.on('menu:help', () => callback()),

  // Annotations
  saveAnnotations: (filePath, annotations) =>
    ipcRenderer.invoke('annotations:save', { filePath, annotations }),
  loadAnnotations: (filePath) => ipcRenderer.invoke('annotations:load', filePath),

  // Chart export
  saveChartImage: () => ipcRenderer.invoke('chart:saveImage'),

  // CSV export
  exportCSV: () => ipcRenderer.invoke('export:csv'),
  saveCSV: (filePath, content) =>
    ipcRenderer.invoke('export:saveCSV', { filePath, content }),

  // Filter file export/import (.logfilter)
  saveFilterFile: (config) => ipcRenderer.invoke('filters:save', config),
  loadFilterFile: () => ipcRenderer.invoke('filters:load'),

  // Cleanup helper
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
};

try {
  contextBridge.exposeInMainWorld('api', api);
  console.log('✅ preload: api exposed successfully');
} catch (err) {
  console.error('❌ preload: failed to expose api', err);
}
