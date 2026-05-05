import React from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import { t } from '../../i18n';
import { TuiIconButton } from '../../tui';

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
          className={`mobile-tab mobile-tab--map ${mobileTab === 'map' ? 'active' : ''}`}
          onClick={onSelectMap}
        >
          {t('tab.map')}
        </button>
        <button
          className={`mobile-tab mobile-tab--lab ${mobileTab === 'lab' ? 'active' : ''} disabled`}
          onClick={() => {}}
          disabled
        >
          {t('tab.lab')}
        </button>
        <button
          className={`mobile-tab mobile-tab--hexipedia ${mobileTab === 'hexipedia' ? 'active' : ''}`}
          onClick={onSelectHexipedia}
        >
          {t('tab.hexipedia')}
        </button>
      </div>
      {isHexiOsMode ? (
        <TuiIconButton
          className="disconnect-button tui-icon-btn--no-brackets"
          onClick={onPlayLatestSession}
          title={t('action.loadSession')}
        >
          <i className="fas fa-play"></i>
        </TuiIconButton>
      ) : (
        <TuiIconButton
          variant="danger"
          className="disconnect-button tui-icon-btn--no-brackets"
          onClick={onDisconnect}
          title={t('action.disconnect')}
        >
          <i className="fas fa-stop"></i>
        </TuiIconButton>
      )}
      <TuiIconButton
        className="settings-button tui-icon-btn--no-brackets"
        onClick={onOpenSettings}
        title={t('settings.open')}
      >
        <i className="fas fa-cog"></i>
      </TuiIconButton>
    </div>
  );
};

export default GameMobileTabs;
