import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { VaultProvider } from './lib/vault';
import App from './app/App';
import './index.css';

// Get basename for GitHub Pages deployment
// When deployed to GitHub Pages, the app is served from a subpath
const basename = import.meta.env.BASE_URL;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <VaultProvider>
        <App />
      </VaultProvider>
    </BrowserRouter>
  </React.StrictMode>
);