import React from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import { t } from '../../i18n';

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
      {isHexiOsMode ? (
        <button
          className="disconnect-button"
          onClick={onPlayLatestSession}
          title={t('action.loadSession')}
        >
          <i className="fas fa-play"></i>
        </button>
      ) : (
        <button
          className="disconnect-button"
          onClick={onDisconnect}
          title={t('action.disconnect')}
        >
          <i className="fas fa-stop"></i>
        </button>
      )}
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
