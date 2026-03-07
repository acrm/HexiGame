import React from 'react';

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
      <div className="hexipedia-section-header-container">
        <div 
          className={`hexipedia-section-header ${isCollapsed ? 'collapsed' : ''}`}
          onClick={onToggleCollapse}
        >
          <span className="hexipedia-section-toggle">{isCollapsed ? '▶' : '▼'}</span>
          <span className="hexipedia-section-title">{title}</span>
        </div>
        <div className="hexipedia-section-controls">
          {headerExtra}
          <button
            className="hexipedia-section-move"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            title="Move up"
            aria-label="Move up"
          >
            ▲
          </button>
          <button
            className="hexipedia-section-move"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            title="Move down"
            aria-label="Move down"
          >
            ▼
          </button>
        </div>
      </div>
      {!isCollapsed && children}
    </div>
  );
};

export default SectionBase;
