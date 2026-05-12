import React from 'react';
import type { Axial } from '../../../gameLogic/core/types';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import { t } from '../../i18n';

export type HexiStatusMode = 'guest' | 'session';

interface HexiStatusLineProps {
  mode: HexiStatusMode;
  mobileTab?: MobileTab;
  tick?: number;
  sessionStartTick?: number;
  cursor?: Axial;
  notice?: string | null;
  className?: string;
}

function formatElapsedTicks(ticks: number): string {
  const totalSeconds = Math.max(0, Math.floor(ticks / 12));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getTabLabel(tab: MobileTab | undefined): string {
  if (tab === 'hexipedia') return 'HEXI';
  if (tab === 'lab') return 'LAB';
  return 'MAP';
}

export const HexiStatusLine: React.FC<HexiStatusLineProps> = ({
  mode,
  mobileTab,
  tick = 0,
  sessionStartTick = 0,
  cursor,
  notice,
  className,
}) => {
  const tickValue = Math.max(0, Math.floor(tick));
  const elapsedTicks = Math.max(0, tickValue - Math.max(0, Math.floor(sessionStartTick)));
  const noticeText = notice ?? t('status.noticeReady');

  const leftText = mode === 'session'
    ? `${t('status.modeSession')} ${getTabLabel(mobileTab)}`
    : t('status.modeGuest');

  const centerText = mode === 'session'
    ? `t${tickValue} ${formatElapsedTicks(elapsedTicks)} ${t('status.cursor')} ${cursor?.q ?? 0}:${cursor?.r ?? 0}`
    : noticeText;

  const hotkeysText = mode === 'session'
    ? t('status.hotkeysSession')
    : t('status.hotkeysGuest');

  return (
    <div className={['game-status-line', className].filter(Boolean).join(' ')} role="status" aria-live="polite">
      <span className="game-status-line-segment game-status-line-segment--left">{leftText}</span>
      <span className="game-status-line-divider" aria-hidden="true">|</span>
      <span className="game-status-line-segment game-status-line-segment--center">{centerText}</span>
      <span className="game-status-line-divider" aria-hidden="true">|</span>
      <span className="game-status-line-segment game-status-line-segment--notice">{noticeText}</span>
      <span className="game-status-line-divider" aria-hidden="true">|</span>
      <span className="game-status-line-segment game-status-line-segment--hotkeys">{hotkeysText}</span>
    </div>
  );
};

export default HexiStatusLine;
