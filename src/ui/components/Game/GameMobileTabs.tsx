import React from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import { t } from '../../i18n';
import { TuiTabBar } from '../../tui';

interface GameMobileTabsProps {
  mobileTab: MobileTab;
  isHexiOsMode: boolean;
  onSelectMap: () => void;
  onSelectHexipedia: () => void;
  onOpenSettings: () => void;
  onDisconnect: () => void;
  onPlayLatestSession?: () => void;
}

export const GameMobileTabs: React.FC<GameMobileTabsProps> = ({
  mobileTab,
  isHexiOsMode,
  onSelectMap,
  onSelectHexipedia,
  onOpenSettings,
  onDisconnect,
  onPlayLatestSession,
}) => {
  const mapLabel = mobileTab === 'map' ? 'MAP' : 'map';
  const labLabel = mobileTab === 'lab' ? 'LAB' : 'lab';
  const hexiLabel = mobileTab === 'hexipedia' ? 'HEXI' : 'hexi';

  return (
    <div className="mobile-tab-bar">
      <TuiTabBar
        className="gs-tab-bar game-mobile-tab-bar"
        title={(
          <div className="gs-tabs-container mobile-tabs-container">
            <button
              className={`mobile-tab mobile-tab--map ${mobileTab === 'map' ? 'active' : ''}`}
              onClick={onSelectMap}
              title={t('tab.map')}
              aria-label={t('tab.map')}
            >
              {mapLabel}
            </button>
            <button
              className={`mobile-tab mobile-tab--lab ${mobileTab === 'lab' ? 'active' : ''} disabled`}
              onClick={() => {}}
              disabled
              title={t('tab.lab')}
              aria-label={t('tab.lab')}
            >
              {labLabel}
            </button>
            <button
              className={`mobile-tab mobile-tab--hexipedia ${mobileTab === 'hexipedia' ? 'active' : ''}`}
              onClick={onSelectHexipedia}
              title={t('tab.hexipedia')}
              aria-label={t('tab.hexipedia')}
            >
              {hexiLabel}
            </button>
          </div>
        )}
        actions={(
          <>
            {isHexiOsMode ? (
              <button
                type="button"
                className="disconnect-button game-mobile-action-btn"
                onClick={onPlayLatestSession}
                title={t('action.loadSession')}
              >
                RUN
              </button>
            ) : (
              <button
                type="button"
                className="disconnect-button game-mobile-action-btn"
                onClick={onDisconnect}
                title={t('action.disconnect')}
              >
                STOP
              </button>
            )}
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

export default GameMobileTabs;
