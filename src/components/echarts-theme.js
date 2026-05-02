/**
 * LogAnalyzer ECharts Dark Theme
 * Based on DESIGN.md Section 7.2
 * Ref: variables.css for design tokens (same values inlined for portability)
 */

export const logAnalyzerTheme = {
  // 调色板 — 对应 6 个高亮色
  color: [
    '#cba6f7',  // highlight-1 — 紫色
    '#89b4fa',  // highlight-2 — 蓝色
    '#a6e3a1',  // highlight-3 — 绿色
    '#f9e2af',  // highlight-4 — 黄色
    '#f38ba8',  // highlight-5 — 红色
    '#fab387',  // highlight-6 — 橙色
  ],

  // 背景透明，让 CSS 背景穿透
  backgroundColor: 'transparent',

  // 全局文字样式
  textStyle: {
    color: '#d0d6e0',          // --text-secondary
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', ui-monospace, Menlo, monospace",
  },

  // 标题
  title: {
    textStyle: {
      color: '#f7f8f8',         // --text-primary
      fontWeight: 590,
      fontSize: 15,
    },
    subtextStyle: {
      color: '#8a8f98',         // --text-tertiary
      fontSize: 13,
    },
  },

  // 图例
  legend: {
    textStyle: {
      color: '#8a8f98',         // --text-tertiary
      fontSize: 12,
    },
    inactiveColor: '#62666d',   // --text-muted
  },

  // 提示框
  tooltip: {
    backgroundColor: '#191a1b',  // --bg-surface
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    padding: [8, 12],
    textStyle: {
      color: '#f7f8f8',         // --text-primary
      fontSize: 12,
    },
    extraCssText: 'box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.4); border-radius: 6px;',
  },

  // 坐标轴
  xAxis: {
    axisLine: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
    },
    axisTick: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
    },
    axisLabel: {
      color: '#8a8f98',         // --text-tertiary
      fontSize: 11,
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.05)',
      },
    },
  },

  yAxis: {
    axisLine: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
    },
    axisTick: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
    },
    axisLabel: {
      color: '#8a8f98',         // --text-tertiary
      fontSize: 11,
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.05)',
      },
    },
  },

  // 网格
  grid: {
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },

  // 目录项
  dataZoom: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    fillerColor: 'rgba(113, 112, 255, 0.1)',
    handleStyle: {
      color: '#7170ff',         // --brand-accent
      borderColor: 'rgba(113, 112, 255, 0.5)',
    },
    textStyle: {
      color: '#8a8f98',
    },
  },

  // 时间轴
  timeline: {
    lineStyle: {
      color: 'rgba(255, 255, 255, 0.1)',
    },
    itemStyle: {
      color: '#7170ff',         // --brand-accent
    },
    controlStyle: {
      color: '#5e6ad2',          // --brand-primary
    },
    label: {
      color: '#8a8f98',
    },
  },

  // 折线图
  line: {
    lineStyle: {
      width: 2,
    },
    smooth: true,
    symbol: 'circle',
    symbolSize: 4,
    itemStyle: {
      borderWidth: 2,
    },
  },

  // 柱状图
  bar: {
    itemStyle: {
      borderRadius: [4, 4, 0, 0],
    },
  },

  // 饼图
  pie: {
    itemStyle: {
      borderWidth: 1,
      borderColor: '#0a0a0b',   // --bg-canvas
    },
  },

  // 散点图
  scatter: {
    itemStyle: {
      borderWidth: 1,
    },
  },

  // K线图
  candlestick: {
    itemStyle: {
      color: '#10b981',        // --status-success (涨)
      color0: '#ef4444',        // --status-error (跌)
      borderColor: '#10b981',
      borderColor0: '#ef4444',
    },
  },
};

export default logAnalyzerTheme;
