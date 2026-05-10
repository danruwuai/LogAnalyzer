# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project: LogAnalyzer

## Tech Stack
- **Framework**: Electron 33 + React 19
- **Visualization**: ECharts 6 (with custom Linear dark theme)
- **Styling**: CSS Variables (Linear Dark Theme)
- **Build Tool**: Webpack 5 + Babel (no TypeScript - plain JavaScript with JSX)
- **Testing**: Jest (unit) + Playwright (E2E)

## Commands

```bash
# Development
npm run dev          # Webpack dev mode with --watch
npm run build        # Production build (webpack --mode production)
npm run pack         # Windows packaging (electron-builder nsis + portable)

# Run
npm start            # Run built app with electron .
npx electron .       # Direct electron run (after build)

# Testing
npm test             # Jest unit tests (tests/unit/**/*.test.js)
npm run test:e2e     # Playwright E2E tests (tests/e2e/**/*.spec.js)

# Linting
npm run lint         # ESLint check (if configured)
```

## Architecture

### Electron App Structure
```
LogAnalyzer/
├── main.js              # Electron main process (window creation, IPC handlers)
├── preload.js           # Electron preload script (contextBridge, exposed APIs)
├── src/                 # Renderer process (React app)
│   ├── index.js         # React entry point
│   ├── index.html       # HTML template
│   ├── App.js           # Main React component
│   ├── components/      # React components
│   │   ├── DraggablePanel.js
│   │   ├── Toolbar.js
│   │   ├── LogPanel.js
│   │   ├── echarts-theme.js
│   │   └── ...
│   └── styles/
│       ├── variables.css    # CSS design tokens
│       └── components.css   # Component styles
├── tests/
│   ├── unit/            # Jest unit tests
│   ├── e2e/             # Playwright E2E tests
│   └── setup.js         # Jest setup
├── dist/                # Webpack build output
├── dist-builder/        # electron-builder output (NSIS installer, portable)
├── docs/                # Design docs (DESIGN.md, Sprint docs)
├── webpack.config.js    # Renderer bundling config
├── babel.config.js      # Babel transpilation
├── jest.config.js       # Jest test config
├── playwright.config.js # Playwright E2E config
└── package.json
```

### Main ↔ Renderer Communication
- **preload.js** uses `contextBridge` to expose safe APIs to renderer
- Main process handles file system operations, native dialogs
- Renderer uses React + ECharts for UI

### Key Patterns

#### ECharts Instance Management
```javascript
// Always use useRef + useEffect with cleanup
const chartRef = useRef(null);
const chartInstance = useRef(null);

useEffect(() => {
  if (chartRef.current) {
    chartInstance.current = echarts.init(chartRef.current, 'darkTheme');
    return () => chartInstance.current?.dispose();
  }
}, []);
```

#### Draggable Panel Pattern
```javascript
const panelRef = useRef(null);
const [position, setPosition] = useState({ x: 0, y: 0 });

useEffect(() => {
  const panel = panelRef.current;
  // drag event listeners
}, []);
```

#### CSS Variables (Linear Dark Theme)
All styling should use CSS variables from `src/styles/variables.css`:
```css
--bg-canvas:      #0a0a0b;   /*最深背景*/
--bg-panel:       #0f1011;   /* 面板背景 */
--bg-surface:     #191a1b;   /* 卡片/容器 */
--text-primary:   #f7f8f8;   /* 主要文字 */
--text-secondary: #d0d6e0;   /* 次要文字 */
--brand-accent:   #7170ff;   /* 交互强调 */
```

## Design System

The project follows a **Linear-inspired dark theme**. See `DESIGN.md` for full specifications:
- 4-level depth system (canvas → panel → surface → elevated)
- Semantic color roles (highlight-1 through highlight-6 for keyword highlighting)
- Status colors (success/warning/error/info)
- Typography scale (11px → 18px, monospace for logs)
- 8px-based spacing system
- Ghost button, primary button, icon button patterns

## Key Features

| Feature | Description |
|---------|-------------|
| 日志查看 | 虚拟滚动，大文件流式加载，2万行限制 |
| 搜索高亮 | 多关键字正则高亮，不同颜色 |
| 筛选系统 | 过滤/全显模式，拖拽排序，方案保存 |
| 图表联动 | 正则提取数值，日志↔图表双向同步 |
| 注释书签 | 右键注释，书签定位，导出支持 |
| 时间轴缩略图 | 日志密度分布，ERROR/WARN 标记，视口导航 |

## CI/CD

GitHub Actions workflows in `.github/workflows/`:
- `build.yml` - Production build on push
- `build-and-release.yml` - Build + release on tag

## Known Gotchas

⚠️ **ECharts Memory Leaks**: Always dispose chart instance in `useEffect` cleanup.

⚠️ **Webpack Chunking**: ECharts is split into a separate chunk (`echarts.[hash].js`) - don't inline it.

⚠️ **Electron DevTools**: Use `ctrl+shift+i` to open DevTools.

⚠️ **CSS Variables in ECharts**: ECharts doesn't natively support CSS variables. Use the custom theme bridge in `echarts-theme.js`.

⚠️ **Build Output**: `dist/` is webpack output, `dist-builder/` is electron-builder output. Don't commit either.

## Current Sprint Status

See `docs/` for sprint design docs. Sprint 2 focused on:
- ✅ UI 改造 (Design system, dark theme, draggable panels)
- 🔄 时间轴缩略图 (Timeline overview component)
- 📋 多文件比较 (Multi-file comparison - planned)

## Git Workflow

- **Atomic commits**: One logical change per commit (~100 lines)
- **Conventional commits**: `feat:`, `fix:`, `refactor:`, `test:`
- **Never**: Commit `node_modules/`, `dist/`, `dist-builder/`, `.env`

---

**Last Updated**: 2026-05-10  
**Maintainer**: code_engineer (AI Agent)  
**Project Repo**: https://github.com/danruwuai/LogAnalyzer
