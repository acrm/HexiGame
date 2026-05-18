import React from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import type { SessionHistoryRecord } from '../../../appLogic/sessionHistory';
import GuestStart from '../GuestStart';
import Mascot from '../Mascot';
import Settings from '../Settings';
import TutorialProgressWidget from '../TutorialProgressWidget';
import TutorialTaskIntroModal from '../TutorialTaskIntroModal';
import ColorPaletteWidget from '../ColorPaletteWidget';
import StructureProgressWidget from '../StructureProgressWidget';
import SessionPlaybackWidget from '../SessionPlaybackWidget';

type HexipediaSectionId = 'tasks' | 'session' | 'structures' | 'colors';

interface GameOverlaysProps {
  isMobileLayout: boolean;
  mobileTab: MobileTab;
  taskWidgetProps: React.ComponentProps<typeof TutorialProgressWidget> | null;
  taskIntroModalProps: React.ComponentProps<typeof TutorialTaskIntroModal> | null;
  colorPaletteWidgetProps: React.ComponentProps<typeof ColorPaletteWidget> | null;
  structureWidgetProps: React.ComponentProps<typeof StructureProgressWidget> | null;
  sessionWidgetProps: React.ComponentProps<typeof SessionPlaybackWidget> | null;
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
  onGuestStartUiClick: () => void;
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
  sessionWidgetProps,
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
  onGuestStartUiClick,
  isSettingsOpen,
  settingsProps,
  isMascotOpen,
  onCloseMascot,
}) => {
  const visibleSectionOrder = sectionOrder.filter((sectionId) => {
    if (sectionId === 'tasks') return !!taskWidgetProps;
    if (sectionId === 'colors') return !!colorPaletteWidgetProps;
    if (sectionId === 'structures') return !!structureWidgetProps;
    if (sectionId === 'session') return !!sessionWidgetProps;
    return false;
  });

  return (
    <>
      {isMobileLayout && mobileTab === 'map' && (
        <div className="widget-stack-overlay">
          {visibleSectionOrder.map((sectionId, index) => {
            const totalVisible = visibleSectionOrder.length;
            const stackRole = totalVisible === 1
              ? 'single'
              : index === 0
                ? 'first'
                : index === totalVisible - 1
                  ? 'last'
                  : 'middle';

            if (sectionId === 'tasks' && taskWidgetProps) {
              return (
                <TutorialProgressWidget
                  key="tasks"
                  {...taskWidgetProps}
                  stackRole={stackRole}
                />
              );
            }
            if (sectionId === 'colors' && colorPaletteWidgetProps) {
              return (
                <ColorPaletteWidget
                  key="colors"
                  {...colorPaletteWidgetProps}
                  stackRole={stackRole}
                />
              );
            }
            if (sectionId === 'structures' && structureWidgetProps) {
              return (
                <StructureProgressWidget
                  key="structures"
                  {...structureWidgetProps}
                  stackRole={stackRole}
                />
              );
            }
            if (sectionId === 'session' && sessionWidgetProps) {
              return (
                <SessionPlaybackWidget
                  key="session"
                  {...sessionWidgetProps}
                  stackRole={stackRole}
                />
              );
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
          onUiClick={onGuestStartUiClick}
        />
      )}

      {isSettingsOpen && <Settings {...settingsProps} />}

      {isMascotOpen && <Mascot onClose={onCloseMascot} />}
    </>
  );
};

export default GameOverlays;
