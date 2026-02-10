import React from 'react';
import { TutorialLevel } from '../tutorial/tutorialState';
import { t } from '../ui/i18n';
import './TutorialProgressWidget.css';

interface TutorialProgressWidgetProps {
  level: TutorialLevel;
  visitedCount: number;
  totalCount: number;
  isComplete: boolean;
  onComplete: () => void;
  onViewTask?: () => void;
}

export const TutorialProgressWidget: React.FC<TutorialProgressWidgetProps> = ({
  level,
  visitedCount,
  totalCount,
  isComplete,
  onComplete,
  onViewTask,
}) => {
  const handleClick = () => {
    if (isComplete) {
      onComplete();
    } else if (onViewTask) {
      onViewTask();
    }
  };

  return (
    <>
      <div
        className={`tutorial-progress-widget ${isComplete ? 'complete' : 'clickable'}`}
        onClick={handleClick}
        role="button"
        aria-disabled={!isComplete && !onViewTask}
      >
        <div className="tutorial-progress-row">
          <span className={`tutorial-progress-checkbox ${isComplete ? 'checked' : ''}`}>
            {isComplete ? '✓' : ''}
          </span>
          <span className="tutorial-progress-count">{visitedCount} / {totalCount}</span>
          <span className="tutorial-progress-label">{t('tutorial.cellsVisited')}</span>
        </div>
      </div>
      <div className="tutorial-control-hint">{t('tutorial.controlHint')}</div>
    </>
  );
};

export default TutorialProgressWidget;