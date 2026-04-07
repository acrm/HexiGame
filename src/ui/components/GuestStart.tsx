import React, { useState } from 'react';
import { t, type Lang } from '../i18n';
import type { SessionHistoryRecord } from '../../appLogic/sessionHistory';

interface GuestStartProps {
  hasResumableSession: boolean;
  onContinue: () => void;
  onStartNew: () => void;
  onOpenSettings: () => void;
  sessionHistory: SessionHistoryRecord[];
  onLoadHistorySession: (sessionId: string) => void;
  language: Lang;
  onLanguageChange: (lang: Lang) => void;
}

function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear().toString().slice(2)}.${month}.${day} ${hours}:${minutes}`;
}

export const GuestStart: React.FC<GuestStartProps> = ({
  hasResumableSession,
  onContinue,
  onStartNew,
  onOpenSettings,
  sessionHistory,
  onLoadHistorySession,
  language,
  onLanguageChange,
}) => {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="guest-start-screen">
      <div className="guest-start-content hexipedia-style">
        {/* Header bar */}
        <div className="gs-header">
          <span className="gs-title">Hexi</span>
          <select
            className="gs-lang-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as Lang)}
          >
            <option value="en">{t('language.en')}</option>
            <option value="ru">{t('language.ru')}</option>
          </select>
        </div>

        {/* Search bar placeholder (style parity with HexiPedia) */}
        <div className="gs-search-bar">
          <i className="fas fa-search gs-search-icon" />
          <span className="gs-search-placeholder">
            {showHistory ? t('action.sessionHistory') : 'Hexi'}
          </span>
        </div>

        {showHistory ? (
          /* ── Session history sub-view ─────────────────────── */
          <div className="gs-section-wrapper">
            <div className="gs-section-header" onClick={() => setShowHistory(false)}>
              <i className="fas fa-chevron-left" style={{ marginRight: 8, fontSize: 12 }} />
              {t('action.backToStart')}
            </div>
            <div className="gs-section-body">
              {sessionHistory.length === 0 ? (
                <div className="gs-empty">{t('stats.history.empty')}</div>
              ) : (
                sessionHistory.map((record) => (
                  <div key={record.id} className="gs-history-row">
                    <div className="gs-history-info">
                      <span className="gs-history-date">{formatDateTime(record.startTime)}</span>
                      <span className="gs-history-time">{record.gameTime}</span>
                    </div>
                    <button
                      type="button"
                      className="gs-action-btn gs-action-btn--primary"
                      onClick={() => onLoadHistorySession(record.id)}
                    >
                      {t('action.loadSession')}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* ── Main menu ────────────────────────────────────── */
          <div className="gs-section-wrapper">
            <div className="gs-section-header">
              <i className="fas fa-play-circle" style={{ marginRight: 8, fontSize: 12 }} />
              Hexi
            </div>
            <div className="gs-section-body">
              {hasResumableSession && (
                <button
                  type="button"
                  className="gs-action-btn gs-action-btn--menu"
                  onClick={onContinue}
                >
                  {t('action.connect')}
                </button>
              )}
              <button
                type="button"
                className="gs-action-btn gs-action-btn--menu"
                onClick={onStartNew}
              >
                {t('action.startNewGame')}
              </button>
              {sessionHistory.length > 0 && (
                <button
                  type="button"
                  className="gs-action-btn gs-action-btn--menu"
                  onClick={() => setShowHistory(true)}
                >
                  {t('action.sessionHistory')}
                </button>
              )}
              <button
                type="button"
                className="gs-action-btn gs-action-btn--menu"
                onClick={onOpenSettings}
              >
                {t('settings.title')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestStart;
