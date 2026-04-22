import React, { useMemo, useCallback } from 'react';

const SAMPLE_SIZE = 100;
const MAX_SEGMENTS = 200;

/**
 * TimelineOverview - 日志密度缩略图组件
 * 位置：日志面板下方，高度固定 40px
 * 性能：每 100 行一个密度点，最大 200 段
 */
export default function TimelineOverview({
  lines,
  totalLines,
  visibleStart,
  visibleEnd,
  onViewportChange,
  onJumpToLine,
  convergenceState,
}) {
  // 计算密度分段
  const segments = useMemo(() => {
    if (totalLines === 0) return [];
    
    const segmentCount = Math.min(Math.ceil(totalLines / SAMPLE_SIZE), MAX_SEGMENTS);
    const segmentSize = Math.ceil(totalLines / segmentCount);
    
    return Array.from({ length: segmentCount }, (_, i) => {
      const startIdx = i * segmentSize;
      const endIdx = Math.min(startIdx + segmentSize, totalLines);
      
      let hasError = false;
      let hasWarn = false;
      let hasInfo = false;
      
      // 只检查可见范围的行（采样）
      for (let j = startIdx; j < endIdx && j < lines.length; j++) {
        const textLower = lines[j]?.text?.toLowerCase() || '';
        if (!hasError && (textLower.includes('error') || textLower.includes('exception'))) {
          hasError = true;
        }
        if (!hasWarn && (textLower.includes('warn'))) {
          hasWarn = true;
        }
        if (!hasInfo && (textLower.includes('info'))) {
          hasInfo = true;
        }
        if (hasError && hasWarn && hasInfo) break;
      }
      
      return {
        index: i,
        lineStart: startIdx,
        lineEnd: endIdx,
        hasError,
        hasWarn,
        hasInfo,
      };
    });
  }, [lines, totalLines]);

  // 计算视口位置百分比
  const viewportStyle = useMemo(() => {
    if (totalLines === 0) return { left: '0%', width: '100%' };
    const left = (visibleStart / totalLines) * 100;
    const width = ((visibleEnd - visibleStart) / totalLines) * 100;
    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100, Math.max(1, width))}%`,
    };
  }, [visibleStart, visibleEnd, totalLines]);

  // 点击跳转
  const handleClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;
    const targetLine = Math.floor(clickPercent * totalLines);
    onJumpToLine(targetLine);
  }, [totalLines, onJumpToLine]);

  // 拖拽视口
  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startVisibleStart = visibleStart;
    const startVisibleEnd = visibleEnd;
    const containerWidth = e.currentTarget.parentElement.getBoundingClientRect().width;
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaLines = Math.floor((deltaX / containerWidth) * totalLines);
      const newStart = Math.max(0, Math.min(totalLines - (startVisibleEnd - startVisibleStart), startVisibleStart + deltaLines));
      onViewportChange(newStart, newStart + (startVisibleEnd - startVisibleStart));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [visibleStart, visibleEnd, totalLines, onViewportChange]);

  if (totalLines === 0) {
    return (
      <div className="timeline-container">
        <div className="timeline-density-bar" style={{ opacity: 0.3 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>打开日志文件查看密度分布</span>
        </div>
      </div>
    );
  }

  const convergenceLabel = {
    converging: { text: '已收敛', color: 'var(--status-success)' },
    diverging: { text: '发散中', color: 'var(--status-error)' },
    stable: { text: '稳定', color: 'var(--text-muted)' },
    analyzing: { text: '分析中', color: 'var(--text-muted)' },
  }[convergenceState] || null;

  return (
    <div className="timeline-container" onClick={handleClick}>
      {convergenceLabel && (
        <span className="timeline-convergence-badge" style={{ color: convergenceLabel.color }}>
          {convergenceLabel.text}
        </span>
      )}
      <span className="timeline-label start">L1</span>
      <div className="timeline-density-bar">
        {segments.map((seg) => (
          <div
            key={seg.index}
            className={`bar-segment ${
              seg.hasError ? 'has-error' : seg.hasWarn ? 'has-warn' : seg.hasInfo ? 'has-info' : 'blank'
            }`}
            title={`行 ${seg.lineStart}-${seg.lineEnd}`}
          />
        ))}
        {/* 视口指示器 */}
        <div
          className="timeline-viewport"
          style={viewportStyle}
          onMouseDown={handleDragStart}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <span className="timeline-label end">L{totalLines.toLocaleString()}</span>
    </div>
  );
}