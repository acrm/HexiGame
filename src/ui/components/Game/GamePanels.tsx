import React from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import GameField from '../GameField/GameField';
import HexiPedia from '../HexiPedia';

interface GamePanelsProps {
  isMobileLayout: boolean;
  mobileTab: MobileTab;
  hexiPediaProps: React.ComponentProps<typeof HexiPedia>;
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
          <HexiPedia {...hexiPediaProps} />
        ) : (
          <GameField {...gameFieldProps} />
        )}
      </div>
      <div className="game-footer-controls" />
    </div>
  );
};

export default GamePanels;
