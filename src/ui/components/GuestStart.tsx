import React, { useState } from 'react';
import { t, type Lang } from '../i18n';
import type { SessionHistoryRecord } from '../../appLogic/sessionHistory';
import version from '../../../version.json';

interface GuestStartProps {
  hasResumableSession: boolean;
  onContinue: () => void;
  onStartNew: () => void;
  onOpenSettings: () => void;
  onUiClick: () => void;
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
  onUiClick,
  onOpenSettings,
  sessionHistory,
  onLoadHistorySession,
  language,
  onLanguageChange,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const marketingVersion = `v${version.marketing.major}.${version.marketing.minor}.${version.marketing.publicBuild}`;

  return (
    <div className="guest-start-screen">
      <div className="guest-start-content hexipedia-style">
        {/* Tab bar — same visual structure as in-game mobile-tab-bar */}
        <div className="gs-tab-bar">
          <div className="gs-tabs-container">
            <div className="gs-system-tab">HexiOS {marketingVersion}</div>
          </div>
          <button
            type="button"
            className="settings-button"
            title={t('settings.open')}
            onClick={() => {
              onUiClick();
              onOpenSettings();
            }}
          >
            <i className="fas fa-cog" />
          </button>
        </div>

        {/* Language bar — same style as hexipedia-section-filter */}
        <div className="hexipedia-section-filter gs-language-bar">
          <i className="fas fa-globe hexipedia-section-filter-icon" />
          <label className="gs-language-label" htmlFor="guest-start-language">
            {t('settings.language')}
          </label>
          <select
            id="guest-start-language"
            className="gs-lang-select"
            value={language}
            onChange={(e) => {
              onUiClick();
              onLanguageChange(e.target.value as Lang);
            }}
          >
            <option value="en">{t('language.en')}</option>
            <option value="ru">{t('language.ru')}</option>
          </select>
        </div>

        {/* Sessions section — same structure as hexipedia-section-wrapper */}
        <div className="hexipedia-section-wrapper gs-sessions-section">
          <div className="hexipedia-section-header-container">
            <div className="hexipedia-section-header" style={{ cursor: 'default' }}>
              <span className="hexipedia-section-toggle">▼</span>
              {t('sessions.title')}
            </div>
          </div>
          <div className="gs-session-body">
            {hasResumableSession && (
              <button
                type="button"
                className="gs-nav-btn"
                onClick={() => {
                  onUiClick();
                  onContinue();
                }}
              >
                <span>{t('action.connect')}</span>
                <i className="fas fa-chevron-right gs-nav-btn-chevron" />
              </button>
            )}
            <button
              type="button"
              className="gs-nav-btn"
              onClick={() => {
                onUiClick();
                onStartNew();
              }}
            >
              <span>{t('action.startNewGame')}</span>
              <i className="fas fa-chevron-right gs-nav-btn-chevron" />
            </button>

            {sessionHistory.length > 0 && (
              <button
                type="button"
                className="gs-nav-btn gs-nav-btn--secondary"
                onClick={() => {
                  onUiClick();
                  setShowHistory(h => !h);
                }}
              >
                <span>
                  {t('action.sessionHistory')}
                  <span className="gs-history-count"> ({sessionHistory.length})</span>
                </span>
                <i className={`fas ${showHistory ? 'fa-chevron-up' : 'fa-chevron-down'} gs-nav-btn-chevron`} />
              </button>
            )}

            {showHistory && (
              <div className="gs-history-list">
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
                        className="hexipedia-task-action"
                        onClick={() => {
                          onUiClick();
                          onLoadHistorySession(record.id);
                        }}
                      >
                        {t('action.loadSession')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestStart;
