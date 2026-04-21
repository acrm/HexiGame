import React, { useMemo, useRef, useState } from 'react';
import { t, type Lang } from '../i18n';
import { getSessionDisplayName, type SessionHistoryRecord } from '../../appLogic/sessionHistory';
import version from '../../../version.json';

interface GuestStartProps {
  sessionHistory: SessionHistoryRecord[];
  currentSessionId: string | null;
  onContinueSession: (sessionId: string) => void;
  onPlayLatestSession: () => void;
  onNewSession: () => void;
  onDownloadSession: (sessionId: string) => void;
  onImportSession: (file: File) => void;
  onRenameSession: (sessionId: string, customName: string) => void;
  onDeleteSessions: (sessionIds: string[]) => void;
  onOpenSettings: () => void;
  onUiClick: () => void;
  language: Lang;
  onLanguageChange: (lang: Lang) => void;
}

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear().toString().slice(2)}.${month}.${day} ${hours}:${minutes}`;
}

function formatTotalTime(milliseconds?: number): string {
  if (!milliseconds || milliseconds <= 0) return '—';
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export const GuestStart: React.FC<GuestStartProps> = ({
  sessionHistory,
  currentSessionId,
  onContinueSession,
  onPlayLatestSession,
  onNewSession,
  onDownloadSession,
  onImportSession,
  onRenameSession,
  onDeleteSessions,
  onOpenSettings,
  onUiClick,
  language,
  onLanguageChange,
}) => {
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [sessionsCollapsed, setSessionsCollapsed] = useState(false);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const marketingVersion = `v${version.marketing.major}.${version.marketing.minor}.${version.marketing.publicBuild}`;

  const sortedSessions = useMemo(
    () => [...sessionHistory].sort((a, b) => (b.lastActionTime ?? b.endTime) - (a.lastActionTime ?? a.endTime)),
    [sessionHistory],
  );

  const toggleSessionExpanded = (sessionId: string) => {
    setExpandedSessionIds((previous) => {
      const next = new Set(previous);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const requestDelete = (sessionId: string) => {
    setPendingDeleteId(sessionId);
  };

  const confirmDelete = (sessionId: string) => {
    onUiClick();
    onDeleteSessions([sessionId]);
    setPendingDeleteId(null);
    setExpandedSessionIds((previous) => {
      const next = new Set(previous);
      next.delete(sessionId);
      return next;
    });
  };

  const cancelDelete = () => {
    setPendingDeleteId(null);
  };

  const startRename = (record: SessionHistoryRecord) => {
    setEditingId(record.id);
    setEditingName(record.customName ?? '');
  };

  const submitRename = () => {
    if (!editingId) return;
    onUiClick();
    onRenameSession(editingId, editingName);
    setEditingId(null);
    setEditingName('');
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className="guest-start-screen">
      <div className="guest-start-content hexipedia-style">
        <div className="gs-fixed-header">
          <div className="gs-tab-bar">
            <div className="gs-tabs-container">
              <div className="gs-system-tab">HexiOS {marketingVersion}</div>
            </div>
            <button
              type="button"
              className="disconnect-button"
              title={t('action.loadSession')}
              onClick={() => {
                onUiClick();
                onPlayLatestSession();
              }}
            >
              <span className="gs-symbol">PLAY</span>
            </button>
            <button
              type="button"
              className="settings-button"
              title={t('settings.open')}
              onClick={() => {
                onUiClick();
                onOpenSettings();
              }}
            >
              <span className="gs-symbol">SET</span>
            </button>
          </div>
        </div>

        <div className="gs-main-panels">
          <div className="gs-language-panel gs-tui-frame">
            <div className="hexipedia-section-filter gs-language-bar">
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
          </div>

          <div className="gs-sessions-panel">
            <div className="hexipedia-section-wrapper gs-sessions-section gs-tui-frame">
              <div className="hexipedia-section-header-container">
                <button
                  type="button"
                  className="hexipedia-section-header gs-section-toggle"
                  onClick={() => setSessionsCollapsed((value) => !value)}
                >
                  <span className="gs-panel-toggle-icon">{sessionsCollapsed ? '⏷' : '⏶'}</span>
                  <span className="gs-panel-title">{t('sessions.title')}</span>
                </button>
              </div>

              {!sessionsCollapsed && (
                <div className="gs-session-body">
                  <div className="gs-session-actions">
                    <button
                      type="button"
                      className="gs-nav-btn"
                      onClick={() => {
                        onUiClick();
                        onNewSession();
                      }}
                    >
                      <span>NEW</span>
                    </button>
                    <button
                      type="button"
                      className="gs-nav-btn gs-nav-btn--secondary"
                      onClick={() => {
                        onUiClick();
                        importFileRef.current?.click();
                      }}
                    >
                      <span>LOAD</span>
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

                  {sortedSessions.length === 0 && (
                    <div className="gs-empty">{t('stats.history.empty')}</div>
                  )}

                  {sortedSessions.length > 0 && (
                    <div className="gs-history-list">
                      {sortedSessions.map((record) => {
                        const displayName = getSessionDisplayName(record);
                        const isEditing = editingId === record.id;
                        const isExpanded = expandedSessionIds.has(record.id);
                        const isDeletePending = pendingDeleteId === record.id;
                        const lastActionLabel = formatDateTime(record.lastActionTime ?? record.endTime);

                        return (
                          <div key={record.id} className={`gs-session-card ${currentSessionId === record.id ? 'gs-session-card--active' : ''}`.trim()}>
                            <div className="gs-session-row">
                              <div className="gs-session-line gs-session-line--top">
                                <button
                                  type="button"
                                  className="gs-expander-btn"
                                  onClick={() => toggleSessionExpanded(record.id)}
                                  aria-label={isExpanded ? t('action.backToStart') : t('action.sessionHistory')}
                                  title={isExpanded ? 'Collapse' : 'Expand'}
                                >
                                  {isExpanded ? '⏶' : '⏷'}
                                </button>
                                <span className="gs-session-name">{displayName}</span>
                              </div>
                              <div className="gs-session-line gs-session-line--bottom">
                                <span className="gs-session-date-inline">{lastActionLabel}</span>
                                <button
                                  type="button"
                                  className="gs-session-start-btn"
                                  onClick={() => {
                                    onUiClick();
                                    onContinueSession(record.id);
                                  }}
                                  title={t('action.loadSession')}
                                >
                                  <span className="gs-symbol">RUN</span>
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="gs-session-expanded">
                                {isEditing ? (
                                  <div className="gs-rename-inline">
                                    <input
                                      className="gs-rename-input"
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') submitRename();
                                        if (e.key === 'Escape') cancelRename();
                                      }}
                                      placeholder={record.name}
                                      autoFocus
                                    />
                                    <button type="button" className="gs-icon-btn" onClick={submitRename} title={t('common.yes')}>
                                      <span className="gs-symbol">SAVE</span>
                                    </button>
                                    <button type="button" className="gs-icon-btn" onClick={cancelRename} title={t('common.no')}>
                                      <span className="gs-symbol">CANC</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="gs-session-card-actions">
                                    <button
                                      type="button"
                                      className="gs-icon-btn"
                                      title={t('action.download')}
                                      onClick={() => onDownloadSession(record.id)}
                                    >
                                      <span className="gs-symbol">SAVE</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="gs-icon-btn"
                                      title={t('action.renameSession')}
                                      onClick={() => startRename(record)}
                                    >
                                      <span className="gs-symbol">REN</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="gs-icon-btn gs-icon-btn--danger"
                                      title={t('common.delete')}
                                      onClick={() => {
                                        if (isDeletePending) {
                                          cancelDelete();
                                          return;
                                        }
                                        requestDelete(record.id);
                                      }}
                                    >
                                      <span className="gs-symbol">{isDeletePending ? 'CANC' : 'DEL'}</span>
                                    </button>
                                    {isDeletePending && (
                                      <button
                                        type="button"
                                        className="gs-icon-btn gs-icon-btn--danger-confirm"
                                        title={t('session.confirmDeleteAction')}
                                        onClick={() => confirmDelete(record.id)}
                                      >
                                        <span className="gs-symbol">CONF</span>
                                      </button>
                                    )}
                                  </div>
                                )}

                                <div className="gs-session-meta-grid">
                                  <span>[ST] {t('session.startTime')}: {formatDateTime(record.startTime)}</span>
                                  <span>[LA] {t('session.lastActionTime')}: {lastActionLabel}</span>
                                  <span>[AC] {t('session.actionCount')}: {record.actionCount ?? '—'}</span>
                                  <span>[TK] {t('session.ticks')}: {record.gameTicks ?? '—'} / {record.gameTime || '—'}</span>
                                  <span>[TT] {t('session.totalTime')}: {formatTotalTime(record.totalSessionTime)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestStart;
