import React from 'react';
import ChartPanel from './ChartPanel';
import AnnotationsPanel from './AnnotationsPanel';
import ExtractorsPanel from './ExtractorsPanel';
import FilterPanel from './FilterPanel';
import { Icons } from './Icons';

export default function RightPanel({
  activeTab, onTabChange, lines, filteredLines,
  extractors, onAddExtractor, onUpdateExtractor, onRemoveExtractor,
  xAxisMode, onXAxisModeChange, xAxisField, onXAxisFieldChange,
  thresholds, onAddThreshold, onUpdateThreshold, onRemoveThreshold,
  annotations, onAddAnnotation, onRemoveAnnotation, onJumpToLine, chartLinkedLine,
  filterItems, onFilterItemsChange, filterMode, onFilterModeChange,
  filterPresets, onSaveFilterPreset, onLoadFilterPreset, onDeleteFilterPreset,
  filePath,
}) {
  const tabs = [
    { id: 'filter', icon: <Icons.Filter />, label: '筛选' },
    { id: 'chart', icon: <Icons.Chart />, label: '图表' },
    { id: 'annotations', icon: <Icons.NoteList />, label: '注释' },
    { id: 'config', icon: <Icons.Gear />, label: '配置' },
  ];

  return (
    <div className="right-panel">
      <div className="right-panel-tabs">
        {tabs.map(tab => (
          <button key={tab.id}
            className={`right-panel-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="right-panel-content">
        {activeTab === 'filter' && (
          <FilterPanel
            filterItems={filterItems} onFilterItemsChange={onFilterItemsChange}
            filterMode={filterMode} onFilterModeChange={onFilterModeChange}
            filterPresets={filterPresets}
            onSaveFilterPreset={onSaveFilterPreset}
            onLoadFilterPreset={onLoadFilterPreset}
            onDeleteFilterPreset={onDeleteFilterPreset}
            allLines={lines}
          />
        )}
        {activeTab === 'chart' && (
          <ChartPanel lines={lines} filteredLines={filteredLines}
            extractors={extractors} xAxisMode={xAxisMode}
            onXAxisModeChange={onXAxisModeChange}
            xAxisField={xAxisField} onXAxisFieldChange={onXAxisFieldChange}
            thresholds={thresholds} annotations={annotations}
            onJumpToLine={onJumpToLine} chartLinkedLine={chartLinkedLine} />
        )}
        {activeTab === 'annotations' && (
          <AnnotationsPanel annotations={annotations}
            onRemoveAnnotation={onRemoveAnnotation} onJumpToLine={onJumpToLine} />
        )}
        {activeTab === 'config' && (
          <ExtractorsPanel extractors={extractors}
            onAddExtractor={onAddExtractor} onUpdateExtractor={onUpdateExtractor}
            onRemoveExtractor={onRemoveExtractor} thresholds={thresholds}
            onAddThreshold={onAddThreshold} onUpdateThreshold={onUpdateThreshold}
            onRemoveThreshold={onRemoveThreshold} lines={lines} />
        )}
      </div>
    </div>
  );
}
