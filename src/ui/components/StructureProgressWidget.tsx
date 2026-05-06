import React from 'react';
import { t } from '../i18n';
import { TuiIconButton } from '../tui';
import OverlayWidgetFrame, { type OverlayWidgetStackRole } from './OverlayWidgetFrame';
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
  stackRole?: OverlayWidgetStackRole;
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
  stackRole,
}) => {
  const statusLabel = getStatusLabel(hasErrors, isCompleted);

  return (
    <OverlayWidgetFrame
      className="structure-progress-widget-shell"
      stackRole={stackRole}
    >
      <div className="overlay-widget-shell">
        <button
          type="button"
          className={`overlay-widget-body structure-progress-widget ${hasErrors ? 'is-invalid' : ''} ${isCompleted ? 'is-complete' : ''}`.trim()}
          onClick={onNavigateToStructures}
          disabled={!onNavigateToStructures}
        >
          <div className="structure-progress-widget__row">
            <span className="structure-progress-widget__name">{structureName}</span>
            {baseColor && (
              <span
                className="structure-progress-widget__swatch"
                style={{ color: baseColor }}
                aria-hidden="true"
              >
                {'■'}
              </span>
            )}
            <span className="structure-progress-widget__progress">
              {progressCurrent} / {progressTotal}
            </span>
            <span className="structure-progress-widget__status">{statusLabel}</span>
          </div>
        </button>
        {onNavigateToStructures && (
          <TuiIconButton
            type="button"
            className="overlay-widget-edge-button structure-progress-widget__navigate-button tui-icon-btn--no-brackets"
            onClick={onNavigateToStructures}
            title={t('structures.widget.openStructures')}
            aria-label={t('structures.widget.openStructures')}
          >
            {'►'}
          </TuiIconButton>
        )}
      </div>
    </OverlayWidgetFrame>
  );
};

export default StructureProgressWidget;