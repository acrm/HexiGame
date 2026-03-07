/**
 * HexiPedia - Extensible knowledge/reference panel with searchable sections
 * 
 * Architecture supports:
 * - Unlimited searchable sections (each with search keywords in multiple languages)  * - Pin/unpin sections to customize layout
 * - Collapsible sections to manage vertical space
 * - Future: drag-to-reorder, favorites, nested subsections
 */

import React, { useState, useMemo } from 'react';
import type { GameState } from '../../../gameLogic/core/types';
import type { Params } from '../../../gameLogic/core/params';
import { TutorialLevel, getHintForMode, axialToKey } from '../../../tutorial/tutorialState';
import { t } from '../../i18n';
import { getAllTutorialLevels } from '../../../tutorial/tutorialLevels';
import { audioManager } from '../../../audio/audioManager';
import { ALL_TEMPLATES } from '../../../templates/templateLibrary';
import SectionBase from './sections/SectionBase';
import { HEXIPEDIA_SECTIONS, DEFAULT_SECTION_ORDER } from './constants';
import type { SectionId, HexiPediaSectionState, SessionHistoryRecord } from './types';
import '../HexiPedia.css';

interface HexiPediaProps {
  gameState: GameState;
  params: Params;
  interactionMode: 'desktop' | 'mobile';
  tutorialLevel: TutorialLevel | null;
  tutorialLevelId?: string | null;
  isTutorialTaskComplete?: boolean;
  completedTutorialLevelIds?: Set<string>;
  sessionHistory?: SessionHistoryRecord[];
  trackSessionHistory?: boolean;
  onSelectTutorialLevel?: (levelId: string) => void;
  onRestartTutorialLevel?: (levelId: string) => void;
  onToggleTrackHistory?: (enabled: boolean) => void;
  onDeleteSessionRecord?: (recordId: string) => void;
  onClearSessionHistory?: () => void;
  onSwitchTab?: (tab: string) => void;
  onActivateTemplate?: (templateId: string) => void;
  selectedColorIndex?: number;
  onColorSelect?: (index: number) => void;
  showColorWidget?: boolean;
  onToggleColorWidget?: (visible: boolean) => void;
  currentSessionStartTick?: number;
}

/**
 * HexiPedia container component
 * Manages search, section visibility, and collapsed/pinned state
 */
export const HexiPedia: React.FC<HexiPediaProps> = ({
  gameState,
  params,
  interactionMode,
  tutorialLevel,
  tutorialLevelId,
  isTutorialTaskComplete = false,
  completedTutorialLevelIds = new Set(),
  sessionHistory = [],
  trackSessionHistory = true,
  onSelectTutorialLevel,
  onRestartTutorialLevel,
  onToggleTrackHistory,
  onDeleteSessionRecord,
  onClearSessionHistory,
  onSwitchTab,
  onActivateTemplate,
  selectedColorIndex,
  onColorSelect,
  showColorWidget = true,
  onToggleColorWidget,
  currentSessionStartTick = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionStates, setSectionStates] = useState<Map<SectionId, HexiPediaSectionState>>(() => {
    const m = new Map<SectionId, HexiPediaSectionState>();
    DEFAULT_SECTION_ORDER.forEach((sectionId, index) => {
      m.set(sectionId, {
        sectionId,
        isPinned: false,
        isExpanded: true,
        order: index,
      });
    });
    return m;
  });

  // Filter sections based on search query
  const filteredSectionIds = useMemo(() => {
    if (!searchQuery.trim()) {
      return DEFAULT_SECTION_ORDER;
    }
    const query = searchQuery.toLowerCase();
    return DEFAULT_SECTION_ORDER.filter(sectionId => {
      const section = HEXIPEDIA_SECTIONS[sectionId];
      if (!section) return false;
      
      const searchIn = [...section.searchKeywords.en, ...section.searchKeywords.ru];
      return searchIn.some(keyword => keyword.includes(query));
    });
  }, [searchQuery]);

  // Sort sections: pinned first, then by order
  const orderedSectionIds = useMemo(() => {
    return [...filteredSectionIds].sort((a, b) => {
      const stateA = sectionStates.get(a);
      const stateB = sectionStates.get(b);
      
      // Pinned sections first
      if (stateA?.isPinned && !stateB?.isPinned) return -1;
      if (!stateA?.isPinned && stateB?.isPinned) return 1;
      
      // Then by order
      return (stateA?.order ?? 0) - (stateB?.order ?? 0);
    });
  }, [filteredSectionIds, sectionStates]);

  const handleTogglePin = (sectionId: SectionId) => {
    setSectionStates(prev => {
      const newMap = new Map(prev);
      const state = newMap.get(sectionId);
      if (state) {
        newMap.set(sectionId, { ...state, isPinned: !state.isPinned });
      }
      return newMap;
    });
  };

  const handleToggleExpand = (sectionId: SectionId) => {
    setSectionStates(prev => {
      const newMap = new Map(prev);
      const state = newMap.get(sectionId);
      if (state) {
        newMap.set(sectionId, { ...state, isExpanded: !state.isExpanded });
      }
      return newMap;
    });
  };

  const progress = gameState.tutorialProgress;
  const hint = tutorialLevel ? getHintForMode(tutorialLevel.hints, interactionMode) : '';
  const fullHint = hint ? `${hint} ${t('tutorial.followFocusNote')}` : t('tutorial.followFocusNote');

  const targetCells = tutorialLevel?.targetCells ?? [];
  const targetKeys = tutorialLevel ? targetCells.map(axialToKey) : [];
  const visitedCount = progress ? targetKeys.filter(key => progress.visitedTargetKeys.has(key)).length : 0;

  return (
    <div className="hexipedia-container">
      {/* Search header */}
      <div className="hexipedia-search-header">
        <input
          type="text"
          className="hexipedia-search-input"
          placeholder={t('search') || 'Search sections...'}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="hexipedia-search-clear" onClick={() => setSearchQuery('')}>
            ✕
          </button>
        )}
      </div>

      {/* Sections */}
      <div className="hexipedia-sections">
        {orderedSectionIds.length === 0 ? (
          <div className="hexipedia-no-results">{t('noResults') || 'No sections found'}</div>
        ) : (
          orderedSectionIds.map(sectionId => {
            const section = HEXIPEDIA_SECTIONS[sectionId];
            const state = sectionStates.get(sectionId);
            if (!section || !state) return null;

            return (
              <SectionBase
                key={sectionId}
                section={section}
                isExpanded={state.isExpanded}
                isPinned={state.isPinned}
                onToggleExpand={() => handleToggleExpand(sectionId)}
                onTogglePin={() => handleTogglePin(sectionId)}
              >
                {/* Render section content based on sectionId */}
                {renderSectionContent(
                  sectionId,
                  {
                    gameState,
                    params,
                    interactionMode,
                    tutorialLevel,
                    tutorialLevelId,
                    isTutorialTaskComplete,
                    completedTutorialLevelIds,
                    sessionHistory,
                    trackSessionHistory,
                    currentSessionStartTick,
                  },
                  {
                    onSelectTutorialLevel,
                    onRestartTutorialLevel,
                    onToggleTrackHistory,
                    onDeleteSessionRecord,
                    onClearSessionHistory,
                    onSwitchTab,
                    onActivateTemplate,
                    selectedColorIndex,
                    onColorSelect,
                    showColorWidget,
                    onToggleColorWidget,
                  }
                )}
              </SectionBase>
            );
          })
        )}
      </div>
    </div>
  );
};

/**
 * Render content for each section type
 * This function acts as a dispatcher for section rendering
 * Extensible: add new section types here
 */
function renderSectionContent(
  sectionId: SectionId,
  sectionData: any,
  sectionCallbacks: any
): React.ReactNode {
  switch (sectionId) {
    case 'tasks':
      return <TasksSectionContent {...sectionData} {...sectionCallbacks} />;
    case 'stats':
      return <StatsSectionContent {...sectionData} {...sectionCallbacks} />;
    case 'templates':
      return <TemplatesSectionContent {...sectionData} {...sectionCallbacks} />;
    case 'colors':
      return <ColorsSectionContent {...sectionData} {...sectionCallbacks} />;
    default:
      return <div>Unknown section</div>;
  }
}

// TODO: Extract these into separate component files
function TasksSectionContent() {
  return <div>Tasks content here</div>;
}

function StatsSectionContent() {
  return <div>Stats content here</div>;
}

function TemplatesSectionContent() {
  return <div>Templates content here</div>;
}

function ColorsSectionContent() {
  return <div>Colors content here</div>;
}

export default HexiPedia;
