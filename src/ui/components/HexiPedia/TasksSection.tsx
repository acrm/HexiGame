import React, { useState } from 'react';
import type { TutorialLevel } from '../../../tutorial/tutorialState';
import { getHintForMode, axialToKey } from '../../../tutorial/tutorialState';
import { t } from '../../i18n';
import { getAllTutorialLevels } from '../../../tutorial/tutorialLevels';
import { audioController } from '../../../appLogic/audioController';
import SectionBase from './SectionBase';

interface TasksSectionProps {
  tutorialLevel: TutorialLevel | null;
  tutorialLevelId?: string | null;
  isTutorialTaskComplete?: boolean;
  completedTutorialLevelIds?: Set<string>;
  interactionMode: 'desktop' | 'mobile';
  soundEnabled?: boolean;
  soundVolume?: number;
  onSelectTutorialLevel?: (levelId: string) => void;
  onRestartTutorialLevel?: (levelId: string) => void;
  onSwitchTab?: (tab: string) => void;
  sectionOrder: string[];
  isCollapsed: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggleCollapse: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  tutorialProgress?: any;
  targetCells?: any[];
  visitedCount?: number;
}

export const TasksSection: React.FC<TasksSectionProps> = ({
  tutorialLevel,
  tutorialLevelId,
  isTutorialTaskComplete = false,
  completedTutorialLevelIds = new Set(),
  interactionMode,
  soundEnabled = true,
  soundVolume = 0.6,
  onSelectTutorialLevel,
  onRestartTutorialLevel,
  onSwitchTab,
  sectionOrder,
  isCollapsed,
  canMoveUp,
  canMoveDown,
  onToggleCollapse,
  onMoveUp,
  onMoveDown,
  tutorialProgress,
  targetCells: propTargetCells,
  visitedCount: propVisitedCount,
}) => {
  const [expandedLevelId, setExpandedLevelId] = useState<string | null>(tutorialLevel?.id ?? null);
  
  const allLevels = getAllTutorialLevels();
  const hint = tutorialLevel ? getHintForMode(tutorialLevel.hints, interactionMode) : '';
  const fullHint = hint ? `${hint} ${t('tutorial.followFocusNote')}` : t('tutorial.followFocusNote');
  const targetCells = propTargetCells ?? tutorialLevel?.targetCells ?? [];
  const targetKeys = tutorialLevel ? targetCells.map(axialToKey) : [];
  const visitedCount = propVisitedCount ?? (tutorialProgress ? targetKeys.filter(key => tutorialProgress.visitedTargetKeys.has(key)).length : 0);

  const toggleSection = (sectionId: string) => {
    if (expandedLevelId === sectionId) {
      setExpandedLevelId(null);
    } else {
      setExpandedLevelId(sectionId);
    }
  };

  return (
    <SectionBase
      sectionId="tasks"
      title={t('tutorial.tasksTitle')}
      isCollapsed={isCollapsed}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      onToggleCollapse={onToggleCollapse}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
    >
      <div className="hexipedia-accordion-list">
        {allLevels.map(level => {
          const isCurrent = tutorialLevelId === level.id;
          const isCompleted = completedTutorialLevelIds.has(level.id) || (isCurrent && isTutorialTaskComplete);
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
                        audioController.playRandomSound(soundEnabled, soundVolume);
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
                        audioController.playRandomSound(soundEnabled, soundVolume);
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
                              audioController.playRandomSound(soundEnabled, soundVolume);
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
    </SectionBase>
  );
};

export default TasksSection;
