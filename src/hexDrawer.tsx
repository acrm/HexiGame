import React from 'react';
import { createRoot } from 'react-dom/client';
import './ui/globalTypography.css';
import HexDrawerPage from './hexDrawer/HexDrawerPage';

const version = (import.meta as ImportMeta & { env?: { APP_VERSION?: string; DEV?: boolean; MODE?: string } }).env?.APP_VERSION;
const baseTitle = document.title || 'Hex Drawer';

if (version) {
  if (import.meta.env.DEV || import.meta.env.MODE === 'preview') {
    document.title = `${baseTitle} - ${version} (local)`;
  } else {
    document.title = `${baseTitle} - ${version}`;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HexDrawerPage />
  </React.StrictMode>,
);
