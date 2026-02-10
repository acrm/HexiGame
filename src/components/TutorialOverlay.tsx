import React from 'react';
import { GameState, Params } from '../logic/pureLogic';
import { TutorialLevel, getHintForMode, TutorialProgressData } from '../tutorial/tutorialState';
import { t } from '../ui/i18n';
import './TutorialOverlay.css';

interface TutorialOverlayProps {
  gameState: GameState;
  params: Params;
  level: TutorialLevel;
  interactionMode: 'desktop' | 'mobile';
}

/**
 * Оверлей туториала - отображает цель, подсказку и прогресс
 */
export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  gameState,
  params,
  level,
  interactionMode,
}) => {
  const progress = gameState.tutorialProgress;
  if (!progress) return null;

  const hint = getHintForMode(level.hints, interactionMode);
  const visitedCount = progress.visitedTargetKeys.size;

  // Для уровня движения показываем счётчик посещённых клеток
  const progressText =
    level.id === 'tutorial_1_movement'
      ? `${visitedCount} / 3 ${t('tutorial.cellsVisited')}`
      : null;

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-panel">
        <div className="tutorial-objective">
          <h3>{level.objective}</h3>
        </div>

        {progressText && <div className="tutorial-progress">{progressText}</div>}

        <div className="tutorial-hint">
          <p>{hint}</p>
        </div>
      </div>
    </div>
  );
};
