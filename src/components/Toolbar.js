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
}) {
  const handleSearchKey = (e) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="toolbar">
      <button className="toolbar-btn" onClick={onOpenFile} disabled={loading}>
        <Icons.Folder /> 打开
      </button>
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
      {fileName && <span className="file-info"><Icons.File /> {fileName}</span>}
    </div>
  );
}
