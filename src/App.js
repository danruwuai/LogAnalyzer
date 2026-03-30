import React, { useState, useCallback, useRef, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import LogPanel from './components/LogPanel';
import StatusBar from './components/StatusBar';
import { Icons } from './components/Icons';

const COLORS = ['#89b4fa', '#a6e3a1', '#f9e2af', '#f38ba8', '#fab387', '#cba6f7', '#94e2d5'];

// Error boundary to catch render crashes
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
  // File state
  const [filePath, setFilePath] = useState(null);
  const [fileName, setFileName] = useState('');
  const [lines, setLines] = useState([]);
  const [totalLines, setTotalLines] = useState(0);
  const [fileSize, setFileSize] = useState(0);
  const [loading, setLoading] = useState(false);

  // Search & filter - TextAnalysisTool style
  const [searchTerm, setSearchTerm] = useState('');
  const [filterItems, setFilterItems] = useState([]);
  const [filterMode, setFilterMode] = useState('filter');
  const [timeRange, setTimeRange] = useState({ start: '', end: '' });

  // Bookmarks & annotations
  const [bookmarks, setBookmarks] = useState(new Set());
  const [annotations, setAnnotations] = useState({});

  // Chart extractors
  const [extractors, setExtractors] = useState([]);
  const [xAxisMode, setXAxisMode] = useState('line');
  const [xAxisField, setXAxisField] = useState('');
  const [thresholds, setThresholds] = useState([]);
  const [chartLinkedLine, setChartLinkedLine] = useState(null);

  // Bottom panel (unified: filter + chart + config)
  const [bottomPanel, setBottomPanel] = useState('filter');
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // Saved profiles (unified: filters + extractors + thresholds)
  const [profiles, setProfiles] = useState(() => {
    try {
      const saved = localStorage.getItem('logAnalyzer_profiles');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Refs
  const logPanelRef = useRef(null);

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

  // Load file
  const handleOpenFile = useCallback(async () => {
    const path = await window.api.openFile();
    if (!path) return;
    setLoading(true);
    setFilePath(path);
    setFileName(path.split('\\').pop().split('/').pop());
    setLines([]);
    setBookmarks(new Set());
    setAnnotations({});
    setChartLinkedLine(null);
    const result = await window.api.readFull(path);
    if (result.success) {
      setLines(result.lines);
      setTotalLines(result.totalLines);
      setFileSize(result.fileSize);
      const annoResult = await window.api.loadAnnotations(path);
      if (annoResult.success) setAnnotations(annoResult.annotations);
    }
    setLoading(false);
  }, []);

  // Save annotations
  const saveAnnotations = useCallback(async (newAnnotations) => {
    if (filePath) await window.api.saveAnnotations(filePath, newAnnotations);
  }, [filePath]);

  const addAnnotation = useCallback((lineNum, text) => {
    setAnnotations(prev => { const next = { ...prev, [lineNum]: text }; saveAnnotations(next); return next; });
  }, [saveAnnotations]);

  const removeAnnotation = useCallback((lineNum) => {
    setAnnotations(prev => { const next = { ...prev }; delete next[lineNum]; saveAnnotations(next); return next; });
  }, [saveAnnotations]);

  const toggleBookmark = useCallback((lineNum) => {
    setBookmarks(prev => { const next = new Set(prev); next.has(lineNum) ? next.delete(lineNum) : next.add(lineNum); return next; });
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

  const activeHighlightFilters = filterItems.filter(item => item.enabled && item.keyword && !item.exclude);

  const jumpToLine = useCallback((lineNum) => {
    if (logPanelRef.current) logPanelRef.current.jumpToLine(lineNum);
    setChartLinkedLine(lineNum);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'o') { e.preventDefault(); handleOpenFile(); }
      if (e.ctrlKey && e.key === 'f') { e.preventDefault(); document.querySelector('.toolbar-input')?.focus(); }
      if (e.key === 'Escape') { setSearchTerm(''); document.activeElement?.blur(); }
      if (e.ctrlKey && e.key === '1') { e.preventDefault(); setBottomPanel('filter'); setShowBottomPanel(true); }
      if (e.ctrlKey && e.key === '2') { e.preventDefault(); setBottomPanel('chart'); setShowBottomPanel(true); }
      if (e.ctrlKey && e.key === '3') { e.preventDefault(); setBottomPanel('annotations'); setShowBottomPanel(true); }
      if (e.ctrlKey && e.key === '4') { e.preventDefault(); setBottomPanel('config'); setShowBottomPanel(true); }
      if (e.ctrlKey && e.shiftKey && e.key === 'F') { e.preventDefault(); setFilterMode(prev => prev === 'filter' ? 'show-all' : 'filter'); }
      if (e.ctrlKey && e.shiftKey && e.key === 'C') { e.preventDefault(); setFilterItems([]); }
      if (e.key === 'F1') { e.preventDefault(); setShowHelp(prev => !prev); }
      if (e.ctrlKey && e.key === '/') { e.preventDefault(); setShowHelp(prev => !prev); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenFile]);

  // Auto-load for demo
  useEffect(() => {
    if (window.api?.onAutoLoadFile) {
      window.api.onAutoLoadFile(async (filePath) => {
        setLoading(true);
        setFilePath(filePath);
        setFileName(filePath.split('\\').pop().split('/').pop());
        setLines([]); setBookmarks(new Set()); setAnnotations({}); setChartLinkedLine(null);
        const result = await window.api.readFull(filePath);
        if (result.success) {
          setLines(result.lines);
          setTotalLines(result.totalLines);
          setFileSize(result.fileSize);
          setFilterItems([
            { id: Date.now(), enabled: true, keyword: 'INFO', caseSensitive: false, isRegex: false, exclude: false, highlightRow: false, bgColor: 'rgba(137, 180, 250, 0.15)', fgColor: '#89b4fa', fontColor: '' },
            { id: Date.now()+1, enabled: true, keyword: 'WARN', caseSensitive: false, isRegex: false, exclude: false, highlightRow: true, bgColor: 'rgba(249, 226, 175, 0.15)', fgColor: '#f9e2af', fontColor: '' },
            { id: Date.now()+2, enabled: true, keyword: 'ERROR', caseSensitive: false, isRegex: false, exclude: false, highlightRow: true, bgColor: 'rgba(243, 139, 168, 0.15)', fgColor: '#f38ba8', fontColor: '#ffffff' },
          ]);
        }
        setLoading(false);
      });
    }
    if (window.api?.onConfigureExtractors) {
      window.api.onConfigureExtractors((config) => {
        if (config.xAxisMode) setXAxisMode(config.xAxisMode);
        if (config.xAxisField) setXAxisField(config.xAxisField);
        if (config.extractors) setExtractors(config.extractors);
      });
    }
  }, []);

  // File drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file?.path) {
      (async () => {
        setLoading(true);
        setFilePath(file.path);
        setFileName(file.path.split('\\').pop().split('/').pop());
        setLines([]); setBookmarks(new Set()); setAnnotations({}); setChartLinkedLine(null);
        const result = await window.api.readFull(file.path);
        if (result.success) { setLines(result.lines); setTotalLines(result.totalLines); setFileSize(result.fileSize); }
        setLoading(false);
      })();
    }
  }, []);

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
      style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
      onDragOver={e => e.preventDefault()}
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
      />

      {loading && <div className="loading-bar"><div className="loading-bar-inner" /></div>}

      {lines.length === 0 && !loading ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Icons.File /></div>
          <div className="empty-state-text">打开一个日志文件开始分析</div>
          <button className="toolbar-btn" onClick={handleOpenFile}>打开文件</button>
        </div>
      ) : (
        <ErrorBoundary>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Log panel - takes most space */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
          </div>

          {/* Bottom panel toggle */}
          <div className="bottom-panel-toggle">
            <div className="bottom-panel-tabs">
              {['filter', 'chart', 'annotations', 'config'].map(tab => (
                <button key={tab}
                  className={`bottom-panel-tab ${bottomPanel === tab ? 'active' : ''}`}
                  onClick={() => { setBottomPanel(tab); setShowBottomPanel(true); }}>
                  {tab === 'filter' && <><Icons.Filter /> 筛选 ({filterItems.length})</>}
                  {tab === 'chart' && <><Icons.Chart /> 图表 ({extractors.length})</>}
                  {tab === 'annotations' && <><Icons.NoteList /> 注释 ({Object.keys(annotations).length})</>}
                  {tab === 'config' && <><Icons.Gear /> 配置</>}
                </button>
              ))}
              <button className="bottom-panel-tab" onClick={() => setShowBottomPanel(p => !p)}>
                {showBottomPanel ? '▼' : '▲'}
              </button>
            </div>
          </div>

          {/* Bottom panel content */}
          {showBottomPanel && (
            <div className="bottom-panel-content">
              <ErrorBoundary>
                {bottomPanel === 'filter' && <FilterPanelInline
                  filterItems={filterItems} onFilterItemsChange={setFilterItems}
                  filterMode={filterMode} onFilterModeChange={setFilterMode}
                />}
                {bottomPanel === 'chart' && <ChartPanelInline
                  lines={lines} extractors={extractors}
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
      />

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
              <div className="help-shortcut"><kbd>Esc</kbd><span>清除搜索</span></div>
              <div className="help-shortcut"><kbd>Ctrl</kbd>+<kbd>1-4</kbd><span>切换底部标签</span></div>
              <div className="help-shortcut"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd><span>切换过滤/全显</span></div>
              <div className="help-shortcut"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd><span>清空筛选条件</span></div>
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
        <span style={{ fontSize: 11, color: '#6c7086' }}>匹配: {filterItems.filter(i => i.enabled).length} 条件</span>
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
        {filterItems.length === 0 && <div style={{ color: '#6c7086', fontSize: 12, padding: '8px 0' }}>在搜索框输入关键字后按回车添加过滤</div>}
      </div>
    </div>
  );
}

function ChartPanelInline({ lines, extractors, onAddExtractor, onUpdateExtractor, onRemoveExtractor,
  xAxisMode, onXAxisModeChange, xAxisField, onXAxisFieldChange,
  thresholds, onAddThreshold, onUpdateThreshold, onRemoveThreshold,
  annotations, onJumpToLine, chartLinkedLine }) {

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

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
        if (match && match[1]) { const val = parseFloat(match[1]); if (!isNaN(val)) { point[r.name] = val; hasData = true; } }
      }
      if (hasData) results.push(point);
    }
    return results;
  }, [lines, extractors]);

  useEffect(() => {
    if (!chartRef.current) return;
    // echarts is exposed via preload as window.echarts
    const echarts = window.echarts;
    if (!echarts) { console.error('echarts not available'); return; }
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, null, { renderer: 'canvas' });
    }
    if (!chartData || chartData.length === 0) { chart.clear(); return; }

    const metricNames = extractors.map(e => e.name).filter(n => n !== 'seqNum' && n !== 'isConverge');
    const xData = xAxisMode === 'data' ? chartData.map(d => d[xAxisField] ?? d.lineNum) : chartData.map(d => d.lineNum);
    const series = metricNames.map(name => ({
      name, type: 'line', data: chartData.map(d => d[name] ?? null),
      smooth: true, symbol: 'circle', symbolSize: 3,
      lineStyle: { width: 2 }, itemStyle: { color: extractors.find(e => e.name === name)?.color || '#89b4fa' },
    }));

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#1e1e2e', borderColor: '#45475a', textStyle: { color: '#cdd6f4' } },
      legend: { data: metricNames, top: 0, textStyle: { color: '#a6adc8', fontSize: 11 } },
      grid: { left: 50, right: 20, top: 30, bottom: 25 },
      xAxis: { type: 'category', data: xData, axisLabel: { color: '#6c7086', fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { color: '#6c7086', fontSize: 10 }, splitLine: { lineStyle: { color: '#313244' } } },
      series,
      dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 0, height: 16 }],
    }, true);

    setTimeout(() => chart.resize(), 50);
    return () => { window.removeEventListener('resize', () => chart.resize()); };
  }, [chartData, extractors, xAxisMode, xAxisField]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={xAxisMode} onChange={e => onXAxisModeChange(e.target.value)} style={{ fontSize: 12 }}>
          <option value="line">X轴: 行号</option><option value="data">X轴: 数据字段</option>
        </select>
        {xAxisMode === 'data' && <input className="toolbar-input" style={{ width: 100 }} placeholder="字段名" value={xAxisField} onChange={e => onXAxisFieldChange(e.target.value)} />}
        <button className="toolbar-btn small" onClick={onAddExtractor}>+ 指标</button>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: 200, minHeight: 200, position: 'relative' }} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        {extractors.map((ext, i) => (
          <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, background: '#181825', padding: '2px 6px', borderRadius: 4, borderLeft: `3px solid ${ext.color}` }}>
            <input style={{ width: 70, fontSize: 11, background: '#1e1e2e', border: '1px solid #45475a', color: '#cdd6f4', borderRadius: 3, padding: '1px 4px' }}
              value={ext.name} onChange={e => onUpdateExtractor(i, 'name', e.target.value)} placeholder="名称" />
            <input style={{ width: 100, fontSize: 11, background: '#1e1e2e', border: '1px solid #45475a', color: '#cdd6f4', borderRadius: 3, padding: '1px 4px' }}
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
  if (entries.length === 0) return <div style={{ color: '#6c7086', fontSize: 12, padding: 8 }}>右键日志行添加注释</div>;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 150, overflow: 'auto' }}>
      {entries.map(([lineNum, text]) => (
        <div key={lineNum} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, background: '#181825', padding: '3px 8px', borderRadius: 4, cursor: 'pointer' }}
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
        <span style={{ fontSize: 11, color: '#6c7086' }}>{filterItems.length} 过滤 + {extractors.length} 指标</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {profiles.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, background: '#181825', padding: '3px 8px', borderRadius: 4 }}>
            <span style={{ color: '#a6e3a1', cursor: 'pointer' }} onClick={() => onLoadProfile(p)}>{p.name}</span>
            <span style={{ color: '#6c7086' }}>({p.filterItems?.length || 0}F+{p.extractors?.length || 0}C)</span>
            <button style={{ background: 'none', border: 'none', color: '#f38ba8', cursor: 'pointer' }} onClick={() => onDeleteProfile(i)}>×</button>
          </div>
        ))}
        {profiles.length === 0 && <div style={{ color: '#6c7086', fontSize: 12 }}>保存配置可一键恢复过滤器和图表设置</div>}
      </div>
    </div>
  );
}
