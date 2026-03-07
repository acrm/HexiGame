import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Game from './ui/components/Game';
import LoadingScreen from './ui/components/LoadingScreen';
import { integration } from './appLogic/integration';
import { audioController } from './appLogic/audioController';
import '@fortawesome/fontawesome-free/css/all.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/700.css';

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

function Root() {
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Initialize platform integration and preload critical assets
		(async () => {
			try {
				// Platform integration (SDK, language, etc.)
				await integration.init();
				
				// Preload critical audio assets (sound effects + first music track)
				await audioController.preload();
				
				integration.onGameReady();
			} catch {}
			
			// Small delay to ensure smooth transition
			setTimeout(() => {
				setIsLoading(false);
			}, 300);
		})();

		const applyVh = () => {
			const vh = window.innerHeight * 0.01;
			document.documentElement.style.setProperty('--vh', `${vh}px`);
		};
		applyVh();
		window.addEventListener('resize', applyVh);
		return () => window.removeEventListener('resize', applyVh);
	}, []);

	return (
		<>
			<LoadingScreen isLoading={isLoading} />
			{!isLoading && <Game />}
		</>
	);
}

createRoot(document.getElementById('root')!).render(<Root />);
