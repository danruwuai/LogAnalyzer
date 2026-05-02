import React, { useState } from 'react';
import { Icons } from './Icons';

/**
 * ConvergenceThresholdPanel
 * Compact threshold configuration with slider + input, shown in StatusBar or a mini panel.
 * Allows setting: windowSize, peakRatio threshold, stableThreshold
 */
export default function ConvergenceThresholdPanel({ config, onChange, compact = false }) {
  // config: { windowSize, peakRatio, stableThreshold, enabled }
  const [localConfig, setLocalConfig] = useState({
    windowSize: config?.windowSize ?? 50,
    peakRatio: config?.peakRatio ?? 0.6,
    stableThreshold: config?.stableThreshold ?? 3,
    enabled: config?.enabled ?? true,
  });

  const update = (key, value) => {
    const next = { ...localConfig, [key]: value };
    setLocalConfig(next);
    if (onChange) onChange(next);
  };

  if (compact) {
    return (
      <div className="threshold-compact">
        <label className="threshold-compact-label">
          <input
            type="checkbox"
            checked={localConfig.enabled}
            onChange={(e) => update('enabled', e.target.checked)}
            style={{ accentColor: 'var(--brand-accent)' }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>收敛检测</span>
        </label>
        {localConfig.enabled && (
          <>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>窗口{localConfig.windowSize}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>峰值比{localConfig.peakRatio}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="threshold-panel" style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      minWidth: 260,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icons.Chart />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            收敛检测阈值
          </span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={localConfig.enabled}
            onChange={(e) => update('enabled', e.target.checked)}
            style={{ accentColor: 'var(--brand-accent)' }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>启用</span>
        </label>
      </div>

      {/* Window size */}
      <ThresholdRow
        label="窗口大小"
        description="每N行一个分析窗口"
        value={localConfig.windowSize}
        min={10}
        max={200}
        step={10}
        unit="行"
        onChange={(v) => update('windowSize', v)}
        disabled={!localConfig.enabled}
      />

      {/* Peak ratio threshold */}
      <ThresholdRow
        label="峰值比率"
        description="相对于峰值的收敛判定比例"
        value={localConfig.peakRatio}
        min={0.1}
        max={1.0}
        step={0.05}
        unit=""
        formatValue={(v) => (v * 100).toFixed(0) + '%'}
        onChange={(v) => update('peakRatio', v)}
        disabled={!localConfig.enabled}
      />

      {/* Stable threshold - consecutive decreases */}
      <ThresholdRow
        label="连续下降判定"
        description="连续下降N次视为收敛"
        value={localConfig.stableThreshold}
        min={1}
        max={10}
        step={1}
        unit="次"
        onChange={(v) => update('stableThreshold', v)}
        disabled={!localConfig.enabled}
      />
    </div>
  );
}

function ThresholdRow({ label, description, value, min, max, step, unit, formatValue, onChange, disabled }) {
  const displayValue = formatValue ? formatValue(value) : value;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>{description}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Number input */}
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= min && v <= max) onChange(v);
            }}
            style={{
              width: 52,
              padding: '2px 6px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
              fontSize: 12,
              textAlign: 'center',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{unit}</span>
        </div>
      </div>
      {/* Slider */}
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: 'var(--brand-accent)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
        }}
      />
    </div>
  );
}
