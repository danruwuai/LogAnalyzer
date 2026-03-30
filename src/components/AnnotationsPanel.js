import React from 'react';
import { Icons } from './Icons';

export default function AnnotationsPanel({ annotations, onRemoveAnnotation, onJumpToLine }) {
  const entries = Object.entries(annotations)
    .map(([lineNum, text]) => ({ lineNum: parseInt(lineNum), text }))
    .sort((a, b) => a.lineNum - b.lineNum);

  const handleExport = () => {
    if (entries.length === 0) return;
    const md = entries.map(e => `- **行 ${e.lineNum}**: ${e.text}`).join('\n');
    const blob = new Blob([`# 日志注释\n\n${md}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'annotations.md'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {entries.length} 条注释
        </span>
        {entries.length > 0 && (
          <button className="toolbar-btn" onClick={handleExport}>导出</button>
        )}
      </div>
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30, fontSize: 11 }}>
          右键日志行添加注释
        </div>
      ) : (
        <div className="annotations-list">
          {entries.map(({ lineNum, text }) => (
            <div key={lineNum} className="annotation-item" onClick={() => onJumpToLine(lineNum)}>
              <span className="annotation-line-num">L{lineNum}</span>
              <span className="annotation-text">{text}</span>
              <button className="remove-btn" onClick={(e) => { e.stopPropagation(); onRemoveAnnotation(lineNum); }}>
                <Icons.Close />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
