import React from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import GuestStart from '../GuestStart';
import Mascot from '../Mascot';
import Settings from '../Settings';
import TutorialProgressWidget from '../TutorialProgressWidget';
import TutorialTaskIntroModal from '../TutorialTaskIntroModal';
import ColorPaletteWidget from '../ColorPaletteWidget';

type HexiPediaSectionId = 'tasks' | 'stats' | 'templates' | 'colors';

interface GameOverlaysProps {
  isMobileLayout: boolean;
  mobileTab: MobileTab;
  tutorialWidgetProps: React.ComponentProps<typeof TutorialProgressWidget> | null;
  tutorialIntroModalProps: React.ComponentProps<typeof TutorialTaskIntroModal> | null;
  colorPaletteWidgetProps: React.ComponentProps<typeof ColorPaletteWidget> | null;
  sectionOrder: HexiPediaSectionId[];
  showGuestStart: boolean;
  onGuestStart: () => void;
  isSettingsOpen: boolean;
  settingsProps: React.ComponentProps<typeof Settings>;
  isMascotOpen: boolean;
  onCloseMascot: () => void;
}

export const GameOverlays: React.FC<GameOverlaysProps> = ({
  isMobileLayout,
  mobileTab,
  tutorialWidgetProps,
  tutorialIntroModalProps,
  colorPaletteWidgetProps,
  sectionOrder,
  showGuestStart,
  onGuestStart,
  isSettingsOpen,
  settingsProps,
  isMascotOpen,
  onCloseMascot,
}) => {
  return (
    <>
      {isMobileLayout && mobileTab === 'heximap' && (
        <div className="widget-stack-overlay">
          {sectionOrder.map(sectionId => {
            if (sectionId === 'tasks' && tutorialWidgetProps) {
              return <TutorialProgressWidget key="tasks" {...tutorialWidgetProps} />;
            }
            if (sectionId === 'colors' && colorPaletteWidgetProps) {
              return <ColorPaletteWidget key="colors" {...colorPaletteWidgetProps} />;
            }
            return null;
          })}
        </div>
      )}

      {tutorialIntroModalProps && <TutorialTaskIntroModal {...tutorialIntroModalProps} />}

      {showGuestStart && <GuestStart onStart={onGuestStart} />}

      {isSettingsOpen && <Settings {...settingsProps} />}

      {isMascotOpen && <Mascot onClose={onCloseMascot} />}
    </>
  );
};

export default GameOverlays;
