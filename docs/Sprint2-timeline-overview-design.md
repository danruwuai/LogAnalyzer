# Sprint 2 - 时间轴缩略图 UI 设计稿

## 1. 概念与场景

时间轴缩略图是一个日志分布 overview 组件，帮助用户快速定位关键区域（ERROR/WARN）和理解日志密度分布。

**核心场景：**
- 大文件（>10k行）导航时，快速定位 ERROR 行
- 多指标图表联动时，同步显示当前视口位置
- 日志时间分布概览（按行号密度可视化）

---

## 2. 位置与布局

### 2.1 位置决策
```
当前布局（问题）：
┌─────────────────────────────────┐
│ 工具栏 (48px)                    │
├────────┬────────────────────────┤
│ 左侧   │  日志面板 (flex-1)      │
│ 面板   │                        │
│ 220px  │                        │
├────────┼────────────────────────┤
│        │  底部面板 (280px)       │
│        │  [筛选] [图表] [注释]   │
└────────┴────────────────────────┘

优化布局：
┌─────────────────────────────────┐
│ 工具栏 (48px)                    │
├────────┬────────────────────────┤
│ 左侧   │  日志面板 (flex-1)      │
│ 面板   │                        │
│ 220px  ├────────────────────────┤
│        │  时间轴缩略图 (40px)    │ ← 新增
├────────┼────────────────────────┤
│        │  底部面板 (280px)       │
└────────┴────────────────────────┘
```

### 2.2 缩略图尺寸规范
```css
/* 高度固定 40px，符合 Linear 标准工具栏高度 */
--timeline-height: 40px;

/* 内边距 */
--timeline-padding: 0 12px;

/* 视口指示器圆角 */
--timeline-viewport-radius: 4px;
```

---

## 3. 视觉设计

### 3.1 外观样式
```css
.timeline-container {
  height: 40px;
  background: var(--bg-panel);
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
  flex-shrink: 0;
}

/* 日志密度条 */
.timeline-density-bar {
  flex: 1;
  height: 24px;
  display: flex;
  align-items: flex-end;
  gap: 1px;
  cursor: pointer;
  position: relative;
}

/* 单个密度柱 */
.timeline-density-bar .bar-segment {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 1px 1px 0 0;
  transition: background 0.1s;
  min-width: 2px;
  max-width: 8px;
}
.timeline-density-bar .bar-segment:hover {
  background: rgba(255, 255, 255, 0.16);
}

/* ERROR 标记点 */
.timeline-density-bar .marker-error {
  position: absolute;
  width: 3px;
  height: 8px;
  background: var(--status-error);
  border-radius: 1px;
  top: 0;
  pointer-events: none;
}

/* WARN 标记点 */
.timeline-density-bar .marker-warn {
  position: absolute;
  width: 3px;
  height: 6px;
  background: var(--status-warning);
  border-radius: 1px;
  top: 0;
  pointer-events: none;
}

/* 视口指示器（当前可见范围）*/
.timeline-viewport {
  position: absolute;
  height: 100%;
  background: rgba(113, 112, 255, 0.15);
  border: 1px solid var(--brand-accent);
  border-radius: var(--radius-sm);
  cursor: grab;
  transition: border-color 0.15s;
}
.timeline-viewport:hover {
  background: rgba(113, 112, 255, 0.25);
  border-color: var(--brand-hover);
}
.timeline-viewport.dragging {
  cursor: grabbing;
  background: rgba(113, 112, 255, 0.3);
}

/* 行号范围标签 */
.timeline-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
  user-select: none;
}
.timeline-label.start { text-align: left; }
.timeline-label.end { text-align: right; }
```

### 3.2 色彩语义
```css
/* 日志密度 - 按日志级别分布着色 */
.bar-segment.has-error {
  background: rgba(239, 68, 68, 0.4);
}
.bar-segment.has-warn {
  background: rgba(245, 158, 11, 0.35);
}
.bar-segment.has-info {
  background: rgba(59, 130, 246, 0.25);
}

/* 无级别日志 - 极淡中性 */
.bar-segment.blank {
  background: rgba(255, 255, 255, 0.03);
}
```

---

## 4. 交互设计

### 4.1 点击行为
- 点击缩略图任意位置 → 日志面板跳转到对应行号
- 视口指示器同步更新

### 4.2 拖拽行为
- 拖拽视口指示器 → 日志面板同步滚动
- 拖拽时显示当前行号 tooltip

### 4.3 滚轮行为
- 鼠标悬停缩略图 + 滚轮 → 调整视口大小（放大/缩小）
- 保持视口居中位置不变

### 4.4 快捷键
```css
/* 在日志面板按 Ctrl+T 切换时间轴缩略图显示/隐藏 */
.timeline-container.hidden {
  height: 0;
  overflow: hidden;
  opacity: 0;
}
```

---

## 5. 组件规格

### 5.1 组件 Props
```tsx
interface TimelineOverview {
  lines: LogLine[];           // 全部日志行
  filteredLines: LogLine[];  // 当前过滤后的行
  totalLines: number;        // 总行数
  visibleStart: number;       // 当前视口起始行
  visibleEnd: number;        // 当前视口结束行
  onViewportChange: (start: number, end: number) => void;
  onJumpToLine: (lineNum: number) => void;
}
```

### 5.2 性能优化
```js
// 密度采样策略：每 100 行计算一个密度点
// 总分段数 = Math.ceil(totalLines / 100)，最大 200 段
const SAMPLE_SIZE = 100;
const MAX_SEGMENTS = 200;
const segmentCount = Math.min(Math.ceil(totalLines / SAMPLE_SIZE), MAX_SEGMENTS);
```

### 5.3 密度计算
```js
function computeDensity(lines, segmentCount) {
  const segmentSize = Math.ceil(lines.length / segmentCount);
  return Array.from({ length: segmentCount }, (_, i) => {
    const start = i * segmentSize;
    const end = Math.min(start + segmentSize, lines.length);
    const segmentLines = lines.slice(start, end);
    
    return {
      hasError: segmentLines.some(l => l.level === 'ERROR'),
      hasWarn: segmentLines.some(l => l.level === 'WARN'),
      hasInfo: segmentLines.some(l => l.level === 'INFO'),
      density: segmentLines.length / segmentSize,  // 0-1 密度值
      lineStart: lines[start]?.num || 0,
      lineEnd: lines[end - 1]?.num || 0,
    };
  });
}
```

---

## 6. 实现优先级

| 优先级 | 任务 | 复杂度 | 影响 |
|--------|------|--------|------|
| P1 | 时间轴缩略图组件结构 + 静态展示 | 中 | 高 |
| P1 | 密度计算 + ERROR/WARN 标记点 | 中 | 高 |
| P1 | 视口指示器 + 滚动联动 | 高 | 高 |
| P2 | 点击跳转 + 拖拽导航 | 高 | 中 |
| P2 | 滚轮缩放视口 | 中 | 中 |
| P3 | 快捷键切换显示/隐藏 | 低 | 低 |

---

## 7. 参考实现

代码工程师需要修改的文件：
1. `src/components/TimelineOverview.js` — 新建组件
2. `src/App.js` — 集成到日志面板下方
3. `src/styles/components.css` — 添加 `.timeline-*` 样式

设计系统引用：
- variables.css 中的所有 CSS 变量
- Linear 暗色主题配色
