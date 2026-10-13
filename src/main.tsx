import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './app/App';
import { installAudioUnlock, synth } from './audio/synth';
import { registerServiceWorker } from './pwa/register';

// Frame-busting: this app must never run inside someone else's page.
try {
  if (window.top && window.top !== window.self) {
    window.top.location.href = window.self.location.href;
  }
} catch {
  // Cross-origin access throws; the CSP still applies. Nothing else to do.
}

registerServiceWorker();
installAudioUnlock(synth, document);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element');
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
