import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { useStore } from './state/store';
import { getEngine } from './engine/bridge';
import './ui/styles.css';

// Debug handle for the console and for the end-to-end smoke test (scripts/e2e/smoke-course.mjs).
declare global {
  interface Window {
    __lastLight: { store: typeof useStore; engine: typeof getEngine };
  }
}
window.__lastLight = { store: useStore, engine: getEngine };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
