import React from 'react';

export default function ConvergenceStateVisualization({
  convergenceState,
  convergenceThresholdConfig,
  compact = false,
  showDetails = false,
}) {
  const stateConfig = {
    analyzing: { label: '分析中', color: '#64748b', icon: '◎' },
    converging: { label: '已收敛', color: '#22c55e', icon: '✓' },
    diverging: { label: '发散中', color: '#ef4444', icon: '↑' },
    stable: { label: '稳定', color: '#64748b', icon: '→' }
  };

  const config = stateConfig[convergenceState] || stateConfig.analyzing;

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12
      }}>
        <span style={{ color: config.color, fontSize: 14, fontWeight: 600 }}>
          {config.icon}
        </span>
        <span style={{ fontWeight: 500 }}>{config.label}</span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      padding: '16px',
      minWidth: 320
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ color: config.color, fontSize: 20, fontWeight: 600 }}>
          {config.icon}
        </span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {config.label}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {convergenceState === 'converging' ? '错误率趋于稳定' : 
             convergenceState === 'diverging' ? '错误率持续上升' : 
             '正在分析日志趋势'}
          </div>
        </div>
      </div>
      
      {convergenceThresholdConfig && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          配置: 窗口={convergenceThresholdConfig.windowSize}, 
          峰值比={(convergenceThresholdConfig.peakRatio * 100).toFixed(0)}%
        </div>
      )}

      {showDetails && (
        <div style={{ height: 60, background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
          <svg width="100%" height="100%" viewBox="0 0 100 20" preserveAspectRatio="none">
            {/* 简化占位可视化，实际可接入真实收敛趋势数据 */}
            <path 
              d="M0 20 Q25 10, 50 15 T100 20" 
              fill="none" 
              stroke={config.color} 
              strokeWidth="2"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
