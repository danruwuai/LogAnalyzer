# Project: LogAnalyzer

## Tech Stack
- **Framework**: Electron 28 + React 18 + TypeScript 5
- **Visualization**: ECharts 5 (with custom dark theme)
- **Styling**: CSS Variables (Linear Dark Theme)
- **Build Tool**: Electron Forge / Webpack

## Commands

```bash
# Development
npm run dev          # Start dev server with hot reload

# Build
npm run build        # Production build
npm run package      # Package for distribution

# Testing (待测试工程师确认框架)
npm test             # Run test suite
npm run test:watch   # Watch mode

# Linting & Type Check
npm run lint         # ESLint check
npx tsc --noEmit    # TypeScript type check
```

## Code Conventions

### React Components
- ✅ **Functional components with hooks** (no class components)
- ✅ **Named exports** (no default exports)
  ```typescript
  // Good
  export function LogPanel() { ... }
  
  // Avoid
  export default function LogPanel() { ... }
  ```
- ✅ **Colocate styles**: `Component.js` + `Component.css` in same directory
- ✅ **State management**: React `useState` / `useContext` (no Redux yet)

### Styling
- ✅ **Use CSS Variables** from `src/styles/variables.css`
  ```css
  /* Good */
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  
  /* Avoid */
  background: #1a1a2e;
  ```
- ✅ **Component-scoped CSS** (avoid global styles when possible)

### ECharts Usage
- ✅ **Instance management**: `useRef` + `useEffect` with cleanup
  ```typescript
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>(null);
  
  useEffect(() => {
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current, 'darkTheme');
      return () => chartInstance.current?.dispose();
    }
  }, []);
  ```
- ✅ **Use custom theme**: Import from `src/components/echarts-theme.js`

### Git Workflow
- ✅ **Atomic commits**: One logical change per commit (~100 lines)
- ✅ **Conventional commits**:
  ```
  feat: add multi-file tab switching
  fix: resolve ECharts memory leak in LogPanel
  refactor: extract common chart utilities
  test: add convergence detection unit tests
  ```
- ✅ **Feature flags** for incomplete features
- ✅ **Commit early, commit often** (save points)

## Boundaries

🚫 **Never do**:
- Commit `node_modules/`, `dist/`, `.env`, `.env.local`
- Add dependencies without checking bundle size impact
- Modify database schema without discussion (if applicable)
- Force push to `main` or shared branches
- Skip tests before committing

✅ **Always do**:
- Run `npm test` before committing
- Run `npm run lint` and fix errors
- Verify ECharts renders correctly after changes
- Use feature flags for incomplete UI features

## Patterns

### Draggable Panel Pattern
Location: `src/components/DraggablePanel.js`

```javascript
// Key pattern: useRef + useEffect for DOM manipulation
const panelRef = useRef(null);
const [position, setPosition] = useState({ x: 0, y: 0 });

useEffect(() => {
  // Setup drag listeners
  const panel = panelRef.current;
  // ... drag logic
}, []);
```

### ECharts Theme Integration
Location: `src/components/echarts-theme.js`

```javascript
// Register custom dark theme
echarts.registerTheme('logAnalyzerDark', {
  backgroundColor: 'var(--color-bg-primary)',
  textStyle: { color: 'var(--color-text-primary)' },
  // ... more theme config
});
```

### Design System Usage
Location: `src/styles/variables.css`

```css
/* Always use CSS variables for theming */
:root {
  --color-bg-primary: #0a0a0f;
  --color-bg-secondary: #1a1a2e;
  --color-text-primary: #e0e0e0;
  /* ... */
}
```

## Current Sprint (Sprint 2)

### In Progress
- [ ] **Multi-file comparison** (P1)
  - Slice 1: Tab UI for file switching ✅ Architecture done
  - Slice 2: File switch logic (in progress)
  - Slice 3: Comparison mode toggle
  - Slice 4: Comparison visualization (ECharts)

### Completed
- [x] **Sprint 1 UI改造** (P0) - ✅ Passed acceptance test
  - Design system with CSS variables
  - Dark theme ECharts integration
  - Draggable panels, toolbar, log panel refactoring

## Known Gotchas

⚠️ **ECharts Memory Leaks**:
- Always dispose chart instance in `useEffect` cleanup
- Don't reinitialize chart on every render

⚠️ **Electron + React DevTools**:
- Use `ctrl+shift+i` to open DevTools in Electron
- React DevTools may need manual installation in Electron

⚠️ **CSS Variables in ECharts**:
- ECharts theme doesn't natively support CSS variables
- Use the custom theme bridge in `echarts-theme.js`

## File Structure

```
LogAnalyzer/
├── src/
│   ├── components/
│   │   ├── DraggablePanel.js
│   │   ├── DraggablePanel.css
│   │   ├── Toolbar.js
│   │   ├── Toolbar.css
│   │   ├── LogPanel.js
│   │   ├── LogPanel.css
│   │   └── echarts-theme.js
│   ├── styles/
│   │   ├── variables.css       # CSS design tokens
│   │   └── components.css      # Component styles
│   ├── App.js
│   ├── App.css
│   └── index.js
├── package.json
├── README.md
└── CLAUDE.md                   # This file
```

---

**Last Updated**: 2026-04-27  
**Maintainer**: code_engineer (AI Agent)  
**Project Repo**: https://github.com/danruwuai/LogAnalyzer
