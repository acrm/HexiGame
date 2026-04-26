import React, { useState } from 'react';
import { t } from '../../i18n';
import SectionBase from './SectionBase';
import type { SessionHistoryRecord } from './types';

interface StatsSectionProps {
  gameState: any;
  sessionHistory: SessionHistoryRecord[];
  trackSessionHistory: boolean;
  currentSessionStartTick: number;
  onToggleTrackHistory?: (enabled: boolean) => void;
  onDeleteSessionRecord?: (recordId: string) => void;
  onClearSessionHistory?: () => void;
  sectionOrder: string[];
  isCollapsed: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggleCollapse: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const StatsSection: React.FC<StatsSectionProps> = ({
  gameState,
  sessionHistory,
  trackSessionHistory,
  currentSessionStartTick,
  onToggleTrackHistory,
  onDeleteSessionRecord,
  onClearSessionHistory,
  sectionOrder,
  isCollapsed,
  canMoveUp,
  canMoveDown,
  onToggleCollapse,
  onMoveUp,
  onMoveDown,
}) => {
  const [deleteConfirmRecordId, setDeleteConfirmRecordId] = useState<string | null>(null);
  const [deleteConfirmAll, setDeleteConfirmAll] = useState(false);

  const formatSessionTime = (ticks: number): string => {
    const seconds = Math.floor(ticks / 12);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  const sessionDuration = gameState.tick - currentSessionStartTick;

  return (
    <SectionBase
      sectionId="stats"
      title={t('stats.title')}
      isCollapsed={isCollapsed}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      onToggleCollapse={onToggleCollapse}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
    >
      <div className="hexipedia-stats-section">
        <div className="hexipedia-stats-content">
          <div className="hexipedia-stat-row">
            <span className="hexipedia-stat-label">{t('stats.sessionTime')}</span>
            <span className="hexipedia-stat-value">{formatSessionTime(sessionDuration)}</span>
          </div>
          <div className="hexipedia-stat-row">
            <span className="hexipedia-stat-label">{t('stats.sessionTicks')}</span>
            <span className="hexipedia-stat-value">{sessionDuration}</span>
          </div>
          
          {/* Session History Subsection */}
          <div className="hexipedia-history-subsection">
            <div className="hexipedia-history-header">
              <div className="hexipedia-history-title">История сессий</div>
              <label className="hexipedia-history-toggle">
                <input 
                  type="checkbox" 
                  checked={trackSessionHistory}
                  onChange={(e) => onToggleTrackHistory?.(e.target.checked)}
                />
                <span>Вести историю</span>
              </label>
            </div>
            
            {sessionHistory.length > 0 && (
              <div className="hexipedia-history-controls">
                <button
                  className="hexipedia-history-clear-btn"
                  onClick={() => setDeleteConfirmAll(true)}
                >
                  Удалить всё
                </button>
                {deleteConfirmAll && (
                  <div className="hexipedia-delete-confirm">
                    <span>Удалить все записи?</span>
                    <button
                      className="hexipedia-confirm-yes"
                      onClick={() => {
                        onClearSessionHistory?.();
                        setDeleteConfirmAll(false);
                      }}
                    >
                      Да
                    </button>
                    <button
                      className="hexipedia-confirm-no"
                      onClick={() => setDeleteConfirmAll(false)}
                    >
                      Нет
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {sessionHistory.length > 0 ? (
              <div className="hexipedia-history-list">
                {sessionHistory.slice(0, 20).map((record) => {
                  const startDate = new Date(record.startTime);
                  const endDate = new Date(record.endTime);
                  const dateStr = startDate.toLocaleDateString('ru-RU', { 
                    month: '2-digit', 
                    day: '2-digit' 
                  });
                  const startTimeStr = startDate.toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                  const endTimeStr = endDate.toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                  
                  const showConfirm = deleteConfirmRecordId === record.id;
                  
                  return (
                    <div key={record.id} className="hexipedia-history-item">
                      <span className="hexipedia-history-info">
                        {dateStr} {startTimeStr}—{endTimeStr}
                        {' '}
                        <span className="hexipedia-history-duration">{record.gameTime}</span>
                        {' '}
                        <span className="hexipedia-history-ticks">({record.gameTicks}т)</span>
                      </span>
                      {!showConfirm ? (
                        <button
                          className="hexipedia-history-delete-btn"
                          onClick={() => setDeleteConfirmRecordId(record.id)}
                          title="Удалить"
                        >
                          ✕
                        </button>
                      ) : (
                        <div className="hexipedia-delete-confirm-inline">
                          <button
                            className="hexipedia-confirm-yes"
                            onClick={() => {
                              onDeleteSessionRecord?.(record.id);
                              setDeleteConfirmRecordId(null);
                            }}
                          >
                            Да
                          </button>
                          <button
                            className="hexipedia-confirm-no"
                            onClick={() => setDeleteConfirmRecordId(null)}
                          >
                            Нет
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="hexipedia-history-empty">Нет сохраненных сессий</div>
            )}
          </div>
        </div>
      </div>
    </SectionBase>
  );
};

export default StatsSection;
