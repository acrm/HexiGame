import React, { useState } from 'react';
import { t } from '../i18n';
import { TuiIconButton, TuiButton } from '../tui';
import OverlayWidgetFrame from './OverlayWidgetFrame';
import './OverlayWidget.css';
import './SessionPlaybackWidget.css';

interface SessionPlaybackWidgetProps {
  isPlaybackPaused: boolean;
  currentTick: number;
  onSetPlaybackPaused?: (paused: boolean) => void;
  onSeekToTick?: (tick: number) => void;
  onNavigateToSession?: () => void;
  suppressTopBorder?: boolean;
  suppressBottomBorder?: boolean;
}

export const SessionPlaybackWidget: React.FC<SessionPlaybackWidgetProps> = ({
  isPlaybackPaused,
  currentTick,
  onSetPlaybackPaused,
  onSeekToTick,
  onNavigateToSession,
  suppressTopBorder,
  suppressBottomBorder,
}) => {
  const [seekTickInput, setSeekTickInput] = useState('');

  return (
    <OverlayWidgetFrame
      className="session-playback-widget-shell"
      suppressTopBorder={suppressTopBorder}
      suppressBottomBorder={suppressBottomBorder}
    >
      <div className="overlay-widget-shell">
        <div className="overlay-widget-body session-playback-widget">
          <TuiButton
            variant="secondary"
            type="button"
            className="session-playback-widget__button"
            onClick={() => onSetPlaybackPaused?.(!isPlaybackPaused)}
            disabled={!onSetPlaybackPaused}
            title={isPlaybackPaused ? t('playback.resume') : t('playback.pause')}
          >
            {isPlaybackPaused ? 'play' : 'PLAY'}
          </TuiButton>

          <input
            type="number"
            className="session-playback-widget__input"
            placeholder={t('playback.seekToTick')}
            value={seekTickInput}
            min={0}
            onChange={(e) => setSeekTickInput(e.target.value)}
          />

          <TuiButton
            variant="secondary"
            type="button"
            className="session-playback-widget__button"
            onClick={() => {
              const tick = parseInt(seekTickInput, 10);
              if (!Number.isNaN(tick)) {
                onSeekToTick?.(tick);
                setSeekTickInput('');
              }
            }}
            disabled={!onSeekToTick}
            title={t('playback.play')}
          >
            GO
          </TuiButton>

          <TuiButton
            variant="secondary"
            type="button"
            className="session-playback-widget__button"
            disabled={!onSeekToTick || !isPlaybackPaused}
            onClick={() => onSeekToTick?.(currentTick + 1)}
            title={t('playback.step')}
          >
            STEP
          </TuiButton>
        </div>

        {onNavigateToSession && (
          <TuiIconButton
            type="button"
            className="overlay-widget-edge-button tui-icon-btn--no-brackets"
            onClick={onNavigateToSession}
            title={t('hexipedia.widget.openSession')}
            aria-label={t('hexipedia.widget.openSession')}
          >
            {'►'}
          </TuiIconButton>
        )}
      </div>
    </OverlayWidgetFrame>
  );
};

export default SessionPlaybackWidget;
