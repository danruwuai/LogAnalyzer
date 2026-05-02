import React, { useState, useMemo, useRef, useCallback } from 'react';
import '../styles/variables.css';

/**
 * TimelineOverview - 日志时间轴缩略图组件
 * 提供日志分布概览、快速导航、视口位置指示功能
 */
const TimelineOverview = ({
  lines = [],
  filteredLines = [],
  totalLines = 0,
  visibleStart = 0,
  visibleEnd = 0,
  onViewportChange,
  onJumpToLine
}) => {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartVisible, setDragStartVisible] = useState({ start: 0, end: 0 });
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, text: '' });

  // 密度采样配置
  const SAMPLE_SIZE = 100;
  const MAX_SEGMENTS = 200;

  // 计算密度数据
  const densityData = useMemo(() => {
    if (!lines.length) return [];
    
    const segmentCount = Math.min(Math.ceil(lines.length / SAMPLE_SIZE), MAX_SEGMENTS);
    const segmentSize = Math.ceil(lines.length / segmentCount);
    
    return Array.from({ length: segmentCount }, (_, i) => {
      const start = i * segmentSize;
      const end = Math.min(start + segmentSize, lines.length);
      const segmentLines = lines.slice(start, end);
      
      return {
        hasError: segmentLines.some(l => l.level === 'ERROR'),
        hasWarn: segmentLines.some(l => l.level === 'WARN'),
        hasInfo: segmentLines.some(l => l.level === 'INFO'),
        density: segmentLines.length / segmentSize,
        lineStart: segmentLines[0]?.num || 0,
        lineEnd: segmentLines[segmentLines.length - 1]?.num || 0,
        index: i
      };
    });
  }, [lines, SAMPLE_SIZE, MAX_SEGMENTS]);

  // 计算视口指示器位置和宽度
  const viewportStyle = useMemo(() => {
    if (!totalLines || visibleEnd <= visibleStart) return { display: 'none' };
    
    const containerWidth = containerRef.current?.offsetWidth || 1;
    const startPercent = (visibleStart / totalLines) * 100;
    const endPercent = (visibleEnd / totalLines) * 100;
    
    return {
      left: `${startPercent}%`,
      width: `${Math.max(endPercent - startPercent, 0.5)}%`
    };
  }, [totalLines, visibleStart, visibleEnd]);

  // 处理滚轮缩放视口
  const handleWheel = useCallback((e) => {
    if (!containerRef.current) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 100 : -100; // 向下滚动放大视口（范围变大），向上滚动缩小视口（范围变小）
    const center = (visibleStart + visibleEnd) / 2;
    const currentSize = visibleEnd - visibleStart;
    const newSize = Math.max(100, currentSize + delta); // 最小100行
    
    const newStart = Math.max(0, Math.floor(center - newSize / 2));
    const newEnd = Math.min(totalLines, Math.ceil(center + newSize / 2));
    
    if (newStart < newEnd) {
      onViewportChange?.(newStart, newEnd);
    }
  }, [visibleStart, visibleEnd, totalLines, onViewportChange]);

  // 处理点击跳转
  const handleClick = useCallback((e) => {
    if (!containerRef.current || isDragging) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    const targetLine = Math.floor(percent * totalLines);
    
    onJumpToLine?.(targetLine);
  }, [totalLines, onJumpToLine, isDragging]);

  // 处理拖拽开始
  const handleDragStart = useCallback((e) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartVisible({ start: visibleStart, end: visibleEnd });
  }, [visibleStart, visibleEnd]);

  // 处理拖拽移动
  const handleDragMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartX;
    const deltaPercent = deltaX / rect.width;
    const lineDelta = Math.floor(deltaPercent * totalLines);
    
    const newStart = Math.max(0, dragStartVisible.start + lineDelta);
    const newEnd = Math.min(totalLines, dragStartVisible.end + lineDelta);
    
    if (newStart < newEnd) {
      onViewportChange?.(newStart, newEnd);
      // 更新tooltip显示当前行号范围
      setTooltip({
        visible: true,
        x: e.clientX - rect.left,
        text: `行 ${newStart} - ${newEnd}`,
      });
    }
  }, [isDragging, dragStartX, dragStartVisible, totalLines, onViewportChange]);

  // 处理拖拽结束
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  // 如果没有数据，不渲染
  if (!lines.length || !densityData.length) {
    return null;
  }

  return (
    <div 
      className="timeline-container"
      ref={containerRef}
      onClick={handleClick}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onWheel={handleWheel}
    >
      <span className="timeline-label start">
        {lines[0]?.num || 0}
      </span>
      
      <div className="timeline-density-bar">
        {densityData.map((segment) => (
          <div
            key={segment.index}
            className={`bar-segment ${segment.hasError ? 'has-error' : ''} ${segment.hasWarn ? 'has-warn' : ''} ${segment.hasInfo ? 'has-info' : ''} ${!segment.hasError && !segment.hasWarn && !segment.hasInfo ? 'blank' : ''}`}
            style={{ height: `${Math.max(segment.density * 100, 4)}%` }}
            title={`Lines ${segment.lineStart}-${segment.lineEnd}: ${segment.hasError ? 'ERRORs present' : segment.hasWarn ? 'WARNs present' : 'No errors'}`}
          />
        ))}
        
        {/* 视口指示器 */}
        <div 
          className={`timeline-viewport ${isDragging ? 'dragging' : ''}`}
          style={viewportStyle}
          onMouseDown={handleDragStart}
        />
      </div>
      
      <span className="timeline-label end">
        {lines[lines.length - 1]?.num || 0}
      </span>
      
      {/* Tooltip for drag */}
      {tooltip.visible && (
        <div style={{
          position: 'absolute',
          left: tooltip.x,
          top: -30,
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: 12,
          whiteSpace: 'nowrap',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default TimelineOverview;