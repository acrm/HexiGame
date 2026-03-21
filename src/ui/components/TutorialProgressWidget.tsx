import React from 'react';
import { t } from '../i18n';
import './OverlayWidget.css';
import './TutorialProgressWidget.css';

export type TutorialWidgetPhase = 'pending' | 'active' | 'complete';

interface TutorialProgressWidgetProps {
  phase: TutorialWidgetPhase;
  taskName: string;
  progressCurrent: number;
  progressTotal: number;
  progressLabel: string;
  completeText: string;
  onWidgetClick: () => void;
  onNavigateToTasks?: () => void;
  containerRef?: React.Ref<HTMLDivElement>;
}

export const TutorialProgressWidget: React.FC<TutorialProgressWidgetProps> = ({
  phase,
  taskName,
  progressCurrent,
  progressTotal,
  progressLabel,
  completeText,
  onWidgetClick,
  onNavigateToTasks,
  containerRef,
}) => {
  return (
    <div ref={containerRef} className="overlay-widget-shell tutorial-progress-container">
      <div
        className={`overlay-widget-body tutorial-progress-widget phase-${phase}`}
        onClick={onWidgetClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onWidgetClick(); }}
        aria-label={phase === 'pending' ? taskName : undefined}
      >
        {phase === 'pending' && (
          <div className="tutorial-progress-row">
            <span className="tutorial-task-icon" aria-hidden="true">▶</span>
            <span className="tutorial-task-name">{taskName}</span>
          </div>
        )}

        {phase === 'active' && (
          <div className="tutorial-progress-row">
            <span className="tutorial-progress-count">{progressCurrent} / {progressTotal}</span>
            <span className="tutorial-progress-label">{progressLabel}</span>
          </div>
        )}

        {phase === 'complete' && (
          <div className="tutorial-progress-row">
            <span className="tutorial-progress-checkbox checked" aria-hidden="true">✓</span>
            <span className="tutorial-complete-text">{completeText}</span>
          </div>
        )}
      </div>
      {onNavigateToTasks && (
        <button
          type="button"
          className="overlay-widget-edge-button tutorial-info-button"
          onClick={(event) => {
            event.stopPropagation();
            onNavigateToTasks();
          }}
          title={t('tutorial.widget.openTasks')}
          aria-label={t('tutorial.widget.openTasks')}
        >
          »
        </button>
      )}
    </div>
  );
};

export default TutorialProgressWidget;
