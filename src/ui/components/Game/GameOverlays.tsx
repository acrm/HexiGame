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

type HexipediaSectionId = 'tasks' | 'session' | 'structures' | 'colors';

interface GameOverlaysProps {
  isMobileLayout: boolean;
  mobileTab: MobileTab;
  taskWidgetProps: React.ComponentProps<typeof TutorialProgressWidget> | null;
  taskIntroModalProps: React.ComponentProps<typeof TutorialTaskIntroModal> | null;
  colorPaletteWidgetProps: React.ComponentProps<typeof ColorPaletteWidget> | null;
  structureWidgetProps: React.ComponentProps<typeof StructureProgressWidget> | null;
  sectionOrder: HexipediaSectionId[];
  showGuestStart: boolean;
  sessionHistory: SessionHistoryRecord[];
  currentSessionId: string | null;
  onContinueSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDownloadSession: (sessionId: string) => void;
  onImportSession: (file: File) => void;
  onRenameSession: (sessionId: string, customName: string) => void;
  onDeleteSessions: (sessionIds: string[]) => void;
  onOpenSettings: () => void;
  onGuestStartUiClick: () => void;
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
  onContinueSession,
  sessionHistory,
  currentSessionId,
  onNewSession,
  onDownloadSession,
  onImportSession,
  onRenameSession,
  onDeleteSessions,
  onOpenSettings,
  onGuestStartUiClick,
  language,
  onLanguageChange,
  isSettingsOpen,
  settingsProps,
  isMascotOpen,
  onCloseMascot,
}) => {
  return (
    <>
      {isMobileLayout && mobileTab === 'map' && (
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
          sessionHistory={sessionHistory}
          currentSessionId={currentSessionId}
          onContinueSession={onContinueSession}
          onNewSession={onNewSession}
          onDownloadSession={onDownloadSession}
          onImportSession={onImportSession}
          onRenameSession={onRenameSession}
          onDeleteSessions={onDeleteSessions}
          onOpenSettings={onOpenSettings}
          onUiClick={onGuestStartUiClick}
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
