import React, { useState } from 'react';
import { GameState, Params } from '../logic/pureLogic';
import { TutorialLevel, getHintForMode, axialToKey } from '../tutorial/tutorialState';
import { t } from '../ui/i18n';
import { getAllTutorialLevels } from '../tutorial/tutorialLevels';
import { audioManager } from '../audio/audioManager';
import { ALL_TEMPLATES } from '../templates/templateLibrary';
import './HexiPedia.css';

interface SessionHistoryRecord {
  id: string;
  startTime: number;
  endTime: number;
  gameTicks: number;
  gameTime: string;
}

interface HexiPediaProps {
  gameState: GameState;
  params: Params;
  interactionMode: 'desktop' | 'mobile';
  tutorialLevel: TutorialLevel | null;
  tutorialLevelId?: string | null;
  isTutorialTaskComplete?: boolean;
  completedTutorialLevelIds?: Set<string>;
  sessionHistory?: SessionHistoryRecord[];
  trackSessionHistory?: boolean;
  onSelectTutorialLevel?: (levelId: string) => void;
  onRestartTutorialLevel?: (levelId: string) => void;
  onToggleTrackHistory?: (enabled: boolean) => void;
  onDeleteSessionRecord?: (recordId: string) => void;
  onClearSessionHistory?: () => void;
  onSwitchTab?: (tab: string) => void;
  onActivateTemplate?: (templateId: string) => void;
}

export const HexiPedia: React.FC<HexiPediaProps> = ({
  gameState,
  params,
  interactionMode,
  tutorialLevel,
  tutorialLevelId,
  isTutorialTaskComplete = false,
  completedTutorialLevelIds,
  sessionHistory = [],
  trackSessionHistory = true,
  onSelectTutorialLevel,
  onRestartTutorialLevel,
  onToggleTrackHistory,
  onDeleteSessionRecord,
  onClearSessionHistory,
  onSwitchTab,
  onActivateTemplate,
}) => {
  const [sectionFilter, setSectionFilter] = useState('');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [expandedLevelId, setExpandedLevelId] = useState<string | null>(
    tutorialLevel?.id ?? null
  );
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [sectionOrder, setSectionOrder] = useState(['tasks', 'stats', 'templates', 'colors']);
  const [deleteConfirmRecordId, setDeleteConfirmRecordId] = useState<string | null>(null);
  const [deleteConfirmAll, setDeleteConfirmAll] = useState(false);
  const progress = gameState.tutorialProgress;
  const hint = tutorialLevel ? getHintForMode(tutorialLevel.hints, interactionMode) : '';
  const fullHint = hint ? `${hint} ${t('tutorial.followFocusNote')}` : t('tutorial.followFocusNote');

  const targetCells = tutorialLevel?.targetCells ?? [];
  const targetKeys = tutorialLevel ? targetCells.map(axialToKey) : [];
  const visitedCount = progress ? targetKeys.filter(key => progress.visitedTargetKeys.has(key)).length : 0;

  const toggleSection = (sectionId: string) => {
    if (expandedLevelId === sectionId) {
      setExpandedLevelId(null);
    } else {
      setExpandedLevelId(sectionId);
    }
  };

  const toggleSectionCollapse = (sectionId: string) => {
    const newSet = new Set(collapsedSections);
    if (newSet.has(sectionId)) {
      newSet.delete(sectionId);
    } else {
      newSet.add(sectionId);
    }
    setCollapsedSections(newSet);
  };

  const moveSectionUp = (sectionId: string) => {
    const idx = sectionOrder.indexOf(sectionId);
    if (idx > 0) {
      const newOrder = [...sectionOrder];
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      setSectionOrder(newOrder);
    }
  };

  const moveSectionDown = (sectionId: string) => {
    const idx = sectionOrder.indexOf(sectionId);
    if (idx < sectionOrder.length - 1) {
      const newOrder = [...sectionOrder];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      setSectionOrder(newOrder);
    }
  };

  // Get all tutorial levels and determine which are completed
  const allLevels = getAllTutorialLevels();
  const completedLevelIds = completedTutorialLevelIds ?? new Set<string>();
  const sectionFilterValue = sectionFilter.trim().toLowerCase();
  const isSectionVisible = (title: string) => {
    if (!sectionFilterValue) return true;
    return title.toLowerCase().includes(sectionFilterValue);
  };

  // Format ticks into MM:SS
  // Game runs at 12 ticks per second
  const formatSessionTime = (ticks: number): string => {
    const seconds = Math.floor(ticks / 12);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  const sessionDuration = progress?.startTick !== undefined ? gameState.tick - progress.startTick : 0;

  return (
    <div className="hexipedia-root">
      <div className="hexipedia-section-filter">
        <i className="fas fa-search hexipedia-section-filter-icon" aria-hidden="true"></i>
        <input
          className="hexipedia-section-filter-input"
          type="text"
          value={sectionFilter}
          onChange={(event) => setSectionFilter(event.target.value)}
          aria-label="Filter sections"
        />
      </div>
      <div className="hexipedia-scrollable-content">
      {tutorialLevel || allLevels.length > 0 ? (
        <div>
          {sectionOrder.map(sectionId => {
            const isCollapsed = collapsedSections.has(sectionId);
            const canMoveUp = sectionOrder.indexOf(sectionId) > 0;
            const canMoveDown = sectionOrder.indexOf(sectionId) < sectionOrder.length - 1;

            // Tasks section
            if (sectionId === 'tasks' && isSectionVisible(t('tutorial.tasksTitle'))) {
              return (
                <div key="tasks" className="hexipedia-section-wrapper">
                  <div className="hexipedia-section-header-container">
                    <div 
                      className={`hexipedia-section-header ${isCollapsed ? 'collapsed' : ''}`}
                      onClick={() => toggleSectionCollapse('tasks')}
                    >
                      <span className="hexipedia-section-toggle">{isCollapsed ? '▶' : '▼'}</span>
                      <span className="hexipedia-section-title">{t('tutorial.tasksTitle')}</span>
                    </div>
                    <div className="hexipedia-section-controls">
                      <button
                        className="hexipedia-section-move"
                        onClick={() => moveSectionUp('tasks')}
                        disabled={!canMoveUp}
                        title="Move up"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        className="hexipedia-section-move"
                        onClick={() => moveSectionDown('tasks')}
                        disabled={!canMoveDown}
                        title="Move down"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <div className="hexipedia-accordion-list">
                      {allLevels.map(level => {
                        const isCurrent = tutorialLevelId === level.id;
                        const isCompleted = completedLevelIds.has(level.id) || (isCurrent && isTutorialTaskComplete);
                        const hintText = isCurrent ? fullHint : getHintForMode(level.hints, interactionMode);
                        const levelTargetCells = isCurrent ? targetCells : (level.targetCells ?? []);
                        const levelVisited = isCurrent ? visitedCount : 0;

                        return (
                          <div key={level.id} className="hexipedia-accordion-item">
                            <div className="hexipedia-accordion-title" onClick={() => toggleSection(level.id)}>
                              <span className={`hexipedia-task-checkbox ${isCompleted ? 'checked' : ''}`}>
                                {isCompleted ? '✓' : ''}
                              </span>
                              <span className={`hexipedia-task-name ${isCurrent ? 'current' : ''}`}>
                                {level.objective}
                              </span>
                              <div className="hexipedia-task-actions">
                                {!isCompleted ? (
                                  <button
                                    className={`hexipedia-task-action ${isCurrent ? 'active' : ''}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      audioManager.playRandomSound();
                                      if (!isCurrent) onSelectTutorialLevel?.(level.id);
                                    }}
                                    disabled={isCurrent}
                                  >
                                    {isCurrent ? 'Current' : 'Activate'}
                                  </button>
                                ) : (
                                  <button
                                    className="hexipedia-task-action restart"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      audioManager.playRandomSound();
                                      onRestartTutorialLevel?.(level.id);
                                    }}
                                  >
                                    Restart
                                  </button>
                                )}
                              </div>
                            </div>
                            {expandedLevelId === level.id && (
                              <div className="hexipedia-accordion-content">
                                <div className="hexipedia-section">
                                  <div className="hexipedia-section-title">{t('tutorial.hint')}</div>
                                  <div className="hexipedia-text">
                                    {hintText.includes('HexiMap') ? (
                                      <>
                                        {hintText.split('HexiMap')[0]}
                                        <span 
                                          className="hexipedia-link"
                                          onClick={() => {
                                            audioManager.playRandomSound();
                                            onSwitchTab?.('heximap');
                                          }}
                                        >
                                          HexiMap
                                        </span>
                                        {hintText.split('HexiMap')[1]}
                                      </>
                                    ) : (
                                      hintText
                                    )}
                                  </div>
                                </div>

                                <div className="hexipedia-section">
                                  <div className="hexipedia-section-title">{t('tutorial.progress')}</div>
                                  <div className="hexipedia-text">{levelVisited} / {levelTargetCells.length}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Stats section
            if (sectionId === 'stats' && isSectionVisible(t('stats.title'))) {
              return (
                <div key="stats" className="hexipedia-section-wrapper">
                  <div className="hexipedia-section-header-container">
                    <div 
                      className={`hexipedia-section-header ${isCollapsed ? 'collapsed' : ''}`}
                      onClick={() => toggleSectionCollapse('stats')}
                    >
                      <span className="hexipedia-section-toggle">{isCollapsed ? '▶' : '▼'}</span>
                      <span className="hexipedia-section-title">{t('stats.title')}</span>
                    </div>
                    <div className="hexipedia-section-controls">
                      <button
                        className="hexipedia-section-move"
                        onClick={() => moveSectionUp('stats')}
                        disabled={!canMoveUp}
                        title="Move up"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        className="hexipedia-section-move"
                        onClick={() => moveSectionDown('stats')}
                        disabled={!canMoveDown}
                        title="Move down"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                  {!isCollapsed && (
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
                  )}
                </div>
              );
            }

            // Templates section
            if (sectionId === 'templates' && isSectionVisible('Build Templates')) {
              return (
                <div key="templates" className="hexipedia-section-wrapper">
                  <div className="hexipedia-section-header-container">
                    <div 
                      className={`hexipedia-section-header ${isCollapsed ? 'collapsed' : ''}`}
                      onClick={() => toggleSectionCollapse('templates')}
                    >
                      <span className="hexipedia-section-toggle">{isCollapsed ? '▶' : '▼'}</span>
                      <span className="hexipedia-section-title">Build Templates</span>
                    </div>
                    <div className="hexipedia-section-controls">
                      <button
                        className="hexipedia-section-move"
                        onClick={() => moveSectionUp('templates')}
                        disabled={!canMoveUp}
                        title="Move up"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        className="hexipedia-section-move"
                        onClick={() => moveSectionDown('templates')}
                        disabled={!canMoveDown}
                        title="Move down"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <div className="hexipedia-templates-section">
                      <div className="hexipedia-templates-list">
                        <label className="hexipedia-template-radio">
                          <input
                            type="radio"
                            name="active-template"
                            value=""
                            checked={!gameState.activeTemplate}
                            onChange={() => {
                              audioManager.playRandomSound();
                              onActivateTemplate?.('');
                            }}
                          />
                          <span className="hexipedia-template-name">None</span>
                        </label>
                        
                        {ALL_TEMPLATES.map(template => {
                          const isCompleted = gameState.completedTemplates?.has(template.id) ?? false;
                          const isActive = gameState.activeTemplate?.templateId === template.id;
                          const isExpanded = expandedTemplateId === template.id;
                          
                          return (
                            <div key={template.id} className="hexipedia-template-item">
                              <div className="hexipedia-template-row">
                                <label className="hexipedia-template-radio">
                                  <input
                                    type="radio"
                                    name="active-template"
                                    value={template.id}
                                    checked={isActive}
                                    onChange={() => {
                                      audioManager.playRandomSound();
                                      onActivateTemplate?.(template.id);
                                    }}
                                  />
                                  <span className="hexipedia-template-name">{template.name.en}</span>
                                  <span className={`hexipedia-template-difficulty ${template.difficulty}`}>
                                    {template.difficulty === 'easy' && '●'}
                                    {template.difficulty === 'medium' && '●●'}
                                    {template.difficulty === 'hard' && '●●●'}
                                  </span>
                                  <span className={`hexipedia-template-status ${isCompleted ? 'completed' : ''}`}>
                                    {isCompleted ? '✓' : ''}
                                  </span>
                                </label>
                                
                                <button
                                  className={`hexipedia-template-expand ${isExpanded ? 'expanded' : ''}`}
                                  onClick={() => {
                                    audioManager.playRandomSound();
                                    setExpandedTemplateId(isExpanded ? null : template.id);
                                  }}
                                  aria-label="Show template details"
                                >
                                  ▼
                                </button>
                              </div>

                              {isExpanded && (
                                <div className="hexipedia-template-details">
                                  {template.description && (
                                    <div className="hexipedia-template-description">
                                      <span className="hexipedia-detail-label">Description:</span>
                                      <span className="hexipedia-detail-text">{template.description.en}</span>
                                    </div>
                                  )}
                                  
                                  {template.hints && template.hints.en && template.hints.en.length > 0 && (
                                    <div className="hexipedia-template-hints">
                                      <span className="hexipedia-detail-label">Hints:</span>
                                      <ul className="hexipedia-hints-list">
                                        {template.hints.en.map((hint, idx) => (
                                          <li key={idx} className="hexipedia-hint-item">{hint}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  <div className="hexipedia-template-cells">
                                    <span className="hexipedia-detail-label">Cells:</span>
                                    <span className="hexipedia-detail-text">{template.cells.length}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // Colors section
            if (sectionId === 'colors' && isSectionVisible('Цвета')) {
              return (
                <div key="colors" className="hexipedia-section-wrapper">
                  <div className="hexipedia-section-header-container">
                    <div 
                      className={`hexipedia-section-header ${isCollapsed ? 'collapsed' : ''}`}
                      onClick={() => toggleSectionCollapse('colors')}
                    >
                      <span className="hexipedia-section-toggle">{isCollapsed ? '▶' : '▼'}</span>
                      <span className="hexipedia-section-title">Цвета</span>
                    </div>
                    <div className="hexipedia-section-controls">
                      <button
                        className="hexipedia-section-move"
                        onClick={() => moveSectionUp('colors')}
                        disabled={!canMoveUp}
                        title="Move up"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        className="hexipedia-section-move"
                        onClick={() => moveSectionDown('colors')}
                        disabled={!canMoveDown}
                        title="Move down"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <div className="hexipedia-colors-section">
                      <svg className="hexipedia-color-wheel" viewBox="0 0 300 300" width="200" height="200">
                        {/* Draw color wheel as segments */}
                        {params.ColorPalette.map((color, idx) => {
                          const totalColors = params.ColorPalette.length;
                          const startAngle = (idx * 360 / totalColors - 90) * (Math.PI / 180);
                          const endAngle = ((idx + 1) * 360 / totalColors - 90) * (Math.PI / 180);
                          const innerRadius = 60;
                          const outerRadius = 120;
                          
                          const x1 = 150 + innerRadius * Math.cos(startAngle);
                          const y1 = 150 + innerRadius * Math.sin(startAngle);
                          const x2 = 150 + outerRadius * Math.cos(startAngle);
                          const y2 = 150 + outerRadius * Math.sin(startAngle);
                          const x3 = 150 + outerRadius * Math.cos(endAngle);
                          const y3 = 150 + outerRadius * Math.sin(endAngle);
                          const x4 = 150 + innerRadius * Math.cos(endAngle);
                          const y4 = 150 + innerRadius * Math.sin(endAngle);
                          
                          const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
                          
                          const pathD = `
                            M ${x1} ${y1}
                            L ${x2} ${y2}
                            A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x3} ${y3}
                            L ${x4} ${y4}
                            A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1} ${y1}
                            Z
                          `;
                          
                          return (
                            <path
                              key={idx}
                              d={pathD}
                              fill={color}
                              stroke="#333333"
                              strokeWidth="0.5"
                              opacity="0.8"
                            />
                          );
                        })}
                        
                        {/* Game colors as circles on the wheel */}
                        {params.ColorPalette.map((color, idx) => {
                          // Map color to angle (0-360 degrees)
                          const hue = (params.ColorPaletteStartHue + idx * params.ColorPaletteHueStep) % 360;
                          const angle = (hue - 90) * (Math.PI / 180); // -90 to start from top
                          const radius = 90;
                          const x = 150 + radius * Math.cos(angle);
                          const y = 150 + radius * Math.sin(angle);
                          
                          return (
                            <circle
                              key={`dot-${idx}`}
                              cx={x}
                              cy={y}
                              r="6"
                              fill={color}
                              stroke="#ffffff"
                              strokeWidth="2"
                            />
                          );
                        })}
                        
                        {/* Center circle */}
                        <circle cx="150" cy="150" r="15" fill="#333333" stroke="#666666" strokeWidth="1" />
                      </svg>
                      
                      <div className="hexipedia-colors-list">
                        {params.ColorPalette.map((color, idx) => (
                          <div key={idx} className="hexipedia-color-item">
                            <div className="hexipedia-color-swatch" style={{ backgroundColor: color }}></div>
                            <span className="hexipedia-color-name">Color {idx + 1}</span>
                            <span className="hexipedia-color-value">{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>
      ) : (
        <div className="hexipedia-panel">
          <div className="hexipedia-text">{t('tutorial.noActiveTask')}</div>
        </div>
      )}
      </div>
    </div>
  );
};

export default HexiPedia;