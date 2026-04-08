import React from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import GameField from '../GameField/GameField';
import Hexipedia from '../Hexipedia';

interface GamePanelsProps {
  isMobileLayout: boolean;
  mobileTab: MobileTab;
  hexiPediaProps: React.ComponentProps<typeof Hexipedia>;
  gameFieldProps: React.ComponentProps<typeof GameField>;
}

export const GamePanels: React.FC<GamePanelsProps> = ({
  isMobileLayout,
  mobileTab,
  hexiPediaProps,
  gameFieldProps,
}) => {
  return (
    <div className="game-main">
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
