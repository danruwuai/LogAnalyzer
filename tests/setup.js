// Mock window.api - pure setup, no testing framework needed
global.window = {
  api: {
    openFiles: () => Promise.resolve([]),
    readFull: () => Promise.resolve({ success: false }),
    saveFilterFile: () => Promise.resolve({ success: false }),
    loadFilterFile: () => Promise.resolve({ success: false }),
    saveAnnotations: () => Promise.resolve(),
    loadAnnotations: () => Promise.resolve({ success: false }),
    onAutoLoadFile: () => {},
    onConfigureExtractors: () => {},
    onMenuOpenFile: () => {},
    onMenuSwitchTab: () => {},
    onMenuHelp: () => {},
    onMenuExportFilters: () => {},
    onMenuImportFilters: () => {},
    removeAllListeners: () => {},
  },
  logAnalyzerTheme: {},
};

// Mock localStorage
const localStorageMock = {
  data: {},
  getItem(key) { return this.data[key] ?? null; },
  setItem(key, value) { this.data[key] = String(value); },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; },
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = () => 'blob:test-url';
global.URL.revokeObjectURL = () => {};
