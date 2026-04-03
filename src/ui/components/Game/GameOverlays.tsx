import React from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import GuestStart from '../GuestStart';
import Mascot from '../Mascot';
import Settings from '../Settings';
import TutorialProgressWidget from '../TutorialProgressWidget';
import TutorialTaskIntroModal from '../TutorialTaskIntroModal';
import ColorPaletteWidget from '../ColorPaletteWidget';
import StructureProgressWidget from '../StructureProgressWidget';

type HexiPediaSectionId = 'tasks' | 'stats' | 'structures' | 'colors';

interface GameOverlaysProps {
  isMobileLayout: boolean;
  mobileTab: MobileTab;
  taskWidgetProps: React.ComponentProps<typeof TutorialProgressWidget> | null;
  taskIntroModalProps: React.ComponentProps<typeof TutorialTaskIntroModal> | null;
  colorPaletteWidgetProps: React.ComponentProps<typeof ColorPaletteWidget> | null;
  structureWidgetProps: React.ComponentProps<typeof StructureProgressWidget> | null;
  sectionOrder: HexiPediaSectionId[];
  showGuestStart: boolean;
  hasResumableSession: boolean;
  onContinueSession: () => void;
  onStartNewSession: () => void;
  onOpenSettings: () => void;
  onDownloadSession: () => void;
  isSettingsOpen: boolean;
  settingsProps: React.ComponentProps<typeof Settings>;
  isMascotOpen: boolean;
  onCloseMascot: () => void;
}

export const GameOverlays: React.FC<GameOverlaysProps> = ({
  isMobileLayout,
  mobileTab,
  taskWidgetProps,
  taskIntroModalProps,
  colorPaletteWidgetProps,
  structureWidgetProps,
  sectionOrder,
  showGuestStart,
  hasResumableSession,
  onContinueSession,
  onStartNewSession,
  onOpenSettings,
  onDownloadSession,
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
            if (sectionId === 'tasks' && taskWidgetProps) {
              return <TutorialProgressWidget key="tasks" {...taskWidgetProps} />;
            }
            if (sectionId === 'colors' && colorPaletteWidgetProps) {
              return <ColorPaletteWidget key="colors" {...colorPaletteWidgetProps} />;
            }
            if (sectionId === 'structures' && structureWidgetProps) {
              return <StructureProgressWidget key="structures" {...structureWidgetProps} />;
            }
            return null;
          })}
        </div>
      )}

      {taskIntroModalProps && <TutorialTaskIntroModal {...taskIntroModalProps} />}

      {showGuestStart && (
        <GuestStart
          hasResumableSession={hasResumableSession}
          onContinue={onContinueSession}
          onStartNew={onStartNewSession}
          onOpenSettings={onOpenSettings}
          onDownloadSession={onDownloadSession}
        />
      )}

      {isSettingsOpen && <Settings {...settingsProps} />}

      {isMascotOpen && <Mascot onClose={onCloseMascot} />}
    </>
  );
};

export default GameOverlays;
