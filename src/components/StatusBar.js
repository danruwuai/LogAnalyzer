import React from 'react';
import { Icons } from './Icons';

export default function StatusBar({
  totalLines, filteredLines, fileSize, filePath,
  bookmarkCount, annotationCount, onExportFiltered, filterMode,
}) {
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  };

  const isFiltered = filteredLines !== totalLines;

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
