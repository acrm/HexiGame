import React, { useState } from 'react';
import { GameState } from '../logic/pureLogic';
import { TutorialLevel, getHintForMode, axialToKey } from '../tutorial/tutorialState';
import { t } from '../ui/i18n';
import { getAllTutorialLevels } from '../tutorial/tutorialLevels';
import { audioManager } from '../audio/audioManager';
import { ALL_TEMPLATES } from '../templates/templateLibrary';
import './HexiPedia.css';

interface HexiPediaProps {
  gameState: GameState;
  interactionMode: 'desktop' | 'mobile';
  tutorialLevel: TutorialLevel | null;
  onSwitchTab?: (tab: string) => void;
  onActivateTemplate?: (templateId: string) => void;
}

export const HexiPedia: React.FC<HexiPediaProps> = ({
  gameState,
  interactionMode,
  tutorialLevel,
  onSwitchTab,
  onActivateTemplate,
}) => {
  const [expandedLevelId, setExpandedLevelId] = useState<string | null>(
    tutorialLevel?.id ?? null
  );
  const progress = gameState.tutorialProgress;
  const hint = tutorialLevel ? getHintForMode(tutorialLevel.hints, interactionMode) : '';
  const fullHint = hint ? `${hint} ${t('tutorial.followFocusNote')}` : t('tutorial.followFocusNote');

  const targetCells = tutorialLevel?.targetCells ?? [];
  const targetKeys = tutorialLevel ? targetCells.map(axialToKey) : [];
  const visitedCount = progress ? targetKeys.filter(key => progress.visitedTargetKeys.has(key)).length : 0;
  const isTutorialTaskComplete = targetCells.length > 0 && visitedCount === targetCells.length;

  const toggleSection = (sectionId: string) => {
    if (expandedLevelId === sectionId) {
      setExpandedLevelId(null);
    } else {
      setExpandedLevelId(sectionId);
    }
  };

  // Get all tutorial levels and determine which are completed
  const allLevels = getAllTutorialLevels();
  const completedLevelIds = new Set<string>();
  
  // If there's a current tutorial level, all previous levels are completed
  if (tutorialLevel) {
    const currentIndex = allLevels.findIndex(l => l.id === tutorialLevel.id);
    for (let i = 0; i < currentIndex; i++) {
      completedLevelIds.add(allLevels[i].id);
    }
  } else {
    // No active tutorial means all are completed
    for (const level of allLevels) {
      completedLevelIds.add(level.id);
    }
  }

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
      {tutorialLevel || allLevels.length > 0 ? (
        <div>
          <div className="hexipedia-accordion-list">
            <div className="hexipedia-accordion-header">{t('tutorial.tasksTitle')}</div>
            {allLevels.map(level => {
            const isCurrent = tutorialLevel?.id === level.id;
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

          <div className="hexipedia-stats-section">
            <div className="hexipedia-stats-header">{t('stats.title')}</div>
            <div className="hexipedia-stats-content">
              <div className="hexipedia-stat-row">
                <span className="hexipedia-stat-label">{t('stats.sessionTime')}</span>
                <span className="hexipedia-stat-value">{formatSessionTime(sessionDuration)}</span>
              </div>
              <div className="hexipedia-stat-row">
                <span className="hexipedia-stat-label">{t('stats.sessionTicks')}</span>
                <span className="hexipedia-stat-value">{sessionDuration}</span>
              </div>
            </div>
          </div>


          <div className="hexipedia-templates-section">
            <div className="hexipedia-section-title">Build Templates</div>
            <div className="hexipedia-templates-list">
              <label className="hexipedia-template-radio">
                <input
                  type="radio"
                  name="active-template"
                  value=""
                  checked={!gameState.activeTemplate}
                  onChange={() => {
                    /* Deactivate template - handled by parent */
                    onActivateTemplate?.('');
                  }}
                />
                <span className="hexipedia-template-name">None</span>
              </label>
              
              {ALL_TEMPLATES.map(template => {
                const isCompleted = gameState.completedTemplates?.has(template.id) ?? false;
                const isActive = gameState.activeTemplate?.templateId === template.id;
                
                return (
                  <label key={template.id} className="hexipedia-template-radio">
                    <input
                      type="radio"
                      name="active-template"
                      value={template.id}
                      checked={isActive}
                      onChange={() => onActivateTemplate?.(template.id)}
                    />
                    <span className="hexipedia-template-name">{template.name.en}</span>
                    <span className={`hexipedia-template-status ${isCompleted ? 'completed' : ''}`}>
                      {isCompleted ? '✓' : ''}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="hexipedia-panel">
          <div className="hexipedia-text">{t('tutorial.noActiveTask')}</div>
        </div>
      )}
    </div>
  );
};

export default HexiPedia;