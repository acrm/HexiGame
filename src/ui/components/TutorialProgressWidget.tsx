import React from 'react';
import './OverlayWidget.css';
import './TutorialProgressWidget.css';

interface TutorialProgressWidgetProps {
  progressCurrent: number;
  progressTotal: number;
  progressLabel: string;
  isComplete: boolean;
  onComplete: () => void;
  onViewTask?: () => void;
}

export const TutorialProgressWidget: React.FC<TutorialProgressWidgetProps> = ({
  progressCurrent,
  progressTotal,
  progressLabel,
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
          <span className="tutorial-progress-count">{progressCurrent} / {progressTotal}</span>
          <span className="tutorial-progress-label">{progressLabel}</span>
        </div>
      </div>
      <button
        type="button"
        className="overlay-widget-edge-button tutorial-info-button"
        onClick={(event) => {
          event.stopPropagation();
          onViewTask?.();
        }}
        disabled={!onViewTask}
        title="Open tasks in HexiPedia"
        aria-label="Open tasks in HexiPedia"
      >
        »
      </button>
    </div>
  );
};

export default TutorialProgressWidget;