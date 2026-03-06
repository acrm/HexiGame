import React from 'react';
import { TutorialLevel } from '../tutorial/tutorialState';
import { getNextTutorialLevel } from '../tutorial/tutorialLevels';
import { t } from '../ui/i18n';
import './TutorialCompletion.css';

interface TutorialCompletionProps {
  level: TutorialLevel;
  onNext: () => void; // Called when "Next Level" is clicked
  onSkipTutorial: () => void; // Called when "Skip Tutorial" is clicked
}

/**
 * Congratulation screen shown after completing a tutorial level
 */
export const TutorialCompletion: React.FC<TutorialCompletionProps> = ({
  level,
  onNext,
  onSkipTutorial,
}) => {
  const nextLevel = getNextTutorialLevel(level.id);
  const hasNextLevel = nextLevel !== null;

  return (
    <div className="tutorial-completion-overlay">
      <div className="tutorial-completion-dialog">
        <div className="tutorial-completion-header">
          <h2>🎉 {t('tutorial.levelComplete')}</h2>
        </div>

        <div className="tutorial-completion-body">
          <p className="tutorial-completion-message">
            {t('tutorial.excellentWork')}
          </p>
          {hasNextLevel && (
            <p className="tutorial-completion-next-hint">
              {t('tutorial.nextLevelHint')}
            </p>
          )}
        </div>

        <div className="tutorial-completion-actions">
          {hasNextLevel ? (
            <>
              <button className="tutorial-btn tutorial-btn-primary" onClick={onNext}>
                {t('tutorial.nextLevel')}
              </button>
              <button className="tutorial-btn tutorial-btn-secondary" onClick={onSkipTutorial}>
                {t('tutorial.skipTutorial')}
              </button>
            </>
          ) : (
            <button className="tutorial-btn tutorial-btn-primary" onClick={onNext}>
              {t('tutorial.completeTutorial')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
