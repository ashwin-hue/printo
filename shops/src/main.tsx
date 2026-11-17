import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

window.addEventListener('error', (event) => {
  console.error('Shops global window error:', event.error || event.message);
  const root = document.getElementById('root');
  if (root && (!root.firstElementChild || root.innerHTML.trim() === '')) {
    root.innerHTML = `
      <div style="min-height: 100vh; background: #0a0a0a; color: #fff; padding: 32px; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="max-width: 500px; width: 100%; background: #1a1a1a; padding: 24px; border-radius: 16px; border: 1px solid #333;">
          <h2 style="color: #ff3b00; margin-top: 0;">Prinrox Partner Error</h2>
          <p style="color: #ccc; font-size: 13px;">${event.message || 'An unexpected runtime error occurred.'}</p>
          <pre style="background: #000; padding: 12px; border-radius: 8px; color: #ff8888; font-size: 11px; overflow-x: auto;">${event.error?.stack || event.filename + ':' + event.lineno}</pre>
          <button onclick="window.sessionStorage.clear(); window.location.reload();" style="margin-top: 16px; padding: 10px 20px; background: #ff3b00; color: #fff; border: none; border-radius: 20px; font-weight: bold; cursor: pointer;">Reload Application</button>
        </div>
      </div>
    `;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Shops unhandled promise rejection:', event.reason);
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
