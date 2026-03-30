const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Dialog
  openFile: () => ipcRenderer.invoke('dialog:openFile'),

  // File reading
  readStream: (filePath) => ipcRenderer.invoke('file:readStream', filePath),
  readFull: (filePath) => ipcRenderer.invoke('file:readFull', filePath),

  // Stream events
  onChunk: (callback) => ipcRenderer.on('file:chunk', (_, data) => callback(data)),
  onDone: (callback) => ipcRenderer.on('file:done', (_, data) => callback(data)),
  
  // Auto-load file (for demo purposes)
  onAutoLoadFile: (callback) => ipcRenderer.on('auto-load-file', (_, filePath) => callback(filePath)),
  
  // Configure extractors (for demo purposes)
  onConfigureExtractors: (callback) => ipcRenderer.on('configure-extractors', (_, config) => callback(config)),
  
  // Switch tab (for demo purposes)
  onSwitchTab: (callback) => ipcRenderer.on('switch-tab', (_, tab) => callback(tab)),

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
});

// echarts is bundled in renderer, no need to expose here
