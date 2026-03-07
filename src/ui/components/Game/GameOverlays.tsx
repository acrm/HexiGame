import React from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import GuestStart from '../GuestStart';
import Mascot from '../Mascot';
import Settings from '../Settings';
import TutorialProgressWidget from '../TutorialProgressWidget';

interface GameOverlaysProps {
  isMobileLayout: boolean;
  mobileTab: MobileTab;
  tutorialWidgetProps: React.ComponentProps<typeof TutorialProgressWidget> | null;
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
  showGuestStart,
  onGuestStart,
  isSettingsOpen,
  settingsProps,
  isMascotOpen,
  onCloseMascot,
}) => {
  return (
    <>
      {isMobileLayout && mobileTab === 'heximap' && tutorialWidgetProps && (
        <div className="tutorial-widget-overlay">
          <TutorialProgressWidget {...tutorialWidgetProps} />
        </div>
      )}

      {showGuestStart && <GuestStart onStart={onGuestStart} />}

      {isSettingsOpen && <Settings {...settingsProps} />}

      {isMascotOpen && <Mascot onClose={onCloseMascot} />}
    </>
  );
};

export default GameOverlays;
