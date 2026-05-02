import React from 'react';
import { Icons } from './Icons';

export default function Toolbar({
  onOpenFile,
  searchTerm,
  onSearchChange,
  onSearch,
  loading,
  fileName,
  searchMatchCount,
  onJumpToLine,
  // Multi-file support
  files,
  activeFileId,
  onSetActiveFile,
  compareMode,
  onRemoveFile,
  onToggleCompareMode,
  // Import/Export filter
  onExportFilter,
  onImportFilter,
}) {
// Multi-file support - safe default to empty array
  const safeFiles = Array.isArray(files) ? files : [];

  const handleSearchKey = (e) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="toolbar">
      <button className="toolbar-btn" onClick={onOpenFile} disabled={loading}>
        <Icons.Folder /> 打开
      </button>
      {safeFiles.length > 0 && (
        <>
          <div className="toolbar-separator" />
          {/* File tabs */}
          <div className="toolbar-file-tabs">
            {safeFiles.map(file => (
              <div
                key={file.id}
                className={`toolbar-file-tab ${file.id === activeFileId ? 'active' : ''}`}
                onClick={() => onSetActiveFile(file.id)}
              >
                <Icons.File />
                <span className="toolbar-file-tab-name">{file.name}</span>
                <button
                  className="toolbar-file-tab-close"
                  onClick={(e) => { e.stopPropagation(); onRemoveFile(file.id); }}
                  title="关闭"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {/* Compare mode toggle */}
          {safeFiles.length > 1 && (
            <button
              className={`toolbar-btn small ${compareMode ? 'active' : ''}`}
              onClick={onToggleCompareMode}
              title="多文件对比模式"
            >
              <Icons.Compare /> 对比
            </button>
          )}
        </>
      )}
      <div className="toolbar-separator" />
      <div className="toolbar-search">
        <Icons.Search />
        <input className="toolbar-input" type="text"
          placeholder="搜索 (回车添加为筛选)"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleSearchKey} />
        {searchTerm && searchMatchCount > 0 && (
          <span style={{ fontSize: 11, color: 'var(--highlight-3)', whiteSpace: 'nowrap', padding: '0 6px' }}>
            {searchMatchCount} 匹配
          </span>
        )}
      </div>
      <button className="toolbar-btn" onClick={onJumpToLine} title="跳转到行 (Ctrl+G)">
        ↦ 行号
      </button>
      <div className="toolbar-separator" />
      <button className="toolbar-btn" onClick={onImportFilter} title="导入筛选条件">
        <Icons.Import /> 导入
      </button>
      <button className="toolbar-btn" onClick={onExportFilter} title="导出筛选条件">
        <Icons.Export /> 导出
      </button>
      {fileName && <span className="file-info"><Icons.File /> {fileName}</span>}
    </div>
  );
}