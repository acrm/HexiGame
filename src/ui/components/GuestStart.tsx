import React, { useMemo, useRef, useState } from 'react';
import { t, type Lang } from '../i18n';
import { getSessionDisplayName, type SessionHistoryRecord } from '../../appLogic/sessionHistory';
import version from '../../../version.json';

interface GuestStartProps {
  sessionHistory: SessionHistoryRecord[];
  currentSessionId: string | null;
  onContinueSession: (sessionId: string) => void;
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
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeletePending, setConfirmDeletePending] = useState(false);

  const marketingVersion = `v${version.marketing.major}.${version.marketing.minor}.${version.marketing.publicBuild}`;

  const sortedSessions = useMemo(
    () => [...sessionHistory].sort((a, b) => (b.lastActionTime ?? b.endTime) - (a.lastActionTime ?? a.endTime)),
    [sessionHistory],
  );

  const allSelected = sortedSessions.length > 0 && sortedSessions.every((session) => selectedIds.has(session.id));

  const toggleSelection = (sessionId: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleToggleDeleteMode = () => {
    setDeleteMode((previous) => {
      const next = !previous;
      if (!next) {
        setSelectedIds(new Set());
        setConfirmDeletePending(false);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(sortedSessions.map((session) => session.id)));
  };

  const handleRequestDelete = () => {
    if (selectedIds.size === 0) return;
    setConfirmDeletePending(true);
  };

  const handleConfirmDelete = () => {
    onUiClick();
    onDeleteSessions(Array.from(selectedIds));
    setSelectedIds(new Set());
    setDeleteMode(false);
    setConfirmDeletePending(false);
  };

  const handleCancelDelete = () => {
    setConfirmDeletePending(false);
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
        </div>

        <div className="gs-main-panels">
          <div className="gs-language-panel">
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
          </div>

          <div className="gs-sessions-panel">
            <div className="hexipedia-section-wrapper gs-sessions-section">
              <div className="hexipedia-section-header-container">
                <button
                  type="button"
                  className="hexipedia-section-header gs-section-toggle"
                  onClick={() => setSessionsCollapsed((value) => !value)}
                >
                  <span className="hexipedia-section-toggle">{sessionsCollapsed ? '▶' : '▼'}</span>
                  <span>{t('sessions.title')}</span>
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
                      <i className="fas fa-plus" style={{ marginRight: 6 }} />
                      <span>{t('action.newSession')}</span>
                    </button>
                    <button
                      type="button"
                      className="gs-nav-btn gs-nav-btn--secondary"
                      onClick={() => {
                        onUiClick();
                        importFileRef.current?.click();
                      }}
                    >
                      <i className="fas fa-upload" style={{ marginRight: 6 }} />
                      <span>{t('action.importSession')}</span>
                    </button>
                    <button
                      type="button"
                      className={`gs-nav-btn gs-nav-btn--secondary ${deleteMode ? 'gs-delete-mode-on' : ''}`.trim()}
                      onClick={handleToggleDeleteMode}
                    >
                      <i className="fas fa-trash" style={{ marginRight: 6 }} />
                      <span>{t('common.delete')}</span>
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

                  {deleteMode && (
                    <div className="gs-delete-toolbar">
                      <label className="gs-select-all">
                        <input type="checkbox" checked={allSelected} onChange={handleSelectAll} />
                        <span>{t('session.selectAll')}</span>
                      </label>
                      {confirmDeletePending ? (
                        <div className="gs-delete-confirm">
                          <button
                            type="button"
                            className="gs-nav-btn gs-nav-btn--danger"
                            onClick={handleConfirmDelete}
                          >
                            {t('common.yes')}
                          </button>
                          <button
                            type="button"
                            className="gs-nav-btn gs-nav-btn--secondary"
                            onClick={handleCancelDelete}
                          >
                            {t('common.no')}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="gs-nav-btn gs-nav-btn--danger"
                          disabled={selectedIds.size === 0}
                          onClick={handleRequestDelete}
                        >
                          {t('session.deleteSelected')} ({selectedIds.size})
                        </button>
                      )}
                    </div>
                  )}

                  {sortedSessions.length === 0 && (
                    <div className="gs-empty">{t('stats.history.empty')}</div>
                  )}

                  {sortedSessions.length > 0 && (
                    <div className="gs-history-list">
                      {sortedSessions.map((record) => {
                        const displayName = getSessionDisplayName(record);
                        const isEditing = editingId === record.id;
                        const isSelected = selectedIds.has(record.id);

                        return (
                          <div key={record.id} className={`gs-session-card ${currentSessionId === record.id ? 'gs-session-card--active' : ''}`.trim()}>
                            <div className="gs-session-card-header">
                              <div className="gs-session-title-wrap">
                                {deleteMode && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelection(record.id)}
                                    aria-label={t('session.select')}
                                  />
                                )}
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
                                      <i className="fas fa-check" />
                                    </button>
                                    <button type="button" className="gs-icon-btn" onClick={cancelRename} title={t('common.no')}>
                                      <i className="fas fa-times" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="gs-session-name">{displayName}</span>
                                )}
                              </div>
                              {!isEditing && (
                                <div className="gs-session-card-actions">
                                  <button
                                    type="button"
                                    className="gs-icon-btn"
                                    title={t('action.renameSession')}
                                    onClick={() => startRename(record)}
                                  >
                                    <i className="fas fa-pen" />
                                  </button>
                                  <button
                                    type="button"
                                    className="gs-icon-btn"
                                    title={t('action.download')}
                                    onClick={() => onDownloadSession(record.id)}
                                  >
                                    <i className="fas fa-download" />
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="gs-session-meta-grid">
                              <span><i className="fas fa-clock" /> {t('session.startTime')}: {formatDateTime(record.startTime)}</span>
                              <span><i className="fas fa-history" /> {t('session.lastActionTime')}: {formatDateTime(record.lastActionTime ?? record.endTime)}</span>
                              <span><i className="fas fa-hand-pointer" /> {t('session.actionCount')}: {record.actionCount ?? '—'}</span>
                              <span><i className="fas fa-wave-square" /> {t('session.ticks')}: {record.gameTicks ?? '—'} / {record.gameTime || '—'}</span>
                              <span><i className="fas fa-stopwatch" /> {t('session.totalTime')}: {formatTotalTime(record.totalSessionTime)}</span>
                            </div>

                            <button
                              type="button"
                              className="gs-nav-btn gs-nav-btn--primary"
                              onClick={() => {
                                onUiClick();
                                onContinueSession(record.id);
                              }}
                            >
                              <span>{t('action.loadSession')}</span>
                              <i className="fas fa-chevron-right gs-nav-btn-chevron" />
                            </button>
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
