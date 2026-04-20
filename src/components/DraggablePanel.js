import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * DraggablePanel - Wraps content with a draggable title bar and maximize/restore support.
 * 
 * Props:
 *  - title: string | ReactNode - shown in the title bar
 *  - icon: ReactNode - optional icon before title
 *  - children: panel content
 *  - panelId: unique id for tracking maximize state externally
 *  - isMaximized: boolean - controlled maximize state
 *  - onMaximize: (panelId) => void
 *  - onRestore: (panelId) => void
 *  - defaultPosition: { x, y } - initial position when floated
 *  - style: additional styles on the outer container
 *  - contentStyle: styles on the content area
 *  - className: additional class name
 *  - actions: ReactNode - extra buttons/controls in title bar (right side)
 *  - zIndex: number - z-index for the panel
 *  - onZIndexRequest: () => void - called when panel is interacted with (to bring to front)
 */
export default function DraggablePanel({
  title,
  icon,
  children,
  panelId,
  isMaximized = false,
  onMaximize,
  onRestore,
  defaultPosition = { x: 100, y: 100 },
  style = {},
  contentStyle = {},
  className = '',
  actions,
  zIndex = 10,
  onZIndexRequest,
}) {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isFloated, setIsFloated] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef(null);
  const savedRect = useRef(null);

  // When first dragged, we "float" the panel out of normal flow
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.panel-title-btn') || e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
    if (isMaximized) return; // don't drag when maximized

    e.preventDefault();
    onZIndexRequest?.();

    const rect = panelRef.current?.getBoundingClientRect();
    if (!isFloated && rect) {
      // Save current position for restore
      savedRect.current = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      setPosition({ x: rect.left, y: rect.top });
      setIsFloated(true);
    }

    const currentPos = isFloated ? position : { x: rect.left, y: rect.top };
    dragOffset.current = {
      x: e.clientX - currentPos.x,
      y: e.clientY - currentPos.y,
    };
    setIsDragging(true);

    const handleMouseMove = (e) => {
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [isFloated, isMaximized, position, onZIndexRequest]);

  const handleDoubleClick = useCallback(() => {
    if (isMaximized) {
      onRestore?.(panelId);
    } else {
      onMaximize?.(panelId);
    }
  }, [isMaximized, panelId, onMaximize, onRestore]);

  const handleMaximizeClick = useCallback(() => {
    if (isMaximized) {
      onRestore?.(panelId);
    } else {
      onMaximize?.(panelId);
    }
  }, [isMaximized, panelId, onMaximize, onRestore]);

  // Restore to normal flow (dock back)
  const handleDockBack = useCallback(() => {
    setIsFloated(false);
    savedRect.current = null;
  }, []);

  // Expose dock back for external use
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current._dockBack = handleDockBack;
    }
  }, [handleDockBack]);

  // Maximized: cover the entire viewport
  if (isMaximized) {
    return (
      <div
        ref={panelRef}
        className={`draggable-panel maximized ${className}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-canvas)',
          ...style,
        }}
      >
        <div
          className="draggable-panel-title"
          onDoubleClick={handleDoubleClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: 'var(--bg-panel)',
            borderBottom: '1px solid var(--border-default)',
            cursor: 'default',
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            {icon}
            {title}
          </span>
          {actions}
          <button
            className="panel-title-btn"
            onClick={handleMaximizeClick}
            title="还原"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 6px',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            ⊡
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', ...contentStyle }}>
          {children}
        </div>
      </div>
    );
  }

  // Floated (dragged out of flow) mode
  if (isFloated) {
    return (
      <div
        ref={panelRef}
        className={`draggable-panel floated ${isDragging ? 'dragging' : ''} ${className}`}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: zIndex,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 6,
          boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.4)',
          minWidth: 200,
          minHeight: 100,
          ...style,
        }}
      >
        <div
          className="draggable-panel-title"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: 'var(--bg-panel)',
            borderBottom: '1px solid var(--border-default)',
            borderRadius: '6px 6px 0 0',
            cursor: 'move',
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            {icon}
            {title}
          </span>
          {actions}
          <button
            className="panel-title-btn"
            onClick={handleMaximizeClick}
            title="最大化"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 6px',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            ▢
          </button>
          <button
            className="panel-title-btn"
            onClick={handleDockBack}
            title="停靠"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 6px',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', ...contentStyle }}>
          {children}
        </div>
      </div>
    );
  }

  // Normal (in-flow) mode - just a wrapper with title bar
  return (
    <div
      ref={panelRef}
      className={`draggable-panel ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        ...style,
      }}
    >
      <div
        className="draggable-panel-title"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-default)',
          cursor: 'move',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          {icon}
          {title}
        </span>
        {actions}
        <button
          className="panel-title-btn"
          onClick={handleMaximizeClick}
          title="最大化"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 14,
            padding: '2px 6px',
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          ▢
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', ...contentStyle }}>
        {children}
      </div>
    </div>
  );
}
