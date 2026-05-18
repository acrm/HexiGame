import React, { useMemo, useRef, useState } from 'react';
import { t } from '../i18n';
import { getSessionDisplayName, type SessionHistoryRecord } from '../../appLogic/sessionHistory';
import {
  TuiBorderRow,
  TuiButton,
  TuiIconButton,
  TuiSessionCardFrame,
  TuiSessionMetaRow,
} from '../tui';
import WindowFrame from './WindowFrame';
import HexiStatusLine from './Game/HexiStatusLine';
import '../tui/styles/tui.css';

interface GuestStartProps {
  sessionHistory: SessionHistoryRecord[];
  currentSessionId: string | null;
  onContinueSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDownloadSession: (sessionId: string) => void;
  onImportSession: (file: File) => void;
  onRenameSession: (sessionId: string, customName: string) => void;
  onDeleteSessions: (sessionIds: string[]) => void;
  onUiClick: () => void;
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
  onUiClick,
}) => {
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [sessionsCollapsed, setSessionsCollapsed] = useState(false);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
        <div className="gs-main-panels">
          <div className="gs-sessions-panel">
            <div className="gs-sessions-section">
              <WindowFrame
                className="gs-window"
                title={t('sessions.title')}
                isCollapsed={sessionsCollapsed}
                onToggleCollapsed={() => setSessionsCollapsed((value) => !value)}
                collapseBehavior="icon-only"
                actions={(
                  <div className="gs-window-actions">
                    <TuiButton
                      className="gs-nav-btn"
                      onClick={() => {
                        onUiClick();
                        onNewSession();
                      }}
                    >
                      NEW
                    </TuiButton>
                    <TuiButton
                      variant="secondary"
                      className="gs-nav-btn gs-nav-btn--secondary"
                      onClick={() => {
                        onUiClick();
                        importFileRef.current?.click();
                      }}
                    >
                      LOAD
                    </TuiButton>
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
                )}
                titleRowClassName="gs-window-title-row"
                separatorRowClassName="gs-window-separator-row"
                contentRowClassName="gs-window-content-row"
              >
                <div className="gs-session-body">
                  {sessionsCollapsed && sortedSessions.length > 0 && (
                    <TuiBorderRow
                      className="gs-tui-border-row"
                      leftClassName="gs-tui-border-left"
                      fillClassName="gs-tui-border-fill"
                      rightClassName="gs-tui-border-right"
                      left="║ "
                      right="║"
                    >
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        {sortedSessions.length} total, last: {formatDateTime(sortedSessions[0].lastActionTime ?? sortedSessions[0].endTime)}
                      </span>
                    </TuiBorderRow>
                  )}

                  {!sessionsCollapsed && (
                    <>
                  {sortedSessions.length === 0 && (
                    <div className="gs-empty">{t('stats.history.empty')}</div>
                  )}

                  {sortedSessions.length > 0 && (
                    <div className="gs-history-list">
                      {sortedSessions.map((record, index) => {
                        const displayName = getSessionDisplayName(record);
                        const isEditing = editingId === record.id;
                        const isExpanded = expandedSessionIds.has(record.id);
                        const isDeletePending = pendingDeleteId === record.id;
                        const lastActionLabel = formatDateTime(record.lastActionTime ?? record.endTime);

                        return (
                          <React.Fragment key={record.id}>
                            {index > 0 && (
                              <TuiBorderRow
                                className="gs-tui-border-row gs-session-separator"
                                leftClassName="gs-tui-border-left"
                                fillClassName="gs-tui-border-fill"
                                rightClassName="gs-tui-border-right"
                                left="╟───"
                                right="───╢"
                              >
                                ────────────────────────────────────────────────────────────────────────────────────────────────────
                              </TuiBorderRow>
                            )}
                            <TuiSessionCardFrame
                              className={`gs-session-card ${currentSessionId === record.id ? 'gs-session-card--active' : ''}`.trim()}
                              active={currentSessionId === record.id}
                            >
                              <div className="gs-session-row">
                                <TuiBorderRow
                                  className="gs-tui-border-row gs-session-line gs-session-line--top"
                                  leftClassName="gs-tui-border-left"
                                  fillClassName="gs-tui-border-fill"
                                  rightClassName="gs-tui-border-right"
                                  left="║ "
                                  right="║"
                                >
                                  <div className="gs-session-title-row">
                                    <span className="gs-session-name">{displayName}</span>
                                    <button
                                      type="button"
                                      className="gs-expander-btn"
                                      onClick={() => toggleSessionExpanded(record.id)}
                                      aria-label={isExpanded ? t('action.backToStart') : t('action.sessionHistory')}
                                      title={isExpanded ? 'Collapse' : 'Expand'}
                                    >
                                      {isExpanded ? 'v' : '>'}
                                    </button>
                                  </div>
                                </TuiBorderRow>
                                <TuiBorderRow
                                  className="gs-tui-border-row gs-session-line gs-session-line--bottom"
                                  leftClassName="gs-tui-border-left"
                                  fillClassName="gs-tui-border-fill"
                                  rightClassName="gs-tui-border-right"
                                  left="║ "
                                  right="║"
                                >
                                  <div style={{ display: 'flex', flex: '1', paddingLeft: '1ch', justifyContent: 'space-between' }}>
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
                                      <span className="gs-symbol">Enter</span>
                                    </button>
                                  </div>
                                </TuiBorderRow>
                              </div>

                              {isExpanded && (
                                <div className="gs-session-expanded">
                                {isEditing ? (
                                  <TuiBorderRow
                                    className="gs-tui-border-row gs-session-expanded-row"
                                    leftClassName="gs-tui-border-left"
                                    fillClassName="gs-tui-border-fill gs-session-expanded-fill"
                                    rightClassName="gs-tui-border-right"
                                    left="║ "
                                    right="║"
                                  >
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
                                      <TuiIconButton className="gs-icon-btn" onClick={submitRename} title={t('common.yes')}>
                                        <span className="gs-symbol">SAVE</span>
                                      </TuiIconButton>
                                      <TuiIconButton className="gs-icon-btn" onClick={cancelRename} title={t('common.no')}>
                                        <span className="gs-symbol">CANC</span>
                                      </TuiIconButton>
                                    </div>
                                  </TuiBorderRow>
                                ) : (
                                  <TuiBorderRow
                                    className="gs-tui-border-row gs-session-expanded-row"
                                    leftClassName="gs-tui-border-left"
                                    fillClassName="gs-tui-border-fill gs-session-expanded-fill"
                                    rightClassName="gs-tui-border-right"
                                    left="║ "
                                    right="║"
                                  >
                                    <div className="gs-session-card-actions">
                                      <TuiIconButton
                                        className="gs-icon-btn"
                                        title={t('action.download')}
                                        onClick={() => onDownloadSession(record.id)}
                                      >
                                        <span className="gs-symbol">SAVE</span>
                                      </TuiIconButton>
                                      <TuiIconButton
                                        className="gs-icon-btn"
                                        title={t('action.renameSession')}
                                        onClick={() => startRename(record)}
                                      >
                                        <span className="gs-symbol">REN</span>
                                      </TuiIconButton>
                                      <TuiIconButton
                                        variant="danger"
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
                                      </TuiIconButton>
                                      {isDeletePending && (
                                        <TuiIconButton
                                          variant="confirm"
                                          className="gs-icon-btn gs-icon-btn--danger-confirm"
                                          title={t('session.confirmDeleteAction')}
                                          onClick={() => confirmDelete(record.id)}
                                        >
                                          <span className="gs-symbol">CONF</span>
                                        </TuiIconButton>
                                      )}
                                    </div>
                                  </TuiBorderRow>
                                )}

                                  <TuiSessionMetaRow className="gs-session-meta-grid">
                                    <TuiBorderRow
                                      className="gs-tui-border-row gs-session-meta-line"
                                      leftClassName="gs-tui-border-left"
                                      fillClassName="gs-tui-border-fill gs-session-expanded-fill"
                                      rightClassName="gs-tui-border-right"
                                      left="║ "
                                      right="║"
                                    >
                                      <span className="gs-session-meta-text">[ST] {t('session.startTime')}: {formatDateTime(record.startTime)}</span>
                                    </TuiBorderRow>
                                    <TuiBorderRow
                                      className="gs-tui-border-row gs-session-meta-line"
                                      leftClassName="gs-tui-border-left"
                                      fillClassName="gs-tui-border-fill gs-session-expanded-fill"
                                      rightClassName="gs-tui-border-right"
                                      left="║ "
                                      right="║"
                                    >
                                      <span className="gs-session-meta-text">[LA] {t('session.lastActionTime')}: {lastActionLabel}</span>
                                    </TuiBorderRow>
                                    <TuiBorderRow
                                      className="gs-tui-border-row gs-session-meta-line"
                                      leftClassName="gs-tui-border-left"
                                      fillClassName="gs-tui-border-fill gs-session-expanded-fill"
                                      rightClassName="gs-tui-border-right"
                                      left="║ "
                                      right="║"
                                    >
                                      <span className="gs-session-meta-text">[AC] {t('session.actionCount')}: {record.actionCount ?? '—'}</span>
                                    </TuiBorderRow>
                                    <TuiBorderRow
                                      className="gs-tui-border-row gs-session-meta-line"
                                      leftClassName="gs-tui-border-left"
                                      fillClassName="gs-tui-border-fill gs-session-expanded-fill"
                                      rightClassName="gs-tui-border-right"
                                      left="║ "
                                      right="║"
                                    >
                                      <span className="gs-session-meta-text">[TK] {t('session.ticks')}: {record.gameTicks ?? '—'} / {record.gameTime || '—'}</span>
                                    </TuiBorderRow>
                                    <TuiBorderRow
                                      className="gs-tui-border-row gs-session-meta-line"
                                      leftClassName="gs-tui-border-left"
                                      fillClassName="gs-tui-border-fill gs-session-expanded-fill"
                                      rightClassName="gs-tui-border-right"
                                      left="║ "
                                      right="║"
                                    >
                                      <span className="gs-session-meta-text">[TT] {t('session.totalTime')}: {formatTotalTime(record.totalSessionTime)}</span>
                                    </TuiBorderRow>
                                  </TuiSessionMetaRow>
                                </div>
                              )}
                            </TuiSessionCardFrame>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                    </>
                  )}
                </div>
              </WindowFrame>
            </div>
          </div>
        </div>

        <HexiStatusLine
          mode="guest"
          notice={sortedSessions.length > 0
            ? `${t('sessions.title')}: ${sortedSessions.length}`
            : t('stats.history.empty')}
          className="game-status-line--guest"
        />
      </div>
    </div>
  );
};

export default GuestStart;
