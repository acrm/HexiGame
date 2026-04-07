import React, { useRef, useState } from 'react';
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
  currentSessionId: string | null;
  onNewSession: () => void;
  onDownloadSession: (sessionId: string) => void;
  onImportSession: (file: File) => void;
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
  currentSessionId,
  onNewSession,
  onDownloadSession,
  onImportSession,
  language,
  onLanguageChange,
}) => {
  const importFileRef = useRef<HTMLInputElement | null>(null);
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

        {/* Sessions section */}
        <div className="hexipedia-section-wrapper gs-sessions-section">
          <div className="hexipedia-section-header-container">
            <div className="hexipedia-section-header" style={{ cursor: 'default' }}>
              <span className="hexipedia-section-toggle">▼</span>
              {t('sessions.title')}
            </div>
          </div>
          <div className="gs-session-body">
            {/* Top action buttons: New and Load from file */}
            <div className="gs-session-actions">
              <button
                type="button"
                className="gs-nav-btn"
                onClick={() => { onUiClick(); onNewSession(); }}
              >
                <i className="fas fa-plus" style={{ marginRight: 6 }} />
                <span>{t('action.newSession')}</span>
              </button>
              <button
                type="button"
                className="gs-nav-btn gs-nav-btn--secondary"
                onClick={() => { onUiClick(); importFileRef.current?.click(); }}
              >
                <i className="fas fa-upload" style={{ marginRight: 6 }} />
                <span>{t('action.importSession')}</span>
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportSession(file);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Current session */}
            {currentSessionId && hasResumableSession && (() => {
              const rec = sessionHistory.find((r) => r.id === currentSessionId);
              return (
                <div className="gs-session-card gs-session-card--current">
                  <div className="gs-session-card-header">
                    <span className="gs-session-label">{t('session.currentSession')}</span>
                    <button
                      type="button"
                      className="gs-icon-btn"
                      title={t('action.download')}
                      onClick={() => onDownloadSession(currentSessionId)}
                    >
                      <i className="fas fa-download" />
                    </button>
                  </div>
                  {rec && (
                    <div className="gs-session-meta">
                      <span><i className="fas fa-clock" /> {formatDateTime(rec.startTime)}</span>
                      {rec.actionCount != null && <span><i className="fas fa-hand-pointer" /> {rec.actionCount} {t('session.actionCount')}</span>}
                      <span><i className="fas fa-stopwatch" /> {rec.gameTime}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className="gs-nav-btn gs-nav-btn--primary"
                    onClick={() => { onUiClick(); onContinue(); }}
                  >
                    <span>{t('action.loadSession')}</span>
                    <i className="fas fa-chevron-right gs-nav-btn-chevron" />
                  </button>
                </div>
              );
            })()}

            {/* Other sessions */}
            {sessionHistory.filter((r) => r.id !== currentSessionId).length > 0 && (
              <div className="gs-history-list">
                {sessionHistory
                  .filter((r) => r.id !== currentSessionId)
                  .sort((a, b) => (b.lastActionTime ?? b.endTime) - (a.lastActionTime ?? a.endTime))
                  .map((record) => (
                    <div key={record.id} className="gs-session-card">
                      <div className="gs-session-card-header">
                        <span className="gs-session-date">{formatDateTime(record.startTime)}</span>
                        <button
                          type="button"
                          className="gs-icon-btn"
                          title={t('action.download')}
                          onClick={() => onDownloadSession(record.id)}
                        >
                          <i className="fas fa-download" />
                        </button>
                      </div>
                      <div className="gs-session-meta">
                        {record.actionCount != null && <span><i className="fas fa-hand-pointer" /> {record.actionCount} {t('session.actionCount')}</span>}
                        <span><i className="fas fa-stopwatch" /> {record.gameTime}</span>
                        {record.lastActionTime && <span><i className="fas fa-history" /> {formatDateTime(record.lastActionTime)}</span>}
                      </div>
                      <button
                        type="button"
                        className="gs-nav-btn gs-nav-btn--secondary"
                        onClick={() => { onUiClick(); onLoadHistorySession(record.id); }}
                      >
                        <span>{t('action.switchSession')}</span>
                        <i className="fas fa-chevron-right gs-nav-btn-chevron" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestStart;
