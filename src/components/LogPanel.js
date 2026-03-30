import React, { useRef, useState, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Icons } from './Icons';

const LINE_HEIGHT = 18;
const BUFFER_LINES = 20;

// Pre-compiled regex cache to avoid recompilation on every line render
const _regexCache = new Map();
function getFilterRegex(keyword, caseSensitive) {
  const key = `f|${keyword}|${caseSensitive ? 'c' : 'i'}`;
  if (!_regexCache.has(key)) {
    try {
      _regexCache.set(key, new RegExp(keyword, caseSensitive ? 'g' : 'gi'));
    } catch {
      _regexCache.set(key, null);
    }
  }
  return _regexCache.get(key);
}
function getRowRegex(keyword, caseSensitive) {
  const key = `r|${keyword}|${caseSensitive ? 'c' : 'i'}`;
  if (!_regexCache.has(key)) {
    try {
      _regexCache.set(key, new RegExp(keyword, caseSensitive ? '' : 'i'));
    } catch {
      _regexCache.set(key, null);
    }
  }
  return _regexCache.get(key);
}

const LogPanel = forwardRef(function LogPanel({
  lines,
  totalLines,
  highlightFilters,
  bookmarks,
  annotations,
  chartLinkedLine,
  onToggleBookmark,
  onAddAnnotation,
  onJumpToLine,
  searchTerm,
  filterMode,
}, ref) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [annotationText, setAnnotationText] = useState('');

  // Observe container height
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Scroll handler
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Jump to line
  useImperativeHandle(ref, () => ({
    jumpToLine: (lineNum) => {
      const index = lines.findIndex(l => l.num === lineNum);
      if (index >= 0 && containerRef.current) {
        containerRef.current.scrollTop = index * LINE_HEIGHT - containerHeight / 2;
      }
    },
  }), [lines, containerHeight]);

  // Dynamic line number width based on total lines
  const lineNumWidth = Math.max(50, String(totalLines).length * 9 + 20);
  const totalHeight = lines.length * LINE_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - BUFFER_LINES);
  const endIdx = Math.min(lines.length, Math.ceil((scrollTop + containerHeight) / LINE_HEIGHT) + BUFFER_LINES);
  const visibleLines = lines.slice(startIdx, endIdx);

  // Pre-compute filter highlights as a lookup map for performance
  const renderHelpers = useMemo(() => {
    const hasFilters = highlightFilters && highlightFilters.length > 0;
    const hasSearch = searchTerm && searchTerm.length > 0;

    // Pre-process filters for renderText
    const filterDefs = [];
    if (hasFilters) {
      for (const filter of highlightFilters) {
        if (filter.isRegex) {
          const regex = getFilterRegex(filter.keyword, filter.caseSensitive);
          if (regex) filterDefs.push({ type: 'regex', regex, bgColor: filter.bgColor, fgColor: filter.fgColor, fontColor: filter.fontColor || '' });
        } else {
          filterDefs.push({ type: 'text', keyword: filter.keyword, caseSensitive: filter.caseSensitive, bgColor: filter.bgColor, fgColor: filter.fgColor, fontColor: filter.fontColor || '' });
        }
      }
    }

    // Pre-process filters for row highlight
    const rowHighlightDefs = [];
    if (hasFilters) {
      for (const filter of highlightFilters) {
        if (!filter.highlightRow) continue;
        if (filter.isRegex) {
          const regex = getRowRegex(filter.keyword, filter.caseSensitive);
          if (regex) rowHighlightDefs.push({ type: 'regex', regex, bgColor: filter.bgColor });
        } else {
          rowHighlightDefs.push({ type: 'text', keyword: filter.keyword, caseSensitive: filter.caseSensitive, bgColor: filter.bgColor });
        }
      }
    }

    return { hasFilters, hasSearch, filterDefs, rowHighlightDefs, searchTermLower: hasSearch ? searchTerm.toLowerCase() : '' };
  }, [highlightFilters, searchTerm]);

  // Highlight text - uses pre-compiled regexes from renderHelpers
  const renderText = useCallback((text) => {
    const { hasFilters, hasSearch, filterDefs, searchTermLower } = renderHelpers;
    if (!hasFilters && !hasSearch) return text;

    const matches = [];

    // From filter items
    if (hasFilters) {
      for (const fd of filterDefs) {
        if (fd.type === 'regex') {
          fd.regex.lastIndex = 0;
          let match;
          while ((match = fd.regex.exec(text)) !== null) {
            matches.push({
              start: match.index, end: match.index + match[0].length,
              text: match[0], bgColor: fd.bgColor, fgColor: fd.fgColor,
              fontColor: fd.fontColor, priority: 1,
            });
            if (!fd.regex.global) break;
          }
        } else {
          const searchText = fd.caseSensitive ? text : text.toLowerCase();
          const searchKeyword = fd.caseSensitive ? fd.keyword : fd.keyword.toLowerCase();
          let idx = 0;
          while ((idx = searchText.indexOf(searchKeyword, idx)) !== -1) {
            matches.push({
              start: idx, end: idx + fd.keyword.length,
              text: text.substring(idx, idx + fd.keyword.length),
              bgColor: fd.bgColor, fgColor: fd.fgColor,
              fontColor: fd.fontColor, priority: 1,
            });
            idx += fd.keyword.length;
          }
        }
      }
    }

    // From search term (lower priority, yellow highlight)
    if (hasSearch) {
      const searchText = text.toLowerCase();
      const term = searchTermLower;
      let idx = 0;
      while ((idx = searchText.indexOf(term, idx)) !== -1) {
        matches.push({
          start: idx, end: idx + term.length,
          text: text.substring(idx, idx + term.length),
          bgColor: 'rgba(249, 226, 175, 0.3)', fgColor: '#f9e2af',
          fontColor: '', priority: 0,
        });
        idx += term.length;
      }
    }

    if (matches.length === 0) return text;

    // Sort by start position, then by priority (higher first)
    matches.sort((a, b) => a.start - b.start || b.priority - a.priority);

    // Merge overlapping matches - higher priority wins
    const merged = [];
    for (const match of matches) {
      if (merged.length === 0 || match.start >= merged[merged.length - 1].end) {
        merged.push({ ...match });
      } else {
        const last = merged[merged.length - 1];
        if (match.priority >= last.priority) {
          last.end = Math.max(last.end, match.end);
          if (match.priority > last.priority) {
            last.bgColor = match.bgColor;
            last.fgColor = match.fgColor;
            last.fontColor = match.fontColor;
          }
        } else {
          last.end = Math.max(last.end, match.end);
        }
      }
    }

    // Build result
    const result = [];
    let lastIndex = 0;
    for (const match of merged) {
      if (match.start > lastIndex) {
        result.push(text.substring(lastIndex, match.start));
      }
      result.push(
        <span key={match.start} style={{
          backgroundColor: match.bgColor, color: match.fontColor || match.fgColor,
          padding: '0 2px', borderRadius: 2, fontWeight: 600,
        }}>
          {match.text}
        </span>
      );
      lastIndex = match.end;
    }
    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex));
    }
    return result;
  }, [renderHelpers]);

  // Row highlight check - uses pre-compiled regexes
  const getRowHighlight = useCallback((text) => {
    const { rowHighlightDefs } = renderHelpers;
    if (rowHighlightDefs.length === 0) return null;
    for (const def of rowHighlightDefs) {
      if (def.type === 'regex') {
        def.regex.lastIndex = 0;
        if (def.regex.test(text)) return { backgroundColor: def.bgColor };
      } else {
        const matched = def.caseSensitive
          ? text.includes(def.keyword)
          : text.toLowerCase().includes(def.keyword.toLowerCase());
        if (matched) return { backgroundColor: def.bgColor };
      }
    }
    return null;
  }, [renderHelpers]);

  // Context menu
  const handleContextMenu = (e, lineNum) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, lineNum });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const handler = () => closeContextMenu();
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const startAnnotation = (lineNum) => {
    setEditingAnnotation(lineNum);
    setAnnotationText(annotations[lineNum] || '');
    closeContextMenu();
  };

  const submitAnnotation = () => {
    if (editingAnnotation && annotationText.trim()) {
      onAddAnnotation(editingAnnotation, annotationText.trim());
    }
    setEditingAnnotation(null);
    setAnnotationText('');
  };

  return (
    <div className="log-panel">
      <div className="log-panel-header">
        <span>日志 ({lines.length.toLocaleString()} 行)</span>
        {highlightFilters.length > 0 && (
          <span style={{ color: '#a6e3a1' }}>
            {highlightFilters.length} 个关键字高亮
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6c7086' }}>
          右键添加注释 | 点击行号添加书签
        </span>
      </div>

      <div
        ref={containerRef}
        className="log-list"
        onScroll={handleScroll}
        onClick={closeContextMenu}
      >
        <div style={{ height: totalHeight, position: 'relative', minWidth: 'max-content' }}>
          {visibleLines.map((line, i) => {
            const actualIdx = startIdx + i;
            const isBookmarked = bookmarks.has(line.num);
            const hasAnnotation = annotations.hasOwnProperty(line.num);
            const isChartLinked = chartLinkedLine === line.num;

            return (
              <div
                key={line.num}
                className={`log-line ${isBookmarked ? 'bookmarked' : ''} ${isChartLinked ? 'chart-linked' : ''}`}
                style={{
                  position: 'absolute',
                  top: actualIdx * LINE_HEIGHT,
                  left: 0,
                  height: LINE_HEIGHT,
                  ...(getRowHighlight(line.text) || {}),
                }}
                onContextMenu={(e) => handleContextMenu(e, line.num)}
              >
                <span
                  className="log-line-number"
                  onClick={() => onToggleBookmark(line.num)}
                  title={isBookmarked ? '取消书签' : '添加书签'}
                  style={{ cursor: 'pointer', color: isBookmarked ? '#f9e2af' : undefined, minWidth: lineNumWidth }}
                >
                  {isBookmarked ? <Icons.Star filled /> : line.num}
                  {hasAnnotation && <Icons.Note />}
                </span>
                <span className="log-line-text">
                  {renderText(line.text)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="context-menu-item" onClick={() => onToggleBookmark(contextMenu.lineNum)}>
            {bookmarks.has(contextMenu.lineNum) ? '取消书签' : '添加书签'} <Icons.Star filled={bookmarks.has(contextMenu.lineNum)} />
          </div>
          <div className="context-menu-item" onClick={() => startAnnotation(contextMenu.lineNum)}>
            {annotations.hasOwnProperty(contextMenu.lineNum) ? '编辑注释' : '添加注释'} <Icons.Note />
          </div>
          <div className="context-menu-item" onClick={() => { navigator.clipboard.writeText(lines.find(l => l.num === contextMenu.lineNum)?.text || ''); closeContextMenu(); }}>
            复制该行
          </div>
          <div className="context-menu-item" onClick={() => {
            // Copy line with line number
            const line = lines.find(l => l.num === contextMenu.lineNum);
            if (line) navigator.clipboard.writeText(`L${line.num}: ${line.text}`);
            closeContextMenu();
          }}>
            复制行号+内容
          </div>
          <div className="context-menu-item" onClick={() => {
            // Copy 5 lines around context
            const idx = lines.findIndex(l => l.num === contextMenu.lineNum);
            if (idx >= 0) {
              const start = Math.max(0, idx - 2);
              const end = Math.min(lines.length, idx + 3);
              const text = lines.slice(start, end).map(l => `L${l.num}: ${l.text}`).join('\n');
              navigator.clipboard.writeText(text);
            }
            closeContextMenu();
          }}>
            复制上下文 (±2行)
          </div>
        </div>
      )}

      {/* Annotation input dialog */}
      {editingAnnotation && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }} onClick={() => setEditingAnnotation(null)}>
          <div
            style={{
              background: '#1e1e2e', border: '1px solid #45475a',
              borderRadius: 8, padding: 16, width: 400,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ marginBottom: 8, color: '#a6adc8', fontSize: 13 }}>
              行 {editingAnnotation} 的注释:
            </div>
            <input
              autoFocus
              style={{
                width: '100%', padding: '8px 10px', border: '1px solid #45475a',
                borderRadius: 6, background: '#313244', color: '#cdd6f4',
                fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
              value={annotationText}
              onChange={e => setAnnotationText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitAnnotation()}
              placeholder="输入注释内容..."
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button className="toolbar-btn" onClick={() => setEditingAnnotation(null)}>取消</button>
              <button className="toolbar-btn" onClick={submitAnnotation} style={{ background: '#89b4fa', color: '#1e1e2e' }}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default LogPanel;
