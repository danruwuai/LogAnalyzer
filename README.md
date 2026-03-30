# LogAnalyzer

基于 Electron + React + ECharts 的日志分析工具，类似 TextAnalysisTool 加上图表功能。

## 功能

- 日志文件加载（支持大文件流式加载 + 2万行限制）
- 关键字搜索/高亮（多关键字，不同颜色，支持正则）
- 过滤/全显双模式筛选
- 数据提取器（正则提取数值，自动绘制折线图）
- 多指标叠加 + 阈值线
- 日志↔图表双向联动
- 行注释 + 注释面板 + 导出
- 书签功能
- 图表导出（PNG/CSV）
- 筛选方案保存/加载
- SVG 图标系统（跨平台兼容）
- 键盘快捷键（Ctrl+O/F/1-4、F1 帮助）
- 文件拖拽打开
- 暗色主题

## 启动

```bash
npm install
npx webpack --mode production
npx electron .
```

## 开发

```bash
npx webpack --mode development --watch
npx electron .
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+O | 打开文件 |
| Ctrl+F | 搜索 |
| Ctrl+1 | 日志面板 |
| Ctrl+2 | 图表面板 |
| Ctrl+3 | 筛选面板 |
| Ctrl+4 | 注释面板 |
| F1 | 帮助 |
