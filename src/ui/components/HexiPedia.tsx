import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '../../gameLogic/core/types';
import type { Params } from '../../gameLogic/core/params';
import type { TaskDefinition } from '../../tasks/taskState';
import { getHintForMode, axialToKey, getLocalizedText } from '../../tasks/taskState';
import { t, getLanguage } from '../i18n';
import { getAllTaskDefinitions } from '../../tasks/taskLevels';
import { ALL_TEMPLATES, getTemplateById } from '../../templates/templateLibrary';
import { audioController } from '../../appLogic/audioController';
import './Hexipedia/Hexipedia.css';

interface SessionHistoryRecord {
  id: string;
  startTime: number;
  endTime: number;
  gameTicks: number;
  gameTime: string;
  lastActionTime?: number;
  actionCount?: number;
  totalSessionTime?: number;
}

type HexipediaSectionId = 'tasks' | 'session' | 'structures' | 'colors';

interface HexipediaProps {
  gameState: GameState;
  params: Params;
  interactionMode: 'desktop' | 'mobile';
  task: TaskDefinition | null;
  currentTaskId?: string | null;
  isCurrentTaskComplete?: boolean;
  completedTaskIds?: Set<string>;
  sessionHistory?: SessionHistoryRecord[];
  trackSessionHistory?: boolean;
  soundEnabled?: boolean;
  soundVolume?: number;
  onSelectTask?: (taskId: string) => void;
  onRestartTask?: (taskId: string) => void;
  onToggleTrackHistory?: (enabled: boolean) => void;
  onDeleteSessionRecord?: (recordId: string) => void;
  onClearSessionHistory?: () => void;
  onSwitchTab?: (tab: string) => void;
  onActivateTemplate?: (templateId: string) => void;
  selectedColorIndex?: number;
  onColorSelect?: (index: number) => void;
  showColorWidget?: boolean;
  onToggleColorWidget?: (visible: boolean) => void;
  showTaskWidget?: boolean;
  onToggleTaskWidget?: (visible: boolean) => void;
  showStructureWidget?: boolean;
  onToggleStructureWidget?: (visible: boolean) => void;
  enabledSections?: HexipediaSectionId[];
  pinnedSections?: HexipediaSectionId[];
  onSetSectionEnabled?: (sectionId: HexipediaSectionId, enabled: boolean) => void;
  onSetSectionPinned?: (sectionId: HexipediaSectionId, pinned: boolean) => void;
  focusSectionId?: HexipediaSectionId | null;
  onFocusSectionHandled?: () => void;
  sectionOrder?: HexipediaSectionId[];
  onChangeSectionOrder?: (order: HexipediaSectionId[]) => void;
  currentSessionStartTick?: number;
  currentSessionId?: string | null;
  currentSessionRecord?: SessionHistoryRecord | null;
  isPlaybackPaused?: boolean;
  onSetPlaybackPaused?: (paused: boolean) => void;
  onSeekToTick?: (tick: number) => void;
  onDownloadSession?: (sessionId: string) => void;
}

function formatSessionTime(ticks: number): string {
  const seconds = Math.floor(ticks / 12);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function getColorNameByHue(hue: number): string {
  const normalizedHue = ((hue % 360) + 360) % 360;
  if (normalizedHue < 15 || normalizedHue >= 345) return t('hexipedia.colors.red');
  if (normalizedHue < 45) return t('hexipedia.colors.orange');
  if (normalizedHue < 75) return t('hexipedia.colors.yellow');
  if (normalizedHue < 105) return t('hexipedia.colors.lime');
  if (normalizedHue < 145) return t('hexipedia.colors.green');
  if (normalizedHue < 175) return t('hexipedia.colors.turquoise');
  if (normalizedHue < 205) return t('hexipedia.colors.cyan');
  if (normalizedHue < 235) return t('hexipedia.colors.blue');
  if (normalizedHue < 265) return t('hexipedia.colors.indigo');
  if (normalizedHue < 295) return t('hexipedia.colors.violet');
  if (normalizedHue < 325) return t('hexipedia.colors.purple');
  return t('hexipedia.colors.crimson');
}

function formatRelativePercent(value: number): string {
  if (value === 0) return '0%';
  const absValue = Math.abs(value);
  const rounded = Number.isInteger(absValue) ? absValue.toFixed(0) : absValue.toFixed(1);
  return `${value > 0 ? '+' : '-'}${rounded}%`;
}

function getRelativePercent(index: number, refIndex: number, paletteSize: number): number {
  let distance = index - refIndex;
  while (distance > paletteSize / 2) distance -= paletteSize;
  while (distance <= -paletteSize / 2) distance += paletteSize;
  return (distance * 100) / paletteSize;
}

function getStructureStatusLabel(
  isActive: boolean,
  hasErrors: boolean,
  completedAtTick: number | undefined,
): string {
  if (completedAtTick) return t('structures.status.complete');
  if (hasErrors) return t('structures.status.invalid');
  if (isActive) return t('structures.status.active');
  return t('structures.status.progress');
}

export const Hexipedia: React.FC<HexipediaProps> = ({
  gameState,
  params,
  interactionMode,
  task,
  currentTaskId = null,
  isCurrentTaskComplete = false,
  completedTaskIds,
  soundEnabled = true,
  soundVolume = 0.6,
  sessionHistory = [],
  trackSessionHistory = true,
  onSelectTask,
  onRestartTask,
  onToggleTrackHistory,
  onDeleteSessionRecord,
  onClearSessionHistory,
  onSwitchTab,
  onActivateTemplate,
  selectedColorIndex,
  onColorSelect,
  showColorWidget = true,
  onToggleColorWidget,
  showTaskWidget = true,
  onToggleTaskWidget,
  showStructureWidget = true,
  onToggleStructureWidget,
  enabledSections = ['tasks'],
  pinnedSections = ['tasks'],
  onSetSectionEnabled,
  onSetSectionPinned,
  focusSectionId = null,
  onFocusSectionHandled,
  sectionOrder = ['tasks', 'session', 'structures', 'colors'] as HexipediaSectionId[],
  onChangeSectionOrder,
  currentSessionStartTick = 0,
  currentSessionId = null,
  currentSessionRecord = null,
  isPlaybackPaused = false,
  onSetPlaybackPaused,
  onSeekToTick,
  onDownloadSession,
}) => {
  const [seekTickInput, setSeekTickInput] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(task?.id ?? null);
  const [collapsedSections, setCollapsedSections] = useState<Set<HexipediaSectionId>>(
    new Set<HexipediaSectionId>(['session', 'structures', 'colors']),
  );
  const [deleteConfirmRecordId, setDeleteConfirmRecordId] = useState<string | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showStructureTypeDropdown, setShowStructureTypeDropdown] = useState(false);
  const [localFocusSectionId, setLocalFocusSectionId] = useState<HexipediaSectionId | null>(null);
  const [deleteConfirmAll, setDeleteConfirmAll] = useState(false);
  const [selectedStructureTypeId, setSelectedStructureTypeId] = useState<string>(
    gameState.activeTemplate?.templateId ?? ALL_TEMPLATES[0]?.id ?? '',
  );
  const sectionRefs = useRef<Record<HexipediaSectionId, HTMLDivElement | null>>({
    tasks: null,
    session: null,
    structures: null,
    colors: null,
  });

  const lang = getLanguage();
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const progress = gameState.taskProgress;
  const targetCells = progress?.targetCells ?? task?.targetCells ?? [];
  const targetKeys = task ? targetCells.map(axialToKey) : [];
  const visitedCount = progress ? targetKeys.filter(key => progress.visitedTargetKeys.has(key)).length : 0;
  const completedIds = completedTaskIds ?? new Set<string>();
  const allTasks = getAllTaskDefinitions();
  const sessionDuration = gameState.tick - currentSessionStartTick;
  const sectionFilterValue = sectionFilter.trim().toLowerCase();
  const selectedStructureTemplate = getTemplateById(selectedStructureTypeId) ?? ALL_TEMPLATES[0] ?? null;
  const structureInstances = useMemo(
    () => (gameState.structureInstances ?? [])
      .filter(instance => instance.templateId === selectedStructureTemplate?.id)
      .sort((left, right) => right.startedAtTick - left.startedAtTick),
    [gameState.structureInstances, selectedStructureTemplate],
  );
  const activeStructureInstanceId = gameState.activeTemplate?.instanceId ?? null;

  useEffect(() => {
    if (!gameState.activeTemplate?.templateId) return;
    setSelectedStructureTypeId(current => current || gameState.activeTemplate!.templateId);
  }, [gameState.activeTemplate]);

  const isSectionEnabled = (sectionId: HexipediaSectionId): boolean => enabledSections.includes(sectionId);
  const isSectionPinned = (sectionId: HexipediaSectionId): boolean => pinnedSections.includes(sectionId);

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTaskId(current => (current === taskId ? null : taskId));
  };

  const toggleSectionCollapse = (sectionId: HexipediaSectionId) => {
    if (!isSectionEnabled(sectionId)) return;
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const moveSectionUp = (sectionId: HexipediaSectionId) => {
    const index = sectionOrder.indexOf(sectionId);
    if (index <= 0) return;
    const nextOrder = [...sectionOrder];
    [nextOrder[index - 1], nextOrder[index]] = [nextOrder[index], nextOrder[index - 1]];
    onChangeSectionOrder?.(nextOrder);
  };

  const moveSectionDown = (sectionId: HexipediaSectionId) => {
    const index = sectionOrder.indexOf(sectionId);
    if (index === -1 || index >= sectionOrder.length - 1) return;
    const nextOrder = [...sectionOrder];
    [nextOrder[index], nextOrder[index + 1]] = [nextOrder[index + 1], nextOrder[index]];
    onChangeSectionOrder?.(nextOrder);
  };

  const toggleSectionPinned = (sectionId: HexipediaSectionId) => {
    const nextPinned = !isSectionPinned(sectionId);
    onSetSectionPinned?.(sectionId, nextPinned);
    if (nextPinned && !isSectionEnabled(sectionId)) {
      onSetSectionEnabled?.(sectionId, true);
      setCollapsedSections(prev => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    }
  };

  const openSectionFromSearch = (sectionId: HexipediaSectionId) => {
    onSetSectionEnabled?.(sectionId, true);
    setCollapsedSections(prev => {
      if (!prev.has(sectionId)) return prev;
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
    setLocalFocusSectionId(sectionId);
    setSectionFilter('');
    setShowSearchDropdown(false);
  };

  const activeFocusSectionId = focusSectionId ?? localFocusSectionId;

  useEffect(() => {
    if (!activeFocusSectionId) return;

    if (!isSectionEnabled(activeFocusSectionId)) {
      onSetSectionEnabled?.(activeFocusSectionId, true);
    }

    setCollapsedSections(prev => {
      if (!prev.has(activeFocusSectionId)) return prev;
      const next = new Set(prev);
      next.delete(activeFocusSectionId);
      return next;
    });

    const animationFrameId = requestAnimationFrame(() => {
      const sectionElement = sectionRefs.current[activeFocusSectionId];
      if (!sectionElement) return;

      const isPinned = isSectionPinned(activeFocusSectionId);
      const scrollContainer = sectionElement.parentElement;
      if (!scrollContainer) return;

      if (isPinned) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const sectionRect = sectionElement.getBoundingClientRect();
        const scrollThreshold = containerRect.height * 0.1;

        if (sectionRect.top < containerRect.top || sectionRect.bottom > containerRect.top + scrollThreshold) {
          const scrollOffset = sectionElement.offsetTop - scrollThreshold;
          scrollContainer.scrollTo({ top: Math.max(0, scrollOffset), behavior: 'smooth' });
        }
      } else {
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      if (focusSectionId) onFocusSectionHandled?.();
      else setLocalFocusSectionId(null);
    });

    return () => cancelAnimationFrame(animationFrameId);
  }, [activeFocusSectionId, enabledSections, focusSectionId, onFocusSectionHandled]);

  const sectionTitles: Record<HexipediaSectionId, string> = {
    tasks: t('task.tasksTitle'),
    session: t('session.title'),
    structures: t('structures.title'),
    colors: t('colors.title'),
  };

  const dropdownSections = sectionOrder.filter(id => {
    if (!sectionFilterValue) return true;
    return sectionTitles[id].toLowerCase().includes(sectionFilterValue);
  });

  return (
    <div className="hexipedia-root">
      <div className="hexipedia-section-filter" style={{ position: 'relative' }}>
        <i className="fas fa-search hexipedia-section-filter-icon" aria-hidden="true"></i>
        <input
          className="hexipedia-section-filter-input"
          type="text"
          value={sectionFilter}
          onChange={(event) => setSectionFilter(event.target.value)}
          onFocus={() => setShowSearchDropdown(true)}
          onBlur={() => setTimeout(() => setShowSearchDropdown(false), 150)}
          placeholder={t('hexipedia.searchPlaceholder')}
          aria-label={t('hexipedia.searchAria')}
        />
        {showSearchDropdown && (
          <div className="hexipedia-section-dropdown">
            {dropdownSections.map(id => (
              <button
                key={id}
                className={`hexipedia-section-dropdown-item ${isSectionEnabled(id) ? 'is-enabled' : ''} ${isSectionPinned(id) ? 'is-pinned' : ''}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  openSectionFromSearch(id);
                }}
              >
                <span className="hexipedia-section-dropdown-name">{sectionTitles[id]}</span>
                {isSectionPinned(id) && <i className="fas fa-thumbtack hexipedia-section-dropdown-pin" aria-hidden="true" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="hexipedia-scrollable-content">
        {sectionOrder.map(sectionId => {
          const isCollapsed = collapsedSections.has(sectionId);
          const canMoveUp = sectionOrder.indexOf(sectionId) > 0;
          const canMoveDown = sectionOrder.indexOf(sectionId) < sectionOrder.length - 1;
          const isEnabled = isSectionEnabled(sectionId);
          const isPinned = isSectionPinned(sectionId);

          if (!isEnabled) return null;

          if (sectionId === 'tasks') {
            return (
              <div
                key="tasks"
                ref={(element) => {
                  sectionRefs.current.tasks = element;
                }}
                className="hexipedia-section-wrapper"
              >
                <div className="hexipedia-section-header-container">
                  <div
                    className={`hexipedia-section-header ${isCollapsed ? 'collapsed' : ''}`.trim()}
                    onClick={() => toggleSectionCollapse('tasks')}
                  >
                    <span className="hexipedia-section-toggle">{isCollapsed ? '▶' : '▼'}</span>
                    <span className="hexipedia-section-title">{t('task.tasksTitle')}</span>
                  </div>
                  <div className="hexipedia-section-controls">
                    <button
                      className={`hexipedia-section-move hexipedia-widget-toggle ${showTaskWidget ? 'on' : 'off'}`}
                      onClick={() => onToggleTaskWidget?.(!showTaskWidget)}
                      disabled={!onToggleTaskWidget}
                      title={showTaskWidget ? t('hexipedia.widget.hideTasks') : t('hexipedia.widget.showTasks')}
                      aria-label={showTaskWidget ? t('hexipedia.widget.hideTasks') : t('hexipedia.widget.showTasks')}
                    >
                      <i className={`fas ${showTaskWidget ? 'fa-eye' : 'fa-eye-slash'}`} aria-hidden="true" />
                    </button>
                    {isPinned && (
                      <>
                        <button
                          className="hexipedia-section-move"
                          onClick={() => moveSectionUp('tasks')}
                          disabled={!canMoveUp}
                          title={t('hexipedia.section.moveUp')}
                          aria-label={t('hexipedia.section.moveUp')}
                        >
                          ▲
                        </button>
                        <button
                          className="hexipedia-section-move"
                          onClick={() => moveSectionDown('tasks')}
                          disabled={!canMoveDown}
                          title={t('hexipedia.section.moveDown')}
                          aria-label={t('hexipedia.section.moveDown')}
                        >
                          ▼
                        </button>
                      </>
                    )}
                    <button
                      className={`hexipedia-section-move hexipedia-section-pin ${isPinned ? 'pinned' : ''}`}
                      onClick={() => toggleSectionPinned('tasks')}
                      title={isPinned ? t('hexipedia.section.unpin') : t('hexipedia.section.pin')}
                      aria-label={isPinned ? t('hexipedia.section.unpin') : t('hexipedia.section.pin')}
                    >
                      <i className="fas fa-thumbtack" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="hexipedia-accordion-list">
                    {allTasks.map(definition => {
                      const isCurrent = currentTaskId === definition.id;
                      const isActive = isCurrent && !!gameState.taskProgress;
                      const isCompleted = completedIds.has(definition.id) || (isCurrent && isCurrentTaskComplete);
                      const hintText = getHintForMode(definition.hints, interactionMode, lang);
                      const definitionTargetCells = isCurrent ? targetCells : (definition.targetCells ?? []);
                      const progressForDefinition = isCurrent && progress
                        ? progress
                        : {
                            visitedTargetKeys: new Set<string>(),
                            collectedTargetKeys: new Set<string>(),
                            startTick: 0,
                            targetCells: definition.targetCells,
                            targetHexes: definition.targetHexes,
                          };
                      const fallbackProgress = definition.getProgress
                        ? definition.getProgress(
                            gameState,
                            params,
                            progressForDefinition,
                          )
                        : {
                            current: 0,
                            total: definitionTargetCells.length,
                            labelKey: 'task.cellsVisited',
                          };
                      const displayedProgress = isCurrent && progress
                        ? (definition.getProgress
                          ? definition.getProgress(gameState, params, progressForDefinition)
                          : {
                              current: visitedCount,
                              total: definitionTargetCells.length,
                              labelKey: 'task.cellsVisited',
                            })
                        : {
                            current: isCompleted ? fallbackProgress.total : 0,
                            total: fallbackProgress.total,
                            labelKey: fallbackProgress.labelKey,
                          };

                      return (
                        <div key={definition.id} className="hexipedia-accordion-item">
                          <div className="hexipedia-accordion-title" onClick={() => toggleTaskExpansion(definition.id)}>
                            <span className={`hexipedia-task-checkbox ${isCompleted ? 'checked' : ''}`}>
                              {isCompleted ? '✓' : ''}
                            </span>
                            <span className={`hexipedia-task-name ${isCurrent ? 'current' : ''}`}>
                              {getLocalizedText(definition.name, lang)}
                            </span>
                            <div className="hexipedia-task-actions">
                              {!isCompleted ? (
                                <button
                                  className={`hexipedia-task-action ${isCurrent ? 'active' : ''}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    audioController.playRandomSound(soundEnabled, soundVolume);
                                    if (!isCurrent) onSelectTask?.(definition.id);
                                  }}
                                  disabled={isCurrent}
                                >
                                  {isCurrent ? t('task.current') : t('task.activate')}
                                </button>
                              ) : (
                                <button
                                  className="hexipedia-task-action restart"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    audioController.playRandomSound(soundEnabled, soundVolume);
                                    onRestartTask?.(definition.id);
                                  }}
                                >
                                  {t('task.restart')}
                                </button>
                              )}
                            </div>
                          </div>

                          {expandedTaskId === definition.id && (
                            <div className="hexipedia-accordion-content">
                              <div className="hexipedia-section">
                                <div className="hexipedia-section-title">{t('task.story')}</div>
                                <div className="hexipedia-text">{getLocalizedText(definition.setup, lang)}</div>
                              </div>

                              <div className="hexipedia-section">
                                <div className="hexipedia-section-title">{t('task.goal')}</div>
                                <div className="hexipedia-text">{getLocalizedText(definition.objective, lang)}</div>
                              </div>

                              <div className="hexipedia-section">
                                <div className="hexipedia-section-title">{t('task.progress')}</div>
                                <div className="hexipedia-text">
                                  {displayedProgress.current} / {displayedProgress.total} {t(displayedProgress.labelKey)}
                                </div>
                              </div>

                              <div className="hexipedia-section">
                                <div className="hexipedia-section-title">{t('task.hint')}</div>
                                <div className="hexipedia-text">
                                  {hintText.includes('Map') ? (
                                    <>
                                      {hintText.split('Map')[0]}
                                      <span
                                        className="hexipedia-link"
                                        onClick={() => {
                                          audioController.playRandomSound(soundEnabled, soundVolume);
                                          onSwitchTab?.('map');
                                        }}
                                      >
                                        Map
                                      </span>
                                      {hintText.split('Map')[1]}
                                    </>
                                  ) : (
                                    hintText
                                  )}
                                  {isActive && <span>{` ${t('task.followFocusNote')}`}</span>}
                                </div>
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

          if (sectionId === 'session') {
                return (
                  <div
                    key="session"
                    ref={(element) => {
                      sectionRefs.current.session = element;
                    }}
                    className="hexipedia-section-wrapper"
                  >
                    <div className="hexipedia-section-header-container">
                      <div
                        className={`hexipedia-section-header ${isCollapsed ? 'collapsed' : ''}`.trim()}
                        onClick={() => toggleSectionCollapse('session')}
                      >
                        <span className="hexipedia-section-toggle">{isCollapsed ? '▶' : '▼'}</span>
                        <span className="hexipedia-section-title">{t('session.title')}</span>
                      </div>
                      <div className="hexipedia-section-controls">
                        {currentSessionId && (
                          <button
                            className="hexipedia-section-move"
                            onClick={() => onDownloadSession?.(currentSessionId)}
                            title={t('action.download')}
                            aria-label={t('action.download')}
                          >
                            <i className="fas fa-download" aria-hidden="true" />
                          </button>
                        )}
                        {isPinned && (
                          <>
                            <button
                              className="hexipedia-section-move"
                              onClick={() => moveSectionUp('session')}
                              disabled={!canMoveUp}
                              title={t('hexipedia.section.moveUp')}
                              aria-label={t('hexipedia.section.moveUp')}
                            >
                              ▲
                            </button>
                            <button
                              className="hexipedia-section-move"
                              onClick={() => moveSectionDown('session')}
                              disabled={!canMoveDown}
                              title={t('hexipedia.section.moveDown')}
                              aria-label={t('hexipedia.section.moveDown')}
                            >
                              ▼
                            </button>
                          </>
                        )}
                        <button
                          className={`hexipedia-section-move hexipedia-section-pin ${isPinned ? 'pinned' : ''}`}
                          onClick={() => toggleSectionPinned('session')}
                          title={isPinned ? t('hexipedia.section.unpin') : t('hexipedia.section.pin')}
                          aria-label={isPinned ? t('hexipedia.section.unpin') : t('hexipedia.section.pin')}
                        >
                          <i className="fas fa-thumbtack" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="hexipedia-stats-section">
                        <div className="hexipedia-stats-content">
                          {/* Session metadata */}
                          <div className="hexipedia-stat-row">
                            <span className="hexipedia-stat-label">{t('stats.sessionTime')}</span>
                            <span className="hexipedia-stat-value">{formatSessionTime(sessionDuration)}</span>
                          </div>
                          <div className="hexipedia-stat-row">
                            <span className="hexipedia-stat-label">{t('session.ticks')}</span>
                            <span className="hexipedia-stat-value">{gameState.tick}</span>
                          </div>
                          {currentSessionRecord?.actionCount != null && (
                            <div className="hexipedia-stat-row">
                              <span className="hexipedia-stat-label">{t('session.actionCount')}</span>
                              <span className="hexipedia-stat-value">{currentSessionRecord.actionCount}</span>
                            </div>
                          )}
                          {currentSessionRecord?.startTime && (
                            <div className="hexipedia-stat-row">
                              <span className="hexipedia-stat-label">{t('session.startTime')}</span>
                              <span className="hexipedia-stat-value">
                                {new Date(currentSessionRecord.startTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}

                          {/* Playback controls */}
                          {onSeekToTick && (
                            <div className="hexipedia-history-subsection">
                              <div className="hexipedia-history-header">
                                <div className="hexipedia-history-title">{t('playback.title')}</div>
                              </div>
                              <div className="hexipedia-playback-controls">
                                <button
                                  className="hexipedia-task-action"
                                  onClick={() => onSetPlaybackPaused?.(!isPlaybackPaused)}
                                >
                                  <i className={`fas ${isPlaybackPaused ? 'fa-play' : 'fa-pause'}`} />
                                  {' '}{isPlaybackPaused ? t('playback.resume') : t('playback.pause')}
                                </button>
                                <div className="hexipedia-playback-seek">
                                  <input
                                    type="number"
                                    className="hexipedia-seek-input"
                                    placeholder={t('playback.seekToTick')}
                                    value={seekTickInput}
                                    min={0}
                                    onChange={(e) => setSeekTickInput(e.target.value)}
                                  />
                                  <button
                                    className="hexipedia-task-action"
                                    onClick={() => {
                                      const tick = parseInt(seekTickInput, 10);
                                      if (!Number.isNaN(tick)) {
                                        onSeekToTick(tick);
                                        setSeekTickInput('');
                                      }
                                    }}
                                  >
                                    {t('playback.play')}
                                  </button>
                                </div>
                                <button
                                  className="hexipedia-task-action"
                                  disabled={!isPlaybackPaused}
                                  onClick={() => {
                                    onSeekToTick(gameState.tick + 1);
                                  }}
                                >
                                  <i className="fas fa-step-forward" />
                                  {' '}{t('playback.step')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
          if (sectionId === 'structures') {
            return (
              <div
                key="structures"
                ref={(element) => {
                  sectionRefs.current.structures = element;
                }}
                className="hexipedia-section-wrapper"
              >
                <div className="hexipedia-section-header-container">
                  <div
                    className={`hexipedia-section-header ${isCollapsed ? 'collapsed' : ''}`.trim()}
                    onClick={() => toggleSectionCollapse('structures')}
                  >
                    <span className="hexipedia-section-toggle">{isCollapsed ? '▶' : '▼'}</span>
                    <span className="hexipedia-section-title">{t('structures.title')}</span>
                  </div>
                  <div className="hexipedia-section-controls">
                    <button
                      className={`hexipedia-section-move hexipedia-widget-toggle ${showStructureWidget ? 'on' : 'off'}`}
                      onClick={() => onToggleStructureWidget?.(!showStructureWidget)}
                      disabled={!onToggleStructureWidget}
                      title={showStructureWidget ? t('hexipedia.widget.hideStructures') : t('hexipedia.widget.showStructures')}
                      aria-label={showStructureWidget ? t('hexipedia.widget.hideStructures') : t('hexipedia.widget.showStructures')}
                    >
                      <i className={`fas ${showStructureWidget ? 'fa-eye' : 'fa-eye-slash'}`} aria-hidden="true" />
                    </button>
                    {isPinned && (
                      <>
                        <button
                          className="hexipedia-section-move"
                          onClick={() => moveSectionUp('structures')}
                          disabled={!canMoveUp}
                          title={t('hexipedia.section.moveUp')}
                          aria-label={t('hexipedia.section.moveUp')}
                        >
                          ▲
                        </button>
                        <button
                          className="hexipedia-section-move"
                          onClick={() => moveSectionDown('structures')}
                          disabled={!canMoveDown}
                          title={t('hexipedia.section.moveDown')}
                          aria-label={t('hexipedia.section.moveDown')}
                        >
                          ▼
                        </button>
                      </>
                    )}
                    <button
                      className={`hexipedia-section-move hexipedia-section-pin ${isPinned ? 'pinned' : ''}`}
                      onClick={() => toggleSectionPinned('structures')}
                      title={isPinned ? t('hexipedia.section.unpin') : t('hexipedia.section.pin')}
                      aria-label={isPinned ? t('hexipedia.section.unpin') : t('hexipedia.section.pin')}
                    >
                      <i className="fas fa-thumbtack" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="hexipedia-templates-section">
                    <div className="hexipedia-template-controls" style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 220px', position: 'relative' }}>
                        <span className="hexipedia-detail-label">{t('structures.selectType')}</span>
                        <button
                          type="button"
                          className="hexipedia-structure-type-trigger"
                          onClick={() => setShowStructureTypeDropdown((current) => !current)}
                          onBlur={() => setTimeout(() => setShowStructureTypeDropdown(false), 150)}
                          aria-haspopup="listbox"
                          aria-expanded={showStructureTypeDropdown}
                        >
                          <span className="hexipedia-structure-type-trigger-label">
                            {selectedStructureTemplate?.name[lang] ?? ''}
                          </span>
                          <span className="hexipedia-structure-type-trigger-chevron" aria-hidden="true">▾</span>
                        </button>
                        {showStructureTypeDropdown && (
                          <div className="hexipedia-section-dropdown hexipedia-structure-type-dropdown" role="listbox">
                            {ALL_TEMPLATES.map(template => {
                              const isSelected = template.id === selectedStructureTypeId;

                              return (
                                <button
                                  key={template.id}
                                  type="button"
                                  className={`hexipedia-section-dropdown-item ${isSelected ? 'is-enabled' : ''}`}
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    setSelectedStructureTypeId(template.id);
                                    setShowStructureTypeDropdown(false);
                                  }}
                                  role="option"
                                  aria-selected={isSelected}
                                >
                                  <span className="hexipedia-section-dropdown-name">{template.name[lang]}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
                        <button
                          className="hexipedia-task-action"
                          onClick={() => selectedStructureTemplate && onActivateTemplate?.(selectedStructureTemplate.id)}
                          disabled={!selectedStructureTemplate || !onActivateTemplate}
                        >
                          {t('structures.startNew')}
                        </button>
                        {gameState.activeTemplate && (
                          <button
                            className="hexipedia-task-action restart"
                            onClick={() => onActivateTemplate?.('')}
                            disabled={!onActivateTemplate}
                          >
                            {t('structures.deactivate')}
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedStructureTemplate && (
                      <div className="hexipedia-template-details" style={{ marginBottom: 12 }}>
                        {selectedStructureTemplate.description && (
                          <div className="hexipedia-template-description">
                            <span className="hexipedia-detail-label">{t('structures.description')}</span>
                            <span className="hexipedia-detail-text">{selectedStructureTemplate.description[lang]}</span>
                          </div>
                        )}
                        <div className="hexipedia-template-cells">
                          <span className="hexipedia-detail-label">{t('structures.cells')}</span>
                          <span className="hexipedia-detail-text">{selectedStructureTemplate.structure.cells.length}</span>
                        </div>
                      </div>
                    )}

                    {structureInstances.length > 0 ? (
                      <div className="hexipedia-templates-list">
                        {structureInstances.map((instance, index) => {
                          const isActiveInstance = activeStructureInstanceId === instance.instanceId;
                          const template = getTemplateById(instance.templateId);
                          const totalCells = template?.structure.cells.length ?? 0;
                          const baseColor = instance.anchoredAt
                            ? params.ColorPalette[instance.anchoredAt.baseColorIndex] ?? null
                            : null;

                          return (
                            <div key={instance.instanceId} className="hexipedia-template-item">
                              <div className="hexipedia-template-row">
                                <div className="hexipedia-template-radio" style={{ alignItems: 'center' }}>
                                  <span className="hexipedia-template-name">
                                    {t('structures.instance')} #{structureInstances.length - index}
                                  </span>
                                  <span className={`hexipedia-template-status ${instance.completedAtTick ? 'completed' : ''}`}>
                                    {getStructureStatusLabel(isActiveInstance, instance.hasErrors, instance.completedAtTick)}
                                  </span>
                                </div>
                              </div>
                              <div className="hexipedia-template-details">
                                <div className="hexipedia-template-cells">
                                  <span className="hexipedia-detail-label">{t('structures.progress')}</span>
                                  <span className="hexipedia-detail-text">{instance.filledCells.size} / {totalCells}</span>
                                </div>
                                <div className="hexipedia-template-cells">
                                  <span className="hexipedia-detail-label">{t('structures.baseColor')}</span>
                                  <span className="hexipedia-detail-text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {baseColor ? (
                                      <span style={{ width: 12, height: 12, display: 'inline-block', border: '1px solid rgba(255,255,255,0.5)', background: baseColor }} />
                                    ) : null}
                                    {baseColor ? t('structures.baseColorReady') : t('structures.baseColorPending')}
                                  </span>
                                </div>
                                <div className="hexipedia-template-cells">
                                  <span className="hexipedia-detail-label">{t('structures.validation')}</span>
                                  <span className="hexipedia-detail-text">
                                    {instance.hasErrors ? t('structures.validationInvalid') : t('structures.validationOk')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="hexipedia-history-empty">{t('structures.noneStarted')}</div>
                    )}
                  </div>
                )}
              </div>
            );
          }

          if (sectionId === 'colors') {
            const referenceColorIndex = selectedColorIndex ?? params.PlayerBaseColorIndex;

            return (
              <div
                key="colors"
                ref={(element) => {
                  sectionRefs.current.colors = element;
                }}
                className="hexipedia-section-wrapper"
              >
                <div className="hexipedia-section-header-container">
                  <div
                    className={`hexipedia-section-header ${isCollapsed ? 'collapsed' : ''}`.trim()}
                    onClick={() => toggleSectionCollapse('colors')}
                  >
                    <span className="hexipedia-section-toggle">{isCollapsed ? '▶' : '▼'}</span>
                    <span className="hexipedia-section-title">{t('colors.title')}</span>
                  </div>
                  <div className="hexipedia-section-controls">
                    <button
                      className={`hexipedia-section-move hexipedia-widget-toggle ${showColorWidget ? 'on' : 'off'}`}
                      onClick={() => onToggleColorWidget?.(!showColorWidget)}
                      disabled={!onToggleColorWidget}
                      title={showColorWidget ? t('hexipedia.widget.hideColors') : t('hexipedia.widget.showColors')}
                      aria-label={showColorWidget ? t('hexipedia.widget.hideColors') : t('hexipedia.widget.showColors')}
                    >
                      <i className={`fas ${showColorWidget ? 'fa-eye' : 'fa-eye-slash'}`} aria-hidden="true" />
                    </button>
                    {isPinned && (
                      <>
                        <button
                          className="hexipedia-section-move"
                          onClick={() => moveSectionUp('colors')}
                          disabled={!canMoveUp}
                          title={t('hexipedia.section.moveUp')}
                          aria-label={t('hexipedia.section.moveUp')}
                        >
                          ▲
                        </button>
                        <button
                          className="hexipedia-section-move"
                          onClick={() => moveSectionDown('colors')}
                          disabled={!canMoveDown}
                          title={t('hexipedia.section.moveDown')}
                          aria-label={t('hexipedia.section.moveDown')}
                        >
                          ▼
                        </button>
                      </>
                    )}
                    <button
                      className={`hexipedia-section-move hexipedia-section-pin ${isPinned ? 'pinned' : ''}`}
                      onClick={() => toggleSectionPinned('colors')}
                      title={isPinned ? t('hexipedia.section.unpin') : t('hexipedia.section.pin')}
                      aria-label={isPinned ? t('hexipedia.section.unpin') : t('hexipedia.section.pin')}
                    >
                      <i className="fas fa-thumbtack" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="hexipedia-colors-section">
                    <div className="hexipedia-colors-grid">
                      <div className="hexipedia-colors-column">
                        <div className="hexipedia-color-wheel-wrap">
                          <div className="hexipedia-color-wheel-ring" />
                          <svg className="hexipedia-color-wheel-overlay" viewBox="0 0 300 300" width="200" height="200">
                            {params.ColorPalette.map((color, index) => {
                              const hue = (params.ColorPaletteStartHue + index * params.ColorPaletteHueStep) % 360;
                              const angle = (hue - 90) * (Math.PI / 180);
                              const radius = 128;
                              const x = 150 + radius * Math.cos(angle);
                              const y = 150 + radius * Math.sin(angle);
                              const isSelected = index === selectedColorIndex;

                              return (
                                <g key={`dot-${index}`}>
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r="16"
                                    fill={color}
                                    stroke={isSelected ? '#FFFFFF' : '#AAAAAA'}
                                    strokeWidth={isSelected ? '3' : '2'}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => onColorSelect?.(index)}
                                  />
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      </div>

                      <div className="hexipedia-colors-column">
                        <div className="hexipedia-colors-list">
                          {params.ColorPalette.map((color, index) => {
                            const hue = (params.ColorPaletteStartHue + index * params.ColorPaletteHueStep) % 360;
                            const colorName = getColorNameByHue(hue);
                            const percent = formatRelativePercent(getRelativePercent(index, referenceColorIndex, params.ColorPalette.length));
                            const isSelected = index === referenceColorIndex;

                            return (
                              <div
                                key={index}
                                className={`hexipedia-color-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => onColorSelect?.(index)}
                              >
                                <div className="hexipedia-color-swatch" style={{ backgroundColor: color }}></div>
                                <span className="hexipedia-color-name">{colorName}</span>
                                <span className="hexipedia-color-percent">{percent}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

export default Hexipedia;