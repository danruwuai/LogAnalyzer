import React from 'react';
import { Icons } from './Icons';

export default function Toolbar({
  onOpenFile,
  searchTerm,
  onSearchChange,
  onSearch,
  loading,
  fileName,
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
      </div>
      {fileName && <span className="file-info"><Icons.File /> {fileName}</span>}
    </div>
  );
}
