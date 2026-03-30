import React, { useState, useCallback } from 'react';
import { Icons } from './Icons';

const DEFAULT_COLORS = [
  { bg: 'rgba(137, 180, 250, 0.2)', fg: '#89b4fa' },
  { bg: 'rgba(166, 227, 161, 0.2)', fg: '#a6e3a1' },
  { bg: 'rgba(249, 226, 175, 0.2)', fg: '#f9e2af' },
  { bg: 'rgba(243, 139, 168, 0.2)', fg: '#f38ba8' },
  { bg: 'rgba(250, 179, 135, 0.2)', fg: '#fab387' },
  { bg: 'rgba(203, 166, 247, 0.2)', fg: '#cba6f7' },
  { bg: 'rgba(148, 226, 213, 0.2)', fg: '#94e2d5' },
];

export default function FilterPanel({
  filterItems,
  onFilterItemsChange,
  filterPresets,
  onSaveFilterPreset,
  onLoadFilterPreset,
  onDeleteFilterPreset,
  allLines,
  filterMode,
  onFilterModeChange,
}) {
  const [presetName, setPresetName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // Match counts (debounced for large files)
  const matchCounts = React.useMemo(() => {
    if (!allLines || allLines.length === 0) return {};
    const counts = {};
    const lineCount = allLines.length;
    // For large files, sample instead of scanning all
    const sampleSize = lineCount > 50000 ? 5000 : lineCount;
    const step = lineCount > 50000 ? Math.floor(lineCount / sampleSize) : 1;
    
    for (const item of filterItems) {
      if (!item.keyword) { counts[item.id] = 0; continue; }
      let count = 0;
      let tested = 0;
      try {
        const regex = item.isRegex ? new RegExp(item.keyword, item.caseSensitive ? 'gi' : 'gi') : null;
        for (let i = 0; i < lineCount; i += step) {
          tested++;
          const text = allLines[i].text;
          let matched = false;
          if (regex) {
            regex.lastIndex = 0;
            matched = regex.test(text);
          } else {
            matched = item.caseSensitive
              ? text.includes(item.keyword)
              : text.toLowerCase().includes(item.keyword.toLowerCase());
          }
          if (matched) count++;
        }
        // Extrapolate if sampled
        counts[item.id] = step > 1 ? Math.round(count * (lineCount / tested)) : count;
      } catch { counts[item.id] = 0; }
    }
    return counts;
  }, [filterItems, allLines]);

  const addFilterItem = () => {
    const colorIdx = filterItems.length % DEFAULT_COLORS.length;
    onFilterItemsChange([...filterItems, {
      id: Date.now(), enabled: true, keyword: '',
      caseSensitive: false, isRegex: false, exclude: false,
      highlightRow: false,
      bgColor: DEFAULT_COLORS[colorIdx].bg, fgColor: DEFAULT_COLORS[colorIdx].fg,
      fontColor: '',
    }]);
  };

  const update = (id, field, value) => {
    onFilterItemsChange(filterItems.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const remove = (id) => onFilterItemsChange(filterItems.filter(i => i.id !== id));

  const duplicate = (id) => {
    const idx = filterItems.findIndex(i => i.id === id);
    if (idx === -1) return;
    const colorIdx = filterItems.length % DEFAULT_COLORS.length;
    const copy = { ...filterItems[idx], id: Date.now(), bgColor: DEFAULT_COLORS[colorIdx].bg, fgColor: DEFAULT_COLORS[colorIdx].fg };
    const next = [...filterItems];
    next.splice(idx + 1, 0, copy);
    onFilterItemsChange(next);
  };

  const handleSavePreset = () => {
    if (presetName.trim() && filterItems.length > 0) {
      onSaveFilterPreset(presetName.trim(), filterItems, filterMode);
      setPresetName(''); setShowSaveDialog(false);
    }
  };

  // Drag
  const handleDragStart = useCallback((e, idx) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; }, []);
  const handleDragOver = useCallback((e, idx) => { e.preventDefault(); setDragOverIdx(idx); }, []);
  const handleDrop = useCallback((e, dropIdx) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== dropIdx) {
      const next = [...filterItems];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(dropIdx, 0, moved);
      onFilterItemsChange(next);
    }
    setDragIdx(null); setDragOverIdx(null);
  }, [dragIdx, filterItems, onFilterItemsChange]);

  const enabledCount = filterItems.filter(i => i.enabled).length;

  return (
    <div className="filter-panel">
      {/* Header */}
      <div className="filter-header">
        <div className="filter-mode-toggle">
          <button className={`filter-mode-btn ${filterMode === 'filter' ? 'active' : ''}`} onClick={() => onFilterModeChange('filter')}>
            <Icons.Filter /> 过滤
          </button>
          <button className={`filter-mode-btn ${filterMode === 'show-all' ? 'active' : ''}`} onClick={() => onFilterModeChange('show-all')}>
            <Icons.Eye /> 全显
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {filterItems.length > 0 && (
            <span className="filter-count-badge">{enabledCount}/{filterItems.length}</span>
          )}
          <button className="filter-add-btn" onClick={addFilterItem} title="添加筛选条件">
            <Icons.Plus />
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {filterItems.length > 1 && (
        <div className="filter-bulk-actions">
          <button className="filter-bulk-btn" onClick={() => onFilterItemsChange(filterItems.map(i => ({ ...i, enabled: true })))}>全选</button>
          <button className="filter-bulk-btn" onClick={() => onFilterItemsChange(filterItems.map(i => ({ ...i, enabled: false })))}>全不选</button>
          <button className="filter-bulk-btn filter-bulk-btn-danger" onClick={() => onFilterItemsChange([])}>清空</button>
        </div>
      )}

      {/* Items */}
      <div className="filter-items-list">
        {filterItems.length === 0 ? (
          <div className="filter-empty">点击 + 添加筛选条件</div>
        ) : (
          filterItems.map((item, idx) => (
            <div
              key={item.id}
              className={`filter-item-row ${dragOverIdx === idx ? 'drag-over' : ''} ${dragIdx === idx ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            >
              <div className="filter-item-main">
                <span className="filter-drag-handle"><Icons.Grip /></span>
                <input type="checkbox" checked={item.enabled}
                  onChange={(e) => update(item.id, 'enabled', e.target.checked)}
                  className="filter-checkbox" />
                <input type="text" className="filter-keyword-input" placeholder="关键字..."
                  value={item.keyword}
                  onChange={(e) => update(item.id, 'keyword', e.target.value)}
                  style={{
                    background: item.enabled ? item.bgColor : undefined,
                    color: item.fontColor || (item.enabled ? item.fgColor : undefined),
                    borderColor: item.enabled ? item.fgColor + '44' : undefined,
                  }} />
                {item.keyword && (
                  <span className="filter-match-count" style={{ color: item.enabled ? item.fgColor : undefined }}>
                    {matchCounts[item.id] || 0}
                  </span>
                )}
                {item.isRegex && item.keyword && (() => {
                  try { new RegExp(item.keyword); return null; }
                  catch(e) { return <span className="filter-error" title={e.message}>!</span>; }
                })()}
                <button className={`filter-toggle-btn ${item.caseSensitive ? 'active' : ''}`}
                  onClick={() => update(item.id, 'caseSensitive', !item.caseSensitive)}
                  title="区分大小写"><Icons.CaseSensitive /></button>
                <button className={`filter-toggle-btn ${item.isRegex ? 'active' : ''}`}
                  onClick={() => update(item.id, 'isRegex', !item.isRegex)}
                  title="正则表达式"><Icons.Regex /></button>
                <button className={`filter-toggle-btn ${item.exclude ? 'active exclude' : ''}`}
                  onClick={() => update(item.id, 'exclude', !item.exclude)}
                  title={item.exclude ? '排除' : '包含'}>
                  {item.exclude ? <Icons.Block /> : <Icons.Check />}
                </button>
                <button className="filter-delete-btn" onClick={() => remove(item.id)} title="删除">
                  <Icons.Close />
                </button>
              </div>

              <div className="filter-item-style">
                <label className="filter-style-opt" title="标记整行">
                  <input type="checkbox" checked={item.highlightRow || false}
                    onChange={(e) => update(item.id, 'highlightRow', e.target.checked)}
                    className="filter-mini-checkbox" />
                  <Icons.RowHighlight />
                </label>
                <span className="filter-style-label">背景</span>
                <input type="color" value={item.fgColor}
                  onChange={(e) => {
                    update(item.id, 'fgColor', e.target.value);
                    update(item.id, 'bgColor', e.target.value + '33');
                  }} className="filter-color-dot" title="背景色" />
                <span className="filter-style-label">字色</span>
                <input type="color" value={item.fontColor || item.fgColor}
                  onChange={(e) => update(item.id, 'fontColor', e.target.value)}
                  className="filter-color-dot" title="字体色" />
                {item.fontColor && (
                  <button className="filter-reset-color" onClick={() => update(item.id, 'fontColor', '')} title="重置">
                    <Icons.Reset />
                  </button>
                )}
                <span style={{ flex: 1 }} />
                <button className="filter-action-btn" onClick={() => duplicate(item.id)} title="复制">
                  <Icons.Copy />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Presets */}
      <div className="filter-presets-section">
        <div className="filter-presets-header">
          <span className="filter-presets-title"><Icons.Save /> 方案</span>
          <button className="filter-preset-save-btn" onClick={() => setShowSaveDialog(true)}
            disabled={filterItems.length === 0}>保存</button>
        </div>
        {showSaveDialog && (
          <div className="save-preset-dialog">
            <input type="text" className="filter-preset-input" placeholder="方案名称..."
              value={presetName} onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()} autoFocus />
            <div className="save-preset-actions">
              <button className="toolbar-btn" onClick={handleSavePreset}>确定</button>
              <button className="toolbar-btn" onClick={() => setShowSaveDialog(false)}>取消</button>
            </div>
          </div>
        )}
        {filterPresets.length > 0 && (
          <div className="presets-list">
            {filterPresets.map((preset, i) => (
              <div key={i} className="preset-row">
                <span className="preset-name" onClick={() => onLoadFilterPreset(preset)}>
                  {preset.name}
                  <span className="preset-meta">({preset.items.length})</span>
                </span>
                <button className="preset-delete" onClick={() => onDeleteFilterPreset(i)}><Icons.Close /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
