import React from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import { t } from '../../i18n';

interface GameMobileTabsProps {
  mobileTab: MobileTab;
  onSelectMap: () => void;
  onSelectHexipedia: () => void;
  onOpenSettings: () => void;
  onDisconnect: () => void;
}

export const GameMobileTabs: React.FC<GameMobileTabsProps> = ({
  mobileTab,
  onSelectMap,
  onSelectHexipedia,
  onOpenSettings,
  onDisconnect,
}) => {
  return (
    <div className="mobile-tab-bar">
      <div className="mobile-tabs-container">
        <button
          className={`mobile-tab ${mobileTab === 'map' ? 'active' : ''}`}
          onClick={onSelectMap}
        >
          {t('tab.map')}
        </button>
        <button
          className={`mobile-tab ${mobileTab === 'lab' ? 'active' : ''} disabled`}
          onClick={() => {}}
          disabled
        >
          {t('tab.lab')}
        </button>
        <button
          className={`mobile-tab ${mobileTab === 'hexipedia' ? 'active' : ''}`}
          onClick={onSelectHexipedia}
        >
          {t('tab.hexipedia')}
        </button>
      </div>
      <button
        className="disconnect-button"
        onClick={onDisconnect}
        title={t('action.disconnect')}
      >
        <i className="fas fa-power-off"></i>
      </button>
      <button
        className="settings-button"
        onClick={onOpenSettings}
        title={t('settings.open')}
      >
        <i className="fas fa-cog"></i>
      </button>
    </div>
  );
};

export default GameMobileTabs;
