import React from 'react';
import { TuiBorderRow, TuiIconButton } from '../../tui';

interface SectionBaseProps {
  sectionId: string;
  title: string;
  isCollapsed: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggleCollapse: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}

const SectionBase: React.FC<SectionBaseProps> = ({
  sectionId,
  title,
  isCollapsed,
  canMoveUp,
  canMoveDown,
  onToggleCollapse,
  onMoveUp,
  onMoveDown,
  children,
  headerExtra,
}) => {
  return (
    <div key={sectionId} className="hexipedia-section-wrapper">
      <TuiBorderRow
        className="hexipedia-section-header-row"
        left={
          <div
            className={`hexipedia-section-header ${isCollapsed ? 'collapsed' : ''}`}
            onClick={onToggleCollapse}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleCollapse(); }}
          >
            <span className="hexipedia-section-toggle">{isCollapsed ? '▶' : '▼'}</span>
            <span className="hexipedia-section-title">{title}</span>
          </div>
        }
        right={
          <div className="hexipedia-section-controls">
            {headerExtra}
            <TuiIconButton
              onClick={onMoveUp}
              disabled={!canMoveUp}
              title="Move up"
              aria-label="Move up"
            >
              ▲
            </TuiIconButton>
            <TuiIconButton
              onClick={onMoveDown}
              disabled={!canMoveDown}
              title="Move down"
              aria-label="Move down"
            >
              ▼
            </TuiIconButton>
          </div>
        }
      />
      {!isCollapsed && children}
    </div>
  );
};

export default SectionBase;
