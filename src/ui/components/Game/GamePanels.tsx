import React from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import GameField from '../GameField/GameField';
import Hexipedia from '../Hexipedia';
import SessionTerminalLauncher from './SessionTerminalLauncher';

interface GamePanelsProps {
  isMobileLayout: boolean;
  mobileTab: MobileTab;
  hexiPediaProps: React.ComponentProps<typeof Hexipedia>;
  gameFieldProps: React.ComponentProps<typeof GameField>;
  terminalLauncherProps?: React.ComponentProps<typeof SessionTerminalLauncher> | null;
}

export const GamePanels: React.FC<GamePanelsProps> = ({
  isMobileLayout,
  mobileTab,
  hexiPediaProps,
  gameFieldProps,
  terminalLauncherProps,
}) => {
  return (
    <div className="game-main">
      {terminalLauncherProps && (
        <SessionTerminalLauncher {...terminalLauncherProps} />
      )}
      <div className="game-field-area">
        {isMobileLayout && mobileTab === 'hexipedia' ? (
          <Hexipedia {...hexiPediaProps} />
        ) : (
          <GameField {...gameFieldProps} />
        )}
      </div>
      <div className="game-footer-controls" />
    </div>
  );
};

export default GamePanels;
