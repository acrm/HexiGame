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
        <div className="gs-header">
          <div className="gs-title-tab">HexiOS {marketingVersion}</div>
          <button
            type="button"
            className="gs-settings-button"
            title={t('settings.open')}
            onClick={() => {
              onUiClick();
              onOpenSettings();
            }}
          >
            <i className="fas fa-cog" />
          </button>
        </div>

        <div className="gs-language-row">
          <label className="gs-language-label" htmlFor="guest-start-language">{t('settings.language')}</label>
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

        {showHistory ? (
          <div className="gs-section-wrapper">
            <div className="gs-section-header" onClick={() => { onUiClick(); setShowHistory(false); }}>
              <i className="fas fa-chevron-left" style={{ marginRight: 8, fontSize: 12 }} />
              Сессии
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
          </div>
        ) : (
          <div className="gs-section-wrapper">
            <div className="gs-section-header">Сессии</div>
            <div className="gs-section-body">
              {hasResumableSession && (
                <button
                  type="button"
                  className="gs-action-btn gs-action-btn--menu"
                  onClick={() => {
                    onUiClick();
                    onContinue();
                  }}
                >
                  {t('action.connect')}
                </button>
              )}
              <button
                type="button"
                className="gs-action-btn gs-action-btn--menu"
                onClick={() => {
                  onUiClick();
                  onStartNew();
                }}
              >
                {t('action.startNewGame')}
              </button>
              {sessionHistory.length > 0 && (
                <button
                  type="button"
                  className="gs-action-btn gs-action-btn--menu"
                  onClick={() => {
                    onUiClick();
                    setShowHistory(true);
                  }}
                >
                  {t('action.sessionHistory')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestStart;
