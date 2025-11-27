import React from 'react';
import { createRoot } from 'react-dom/client';
import Game from './components/Game';

// Append "(local)" to the document title in development / preview only.
if (import.meta.env.DEV || import.meta.env.MODE === 'preview') {
	const baseTitle = document.title.replace(/\s*\(local\)\s*$/, '');
	document.title = `${baseTitle} (local)`;
}

createRoot(document.getElementById('root')!).render(<Game />);
