/**
 * Base component for HexiPedia sections
 * Provides: header with title, pin button, collapse toggle, and content area
 */

import React from 'react';
import type { HexiPediaSection } from '../types';

interface SectionBaseProps {
  section: HexiPediaSection;
  isExpanded: boolean;
  isPinned: boolean;
  children: React.ReactNode;
  onToggleExpand: () => void;
  onTogglePin: () => void;
}

export const SectionBase: React.FC<SectionBaseProps> = ({
  section,
  isExpanded,
  isPinned,
  children,
  onToggleExpand,
  onTogglePin,
}) => {
  return (
    <div className="hexipedia-section" data-section-id={section.id}>
      <div className="section-header">
        <div className="section-title-area" onClick={onToggleExpand}>
          <i className={`section-icon ${section.icon}`}></i>
          <h3 className="section-title">{section.name.en}</h3>
          <i className={`section-toggle ${isExpanded ? 'expanded' : 'collapsed'}`}>
            {isExpanded ? '▼' : '▶'}
          </i>
        </div>
        <button
          className={`section-pin-btn ${isPinned ? 'pinned' : ''}`}
          onClick={onTogglePin}
          title={isPinned ? 'Unpin section' : 'Pin section'}
        >
          <i className={isPinned ? 'fas fa-thumbtack' : 'fas fa-thumbtack'} style={{ opacity: isPinned ? 1 : 0.5 }}></i>
        </button>
      </div>
      {isExpanded && <div className="section-content">{children}</div>}
    </div>
  );
};

export default SectionBase;
