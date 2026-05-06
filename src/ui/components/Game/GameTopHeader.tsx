import React from 'react';
import { t } from '../../i18n';
import { TuiTabBar } from '../../tui';

interface GameTopHeaderProps {
  marketingVersion: string;
  onOpenSettings: () => void;
  onDisconnect: () => void;
}

export const GameTopHeader: React.FC<GameTopHeaderProps> = ({
  marketingVersion,
  onOpenSettings,
  onDisconnect,
}) => {
  return (
    <div className="mobile-tab-bar mobile-tab-bar--header">
      <TuiTabBar
        className="game-top-header-bar"
        title={(
          <div className="game-top-header-title">
            <div className="game-top-header-system">HexiOS {marketingVersion}</div>
          </div>
        )}
        actions={(
          <>
            <button
              type="button"
              className="disconnect-button game-mobile-action-btn"
              onClick={onDisconnect}
              title={t('action.disconnect')}
            >
              STOP
            </button>
            <button
              type="button"
              className="settings-button game-mobile-action-btn"
              onClick={onOpenSettings}
              title={t('settings.open')}
            >
              CFG
            </button>
          </>
        )}
      />
    </div>
  );
};

export default GameTopHeader;
