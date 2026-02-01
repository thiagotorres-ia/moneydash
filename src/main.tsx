import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function renderInitError(container: HTMLElement, error: Error) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px' }}>
      <h1 style={{ color: '#b91c1c', marginBottom: '0.5rem' }}>Erro ao iniciar a aplicação</h1>
      <p style={{ color: '#374151' }}>{error.message}</p>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = '<div style="padding:2rem;font-family:sans-serif;color:#b91c1c"><h1>Erro</h1><p>Could not find root element to mount to</p></div>';
} else {
  (async () => {
    try {
      const { default: App } = await import('./App');
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    } catch (error) {
      renderInitError(rootElement, error instanceof Error ? error : new Error(String(error)));
    }
  })();
}