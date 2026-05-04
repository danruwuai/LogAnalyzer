import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import Toolbar from './components/Toolbar';
import LogPanel from './components/LogPanel';
import StatusBar from './components/StatusBar';
import DraggablePanel from './components/DraggablePanel';
import TimelineOverview from './components/TimelineOverview';
import ConvergenceStateVisualization from "./components/ConvergenceStateVisualization";
import CompareView from './components/CompareView';
import FileTabs from './components/FileTabs';
import ConvergenceThresholdPanel from './components/ConvergenceThresholdPanel';
import { Icons } from './components/Icons';
import { logAnalyzerTheme } from './components/echarts-theme';

const COLORS = ['#89b4fa', '#a6e3a1', '#f9e2af', '#f38ba8', '#fab387', '#cba6f7', '#94e2d5'];

// Error boundary
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('Render error:', error, info); }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 20, color: '#f38ba8' }}>
        <h3>渲染出错</h3>
        <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{this.state.error?.message}</pre>
        <button onClick={() => this.setState({ hasError: false, error: null })}>重试</button>
      </div>;
    }
    return this.props.children;
  }
}

export default function App() {
  // 预加载检查
  if (!window.api) {
    return (
      <div style={{ padding: 20, color: '#f38ba8', background: '#1e1e2e', height: '100vh' }}>
        <h3>⚠️ 应用加载异常</h3>
        <p>预加载脚本未正确加载，请尝试：</p>
        <ul>
          <li>重新安装应用</li>
          <li>检查杀毒软件是否拦截</li>
          <li>联系开发团队</li>
        </ul>
      </div>
    );
  }
  // File state - multi-file support
  const [files, setFiles] = useState([]); // [{id, path, name, lines, totalLines, fileSize, bookmarks, annotations}]
  const [activeFileId, setActiveFileId] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  // Sprint 2: 对比模式文件状态
  const [compareLeftId, setCompareLeftId] = useState(null);
  const [compareRightId, setCompareRightId] = useState(null);
  const [diffCounts, setDiffCounts] = useState({}); // {fileId: count}
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // Current active file
  const activeFile = files.find(f => f.id === activeFileId) || null;
  const lines = activeFile?.lines || [];
  const filePath = activeFile?.path || null;
  const fileName = activeFile?.name || '';
  const totalLines = activeFile?.totalLines || 0;
  const fileSize = activeFile?.fileSize || 0;

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterItems, setFilterItems] = useState([]);
  const [filterMode, setFilterMode] = useState('filter');
  const [timeRange, setTimeRange] = useState({ start: '', end: '' });

  // Bookmarks & annotations
  const [fileBookmarks, setFileBookmarks] = useState(new Set());
  const [fileAnnotations, setFileAnnotations] = useState({});
  const bookmarks = activeFile?.bookmarks || fileBookmarks;
  const annotations = activeFile?.annotations || fileAnnotations;

  // Chart extractors
  const [extractors, setExtractors] = useState([]);
  const [xAxisMode, setXAxisMode] = useState('line');
  const [xAxisField, setXAxisField] = useState('');
  const [thresholds, setThresholds] = useState([]);
  const [chartLinkedLine, setChartLinkedLine] = useState(null);

  // Timeline range state
  const [timelineRange, setTimelineRange] = useState({ start: 0, end: 0 });

  // Bottom panel
  const [bottomPanel, setBottomPanel] = useState('filter');
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // Panel mode
  const [panelMode, setPanelMode] = useState('split');
  const [panelZIndex, setPanelZIndex] = useState({ log: 10, bottom: 10 });
  const topZRef = useRef(10);

  // Maximized panel state (controlled by DraggablePanel callbacks)
  const [maximizedPanel, setMaximizedPanel] = useState(null);
  const handleMaximize = useCallback((panelId) => {
    setMaximizedPanel(panelId);
    if (panelId === 'log') setPanelMode('log-full');
  }, []);
  const handleRestore = useCallback(() => {
    setMaximizedPanel(null);
    if (panelMode !== 'split') setPanelMode('split');
  }, [panelMode]);

  // Fullscreen handler for bottom panel tabs
  const handlePanelFullscreen = useCallback((mode) => {
    setPanelMode(mode);
  }, []);

  // Bring panel to front
  const handleBringToFront = useCallback((panelId) => {
    topZRef.current += 1;
    setPanelZIndex(prev => ({ ...prev, [panelId]: topZRef.current }));
  }, []);

  // Sprint 2: 对比文件状态管理
  const handleCompareFilesChange = useCallback((leftId, rightId) => {
    setCompareLeftId(leftId);
    setCompareRightId(rightId);
  }, []);

  const handleDiffCountChange = useCallback((counts) => {
    setDiffCounts(prev => ({ ...prev, ...counts }));
  }, []);

  // 当进入对比模式时，自动设置对比文件
  useEffect(() => {
    if (compareMode && files.length >= 2 && !compareLeftId && !compareRightId) {
      setCompareLeftId(files[0].id);
      setCompareRightId(files[1].id);
    }
    // 退出对比模式时清理
    if (!compareMode) {
      setCompareLeftId(null);
      setCompareRightId(null);
      setDiffCounts({});
    }
  }, [compareMode, files, compareLeftId, compareRightId]);

  // Chart data - computed once at App level for reuse in fullscreen stats
  const chartData = React.useMemo(() => {
    if (extractors.length === 0 || lines.length === 0) return null;
    const regexes = extractors.map(e => {
      try { return { name: e.name, regex: new RegExp(e.regex), color: e.color }; }
      catch { return null; }
    }).filter(Boolean);
    if (regexes.length === 0) return null;
    const linesToProcess = lines.length > 20000 ? lines.slice(0, 20000) : lines;
    const results = [];
    for (const line of linesToProcess) {
      const point = { lineNum: line.num, text: line.text };
      let hasData = false;
      for (const r of regexes) {
        const match = line.text.match(r.regex);
        if (match) {
          for (let g = 1; g < match.length; g++) {
            const val = parseFloat(match[g]);
            if (!isNaN(val)) {
              const key = match.length > 2 ? `${r.name}_g${g}` : r.name;
              point[key] = val;
              hasData = true;
            }
          }
        }
      }
      if (hasData) results.push(point);
    }
    return results;
  }, [lines, extractors]);

  // Export filters to .logfilter file
  const exportFilters = useCallback(async () => {
    const config = {
      filterItems: filterItems.map(({ id, ...rest }) => rest),
      filterMode,
      extractors,
      xAxisMode,
      xAxisField,
      thresholds,
      version: '1.0',
      timestamp: Date.now(),
    };
    const result = await window.api.saveFilterFile(config);
    return result;
  }, [filterItems, filterMode, extractors, xAxisMode, xAxisField, thresholds]);

  // Import filters from .logfilter file
  const importFilters = useCallback(async () => {
    const result = await window.api.loadFilterFile();
    if (!result.success) return;
    const config = result.config;
    if (config.filterItems) {
      setFilterItems(config.filterItems.map(item => ({ ...item, id: Date.now() + Math.random() })));
    }
    if (config.filterMode) setFilterMode(config.filterMode);
    if (config.extractors) setExtractors(config.extractors);
    if (config.xAxisMode) setXAxisMode(config.xAxisMode);
    if (config.xAxisField) setXAxisField(config.xAxisField);
    if (config.thresholds) setThresholds(config.thresholds);
  }, []);

  // Saved profiles (unified: filters + extractors + thresholds)
  const [profiles, setProfiles] = useState(() => {
    try {
      const saved = localStorage.getItem('logAnalyzer_profiles');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Refs
  const logPanelRef = useRef(null);

  // Sync timeline range from LogPanel scroll
  useEffect(() => {
    const syncRange = () => {
      if (logPanelRef.current?.getVisibleRange) {
        const range = logPanelRef.current.getVisibleRange();
        setTimelineRange(range);
      }
    };
    // Poll every 200ms since LogPanel doesn't expose scroll events
    const interval = setInterval(syncRange, 200);
    return () => clearInterval(interval);
  }, []);

  // Timeline viewport change handler
  const handleTimelineViewportChange = useCallback((start, end) => {
    // Update timeline range state
    setTimelineRange({ start, end });
    
    if (!logPanelRef.current) return;
    // Convert line number to scroll position
    const startIdx = lines.findIndex(l => l.num === start);
    if (startIdx >= 0 && logPanelRef.current.scrollTo) {
      logPanelRef.current.scrollTo(startIdx * 21 - 400); // 21 = LINE_HEIGHT, 400 = half container
    }
  }, [lines]);

  // Save profiles to localStorage
  const saveProfiles = useCallback((newProfiles) => {
    setProfiles(newProfiles);
    localStorage.setItem('logAnalyzer_profiles', JSON.stringify(newProfiles));
  }, []);

  // Save current config as profile
  const saveProfile = useCallback((name) => {
    const profile = {
      name,
      filterItems: filterItems.map(({id, ...rest}) => rest),
      filterMode,
      extractors,
      xAxisMode,
      xAxisField,
      thresholds,
      timestamp: Date.now(),
    };
    saveProfiles([...profiles, profile]);
  }, [filterItems, filterMode, extractors, xAxisMode, xAxisField, thresholds, profiles, saveProfiles]);

  // Load profile
  const loadProfile = useCallback((profile) => {
    setFilterItems(profile.filterItems.map(item => ({ ...item, id: Date.now() + Math.random() })));
    if (profile.filterMode) setFilterMode(profile.filterMode);
    if (profile.extractors) setExtractors(profile.extractors);
    if (profile.xAxisMode) setXAxisMode(profile.xAxisMode);
    if (profile.xAxisField) setXAxisField(profile.xAxisField);
    if (profile.thresholds) setThresholds(profile.thresholds);
  }, []);

  // Delete profile
  const deleteProfile = useCallback((index) => {
    saveProfiles(profiles.filter((_, i) => i !== index));
  }, [profiles, saveProfiles]);

  // Load file(s) - supports multi-file
  const handleOpenFile = useCallback(async () => {
    const paths = await window.api.openFiles();
    if (!paths || paths.length === 0) return;
    // Open first file immediately
    const firstPath = paths[0];
    const fileName = firstPath.split(/[/\\]/).pop();
    const result = await window.api.readFull(firstPath);
    const newFile = {
      id: Date.now().toString(),
      path: firstPath,
      name: fileName,
      lines: result.success ? result.lines : [],
      totalLines: result.success ? result.totalLines : 0,
      fileSize: result.success ? result.fileSize : 0,
      bookmarks: new Set(),
      annotations: {},
    };
    if (result.success) {
      const annoResult = await window.api.loadAnnotations(firstPath);
      if (annoResult.success) newFile.annotations = annoResult.annotations;
    }
    setFiles([newFile]);
    setActiveFileId(newFile.id);
    setLoading(false);
    // Open remaining files without switching active
    for (let i = 1; i < paths.length; i++) {
      const p = paths[i];
      const name = p.split(/[/\\]/).pop();
      const res = await window.api.readFull(p);
      const f = {
        id: (Date.now() + i).toString(),
        path: p, name,
        lines: res.success ? res.lines : [],
        totalLines: res.success ? res.totalLines : 0,
        fileSize: res.success ? res.fileSize : 0,
        bookmarks: new Set(),
        annotations: {},
      };
      if (res.success) {
        const ar = await window.api.loadAnnotations(p);
        if (ar.success) f.annotations = ar.annotations;
      }
      setFiles(prev => [...prev, f]);
    }
    if (paths.length > 1) setCompareMode(true);
  }, []);

  // Multi-file management
  const handleRemoveFile = useCallback((fileId) => {
    setFiles(prev => {
      const next = prev.filter(f => f.id !== fileId);
      if (activeFileId === fileId && next.length > 0) {
        setActiveFileId(next[next.length - 1].id);
      } else if (next.length === 0) {
        setActiveFileId(null);
        setCompareMode(false);
      }
      return next;
    });
  }, [activeFileId]);

  const handleSetActiveFile = useCallback((fileId) => {
    setActiveFileId(fileId);
  }, []);

  const handleReorderFiles = useCallback((fromIndex, toIndex) => {
    setFiles(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  // Save annotations
  const saveAnnotations = useCallback(async (newAnnotations) => {
    if (filePath) await window.api.saveAnnotations(filePath, newAnnotations);
  }, [filePath]);

  const addAnnotation = useCallback((lineNum, text) => {
    setFileAnnotations(prev => { const next = { ...prev, [lineNum]: text }; saveAnnotations(next); return next; });
  }, [saveAnnotations]);

  const removeAnnotation = useCallback((lineNum) => {
    setFileAnnotations(prev => { const next = { ...prev }; delete next[lineNum]; saveAnnotations(next); return next; });
  }, [saveAnnotations]);

  const toggleBookmark = useCallback((lineNum) => {
    setFileBookmarks(prev => { const next = new Set(prev); next.has(lineNum) ? next.delete(lineNum) : next.add(lineNum); return next; });
  }, []);

  // Extractor helpers
  const addExtractor = useCallback(() => {
    setExtractors(prev => [...prev, { name: `Metric${prev.length + 1}`, regex: '', color: COLORS[prev.length % COLORS.length] }]);
  }, []);
  const updateExtractor = useCallback((i, field, val) => {
    setExtractors(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  }, []);
  const removeExtractor = useCallback((i) => {
    setExtractors(prev => prev.filter((_, idx) => idx !== i));
  }, []);

  // Threshold helpers
  const addThreshold = useCallback(() => {
    setThresholds(prev => [...prev, { name: `Threshold${prev.length + 1}`, value: 80, color: '#f38ba8', metric: '' }]);
  }, []);
  const updateThreshold = useCallback((i, field, val) => {
    setThresholds(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  }, []);
  const removeThreshold = useCallback((i) => {
    setThresholds(prev => prev.filter((_, idx) => idx !== i));
  }, []);

  // Filtered lines
  const filteredLines = React.useMemo(() => {
    let result = lines;
    if (filterMode === 'show-all') return result;
    const activeFilters = filterItems.filter(item => item.enabled && item.keyword);
    if (activeFilters.length > 0) {
      const includeFilters = activeFilters.filter(f => !f.exclude);
      const excludeFilters = activeFilters.filter(f => f.exclude);
      if (includeFilters.length > 0) {
        result = result.filter(line => includeFilters.some(filter => {
          try {
            if (filter.isRegex) return new RegExp(filter.keyword, filter.caseSensitive ? '' : 'i').test(line.text);
            return filter.caseSensitive ? line.text.includes(filter.keyword) : line.text.toLowerCase().includes(filter.keyword.toLowerCase());
          } catch { return false; }
        }));
      }
      if (excludeFilters.length > 0) {
        result = result.filter(line => !excludeFilters.some(filter => {
          try {
            if (filter.isRegex) return new RegExp(filter.keyword, filter.caseSensitive ? '' : 'i').test(line.text);
            return filter.caseSensitive ? line.text.includes(filter.keyword) : line.text.toLowerCase().includes(filter.keyword.toLowerCase());
          } catch { return false; }
        }));
      }
    }
    return result;
  }, [lines, filterItems, filterMode]);

  const activeHighlightFilters = React.useMemo(
    () => filterItems.filter(item => item.enabled && item.keyword && !item.exclude),
    [filterItems]
  );

  const jumpToLine = useCallback((lineNum) => {
    if (logPanelRef.current) logPanelRef.current.jumpToLine(lineNum);
    setChartLinkedLine(lineNum);
  }, []);

  const [showJumpToLine, setShowJumpToLine] = useState(false);
  const [jumpLineNum, setJumpLineNum] = useState('');
  const [showThresholdPanel, setShowThresholdPanel] = useState(false);
  const [showConvergenceVisualization, setShowConvergenceVisualization] = useState(false);



  // Search match count (memoized for performance, cap at 50k lines)
  const searchMatchCount = React.useMemo(() => {
    if (!searchTerm) return 0;
    const term = searchTerm.toLowerCase();
    const scanLines = filteredLines.length > 50000 ? filteredLines.slice(0, 50000) : filteredLines;
    let count = 0;
    for (let i = 0; i < scanLines.length; i++) {
      if (scanLines[i].text.toLowerCase().includes(term)) count++;
    }
    return count;
  }, [filteredLines, searchTerm]);

  // Convergence detection state
  const [convergenceState, setConvergenceState] = useState('analyzing'); // 'analyzing' | 'converging' | 'diverging' | 'stable'

  // Convergence threshold config (for threshold panel)
  const [convergenceThresholdConfig, setConvergenceThresholdConfig] = useState({
    windowSize: 50,
    peakRatio: 0.6,
    stableThreshold: 3,
    enabled: true,
  });

  // Convergence detection: analyze WARN/ERROR trends
  React.useEffect(() => {
    if (lines.length === 0) { setConvergenceState('analyzing'); return; }
    
    const { windowSize, peakRatio, stableThreshold, enabled } = convergenceThresholdConfig;
    if (!enabled) { setConvergenceState('stable'); return; }
    
    // Segment lines into time windows
    const maxWindows = 50;
    const windowCount = Math.min(Math.ceil(lines.length / windowSize), maxWindows);
    if (windowCount < 2) { setConvergenceState('stable'); return; }
    
    const errorCounts = [];
    for (let w = 0; w < windowCount; w++) {
      const start = w * windowSize;
      const end = Math.min(start + windowSize, lines.length);
      let count = 0;
      for (let i = start; i < end; i++) {
        const t = lines[i].text.toLowerCase();
        if (t.includes('error') || t.includes('exception') || t.includes('warn')) count++;
      }
      errorCounts.push(count);
    }
    
    if (errorCounts.length < 3) { setConvergenceState('stable'); return; }
    
    // Find peak
    const peak = Math.max(...errorCounts);
    const peakIdx = errorCounts.indexOf(peak);
    const lastIdx = errorCounts.length - 1;
    
    // If we are after the peak
    if (peakIdx < lastIdx) {
      // Count consecutive decreases after peak
      let decreases = 0;
      let consecutiveDecreases = 0;
      for (let i = peakIdx; i < lastIdx; i++) {
        if (errorCounts[i + 1] < errorCounts[i]) {
          decreases++;
          consecutiveDecreases++;
        } else {
          consecutiveDecreases = 0;
        }
      }
      
      // Calculate recent average (last 2 windows)
      const recentAvg = (errorCounts[lastIdx] + errorCounts[Math.max(0, lastIdx-1)]) / 2;
      const ratio = peak > 0 ? recentAvg / peak : 0;
      
      if (consecutiveDecreases >= stableThreshold && ratio < peakRatio) {
        setConvergenceState('converging');
      } else if (decreases === 0 && recentAvg > peak * (1 - peakRatio * 0.5)) {
        setConvergenceState('diverging');
      } else {
        setConvergenceState('stable');
      }
    } else if (peakIdx === lastIdx) {
      // Peak is in the last window, might still be diverging
      setConvergenceState('diverging');
    } else {
      setConvergenceState('stable');
    }
  }, [lines, convergenceThresholdConfig]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'o') { e.preventDefault(); handleOpenFile(); }
      if (e.ctrlKey && e.key === 'f') { e.preventDefault(); document.querySelector('.toolbar-input')?.focus(); }
      if (e.key === 'Escape') { setSearchTerm(''); setShowJumpToLine(false); document.activeElement?.blur(); }
      if (e.ctrlKey && e.key === '1') { e.preventDefault(); setBottomPanel('filter'); setShowBottomPanel(true); }
      if (e.ctrlKey && e.key === '2') { e.preventDefault(); setBottomPanel('chart'); setShowBottomPanel(true); }
      if (e.ctrlKey && e.key === '3') { e.preventDefault(); setBottomPanel('annotations'); setShowBottomPanel(true); }
      if (e.ctrlKey && e.key === '4') { e.preventDefault(); setBottomPanel('config'); setShowBottomPanel(true); }
      if (e.ctrlKey && e.key === 'g') { e.preventDefault(); setShowJumpToLine(true); }
      if (e.ctrlKey && e.shiftKey && e.key === 'F') { e.preventDefault(); setFilterMode(prev => prev === 'filter' ? 'show-all' : 'filter'); }
      if (e.ctrlKey && e.shiftKey && e.key === 'C') { e.preventDefault(); setFilterItems([]); }
      if (e.key === 'F1') { e.preventDefault(); setShowHelp(prev => !prev); }
      if (e.ctrlKey && e.key === '/') { e.preventDefault(); setShowHelp(prev => !prev); }
      if (e.ctrlKey && e.key === 't') { e.preventDefault(); setShowThresholdPanel(prev => !prev); }
      // F3 / Shift+F3 - search navigation
      if (e.key === 'F3' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (logPanelRef.current) {
          e.shiftKey ? logPanelRef.current.jumpToPrevSearch() : logPanelRef.current.jumpToNextSearch();
        }
      }
      // Ctrl+B - toggle bookmark on current/center line
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        if (logPanelRef.current) {
          const firstVisible = logPanelRef.current.getFirstVisibleLine();
          if (firstVisible != null) toggleBookmark(firstVisible);
        }
      }
      // Ctrl+Shift+L - log fullscreen toggle (sync with maximizedPanel)
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        setMaximizedPanel(prev => prev === 'log' ? null : 'log');
        setPanelMode(prev => prev === 'log-full' ? 'split' : 'log-full');
      }
      // Escape - exit any fullscreen mode
      if (e.key === 'Escape' && panelMode !== 'split') {
        setPanelMode('split');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenFile, toggleBookmark, panelMode]);

  // Auto-load for demo & menu events
  useEffect(() => {
    if (window.api?.onAutoLoadFile) {
      window.api.onAutoLoadFile(async (filePath) => {
        const fileName = filePath.split(/[/\\]/).pop();
        const result = await window.api.readFull(filePath);
        const newFile = {
          id: Date.now().toString(),
          path: filePath, name: fileName,
          lines: result.success ? result.lines : [],
          totalLines: result.success ? result.totalLines : 0,
          fileSize: result.success ? result.fileSize : 0,
          bookmarks: new Set(),
          annotations: {},
        };
        if (result.success) {
          const ar = await window.api.loadAnnotations(filePath);
          if (ar.success) newFile.annotations = ar.annotations;
        }
        setFiles([newFile]);
        setActiveFileId(newFile.id);
        setFilterItems([
          { id: Date.now(), enabled: true, keyword: 'INFO', caseSensitive: false, isRegex: false, exclude: false, highlightRow: false, bgColor: 'rgba(137, 180, 250, 0.15)', fgColor: '#89b4fa', fontColor: '' },
          { id: Date.now()+1, enabled: true, keyword: 'WARN', caseSensitive: false, isRegex: false, exclude: false, highlightRow: true, bgColor: 'rgba(249, 226, 175, 0.15)', fgColor: '#f9e2af', fontColor: '' },
          { id: Date.now()+2, enabled: true, keyword: 'ERROR', caseSensitive: false, isRegex: false, exclude: false, highlightRow: true, bgColor: 'rgba(243, 139, 168, 0.15)', fgColor: '#f38ba8', fontColor: '#ffffff' },
        ]);
      });
    }
    if (window.api?.onConfigureExtractors) {
      window.api.onConfigureExtractors((config) => {
        if (config.xAxisMode) setXAxisMode(config.xAxisMode);
        if (config.xAxisField) setXAxisField(config.xAxisField);
        if (config.extractors) setExtractors(config.extractors);
      });
    }
    // Menu events
    if (window.api?.onMenuOpenFile) window.api.onMenuOpenFile(() => handleOpenFile());
    if (window.api?.onMenuSwitchTab) window.api.onMenuSwitchTab((tab) => { setBottomPanel(tab); setShowBottomPanel(true); });
    if (window.api?.onMenuHelp) window.api.onMenuHelp(() => setShowHelp(prev => !prev));
    if (window.api?.onMenuExportFilters) window.api.onMenuExportFilters(() => exportFilters());
    if (window.api?.onMenuImportFilters) window.api.onMenuImportFilters(() => importFilters());

    return () => {
      if (window.api?.removeAllListeners) {
        window.api.removeAllListeners('auto-load-file');
        window.api.removeAllListeners('configure-extractors');
        window.api.removeAllListeners('menu:openFile');
        window.api.removeAllListeners('menu:switchTab');
        window.api.removeAllListeners('menu:help');
        window.api.removeAllListeners('menu:exportFilters');
        window.api.removeAllListeners('menu:importFilters');
      }
    };
  }, [handleOpenFile, exportFilters, importFilters]);

  // File drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Helper: extract file paths from drop event (works in contextIsolation mode)
  const getDroppedFilePaths = useCallback(async (e) => {
    const paths = [];
    
    // Debug: log all available data types
    console.log('Drop event types:', e.dataTransfer.types);
    
    // Method 1: Try text/uri-list (most reliable in Electron)
    const uriList = e.dataTransfer.getData('text/uri-list');
    console.log('text/uri-list:', uriList);
    
    if (uriList) {
      const uris = uriList.split('\n')
        .map(u => u.trim())
        .filter(u => u && !u.startsWith('#') && u.startsWith('file://'));
      
      console.log('Parsed URIs:', uris);
      
      for (const uri of uris) {
        try {
          // Decode file:// URL to path
          let path = decodeURIComponent(uri);
          console.log('Decoded URI:', path);
          
          // Handle Windows file:///C:/path and Unix file:///path
          if (path.startsWith('file:///')) {
            path = path.slice(8); // Remove 'file:///'
          } else if (path.startsWith('file://')) {
            path = path.slice(7); // Remove 'file://'
          }
          
          // On Windows, remove leading slash if present (e.g., /C:/ -> C:/)
          if (/^\/[A-Za-z]:/.test(path)) {
            path = path.slice(1);
          }
          
          console.log('Final path:', path);
          paths.push(path);
        } catch (err) {
          console.error('Failed to parse URI:', uri, err);
        }
      }
    }
    
    // Method 2: Use IPC to main process for path extraction (more reliable)
    if (paths.length === 0) {
      console.log('Trying IPC method...');
      try {
        const fileNames = Array.from(e.dataTransfer.files || []).map(f => f.name);
        const result = await window.api.getDroppedFilePaths(uriList, fileNames);
        if (result.paths && result.paths.length > 0) {
          paths.push(...result.paths);
        }
      } catch (err) {
        console.error('IPC method failed:', err);
      }
    }
    
    // Method 3: Fallback - try to access .path directly (may not work in contextIsolation)
    if (paths.length === 0 && e.dataTransfer.files?.length > 0) {
      console.log('Trying direct .path access...');
      for (const file of Array.from(e.dataTransfer.files)) {
        if (file.path) {
          paths.push(file.path);
        }
      }
    }
    
    console.log('Final paths:', paths);
    return paths;
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    // Get file paths using the helper (now async)
    const filePaths = await getDroppedFilePaths(e);
    
    if (filePaths.length === 0) {
      const types = e.dataTransfer.types?.join(', ') || 'none';
      alert('无法获取文件路径，请使用"打开文件"按钮选择文件。\n拖拽内容类型: ' + types);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // Validate and load first file
    let filePath = filePaths[0];
    const fileName = filePath.split(/[\\/]/).pop();
    const ext = fileName?.split('.').pop()?.toLowerCase();
    const allowedExts = ['log', 'txt', 'csv', 'json'];
    if (ext && !allowedExts.includes(ext)) {
      alert(`不支持的文件类型: .${ext}\n支持的类型: ${allowedExts.join(', ')}`);
      setLoading(false);
      return;
    }
    
    const result = await window.api.readFull(filePath);
    if (!result.success) {
      alert(`文件加载失败: ${result.error}`);
      setLoading(false);
      return;
    }
    
    const newFile = {
      id: Date.now().toString(),
      path: filePath, name: fileName,
      lines: result.lines,
      totalLines: result.totalLines,
      fileSize: result.fileSize,
      bookmarks: new Set(),
      annotations: {},
    };
    const ar = await window.api.loadAnnotations(filePath);
    if (ar.success) newFile.annotations = ar.annotations;
    setFiles([newFile]);
    setActiveFileId(newFile.id);
    
    // Load remaining dropped files
    for (let i = 1; i < filePaths.length; i++) {
      const fp = filePaths[i];
      const name = fp.split(/[\\/]/).pop();
      const res = await window.api.readFull(fp);
      if (!res.success) {
        console.error(`文件 ${fp} 加载失败:`, res.error);
        continue;
      }
      const ff = {
        id: (Date.now() + i).toString(),
        path: fp, name,
        lines: res.lines,
        totalLines: res.totalLines,
        fileSize: res.fileSize,
        bookmarks: new Set(),
        annotations: {},
      };
      const ar2 = await window.api.loadAnnotations(fp);
      if (ar2.success) ff.annotations = ar2.annotations;
      setFiles(prev => [...prev, ff]);
    }
    
    if (filePaths.length > 1) setCompareMode(true);
    setLoading(false);
  }, [getDroppedFilePaths]);

  // Export filtered lines
  const handleExportFiltered = useCallback(() => {
    if (filteredLines.length === 0) return;
    const content = filteredLines.map(l => l.text).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `filtered_${fileName || 'export'}.txt`; a.click();
    URL.revokeObjectURL(url);
  }, [filteredLines, fileName]);

  return (
    <div
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Toolbar
        onOpenFile={handleOpenFile}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSearch={() => {
          if (searchTerm.trim()) {
            const colorIdx = filterItems.length % 7;
            const colors = [
              { bg: 'rgba(137, 180, 250, 0.2)', fg: '#89b4fa' },
              { bg: 'rgba(166, 227, 161, 0.2)', fg: '#a6e3a1' },
              { bg: 'rgba(249, 226, 175, 0.2)', fg: '#f9e2af' },
              { bg: 'rgba(243, 139, 168, 0.2)', fg: '#f38ba8' },
              { bg: 'rgba(250, 179, 135, 0.2)', fg: '#fab387' },
              { bg: 'rgba(203, 166, 247, 0.2)', fg: '#cba6f7' },
              { bg: 'rgba(148, 226, 213, 0.2)', fg: '#94e2d5' },
            ];
            setFilterItems(prev => [...prev, {
              id: Date.now(), enabled: true, keyword: searchTerm,
              caseSensitive: false, isRegex: false, exclude: false,
              highlightRow: false, bgColor: colors[colorIdx].bg, fgColor: colors[colorIdx].fg, fontColor: '',
            }]);
            setSearchTerm('');
          }
        }}
        loading={loading}
        fileName={fileName}
        searchMatchCount={searchMatchCount}
        onJumpToLine={() => setShowJumpToLine(true)}
        onExportFilter={() => {
          const data = JSON.stringify({ filterItems, searchTerm }, null, 2);
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'filter.json'; a.click();
          URL.revokeObjectURL(url);
        }}
        onImportFilter={() => {
          const input = document.createElement('input');
          input.type = 'file'; input.accept = '.json';
          input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
              try {
                const obj = JSON.parse(ev.target.result);
                if (obj.filterItems) setFilterItems(obj.filterItems);
                if (obj.searchTerm) setSearchTerm(obj.searchTerm);
              } catch (err) { alert('Invalid file'); }
            };
            reader.readAsText(file);
          };
          input.click();
        }}
        // Multi-file support
        files={files}
        activeFileId={activeFileId}
        onSetActiveFile={handleSetActiveFile}
        compareMode={compareMode}
        onToggleCompareMode={() => setCompareMode(prev => !prev)}
      />

      {/* Drag & Drop overlay */}
      {isDragging && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(137, 180, 250, 0.1)', border: '3px dashed var(--highlight-1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, pointerEvents: 'none',
        }}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            borderRadius: 12, padding: '24px 48px',
            fontSize: 18, color: 'var(--highlight-1)', fontWeight: 600,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <span style={{ fontSize: 24, marginRight: 12 }}>📂</span>
            释放以打开文件
          </div>
        </div>
      )}

      {/* Jump to line dialog */}
      {showJumpToLine && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }} onClick={() => setShowJumpToLine(false)}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            borderRadius: 8, padding: 16, width: 300,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: 13 }}>跳转到行号:</div>
            <input
              autoFocus
              style={{
                width: '100%', padding: '8px 10px', border: '1px solid var(--border-default)',
                borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
              value={jumpLineNum}
              onChange={e => setJumpLineNum(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => {
                if (e.key === 'Enter' && jumpLineNum) {
                  jumpToLine(parseInt(jumpLineNum));
                  setShowJumpToLine(false);
                  setJumpLineNum('');
                }
              }}
              placeholder={`1 - ${totalLines}`}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button className="toolbar-btn" onClick={() => { setShowJumpToLine(false); setJumpLineNum(''); }}>取消</button>
              <button className="toolbar-btn" onClick={() => {
                if (jumpLineNum) { jumpToLine(parseInt(jumpLineNum)); setShowJumpToLine(false); setJumpLineNum(''); }
              }} style={{ background: 'var(--highlight-2)', color: 'var(--bg-canvas)' }}>跳转</button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="loading-bar"><div className="loading-bar-inner" /></div>}

      {/* Multi-file tabs */}
      {files.length > 0 && (
        <FileTabs
          files={files}
          activeFileId={activeFileId}
          onSelectFile={handleSetActiveFile}
          onRemoveFile={handleRemoveFile}
          onReorderFiles={handleReorderFiles}
          compareLeftId={compareLeftId}
          compareRightId={compareRightId}
          diffCounts={diffCounts}
        />
      )}

      {lines.length === 0 && !loading ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Icons.File /></div>
          <div className="empty-state-text">打开一个日志文件开始分析</div>
          <button className="toolbar-btn" onClick={handleOpenFile}>打开文件</button>
        </div>
      ) : (
        <ErrorBoundary>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Log panel - always rendered except in log-full mode (rendered by DraggablePanel in fullscreen) */}
          {panelMode !== 'log-full' && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {compareMode ? (
                <CompareView 
                  files={files}
                  activeFileId={activeFileId}
                  onSelectFile={handleSetActiveFile}
                  filteredLines={filteredLines}
                  compareLeftId={compareLeftId}
                  compareRightId={compareRightId}
                  onCompareFilesChange={handleCompareFilesChange}
                  onDiffCountChange={handleDiffCountChange}
                />
              ) : (
                <DraggablePanel
                  title={`日志 ${filteredLines.length > 0 ? `(${filteredLines.length}行)` : ''}`}
                  icon={<Icons.File />}
                  panelId="log"
                  isMaximized={maximizedPanel === 'log'}
                  onMaximize={handleMaximize}
                  onRestore={handleRestore}
                  zIndex={panelZIndex.log}
                  onZIndexRequest={() => handleBringToFront('log')}
                  actions={
                    <button
                      className="panel-title-btn panel-fullscreen-btn"
                      onClick={() => handlePanelFullscreen('log-full')}
                      title="全屏 (Ctrl+Shift+L)"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '2px 6px', borderRadius: 3, display: 'flex', alignItems: 'center' }}
                    >
                      ⛶
                    </button>
                  }
                >
                  <LogPanel
                    ref={logPanelRef}
                    lines={filteredLines}
                    totalLines={totalLines}
                    highlightFilters={activeHighlightFilters}
                    bookmarks={bookmarks}
                    annotations={annotations}
                    chartLinkedLine={chartLinkedLine}
                    onToggleBookmark={toggleBookmark}
                    onAddAnnotation={addAnnotation}
                    onJumpToLine={jumpToLine}
                    searchTerm={searchTerm}
                    filterMode={filterMode}
                  />
                </DraggablePanel>
              )}
            </div>
          )}

          {/* Timeline Overview - 日志密度缩略图 */}
          {panelMode !== 'log-full' && lines.length > 0 && (
            <TimelineOverview
              lines={lines}
              totalLines={totalLines}
              visibleStart={timelineRange.start}
              visibleEnd={timelineRange.end}
              onViewportChange={handleTimelineViewportChange}
              onJumpToLine={jumpToLine}
              convergenceState={convergenceState}
            />
          )}

          {/* Bottom panel - always rendered in split mode; hidden in log-full */}
          {panelMode === 'split' && (
            <div style={{ flexShrink: 0 }}>
              {/* Bottom tab bar - always visible in split mode */}
              <div className="bottom-panel-tabs">
                {['filter', 'chart', 'annotations', 'config'].map(tab => (
                  <button key={tab}
                    className={`bottom-panel-tab ${bottomPanel === tab ? 'active' : ''}`}
                    onClick={() => { setBottomPanel(tab); setShowBottomPanel(true); }}
                  >
                    {tab === 'filter' && <><Icons.Filter /> 筛选 ({filterItems.length})</>}
                    {tab === 'chart' && <><Icons.Chart /> 图表 ({extractors.length})</>}
                    {tab === 'annotations' && <><Icons.NoteList /> 注释 ({Object.keys(annotations).length})</>}
                    {tab === 'config' && <><Icons.Gear /> 配置</>}
                  </button>
                ))}
                {/* Separator */}
                <span style={{ flex: 1 }} />
                {/* Fullscreen buttons per tab */}
                {bottomPanel === 'chart' && (
                  <button className="bottom-panel-tab panel-fullscreen-btn"
                    onClick={() => handlePanelFullscreen('chart-full')}
                    title="图表全屏" style={{ fontSize: 14 }}>
                    ⛶
                  </button>
                )}
                {bottomPanel === 'annotations' && (
                  <button className="bottom-panel-tab panel-fullscreen-btn"
                    onClick={() => handlePanelFullscreen('annotations-full')}
                    title="注释全屏" style={{ fontSize: 14 }}>
                    ⛶
                  </button>
                )}
                {/* Toggle collapse */}
                <button className="bottom-panel-tab" onClick={() => setShowBottomPanel(p => !p)} style={{ padding: '2px 8px' }}>
                  {showBottomPanel ? '▼' : '▲'}
                </button>
              </div>

              {/* Bottom panel content (DraggablePanel as content container) */}
              <DraggablePanel
                title={null}
                panelId="bottom"
                isMaximized={false}
                onMaximize={handleMaximize}
                onRestore={handleRestore}
                zIndex={panelZIndex.bottom}
                onZIndexRequest={() => handleBringToFront('bottom')}
                contentStyle={{ maxHeight: showBottomPanel ? 280 : 0, overflow: 'auto', padding: showBottomPanel ? '8px 12px' : 0, transition: 'max-height 0.2s' }}
              >
                {showBottomPanel && (
                  <ErrorBoundary>
                    {bottomPanel === 'filter' && <FilterPanelInline
                      filterItems={filterItems} onFilterItemsChange={setFilterItems}
                      filterMode={filterMode} onFilterModeChange={setFilterMode}
                    />}
                    {bottomPanel === 'chart' && <ChartPanelInline
                      lines={lines} extractors={extractors} chartData={chartData}
                      onAddExtractor={addExtractor} onUpdateExtractor={updateExtractor} onRemoveExtractor={removeExtractor}
                      xAxisMode={xAxisMode} onXAxisModeChange={setXAxisMode}
                      xAxisField={xAxisField} onXAxisFieldChange={setXAxisField}
                      thresholds={thresholds} onAddThreshold={addThreshold} onUpdateThreshold={updateThreshold} onRemoveThreshold={removeThreshold}
                      annotations={annotations} onJumpToLine={jumpToLine} chartLinkedLine={chartLinkedLine}
                    />}
                    {bottomPanel === 'annotations' && <AnnotationsPanelInline
                      annotations={annotations} onRemoveAnnotation={removeAnnotation} onJumpToLine={jumpToLine}
                    />}
                    {bottomPanel === 'config' && <ConfigPanelInline
                      profiles={profiles} onSaveProfile={saveProfile} onLoadProfile={loadProfile} onDeleteProfile={deleteProfile}
                      filterItems={filterItems} extractors={extractors}
                    />}
                  </ErrorBoundary>
                )}
              </DraggablePanel>
            </div>
          )}

          {/* Chart fullscreen - chart takes entire main area */}
          {panelMode === 'chart-full' && (
            <div className="panel-fullscreen chart-fullscreen-container">
              <div className="chart-fullscreen-toolbar">
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  <Icons.Chart /> 图表全屏
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                  {extractors.length} 指标 | {chartData?.length || 0} 数据点
                </span>
                <button className="panel-title-btn panel-fullscreen-btn exit-fullscreen"
                  onClick={() => setPanelMode('split')}
                  title="退出全屏 (Esc)"
                >
                  ⊡ 退出全屏
                </button>
              </div>
              <div style={{ flex: 1, padding: '0 12px 12px' }}>
                <ChartPanelInline
                  lines={lines} extractors={extractors} chartData={chartData}
                  onAddExtractor={addExtractor} onUpdateExtractor={updateExtractor} onRemoveExtractor={removeExtractor}
                  xAxisMode={xAxisMode} onXAxisModeChange={setXAxisMode}
                  xAxisField={xAxisField} onXAxisFieldChange={setXAxisField}
                  thresholds={thresholds} onAddThreshold={addThreshold} onUpdateThreshold={updateThreshold} onRemoveThreshold={removeThreshold}
                  annotations={annotations} onJumpToLine={jumpToLine} chartLinkedLine={chartLinkedLine}
                />
              </div>
              {/* Mini tab bar for switching tabs */}
              <div className="bottom-panel-tabs chart-fullscreen-tabs">
                {['filter', 'chart', 'annotations', 'config'].map(tab => (
                  <button key={tab}
                    className={`bottom-panel-tab ${bottomPanel === tab ? 'active' : ''}`}
                    onClick={() => { setBottomPanel(tab); setPanelMode(tab === 'chart' ? 'chart-full' : tab === 'annotations' ? 'annotations-full' : 'split'); }}
                  >
                    {tab === 'filter' && <><Icons.Filter /> 筛选</>}
                    {tab === 'chart' && <><Icons.Chart /> 图表</>}
                    {tab === 'annotations' && <><Icons.NoteList /> 注释</>}
                    {tab === 'config' && <><Icons.Gear /> 配置</>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Annotations fullscreen */}
          {panelMode === 'annotations-full' && (
            <div className="panel-fullscreen annotations-fullscreen-container">
              <div className="chart-fullscreen-toolbar">
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  <Icons.NoteList /> 注释全屏
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                  {Object.keys(annotations).length} 条注释
                </span>
                <button className="panel-title-btn panel-fullscreen-btn exit-fullscreen"
                  onClick={() => setPanelMode('split')}
                  title="退出全屏 (Esc)"
                >
                  ⊡ 退出全屏
                </button>
              </div>
              <div style={{ flex: 1, padding: '0 12px 12px' }}>
                <AnnotationsPanelInline
                  annotations={annotations} onRemoveAnnotation={removeAnnotation} onJumpToLine={jumpToLine}
                />
              </div>
              {/* Mini tab bar */}
              <div className="bottom-panel-tabs chart-fullscreen-tabs">
                {['filter', 'chart', 'annotations', 'config'].map(tab => (
                  <button key={tab}
                    className={`bottom-panel-tab ${bottomPanel === tab ? 'active' : ''}`}
                    onClick={() => { setBottomPanel(tab); setPanelMode(tab === 'chart' ? 'chart-full' : tab === 'annotations' ? 'annotations-full' : 'split'); }}
                  >
                    {tab === 'filter' && <><Icons.Filter /> 筛选</>}
                    {tab === 'chart' && <><Icons.Chart /> 图表</>}
                    {tab === 'annotations' && <><Icons.NoteList /> 注释</>}
                    {tab === 'config' && <><Icons.Gear /> 配置</>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        </ErrorBoundary>
      )}

      <StatusBar
        totalLines={totalLines} filteredLines={filteredLines.length} fileSize={fileSize}
        filePath={filePath} bookmarkCount={bookmarks.size}
        annotationCount={Object.keys(annotations).length}
        onExportFiltered={handleExportFiltered} filterMode={filterMode}
        convergenceState={convergenceState}
        convergenceThresholdConfig={convergenceThresholdConfig}
        onShowThresholdPanel={() => setShowThresholdPanel(v => !v)}
        onShowVisualization={() => setShowConvergenceVisualization(v => !v)}
      />
      <ConvergenceStateVisualization
        convergenceState={convergenceState}
        convergenceThresholdConfig={convergenceThresholdConfig}
        compact={true}
        showDetails={false}
      />

      {showThresholdPanel && (
        <div style={{
          position: 'fixed',
          bottom: 32,
          right: 12,
          zIndex: 500,
        }}>
      {showConvergenceVisualization && (
        <div style={{
          position: 'fixed',
          bottom: 32,
          right: 12,
          zIndex: 500,
        }}>
          <ConvergenceStateVisualization
            convergenceState={convergenceState}
            convergenceThresholdConfig={convergenceThresholdConfig}
            compact={false}
            showDetails={true}
          />
        </div>
      )}

        }}>
          <ConvergenceThresholdPanel
            config={convergenceThresholdConfig}
            onChange={setConvergenceThresholdConfig}
          />
        </div>
      )}

      {showHelp && (
        <div className="help-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-overlay-content" onClick={e => e.stopPropagation()}>
            <div className="help-overlay-header">
              <span style={{ fontWeight: 600 }}>快捷键</span>
              <button className="toolbar-btn" onClick={() => setShowHelp(false)}><Icons.Close /></button>
            </div>
            <div className="help-overlay-body">
              <div className="help-shortcut"><kbd>Ctrl</kbd>+<kbd>O</kbd><span>打开文件</span></div>
              <div className="help-shortcut"><kbd>Ctrl</kbd>+<kbd>F</kbd><span>聚焦搜索框</span></div>
              <div className="help-shortcut"><kbd>Ctrl</kbd>+<kbd>G</kbd><span>跳转到行号</span></div>
              <div className="help-shortcut"><kbd>Esc</kbd><span>清除搜索/关闭对话框/退出全屏</span></div>
              <div className="help-shortcut"><kbd>Ctrl</kbd>+<kbd>1-4</kbd><span>切换底部标签</span></div>
              <div className="help-shortcut"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd><span>切换过滤/全显</span></div>
              <div className="help-shortcut"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd><span>清空筛选条件</span></div>
              <div className="help-shortcut"><kbd>F3</kbd><span>跳转到下一个搜索匹配</span></div>
              <div className="help-shortcut"><kbd>Shift</kbd>+<kbd>F3</kbd><span>跳转到上一个搜索匹配</span></div>
              <div className="help-shortcut"><kbd>Ctrl</kbd>+<kbd>B</kbd><span>切换当前行书签</span></div>
              <div className="help-shortcut"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd><span>日志全屏切换</span></div>
              <div className="help-shortcut"><kbd>双击标题栏</kbd><span>日志/面板全屏还原</span></div>
              <div className="help-shortcut"><kbd>F1</kbd><span>显示/隐藏帮助</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Inline panels (compact, bottom bar style) ---

function FilterPanelInline({ filterItems, onFilterItemsChange, filterMode, onFilterModeChange }) {
  const toggleItem = (id) => {
    onFilterItemsChange(filterItems.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
  };
  const removeItem = (id) => {
    onFilterItemsChange(filterItems.filter(item => item.id !== id));
  };
  const toggleExclude = (id) => {
    onFilterItemsChange(filterItems.map(item => item.id === id ? { ...item, exclude: !item.exclude } : item));
  };
  const toggleHighlight = (id) => {
    onFilterItemsChange(filterItems.map(item => item.id === id ? { ...item, highlightRow: !item.highlightRow } : item));
  };

  return (
    <div className="filter-inline">
      <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
        <button className={`toolbar-btn small ${filterMode === 'filter' ? 'active' : ''}`} onClick={() => onFilterModeChange('filter')}>过滤模式</button>
        <button className={`toolbar-btn small ${filterMode === 'show-all' ? 'active' : ''}`} onClick={() => onFilterModeChange('show-all')}>全显模式</button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>匹配: {filterItems.filter(i => i.enabled).length} 条件</span>
      </div>
      <div className="filter-inline-list">
        {filterItems.map(item => (
          <div key={item.id} className="filter-inline-item" style={{ borderLeft: `3px solid ${item.fgColor}` }}>
            <input type="checkbox" checked={item.enabled} onChange={() => toggleItem(item.id)} />
            <span className="filter-inline-keyword" style={{ color: item.fgColor }}>{item.keyword}</span>
            {item.isRegex && <span className="filter-inline-badge">.*</span>}
            <button className={`filter-inline-btn ${item.exclude ? 'active-exclude' : ''}`} onClick={() => toggleExclude(item.id)} title="排除">
              {item.exclude ? '⊘' : '✓'}
            </button>
            <button className={`filter-inline-btn ${item.highlightRow ? 'active-hl' : ''}`} onClick={() => toggleHighlight(item.id)} title="整行高亮">
              {item.highlightRow ? '█' : '░'}
            </button>
            <button className="filter-inline-btn" onClick={() => removeItem(item.id)} title="删除">×</button>
          </div>
        ))}
        {filterItems.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>在搜索框输入关键字后按回车添加过滤</div>}
      </div>
    </div>
  );
}

function ChartPanelInline({ lines, extractors, chartData: chartDataProp, onAddExtractor, onUpdateExtractor, onRemoveExtractor,
  xAxisMode, onXAxisModeChange, xAxisField, onXAxisFieldChange,
  thresholds, onAddThreshold, onUpdateThreshold, onRemoveThreshold,
  annotations, onJumpToLine, chartLinkedLine }) {

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  // Use prop chartData if provided (computed at App level), otherwise fall back to inline computation
  const chartData = chartDataProp !== undefined ? chartDataProp : React.useMemo(() => {
    if (extractors.length === 0 || lines.length === 0) return null;
    const regexes = extractors.map(e => {
      try { return { name: e.name, regex: new RegExp(e.regex), color: e.color }; }
      catch { return null; }
    }).filter(Boolean);
    if (regexes.length === 0) return null;
    const linesToProcess = lines.length > 20000 ? lines.slice(0, 20000) : lines;
    const results = [];
    for (const line of linesToProcess) {
      const point = { lineNum: line.num, text: line.text };
      let hasData = false;
      for (const r of regexes) {
        const match = line.text.match(r.regex);
        if (match) {
          for (let g = 1; g < match.length; g++) {
            const val = parseFloat(match[g]);
            if (!isNaN(val)) {
              const key = match.length > 2 ? `${r.name}_g${g}` : r.name;
              point[key] = val;
              hasData = true;
            }
          }
        }
      }
      if (hasData) results.push(point);
    }
    return results;
  }, [lines, extractors]);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, logAnalyzerTheme, { renderer: 'canvas' });
    }
    if (!chartData || chartData.length === 0) { chartInstance.current.clear(); return; }

    const metricNames = extractors.map(e => e.name).filter(n => n !== 'seqNum' && n !== 'isConverge');
    const xData = xAxisMode === 'data' ? chartData.map(d => d[xAxisField] ?? d.lineNum) : chartData.map(d => d.lineNum);
    const series = metricNames.map(name => {
      const s = {
        name, type: 'line', data: chartData.map(d => d[name] ?? null),
        smooth: true, symbol: 'circle', symbolSize: 3,
        lineStyle: { width: 2 }, itemStyle: { color: extractors.find(e => e.name === name)?.color || '#89b4fa' },
      };
      // Add threshold markLines for matching metrics
      const matchingThresholds = thresholds.filter(t => !t.metric || t.metric === name);
      if (matchingThresholds.length > 0) {
        s.markLine = {
          silent: true, symbol: 'none',
          data: matchingThresholds.map(t => ({
            yAxis: t.value, name: t.name,
            lineStyle: { color: t.color, type: 'dashed', width: 1 },
            label: { formatter: t.name, color: t.color, fontSize: 10 },
          })),
        };
      }
      return s;
    });

    chartInstance.current.setOption({
      /* 背景透明，使用 CSS 背景穿透 */
      backgroundColor: 'transparent',
      /* 图例 */
      legend: { data: metricNames, top: 0, textStyle: { color: '#8a8f98', fontSize: 11 } },
      /* 网格 */
      grid: { left: 50, right: 20, top: 30, bottom: 25 },
      /* X轴 */
      xAxis: { type: 'category', data: xData, axisLabel: { color: '#8a8f98', fontSize: 10 } },
      /* Y轴 */
      yAxis: { type: 'value', axisLabel: { color: '#8a8f98', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
      /* 缩放 */
      dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 0, height: 16 }],
      series,
    }, true);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [chartData, extractors, xAxisMode, xAxisField, thresholds]);

  // Cleanup chart instance on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={xAxisMode} onChange={e => onXAxisModeChange(e.target.value)} style={{ fontSize: 12 }}>
          <option value="line">X轴: 行号</option><option value="data">X轴: 数据字段</option>
        </select>
        {xAxisMode === 'data' && <input className="toolbar-input" style={{ width: 100 }} placeholder="字段名" value={xAxisField} onChange={e => onXAxisFieldChange(e.target.value)} />}
        <button className="toolbar-btn small" onClick={onAddExtractor}>+ 指标</button>
        <button className="toolbar-btn small" onClick={onAddThreshold}>+ 阈值线</button>
        {chartData && chartData.length > 0 && (
          <>
            <button className="toolbar-btn small" onClick={() => {
              if (!chartInstance.current) return;
              const url = chartInstance.current.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#0a0a0b' });
              const a = document.createElement('a');
              a.href = url; a.download = 'chart.png'; a.click();
            }}>保存图表</button>
            <button className="toolbar-btn small" onClick={() => {
              if (!chartData || chartData.length === 0) return;
              const metricNames = extractors.map(e => e.name);
              const headers = ['lineNum', ...metricNames];
              const rows = chartData.map(d => headers.map(h => d[h] ?? '').join(','));
              const csv = [headers.join(','), ...rows].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'chart_data.csv'; a.click();
              URL.revokeObjectURL(url);
            }}>导出CSV</button>
          </>
        )}
      </div>
      {/* Stats summary */}
      {chartData && chartData.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 4, fontSize: 11 }}>
          {extractors.filter(e => e.name !== 'seqNum' && e.name !== 'isConverge').map(ext => {
            const vals = chartData.map(d => d[ext.name]).filter(v => v != null && !isNaN(v));
            if (vals.length === 0) return null;
            const min = Math.min(...vals).toFixed(2);
            const max = Math.max(...vals).toFixed(2);
            const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
            return (
              <div key={ext.name} style={{ background: 'var(--bg-panel)', padding: '2px 8px', borderRadius: 4, borderLeft: `3px solid ${ext.color}` }}>
                <span style={{ color: ext.color, fontWeight: 600 }}>{ext.name}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>min:{min}</span>
                <span style={{ color: 'var(--text-muted)' }}> max:{max}</span>
                <span style={{ color: 'var(--text-muted)' }}> avg:{avg}</span>
                <span style={{ color: 'var(--text-muted)' }}> n:{vals.length}</span>
              </div>
            );
          })}
        </div>
      )}
      <div ref={chartRef} style={{ width: '100%', height: 200, minHeight: 200, position: 'relative' }} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        {extractors.map((ext, i) => (
          <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: 4, borderLeft: `3px solid ${ext.color}` }}>
            <input style={{ width: 70, fontSize: 11, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 3, padding: '1px 4px' }}
              value={ext.name} onChange={e => onUpdateExtractor(i, 'name', e.target.value)} placeholder="名称" />
            <input style={{ width: 100, fontSize: 11, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 3, padding: '1px 4px' }}
              value={ext.regex} onChange={e => onUpdateExtractor(i, 'regex', e.target.value)} placeholder="正则 (分组1)" />
            <input type="color" value={ext.color} onChange={e => onUpdateExtractor(i, 'color', e.target.value)} style={{ width: 20, height: 20, border: 'none', cursor: 'pointer' }} />
            <button style={{ background: 'none', border: 'none', color: '#f38ba8', cursor: 'pointer', fontSize: 14 }} onClick={() => onRemoveExtractor(i)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnotationsPanelInline({ annotations, onRemoveAnnotation, onJumpToLine }) {
  const entries = Object.entries(annotations);
  if (entries.length === 0) return <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>右键日志行添加注释</div>;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 150, overflow: 'auto' }}>
      {entries.map(([lineNum, text]) => (
        <div key={lineNum} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, background: 'var(--bg-panel)', padding: '3px 8px', borderRadius: 4, cursor: 'pointer' }}
          onClick={() => onJumpToLine(parseInt(lineNum))}>
          <span style={{ color: '#89b4fa' }}>L{lineNum}</span>
          <span>{text}</span>
          <button style={{ background: 'none', border: 'none', color: '#f38ba8', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onRemoveAnnotation(parseInt(lineNum)); }}>×</button>
        </div>
      ))}
    </div>
  );
}

function ConfigPanelInline({ profiles, onSaveProfile, onLoadProfile, onDeleteProfile, filterItems, extractors }) {
  const [name, setName] = useState('');
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <input className="toolbar-input" style={{ width: 150 }} placeholder="配置名称" value={name} onChange={e => setName(e.target.value)} />
        <button className="toolbar-btn small" onClick={() => { if (name.trim()) { onSaveProfile(name.trim()); setName(''); } }}>保存当前配置</button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{filterItems.length} 过滤 + {extractors.length} 指标</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {profiles.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, background: 'var(--bg-panel)', padding: '3px 8px', borderRadius: 4 }}>
            <span style={{ color: 'var(--highlight-3)', cursor: 'pointer' }} onClick={() => onLoadProfile(p)}>{p.name}</span>
            <span style={{ color: 'var(--text-muted)' }}>({p.filterItems?.length || 0}F+{p.extractors?.length || 0}C)</span>
            <button style={{ background: 'none', border: 'none', color: '#f38ba8', cursor: 'pointer' }} onClick={() => onDeleteProfile(i)}>×</button>
          </div>
        ))}
        {profiles.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>保存配置可一键恢复过滤器和图表设置</div>}
      </div>
    </div>
  );
}

