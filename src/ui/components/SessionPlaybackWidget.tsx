import React, { useState } from 'react';
import { t } from '../i18n';
import './OverlayWidget.css';
import './SessionPlaybackWidget.css';

interface SessionPlaybackWidgetProps {
  isPlaybackPaused: boolean;
  currentTick: number;
  onSetPlaybackPaused?: (paused: boolean) => void;
  onSeekToTick?: (tick: number) => void;
  onNavigateToSession?: () => void;
}

export const SessionPlaybackWidget: React.FC<SessionPlaybackWidgetProps> = ({
  isPlaybackPaused,
  currentTick,
  onSetPlaybackPaused,
  onSeekToTick,
  onNavigateToSession,
}) => {
  const [seekTickInput, setSeekTickInput] = useState('');

  return (
    <div className="overlay-widget-shell session-playback-widget-shell">
      <div className="overlay-widget-body session-playback-widget">
        <button
          type="button"
          className="session-playback-widget__button"
          onClick={() => onSetPlaybackPaused?.(!isPlaybackPaused)}
          disabled={!onSetPlaybackPaused}
          title={isPlaybackPaused ? t('playback.resume') : t('playback.pause')}
        >
          <i className={`fas ${isPlaybackPaused ? 'fa-play' : 'fa-pause'}`} />
        </button>

        <input
          type="number"
          className="session-playback-widget__input"
          placeholder={t('playback.seekToTick')}
          value={seekTickInput}
          min={0}
          onChange={(e) => setSeekTickInput(e.target.value)}
        />

        <button
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
          <i className="fas fa-forward" />
        </button>

        <button
          type="button"
          className="session-playback-widget__button"
          disabled={!onSeekToTick || !isPlaybackPaused}
          onClick={() => onSeekToTick?.(currentTick + 1)}
          title={t('playback.step')}
        >
          <i className="fas fa-step-forward" />
        </button>
      </div>

      {onNavigateToSession && (
        <button
          type="button"
          className="overlay-widget-edge-button"
          onClick={onNavigateToSession}
          title={t('hexipedia.widget.openSession')}
          aria-label={t('hexipedia.widget.openSession')}
        >
          »
        </button>
      )}
    </div>
  );
};

export default SessionPlaybackWidget;
