import React from 'react';
import { t } from '../i18n';
import './OverlayWidget.css';
import './TutorialProgressWidget.css';

interface TutorialProgressWidgetProps {
  progressCurrent: number;
  progressTotal: number;
  progressLabel: string;
  isComplete: boolean;
  onComplete: () => void;
  onViewTask?: () => void;
  containerRef?: React.Ref<HTMLDivElement>;
}

export const TutorialProgressWidget: React.FC<TutorialProgressWidgetProps> = ({
  progressCurrent,
  progressTotal,
  progressLabel,
  isComplete,
  onComplete,
  onViewTask,
  containerRef,
}) => {
  const handleClick = () => {
    if (isComplete) {
      onComplete();
    } else if (onViewTask) {
      onViewTask();
    }
  };

  return (
    <div ref={containerRef} className="overlay-widget-shell tutorial-progress-container">
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
        title={t('tutorial.widget.openTasks')}
        aria-label={t('tutorial.widget.openTasks')}
      >
        »
      </button>
    </div>
  );
};

export default TutorialProgressWidget;