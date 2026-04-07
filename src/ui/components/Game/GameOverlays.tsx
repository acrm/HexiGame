import React from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import type { SessionHistoryRecord } from '../../../appLogic/sessionHistory';
import type { Lang } from '../../i18n';
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
  sessionHistory: SessionHistoryRecord[];
  onLoadHistorySession: (sessionId: string) => void;
  onOpenSettings: () => void;
  language: Lang;
  onLanguageChange: (lang: Lang) => void;
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
  sessionHistory,
  onLoadHistorySession,
  onOpenSettings,
  language,
  onLanguageChange,
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
          sessionHistory={sessionHistory}
          onLoadHistorySession={onLoadHistorySession}
          onOpenSettings={onOpenSettings}
          language={language}
          onLanguageChange={onLanguageChange}
        />
      )}

      {isSettingsOpen && <Settings {...settingsProps} />}

      {isMascotOpen && <Mascot onClose={onCloseMascot} />}
    </>
  );
};

export default GameOverlays;
