import React, { useState } from 'react';
import { TutorialLevel } from '../../tutorial/tutorialState';
import { t } from '../i18n';
import './OverlayWidget.css';
import './TutorialProgressWidget.css';

interface TutorialProgressWidgetProps {
  level: TutorialLevel;
  hintText: string;
  visitedCount: number;
  totalCount: number;
  isComplete: boolean;
  onComplete: () => void;
  onViewTask?: () => void;
}

export const TutorialProgressWidget: React.FC<TutorialProgressWidgetProps> = ({
  level,
  hintText,
  visitedCount,
  totalCount,
  isComplete,
  onComplete,
  onViewTask,
}) => {
  const [showInfoBubble, setShowInfoBubble] = useState(false);

  const handleClick = () => {
    if (isComplete) {
      onComplete();
    } else if (onViewTask) {
      onViewTask();
    }
  };

  return (
    <>
      <div className="overlay-widget-shell tutorial-progress-container">
        <div
          className={`overlay-widget-body tutorial-progress-widget ${isComplete ? 'complete' : 'clickable'}`}
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
        <button
          type="button"
          className="overlay-widget-edge-button tutorial-info-button"
          onClick={(e) => {
            e.stopPropagation();
            setShowInfoBubble(!showInfoBubble);
          }}
          title="Show task hint"
          aria-label="Task information"
        >
          ℹ
        </button>
      </div>
      {showInfoBubble && (
        <div className="tutorial-info-bubble">
          <button
            className="tutorial-info-close"
            onClick={() => setShowInfoBubble(false)}
            aria-label="Close"
          >
            ✕
          </button>
          <div className="tutorial-info-content">
            <div className="tutorial-info-title">{level.objective}</div>
            <div className="tutorial-info-hint">{hintText}</div>
          </div>
        </div>
      )}
    </>
  );
};

export default TutorialProgressWidget;