import React, { useMemo } from 'react';
import { Params, GameState } from '../logic/pureLogic';
import { t } from '../ui/i18n';

export const Wiki: React.FC<{ gameState: GameState; params: Params }> = ({ gameState, params }) => {
  const elapsed = useMemo(() => {
    const initial = params.TimerInitialSeconds ?? 0;
    const current = gameState.remainingSeconds ?? initial;
    const passed = Math.max(0, initial - current);
    return passed;
  }, [gameState.remainingSeconds, params.TimerInitialSeconds]);

  return (
    <div className="wiki-placeholder" style={{ padding: 16, color: '#fff' }}>
      <div>{t('wiki.elapsed')}: {elapsed}s</div>
    </div>
  );
};

export default Wiki;
