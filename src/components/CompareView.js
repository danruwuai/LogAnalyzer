import React, { useMemo, useRef, useCallback, useState } from 'react';
import LogPanel from './LogPanel';

/**
 * CompareView - 多文件对比视图组件
 * 并排显示两个文件的日志内容，高亮差异行
 */
const CompareView = ({ files, activeFileId, onSelectFile, filteredLines }) => {
  // 状态：选择要对比的两个文件
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);
  
  // 初始化：当文件列表变化时，自动选择前两个文件
  const compareFiles = useMemo(() => {
    if (!files || files.length < 2) return [null, null];
    
    // 如果已选择文件，保持选择；否则选择前两个
    const fileA = selectedA 
      ? files.find(f => f.id === selectedA) 
      : files[0];
    const fileB = selectedB 
      ? files.find(f => f.id === selectedB) 
      : files.length > 1 ? files[1] : null;
      
    return [fileA, fileB];
  }, [files, selectedA, selectedB]);

  const [fileA, fileB] = compareFiles;

  // 文件选择变更处理
  const handleFileAChange = useCallback((e) => {
    const newId = e.target.value;
    setSelectedA(newId);
    if (onSelectFile && newId) onSelectFile(newId);
  }, [onSelectFile]);

  const handleFileBChange = useCallback((e) => {
    const newId = e.target.value;
    setSelectedB(newId);
    if (onSelectFile && newId) onSelectFile(newId);
  }, [onSelectFile]);

  // 同步滚动逻辑
  const scrollRefA = useRef(null);
  const scrollRefB = useRef(null);
  const isSyncing = useRef(false);

  const handleScrollA = useCallback((e) => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (scrollRefB.current && scrollRefA.current) {
      scrollRefB.current.scrollTop = scrollRefA.current.scrollTop;
    }
    setTimeout(() => { isSyncing.current = false; }, 50);
  }, []);

  const handleScrollB = useCallback((e) => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (scrollRefA.current && scrollRefB.current) {
      scrollRefA.current.scrollTop = scrollRefB.current.scrollTop;
    }
    setTimeout(() => { isSyncing.current = false; }, 50);
  }, []);

  if (!fileA || !fileB) {
    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: 14
      }}>
        请打开至少两个文件以启用对比模式
      </div>
    );
  }

  // 计算差异，为行添加CSS类（基于内容比较）
  const diffInfo = useMemo(() => {
    if (!fileA || !fileB) return { lines: {}, positions: [] };
    const linesA = fileA.lines || [];
    const linesB = fileB.lines || [];
    const maxLen = Math.max(linesA.length, linesB.length);
    const diff = { lines: {}, positions: [] };
    
    for (let i = 0; i < maxLen; i++) {
      const lineA = linesA[i];
      const lineB = linesB[i];
      
      if (!lineA && lineB) {
        diff.lines[`B-${i}`] = 'diff-only-right';
        diff.positions.push(i);
      } else if (lineA && !lineB) {
        diff.lines[`A-${i}`] = 'diff-only-left';
        diff.positions.push(i);
      } else if (lineA && lineB && lineA.text !== lineB.text) {
        diff.lines[`A-${i}`] = 'diff-different';
        diff.lines[`B-${i}`] = 'diff-different';
        diff.positions.push(i);
      } else {
        diff.lines[`A-${i}`] = 'diff-same';
        diff.lines[`B-${i}`] = 'diff-same';
      }
    }
    
    return diff;
  }, [fileA, fileB]);

  // 差异导航状态
  const [diffIndex, setDiffIndex] = useState(0);
  
  // 跳转到上一个差异
  const gotoPrevDiff = useCallback(() => {
    if (diffInfo.positions.length === 0) return;
    const newIdx = diffIndex > 0 ? diffIndex - 1 : diffInfo.positions.length - 1;
    setDiffIndex(newIdx);
    const lineNum = diffInfo.positions[newIdx];
    if (scrollRefA.current && lineNum !== undefined) {
      scrollRefA.current.scrollTop = lineNum * 21; // LINE_HEIGHT = 21
    }
  }, [diffInfo, diffIndex]);
  
  // 跳转到下一个差异
  const gotoNextDiff = useCallback(() => {
    if (diffInfo.positions.length === 0) return;
    const newIdx = diffIndex < diffInfo.positions.length - 1 ? diffIndex + 1 : 0;
    setDiffIndex(newIdx);
    const lineNum = diffInfo.positions[newIdx];
    if (scrollRefA.current && lineNum !== undefined) {
      scrollRefA.current.scrollTop = lineNum * 21;
    }
  }, [diffInfo, diffIndex]);

  // lineClassName函数，根据行返回CSS类
  const getLineClassNameA = (line, index) => {
    return diffInfo.lines[`A-${index}`] || '';
  };
  
  const getLineClassNameB = (line, index) => {
    return diffInfo.lines[`B-${index}`] || '';
  };

  // 差异统计
  const diffCount = diffInfo.positions.length;

  // 下拉菜单样式
  const selectStyle = {
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 12,
    minWidth: 120,
    cursor: 'pointer'
  };

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      overflow: 'hidden',
      borderTop: '1px solid var(--border-subtle)'
    }}>
      {/* 文件A */}
      <div style={{ 
        flex: 1, 
        borderRight: '1px solid var(--border-default)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '8px 12px',
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span style={{ color: 'var(--highlight-1)' }}>📄 文件A:</span>
          {/* 文件选择下拉菜单 */}
          <select 
            value={selectedA || fileA.id} 
            onChange={handleFileAChange}
            style={selectStyle}
            title="选择文件A"
          >
            {files.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
            {fileA.totalLines} 行
          </span>
          {/* 差异导航 */}
          {diffCount > 0 && (
            <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
              <button 
                onClick={gotoPrevDiff}
                title="上一个差异"
                style={{
                  background: 'none',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: '2px 6px',
                  borderRadius: 4
                }}>
                ← 上一个
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {diffIndex + 1} / {diffCount}
              </span>
              <button 
                onClick={gotoNextDiff}
                title="下一个差异"
                style={{
                  background: 'none',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: '2px 6px',
                  borderRadius: 4
                }}>
                下一个 →
              </button>
            </div>
          )}
        </div>
        
        <div style={{ flex: 1, overflow: 'hidden' }}
          onScroll={handleScrollA}
        >
          <LogPanel
            ref={scrollRefA}
            lines={fileA.lines}
            totalLines={fileA.totalLines}
            highlightFilters={[]}
            bookmarks={new Set()}
            annotations={{}}
            chartLinkedLine={null}
            onToggleBookmark={() => {}}
            onAddAnnotation={() => {}}
            onJumpToLine={() => {}}
            searchTerm=""
            filterMode="filter"
            lineClassName={getLineClassNameA}
          />
        </div>
      </div>

      {/* 文件B */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '8px 12px',
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span style={{ color: 'var(--highlight-2)' }}>📄 文件B:</span>
          {/* 文件选择下拉菜单 */}
          <select 
            value={selectedB || fileB.id} 
            onChange={handleFileBChange}
            style={selectStyle}
            title="选择文件B"
          >
            {files.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
            {fileB.totalLines} 行 {diffCount > 0 && `| ${diffCount} 差异`}
          </span>
        </div>
        
        <div style={{ flex: 1, overflow: 'hidden' }}
          onScroll={handleScrollB}
        >
          <LogPanel
            ref={scrollRefB}
            lines={fileB.lines}
            totalLines={fileB.totalLines}
            highlightFilters={[]}
            bookmarks={new Set()}
            annotations={{}}
            chartLinkedLine={null}
            onToggleBookmark={() => {}}
            onAddAnnotation={() => {}}
            onJumpToLine={() => {}}
            searchTerm=""
            filterMode="filter"
            lineClassName={getLineClassNameB}
          />
        </div>
      </div>
    </div>
  );
};

export default CompareView;
