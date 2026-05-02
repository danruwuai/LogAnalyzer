# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - Sprint 4

### Added
- **Ctrl+Shift+L 与 maximizedPanel 状态同步**
  - 键盘快捷键 Ctrl+Shift+L 触发时同步更新 maximizedPanel 状态
  - 确保全屏切换时 maximizedPanel 状态一致

- **筛选方案导入导出（.logfilter）**
  - `exportFilters()` / `importFilters()` 函数
  - JSON 格式，.logfilter 文件扩展名
  - 文件菜单新增「导出筛选方案」和「导入筛选方案」
  - 支持筛选条件、图表配置、阈值线完整导出

## [Unreleased] - Sprint 3

### Fixed
- **DraggablePanel maximize/restore 功能失效**
  - 添加缺失的 `handleMaximize` / `handleRestore` 回调函数
  - 添加 `maximizedPanel` 状态，解决双击标题栏和点击最大化按钮失效问题
  - 添加缺失的 `handlePanelFullscreen` / `handleBringToFront` 函数

## [Unreleased] - Sprint 2

### Added
- **多文件支持基础架构** (`00de377`)
  - 多文件状态管理 (`files[]`, `activeFileId`)
  - 打开多个文件，自动进入对比模式
  - 文件切换、关闭、拖拽排序
  - 每个文件独立的 bookmarks/annotations

- **自动收敛检测增强** (`00de377`)
  - 基于 WARN/ERROR 密度的收敛检测算法
  - 四种状态：analyzing / converging / diverging / stable
  - StatusBar 实时显示收敛状态和图标
  - TimelineOverview 集成收敛状态颜色

### Added (UI)
- **FileTabs 组件** (`12ea907`)
  - Linear/Apple 风格多文件标签页
  - 拖拽排序（HTML5 Drag API）
  - 显示文件名 + 文件大小
  - 关闭按钮 + 激活高亮

- **ConvergenceThresholdPanel** (`12ea907`)
  - 可视化阈值配置面板（slider + input）
  - 支持 windowSize / peakRatio / stableThreshold
  - 独立开关启用/禁用

- **StatusBar 增强** (`12ea907`)
  - 收敛状态点击弹出阈值配置面板
  - 显示当前阈值参数 (W/P值)
  - Ctrl+T 快捷键切换面板显示

### Fixed
- 修复 JSX 语法错误并应用 Linear Dark Theme (`69c2e52`)
