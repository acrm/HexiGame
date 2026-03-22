import React from 'react';
import { t } from '../i18n';
import './OverlayWidget.css';
import './StructureProgressWidget.css';

interface StructureProgressWidgetProps {
  structureName: string;
  progressCurrent: number;
  progressTotal: number;
  hasErrors: boolean;
  isCompleted: boolean;
  baseColor: string | null;
  onNavigateToStructures?: () => void;
}

function getStatusLabel(hasErrors: boolean, isCompleted: boolean): string {
  if (isCompleted) return t('structures.widget.status.complete');
  if (hasErrors) return t('structures.widget.status.invalid');
  return t('structures.widget.status.progress');
}

export const StructureProgressWidget: React.FC<StructureProgressWidgetProps> = ({
  structureName,
  progressCurrent,
  progressTotal,
  hasErrors,
  isCompleted,
  baseColor,
  onNavigateToStructures,
}) => {
  const statusLabel = getStatusLabel(hasErrors, isCompleted);

  return (
    <div className="overlay-widget-shell structure-progress-widget-shell">
      <button
        type="button"
        className={`overlay-widget-body structure-progress-widget ${hasErrors ? 'is-invalid' : ''} ${isCompleted ? 'is-complete' : ''}`.trim()}
        onClick={onNavigateToStructures}
        disabled={!onNavigateToStructures}
      >
        <div className="structure-progress-widget__header">
          <span className="structure-progress-widget__name">{structureName}</span>
          <span className="structure-progress-widget__status">{statusLabel}</span>
        </div>
        <div className="structure-progress-widget__meta">
          {baseColor && (
            <span
              className="structure-progress-widget__swatch"
              style={{ backgroundColor: baseColor }}
              aria-hidden="true"
            />
          )}
          <span className="structure-progress-widget__progress">
            {progressCurrent} / {progressTotal}
          </span>
        </div>
      </button>
      {onNavigateToStructures && (
        <button
          type="button"
          className="overlay-widget-edge-button structure-progress-widget__navigate-button"
          onClick={onNavigateToStructures}
          title={t('structures.widget.openStructures')}
          aria-label={t('structures.widget.openStructures')}
        >
          »
        </button>
      )}
    </div>
  );
};

export default StructureProgressWidget;