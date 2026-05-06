import React from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import { t } from '../../i18n';

interface GameMobileTabsProps {
  mobileTab: MobileTab;
  onSelectMap: () => void;
  onSelectHexipedia: () => void;
}

export const GameMobileTabs: React.FC<GameMobileTabsProps> = ({
  mobileTab,
  onSelectMap,
  onSelectHexipedia,
}) => {
  const mapLabel = mobileTab === 'map' ? 'MAP' : 'map';
  const labLabel = mobileTab === 'lab' ? 'LAB' : 'lab';
  const hexiLabel = mobileTab === 'hexipedia' ? 'HEXI' : 'hexi';

  return (
    <div className="mobile-tab-bar mobile-tab-bar--tabs" role="tablist" aria-label={t('tab.hexipedia')}>
      <div className="mobile-tabs-container">
        <button
          className={`mobile-tab mobile-tab--map ${mobileTab === 'map' ? 'active' : ''}`}
          onClick={onSelectMap}
          title={t('tab.map')}
          aria-label={t('tab.map')}
        >
          {mapLabel}
        </button>
        <span className="mobile-tab-separator" aria-hidden="true">|</span>
        <button
          className={`mobile-tab mobile-tab--lab ${mobileTab === 'lab' ? 'active' : ''} disabled`}
          onClick={() => {}}
          disabled
          title={t('tab.lab')}
          aria-label={t('tab.lab')}
        >
          {labLabel}
        </button>
        <span className="mobile-tab-separator" aria-hidden="true">|</span>
        <button
          className={`mobile-tab mobile-tab--hexipedia ${mobileTab === 'hexipedia' ? 'active' : ''}`}
          onClick={onSelectHexipedia}
          title={t('tab.hexipedia')}
          aria-label={t('tab.hexipedia')}
        >
          {hexiLabel}
        </button>
      </div>
    </div>
  );
};

export default GameMobileTabs;
