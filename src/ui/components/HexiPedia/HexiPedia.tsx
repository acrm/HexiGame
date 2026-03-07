import React, { useState } from 'react';
import type { GameState } from '../../../gameLogic/core/types';
import type { Params } from '../../../gameLogic/core/params';
import type { TutorialLevel } from '../../../tutorial/tutorialState';
import { axialToKey } from '../../../tutorial/tutorialState';
import { t } from '../../i18n';
import TasksSection from './TasksSection';
import StatsSection from './StatsSection';
import TemplatesSection from './TemplatesSection';
import ColorsSection from './ColorsSection';
import type { SessionHistoryRecord } from './types';
import './HexiPedia.css';

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
  selectedColorIndex?: number;
  onColorSelect?: (index: number) => void;
  showColorWidget?: boolean;
  onToggleColorWidget?: (visible: boolean) => void;
  currentSessionStartTick?: number;
}

/**
 * HexiPedia - Extensible knowledge/reference panel with modular sections
 * 
 * Architecture:
 * - Main container manages state and section visibility
 * - Each section is in a separate component (Tasks, Stats, Templates, Colors)
 * - SectionBase provides reusable header/controls UI
 * - Easy to add new sections: create component, add to sectionOrder
 */
export const HexiPedia: React.FC<HexiPediaProps> = ({
  gameState,
  params,
  interactionMode,
  tutorialLevel,
  tutorialLevelId,
  isTutorialTaskComplete = false,
  completedTutorialLevelIds = new Set(),
  sessionHistory = [],
  trackSessionHistory = true,
  onSelectTutorialLevel,
  onRestartTutorialLevel,
  onToggleTrackHistory,
  onDeleteSessionRecord,
  onClearSessionHistory,
  onSwitchTab,
  onActivateTemplate,
  selectedColorIndex,
  onColorSelect,
  showColorWidget = true,
  onToggleColorWidget,
  currentSessionStartTick = 0,
}) => {
  const [sectionFilter, setSectionFilter] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [sectionOrder, setSectionOrder] = useState(['tasks', 'stats', 'templates', 'colors']);

  // Calculate tutorial progress info
  const progress = gameState.tutorialProgress;
  const targetCells = tutorialLevel?.targetCells ?? [];
  const targetKeys = tutorialLevel ? targetCells.map(axialToKey) : [];
  const visitedCount = progress ? targetKeys.filter(key => progress.visitedTargetKeys.has(key)).length : 0;

  const sectionFilterValue = sectionFilter.trim().toLowerCase();
  const isSectionVisible = (title: string) => {
    if (!sectionFilterValue) return true;
    return title.toLowerCase().includes(sectionFilterValue);
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
        {tutorialLevel || true ? (
          <div>
            {sectionOrder.map(sectionId => {
              const isCollapsed = collapsedSections.has(sectionId);
              const canMoveUp = sectionOrder.indexOf(sectionId) > 0;
              const canMoveDown = sectionOrder.indexOf(sectionId) < sectionOrder.length - 1;

              // Tasks section
              if (sectionId === 'tasks' && isSectionVisible(t('tutorial.tasksTitle'))) {
                return (
                  <TasksSection
                    key="tasks"
                    tutorialLevel={tutorialLevel}
                    tutorialLevelId={tutorialLevelId}
                    isTutorialTaskComplete={isTutorialTaskComplete}
                    completedTutorialLevelIds={completedTutorialLevelIds}
                    interactionMode={interactionMode}
                    onSelectTutorialLevel={onSelectTutorialLevel}
                    onRestartTutorialLevel={onRestartTutorialLevel}
                    onSwitchTab={onSwitchTab}
                    sectionOrder={sectionOrder}
                    isCollapsed={isCollapsed}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    onToggleCollapse={() => toggleSectionCollapse('tasks')}
                    onMoveUp={() => moveSectionUp('tasks')}
                    onMoveDown={() => moveSectionDown('tasks')}
                    tutorialProgress={progress}
                    targetCells={targetCells}
                    visitedCount={visitedCount}
                  />
                );
              }

              // Stats section
              if (sectionId === 'stats' && isSectionVisible(t('stats.title'))) {
                return (
                  <StatsSection
                    key="stats"
                    gameState={gameState}
                    sessionHistory={sessionHistory}
                    trackSessionHistory={trackSessionHistory}
                    currentSessionStartTick={currentSessionStartTick}
                    onToggleTrackHistory={onToggleTrackHistory}
                    onDeleteSessionRecord={onDeleteSessionRecord}
                    onClearSessionHistory={onClearSessionHistory}
                    sectionOrder={sectionOrder}
                    isCollapsed={isCollapsed}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    onToggleCollapse={() => toggleSectionCollapse('stats')}
                    onMoveUp={() => moveSectionUp('stats')}
                    onMoveDown={() => moveSectionDown('stats')}
                  />
                );
              }

              // Templates section
              if (sectionId === 'templates' && isSectionVisible('Build Templates')) {
                return (
                  <TemplatesSection
                    key="templates"
                    gameState={gameState}
                    onActivateTemplate={onActivateTemplate}
                    sectionOrder={sectionOrder}
                    isCollapsed={isCollapsed}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    onToggleCollapse={() => toggleSectionCollapse('templates')}
                    onMoveUp={() => moveSectionUp('templates')}
                    onMoveDown={() => moveSectionDown('templates')}
                  />
                );
              }

              // Colors section
              if (sectionId === 'colors' && isSectionVisible('Цвета')) {
                return (
                  <ColorsSection
                    key="colors"
                    params={params}
                    selectedColorIndex={selectedColorIndex}
                    showColorWidget={showColorWidget}
                    onColorSelect={onColorSelect}
                    onToggleColorWidget={onToggleColorWidget}
                    sectionOrder={sectionOrder}
                    isCollapsed={isCollapsed}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    onToggleCollapse={() => toggleSectionCollapse('colors')}
                    onMoveUp={() => moveSectionUp('colors')}
                    onMoveDown={() => moveSectionDown('colors')}
                  />
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
