import React, { useMemo } from 'react';
import { Icons } from './Icons';

export default function ExtractorsPanel({
  extractors, onAddExtractor, onUpdateExtractor, onRemoveExtractor,
  thresholds, onAddThreshold, onUpdateThreshold, onRemoveThreshold,
  lines,
}) {
  const suggestions = useMemo(() => {
    if (lines.length === 0) return [];
    const patterns = {};
    const sample = lines.slice(0, 100);
    const keyValueRegex = /(\w+)[=:]\s*(\d+\.?\d*)/g;
    for (const line of sample) {
      let match;
      while ((match = keyValueRegex.exec(line.text)) !== null) {
        const key = match[1];
        if (!patterns[key]) patterns[key] = { count: 0, example: match[0] };
        patterns[key].count++;
      }
    }
    return Object.entries(patterns)
      .filter(([, v]) => v.count > 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([key, val]) => ({ key, example: val.example, count: val.count }));
  }, [lines]);

  const addFromSuggestion = (key) => {
    onAddExtractor();
    setTimeout(() => {
      const idx = extractors.length;
      onUpdateExtractor(idx, 'name', key);
      onUpdateExtractor(idx, 'regex', `${key}[=:]\\s*(\\d+\\.?\\d*)`);
    }, 0);
  };

  return (
    <div>
      {/* Data Extractors */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>数据提取器</span>
          <button className="toolbar-btn" onClick={onAddExtractor}><Icons.Plus /> 添加</button>
        </div>
        {extractors.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            用正则从日志中提取数值数据
          </div>
        )}
        <div className="extractor-panel">
          {extractors.map((ext, i) => (
            <div key={i} className="extractor-row">
              <span className="color-dot" style={{ background: ext.color }} />
              <input placeholder="名称" value={ext.name}
                onChange={e => onUpdateExtractor(i, 'name', e.target.value)} style={{ width: 70 }} />
              <input placeholder="正则 (如: CPU=(\d+))" value={ext.regex}
                onChange={e => onUpdateExtractor(i, 'regex', e.target.value)} />
              <input type="color" value={ext.color}
                onChange={e => onUpdateExtractor(i, 'color', e.target.value)}
                className="filter-color-dot" />
              <button className="remove-btn" onClick={() => onRemoveExtractor(i)}><Icons.Close /></button>
            </div>
          ))}
        </div>
        {suggestions.length > 0 && extractors.length === 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>自动检测 (点击添加):</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {suggestions.map(s => (
                <span key={s.key} onClick={() => addFromSuggestion(s.key)}
                  className="suggestion-chip"
                  title={`${s.example} (${s.count}次)`}>
                  {s.key} ({s.count})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Thresholds */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>阈值线</span>
          <button className="toolbar-btn" onClick={onAddThreshold}><Icons.Plus /> 添加</button>
        </div>
        <div className="threshold-panel">
          {thresholds.map((th, i) => (
            <div key={i} className="threshold-row">
              <input placeholder="名称" value={th.name}
                onChange={e => onUpdateThreshold(i, 'name', e.target.value)} style={{ width: 80 }} />
              <input type="number" placeholder="值" value={th.value}
                onChange={e => onUpdateThreshold(i, 'value', parseFloat(e.target.value) || 0)}
                style={{ width: 60 }} />
              <select value={th.metric} onChange={e => onUpdateThreshold(i, 'metric', e.target.value)}>
                <option value="">指标</option>
                {extractors.map(ext => <option key={ext.name} value={ext.name}>{ext.name}</option>)}
              </select>
              <input type="color" value={th.color}
                onChange={e => onUpdateThreshold(i, 'color', e.target.value)}
                className="filter-color-dot" />
              <button className="remove-btn" onClick={() => onRemoveThreshold(i)}><Icons.Close /></button>
            </div>
          ))}
          {thresholds.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>添加阈值在图表中标记告警值</div>
          )}
        </div>
      </div>

      {/* Regex help */}
      <div className="help-box">
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>正则提示</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.7, fontFamily: 'monospace' }}>
          <div><code style={{color:'var(--accent)'}}>(\d+)</code> 整数</div>
          <div><code style={{color:'var(--accent)'}}>(\d+\.\d+)</code> 小数</div>
          <div><code style={{color:'var(--accent)'}}>(\d+\.?\d*)</code> 整数或小数</div>
        </div>
      </div>
    </div>
  );
}
