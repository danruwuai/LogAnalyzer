# LogAnalyzer UI 优化设计规范
# 基于 Linear Design System + 工具类产品最佳实践

## 1. Visual Theme & Atmosphere

### 当前问题诊断
- 背景层次不清：所有面板同一深度
- 色彩过多：6个高亮色 + 面板色，缺乏主次
- 边框系统缺失：全靠背景色区分区块
- 组件状态不统一：按钮、输入框缺乏系统性规范

### 优化方向
采用 **Linear 暗色哲学**：黑暗不是缺陷，而是原生介质。信息密度通过透明度和微妙的亮度梯度管理，而非颜色变化。

**核心色板：**
| 层级 | 当前问题 | 优化建议 |
|------|----------|----------|
| Marketing Black | - | `#0a0a0b` — 画布/最深层背景 |
| Panel Dark | `#1e1e2e` 太紫 | `#0f1011` — 侧边栏/面板背景 |
| Level 3 Surface | 缺失 | `#191a1b` — 卡片/下拉/浮层 |
| Elevated | 缺失 | `#28282c` — hover状态、次级组件 |

---

## 2. Color Palette & Roles（重点重构）

### 当前配色问题
```
当前高亮色（过于鲜艳，缺乏语义）:
#cba6f7 紫色  — 任意分配
#89b4fa 蓝色  — 任意分配
#a6e3a1 绿色  — 任意分配
#f9e2af 黄色  — 任意分配
#f38ba8 红色  — 任意分配
#fab387 橙色  — 任意分配
```

### 优化方案：语义化色彩系统

```css
/* ========== 基础层 ========== */
--bg-canvas:      #0a0a0b;   /* 最深背景 - 画布 */
--bg-panel:       #0f1011;   /* 面板背景 */
--bg-surface:    #191a1b;   /* 卡片/容器 */
--bg-elevated:   #28282c;   /* hover/次级组件 */
--bg-overlay:    #1e1e24;   /* 下拉/弹窗 */

/* ========== 边框层 ========== */
--border-subtle:  rgba(255,255,255,0.05);  /* 微弱分隔线 */
--border-default: rgba(255,255,255,0.08);  /* 标准边框 */
--border-strong:  rgba(255,255,255,0.12);  /* 强调边框 */

/* ========== 文字层 ========== */
--text-primary:   #f7f8f8;   /* 主要文字 - 接近纯白 */
--text-secondary: #d0d6e0;   /* 次要文字 */
--text-tertiary:  #8a8f98;   /* 辅助文字/元数据 */
--text-muted:     #62666d;   /* 静音/禁用 */

/* ========== 功能色：高亮（按语义分配）========== */
--highlight-1:  #cba6f7;    /* 保留：第一个高亮色 */
--highlight-2:  #89b4fa;    /* 保留：第二个高亮色 */
--highlight-3:  #a6e3a1;    /* 保留：第三个高亮色 */
--highlight-4:  #f9e2af;    /* 保留：第四个高亮色 */
--highlight-5:  #f38ba8;    /* 保留：第五个高亮色 */
--highlight-6:  #fab387;    /* 保留：第六个高亮色 */

/* ========== 状态色 ========== */
--status-success: #10b981;   /* 成功/收敛 */
--status-warning: #f59e0b;   /* 警告 */
--status-error:   #ef4444;   /* 错误/发散 */
--status-info:    #3b82f6;   /* 信息 */

/* ========== 品牌色（参考 Linear）========== */
--brand-primary:  #5e6ad2;   /* 主品牌色 - Indigo */
--brand-accent:   #7170ff;   /* 交互强调 */
--brand-hover:    #828fff;   /* 悬停态 */
```

### 语义化分配建议
```
LOG 分析场景的语义色彩映射：

| 用途           | 建议色彩         | 理由                    |
|----------------|------------------|------------------------|
| 关键字高亮 1   | --highlight-1   | 紫色，视觉突出          |
| 关键字高亮 2   | --highlight-2   | 蓝色，冷静              |
| 关键字高亮 3   | --highlight-3   | 绿色，清新              |
| 关键字高亮 4   | --highlight-4   | 黄色，警示但不紧张      |
| 关键字高亮 5   | --highlight-5   | 红色，重点强调          |
| 关键字高亮 6   | --highlight-6   | 橙色，次级强调          |
| ERROR 行       | --status-error   | 红色背景/边框           |
| WARN 行        | --status-warning | 黄色背景/边框           |
| 书签/注释      | --brand-accent   | 品牌紫，统一性          |
| 收敛状态 (isConverge=1) | --status-success | 绿色 |
| 发散状态 (isConverge=0) | --status-error   | 红色 |
```

---

## 3. Typography Rules

### 当前问题
- 字体无层级：全部 14px 等宽
- 缺少字体族定义
- 行高、字间距无规范

### 优化方案

```css
/* ========== 字体族 ========== */
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', ui-monospace, Menlo, monospace;
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;

/* ========== 字号系统 ========== */
--text-xs:   11px;   /* 微标签、时间戳 */
--text-sm:   13px;   /* 次要说明、元数据 */
--text-base: 14px;   /* 日志正文 - 保持当前 */
--text-md:   15px;   /* 面板标题 */
--text-lg:   18px;   /* 大标题（未使用）*/

/* ========== 行高 ========== */
--leading-tight:  1.3;   /* 标题 */
--leading-normal: 1.5;   /* 正文 */
--leading-relaxed: 1.7; /* 日志行 - 增加可读性 */
```

### 日志显示优化
```
当前：line-height: 1.4, font-size: 14px
优化：line-height: 1.6, font-size: 13px（更稀疏，提升长文本可读性）
```

---

## 4. Component Stylings（组件规范）

### 4.1 按钮系统

**Ghost Button（默认）**
```css
.btn-ghost {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.08);
  color: #d0d6e0;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 510;
  transition: all 0.15s ease;
}
.btn-ghost:hover {
  background: rgba(255,255,255,0.05);
  color: #f7f8f8;
}
.btn-ghost:active {
  background: rgba(255,255,255,0.08);
}
```

**Primary Button（主要操作）**
```css
.btn-primary {
  background: #5e6ad2;
  border: none;
  color: #ffffff;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 590;
}
.btn-primary:hover {
  background: #828fff;
}
```

**Icon Button（图标按钮）**
```css
.btn-icon {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  color: #8a8f98;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-icon:hover {
  background: rgba(255,255,255,0.06);
  color: #f7f8f8;
}
```

**Toolbar Button（小工具栏）**
```css
.btn-toolbar {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.04);
  color: #62666d;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 510;
  box-shadow: rgba(0,0,0,0.03) 0px 1px 0px 0px;
}
```

### 4.2 输入框

```css
.input {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  padding: 8px 12px;
  color: #f7f8f8;
  font-size: 13px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input::placeholder {
  color: #62666d;
}
.input:focus {
  outline: none;
  border-color: rgba(113,112,255,0.5);
  box-shadow: 0 0 0 3px rgba(113,112,255,0.15);
}
```

### 4.3 卡片/面板

```css
.card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px;
  padding: 16px;
}
.card:hover {
  border-color: rgba(255,255,255,0.08);
}

/* 筛选面板项目 */
.filter-item {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 6px;
  padding: 8px 12px;
  transition: all 0.15s;
}
.filter-item:hover {
  background: rgba(255,255,255,0.03);
  border-color: rgba(255,255,255,0.08);
}
.filter-item.active {
  background: rgba(113,112,255,0.1);
  border-color: rgba(113,112,255,0.3);
}
```

### 4.4 标签/徽章

```css
.badge {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 510;
  color: #d0d6e0;
}

.badge-success {
  background: rgba(16,185,129,0.15);
  border-color: rgba(16,185,129,0.3);
  color: #10b981;
}

.badge-error {
  background: rgba(239,68,68,0.15);
  border-color: rgba(239,68,68,0.3);
  color: #ef4444;
}
```

---

## 5. Layout Principles（布局规范）

### 5.1 间距系统
基于 **8px 网格**：

```css
--space-1:  4px;    /* 微调 */
--space-2:  8px;    /* 紧凑间距 */
--space-3:  12px;   /* 默认间距 */
--space-4:  16px;   /* 宽松间距 */
--space-5:  20px;   /* 段落间距 */
--space-6:  24px;   /* 区块间距 */
--space-8:  32px;   /* 大区块 */
--space-10: 40px;   /* 区域间距 */
```

### 5.2 面板布局优化

**当前布局（问题）：**
```
┌─────────────┬────────────────────────────────┐
│  筛选面板    │         日志区域               │
│  240px      │         flex-1                │
│  固定       │                                 │
├─────────────┼────────────────────────────────┤
│             │         图表区域               │
│             │         300px height          │
└─────────────┴────────────────────────────────┘
```

**优化布局：**
```
┌─────────────────────────────────────────────────────┐
│  工具栏 (48px)                                       │
├────────┬────────────────────────────────────────────┤
│  左侧  │                                            │
│  面板  │           主内容区                          │
│ 220px  │           (日志/图表)                       │
│        │                                            │
│        ├────────────────────────────────────────────┤
│        │           底部状态栏 (24px)                 │
└────────┴────────────────────────────────────────────┘
```

**关键改进：**
1. 左侧面板收窄：240px → 220px（Linear 标准）
2. 工具栏高度统一：48px（符合 Radix UI 标准）
3. 日志行高增加：提升可读性
4. 面板间分隔：使用 `border-subtle` 而非背景色

### 5.3 日志行间距优化

```css
/* 当前 */
.log-row {
  padding: 2px 8px;
  line-height: 1.4;
}

/* 优化 - Linear 风格 */
.log-row {
  padding: 4px 12px;        /* 水平padding增加 */
  line-height: 1.6;          /* 提升可读性 */
  border-bottom: 1px solid rgba(255,255,255,0.02);  /* 细微分隔线 */
}

/* 交替行 - 极微妙 */
.log-row:nth-child(even) {
  background: rgba(255,255,255,0.01);
}
```

---

## 6. Depth & Elevation（深度系统）

### 当前问题
- 完全平面，无阴影
- 无法区分层级

### 优化方案

```css
/* 阴影系统 */
--shadow-sm:  0px 1px 2px rgba(0,0,0,0.3);
--shadow-md: 0px 4px 12px rgba(0,0,0,0.4);
--shadow-lg: 0px 8px 24px rgba(0,0,0,0.5);
--shadow-xl: 0px 16px 48px rgba(0,0,0,0.6);

/* 内阴影 - 按下状态 */
--shadow-inset: inset 0px 1px 2px rgba(0,0,0,0.3);

/* 使用场景 */
.dropdown {
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-default);
}

.modal {
  box-shadow: var(--shadow-xl);
}

.input:focus {
  box-shadow: 0 0 0 3px rgba(113,112,255,0.15);
}
```

---

## 7. 日志专用场景优化

### 7.1 高亮行样式
```css
/* 包含关键字的行 */
.log-row.highlighted {
  background: rgba(203,166,247,0.08);  /* highlight-1 透明度降低 */
  border-left: 2px solid var(--highlight-1);
}

/* ERROR 行 */
.log-row.level-error {
  background: rgba(239,68,68,0.08);
  border-left: 2px solid var(--status-error);
}

/* WARN 行 */
.log-row.level-warn {
  background: rgba(245,158,11,0.06);
  border-left: 2px solid var(--status-warning);
}

/* 书签行 */
.log-row.bookmarked {
  background: rgba(113,112,255,0.06);
  border-left: 2px solid var(--brand-accent);
}
```

### 7.2 图表配色（ECharts 主题）
```js
// 基于 Linear 色板的 ECharts 主题
const logAnalyzerTheme = {
  color: [
    '#cba6f7',  // highlight-1
    '#89b4fa',  // highlight-2
    '#a6e3a1',  // highlight-3
    '#f9e2af',  // highlight-4
    '#f38ba8',  // highlight-5
    '#fab387',  // highlight-6
  ],
  backgroundColor: 'transparent',
  textStyle: {
    color: '#d0d6e0',
    fontFamily: "'JetBrains Mono', monospace",
  },
  title: {
    textStyle: { color: '#f7f8f8', fontWeight: 590 },
  },
  legend: {
    textStyle: { color: '#8a8f98' },
  },
  tooltip: {
    backgroundColor: '#191a1b',
    borderColor: 'rgba(255,255,255,0.08)',
    textStyle: { color: '#f7f8f8' },
  },
  xAxis: {
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    axisLabel: { color: '#8a8f98' },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
  },
  yAxis: {
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    axisLabel: { color: '#8a8f98' },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
  },
  grid: {
    borderColor: 'rgba(255,255,255,0.05)',
  },
};
```

---

## 8. Responsive Behavior

### 断点系统
```css
--breakpoint-sm: 768px;
--breakpoint-md: 1024px;
--breakpoint-lg: 1280px;
--breakpoint-xl: 1536px;

/* 日志分析工具典型场景 */
@media (max-width: 1024px) {
  .sidebar {
    width: 180px;  /* 收窄侧边栏 */
  }
}

@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    transform: translateX(-100%);
  }
  .main-content {
    width: 100%;
  }
}
```

---

## 9. Agent Prompt Guide（AI 开发提示）

当使用 AI agent 优化 LogAnalyzer UI 时，可使用以下提示词：

```
参考 Linear design system，优化 LogAnalyzer 的 UI：

1. 色彩系统采用深色主题，以 #0a0a0b 为画布背景
2. 边框使用 rgba(255,255,255,0.05) ~ 0.08 的半透明边框
3. 文字层级：#f7f8f8 (主要) / #d0d6e0 (次要) / #8a8f98 (辅助) / #62666d (静音)
4. 品牌色：#5e6ad2 (主) / #7170ff (强调) / #828fff (悬停)
5. 间距基于 8px 网格：4/8/12/16/24/32px
6. 圆角统一使用 6px（按钮/输入框）、8px（卡片）、12px（大面板）
7. 阴影使用 rgba(0,0,0,0.3) ~ 0.5 的黑色阴影
8. 日志行高增加到 1.6，提升可读性
```

---

## 10. 实施优先级

| 优先级 | 改进项 | 复杂度 | 影响 |
|--------|--------|--------|------|
| P0 | CSS 变量系统重构 | 低 | 高 |
| P0 | 色彩语义化 | 低 | 高 |
| P1 | 按钮/输入框组件规范化 | 中 | 中 |
| P1 | ECharts 暗色主题 | 中 | 中 |
| P2 | 面板布局优化 | 高 | 中 |
| P2 | 日志行高调整 | 低 | 中 |
| P3 | 阴影/层级系统 | 中 | 低 |
