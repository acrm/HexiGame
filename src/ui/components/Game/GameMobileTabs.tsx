import React from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import { t } from '../../i18n';

interface GameMobileTabsProps {
  mobileTab: MobileTab;
  onSelectHexiMap: () => void;
  onSelectHexiPedia: () => void;
  onOpenSettings: () => void;
}

export const GameMobileTabs: React.FC<GameMobileTabsProps> = ({
  mobileTab,
  onSelectHexiMap,
  onSelectHexiPedia,
  onOpenSettings,
}) => {
  return (
    <div className="mobile-tab-bar">
      <div className="mobile-tabs-container">
        <button
          className={`mobile-tab ${mobileTab === 'heximap' ? 'active' : ''}`}
          onClick={onSelectHexiMap}
        >
          {t('tab.heximap')}
        </button>
        <button
          className={`mobile-tab ${mobileTab === 'hexilab' ? 'active' : ''} disabled`}
          onClick={() => {}}
          disabled
        >
          {t('tab.hexilab')}
        </button>
        <button
          className={`mobile-tab ${mobileTab === 'hexipedia' ? 'active' : ''}`}
          onClick={onSelectHexiPedia}
        >
          {t('tab.hexipedia')}
        </button>
      </div>
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
