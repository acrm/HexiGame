import React, { useState } from 'react';
import type { GameState } from '../../../gameLogic/core/types';
import { audioController } from '../../../appLogic/audioController';
import { ALL_TEMPLATES } from '../../../templates/templateLibrary';
import SectionBase from './SectionBase';

interface TemplatesSectionProps {
  gameState: GameState;
  soundEnabled?: boolean;
  soundVolume?: number;
  onActivateTemplate?: (templateId: string) => void;
  sectionOrder: string[];
  isCollapsed: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggleCollapse: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const TemplatesSection: React.FC<TemplatesSectionProps> = ({
  gameState,
  soundEnabled = true,
  soundVolume = 0.6,
  onActivateTemplate,
  sectionOrder,
  isCollapsed,
  canMoveUp,
  canMoveDown,
  onToggleCollapse,
  onMoveUp,
  onMoveDown,
}) => {
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  return (
    <SectionBase
      sectionId="templates"
      title="Build Templates"
      isCollapsed={isCollapsed}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      onToggleCollapse={onToggleCollapse}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
    >
      <div className="hexipedia-templates-section">
        <div className="hexipedia-templates-list">
          <label className="hexipedia-template-radio">
            <input
              type="radio"
              name="active-template"
              value=""
              checked={!gameState.activeTemplate}
              onChange={() => {
                audioController.playRandomSound(soundEnabled, soundVolume);
                onActivateTemplate?.('');
              }}
            />
            <span className="hexipedia-template-name">None</span>
          </label>
          
          {ALL_TEMPLATES.map(template => {
            const isCompleted = gameState.completedTemplates?.has(template.id) ?? false;
            const isActive = gameState.activeTemplate?.templateId === template.id;
            const isExpanded = expandedTemplateId === template.id;
            
            return (
              <div key={template.id} className="hexipedia-template-item">
                <div className="hexipedia-template-row">
                  <label className="hexipedia-template-radio">
                    <input
                      type="radio"
                      name="active-template"
                      value={template.id}
                      checked={isActive}
                      onChange={() => {
                        audioController.playRandomSound(soundEnabled, soundVolume);
                        onActivateTemplate?.(template.id);
                      }}
                    />
                    <span className="hexipedia-template-name">{template.name.en}</span>
                    <span className={`hexipedia-template-difficulty ${template.difficulty}`}>
                      {template.difficulty === 'easy' && '●'}
                      {template.difficulty === 'medium' && '●●'}
                      {template.difficulty === 'hard' && '●●●'}
                    </span>
                    <span className={`hexipedia-template-status ${isCompleted ? 'completed' : ''}`}>
                      {isCompleted ? '✓' : ''}
                    </span>
                  </label>
                  
                  <button
                    className={`hexipedia-template-expand ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => {
                      audioController.playRandomSound(soundEnabled, soundVolume);
                      setExpandedTemplateId(isExpanded ? null : template.id);
                    }}
                    aria-label="Show template details"
                  >
                    ▼
                  </button>
                </div>

                {isExpanded && (
                  <div className="hexipedia-template-details">
                    {template.description && (
                      <div className="hexipedia-template-description">
                        <span className="hexipedia-detail-label">Description:</span>
                        <span className="hexipedia-detail-text">{template.description.en}</span>
                      </div>
                    )}
                    
                    {template.hints && template.hints.en && template.hints.en.length > 0 && (
                      <div className="hexipedia-template-hints">
                        <span className="hexipedia-detail-label">Hints:</span>
                        <ul className="hexipedia-hints-list">
                          {template.hints.en.map((hint, idx) => (
                            <li key={idx} className="hexipedia-hint-item">{hint}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="hexipedia-template-cells">
                      <span className="hexipedia-detail-label">Cells:</span>
                      <span className="hexipedia-detail-text">{template.structure.cells.length}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SectionBase>
  );
};

export default TemplatesSection;
