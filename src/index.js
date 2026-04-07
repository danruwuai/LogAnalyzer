import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './App.css';
import './styles/variables.css';  /* DESIGN.md CSS 变量系统 (P0) */
import './styles/components.css'; /* DESIGN.md 组件样式 (P1) */

const root = createRoot(document.getElementById('root'));
root.render(<App />);
