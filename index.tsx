import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import { AuthProvider } from './src/context/AuthContext';

// Após um deploy novo, o navegador pode ter o index.html em cache apontando
// pra "chunks" (módulos dinâmicos, ex.: o PDF) que já não existem → o import
// falha com erro de fetch. Aqui recarregamos a página UMA vez pra pegar os
// arquivos novos. O flag em sessionStorage evita loop de reload.
function recoverFromStaleChunk() {
  const KEY = 'echonutri_chunk_reloaded';
  if (sessionStorage.getItem(KEY)) return; // já tentamos nesta sessão
  sessionStorage.setItem(KEY, '1');
  window.location.reload();
}
window.addEventListener('vite:preloadError', (e) => { e.preventDefault(); recoverFromStaleChunk(); });
window.addEventListener('unhandledrejection', (e) => {
  const msg = String(e?.reason?.message || e?.reason || '');
  if (/Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(msg)) {
    recoverFromStaleChunk();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
