import React from 'react';
import { Icons } from './Icons';

export default function StatusBar({
  totalLines, filteredLines, fileSize, filePath,
  bookmarkCount, annotationCount, onExportFiltered, filterMode,
  convergenceState, convergenceThresholdConfig,
  onShowThresholdPanel,
}) {
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  };

  const isFiltered = filteredLines !== totalLines;

  const stateLabel = {
    analyzing: { label: '分析中', icon: '◎', color: 'var(--text-muted)' },
    converging: { label: '已收敛', icon: '✓', color: 'var(--status-success)' },
    diverging: { label: '发散中', icon: '↑', color: 'var(--status-error)' },
    stable: { label: '稳定', icon: '→', color: 'var(--text-muted)' },
  }[convergenceState] || { label: '分析中', icon: '◎', color: 'var(--text-muted)' };

  return (
    <div className="status-bar">
      {filePath && (
        <span className="status-file-path">
          <Icons.File /> {filePath.length > 50 ? '...' + filePath.slice(-47) : filePath}
        </span>
      )}
      <span>{totalLines.toLocaleString()} 行</span>
      {isFiltered && (
        <span className="status-filtered">
          {filteredLines.toLocaleString()} 匹配
          {filterMode === 'filter' && onExportFiltered && (
            <button className="status-export-btn" onClick={onExportFiltered} title="导出筛选结果">
              <Icons.Save />
            </button>
          )}
        </span>
      )}
      <span>{formatSize(fileSize)}</span>
      <span className="status-convergence" style={{ color: stateLabel.color, fontWeight: 600, cursor: 'pointer' }}
        onClick={onShowThresholdPanel ? () => onShowThresholdPanel() : undefined}
        title="点击设置收敛阈值">
        <span style={{ fontSize: 13 }}>{stateLabel.icon}</span> {stateLabel.label}
        {convergenceThresholdConfig && (
          <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 4 }}>
            W{convergenceThresholdConfig.windowSize} P{(convergenceThresholdConfig.peakRatio * 100).toFixed(0)}%
          </span>
        )}
      </span>
      {bookmarkCount > 0 && (
        <span className="status-bookmark"><Icons.Star filled /> {bookmarkCount}</span>
      )}
      {annotationCount > 0 && (
        <span className="status-annotation"><Icons.Note /> {annotationCount}</span>
      )}
      <span className="status-mode">{filterMode === 'filter' ? '过滤' : '全显'}</span>
      <span style={{ marginLeft: 'auto', opacity: 0.4 }}>LogAnalyzer</span>
    </div>
  );
}