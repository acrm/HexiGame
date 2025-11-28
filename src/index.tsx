import React from 'react';
import { createRoot } from 'react-dom/client';
import Game from './components/Game';

// Vite exposes package.json version via import.meta.env if configured.
// We pass it using define in vite.config.mts.
const version = (import.meta as any).env.APP_VERSION as string | undefined;

const baseTitle = document.title || 'HexiGame';

if (version) {
	if (import.meta.env.DEV || import.meta.env.MODE === 'preview') {
		document.title = `${baseTitle} — ${version} (local)`;
	} else {
		document.title = `${baseTitle} — ${version}`;
	}
}

createRoot(document.getElementById('root')!).render(<Game />);
