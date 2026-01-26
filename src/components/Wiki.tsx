import React, { useMemo } from 'react';
import { Params, GameState } from '../logic/pureLogic';
import { t, getLanguage } from '../ui/i18n';

export const Wiki: React.FC<{ gameState: GameState; params: Params; isMobile: boolean }> = ({ gameState, params, isMobile }) => {
  const elapsed = useMemo(() => {
    const initial = params.TimerInitialSeconds ?? 0;
    const current = gameState.remainingSeconds ?? initial;
    const passed = Math.max(0, initial - current);
    return passed;
  }, [gameState.remainingSeconds, params.TimerInitialSeconds]);

  return (
    <div className="wiki-placeholder" style={{ padding: 16, color: '#fff', fontSize: 14, lineHeight: 1.6 }}>
      <div style={{ marginBottom: 12, fontWeight: 'bold' }}>{t('wiki.elapsed')}: {elapsed}s</div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{t('wiki.instructions.title')}</div>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          {isMobile ? (
            <>
              <li>{t('wiki.instructions.mobile.step1')}</li>
              <li>{t('wiki.instructions.mobile.step2')}</li>
              <li>{t('wiki.instructions.mobile.step3')}</li>
              <li>{t('wiki.instructions.mobile.step4')}</li>
              <li>{t('wiki.instructions.mobile.step5')}</li>
            </>
          ) : (
            <>
              <li>{t('wiki.instructions.desktop.step1')}</li>
              <li>{t('wiki.instructions.desktop.step2')}</li>
              <li>{t('wiki.instructions.desktop.step3')}</li>
              <li>{t('wiki.instructions.desktop.step4')}</li>
              <li>{t('wiki.instructions.desktop.step5')}</li>
            </>
          )}
        </ol>
      </div>
    </div>
  );
};

export default Wiki;
