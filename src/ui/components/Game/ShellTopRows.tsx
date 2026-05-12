import React from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';
import { t, type Lang } from '../../i18n';
import { TuiTabBar } from '../../tui';

export type ShellTopRowsMode = 'guest' | 'session';

interface ShellTopRowsProps {
  mode: ShellTopRowsMode;
  marketingVersion: string;
  mobileTab: MobileTab;
  language: Lang;
  onPrimaryAction: () => void;
  onOpenSettings: () => void;
  onSelectMap: () => void;
  onSelectHexipedia: () => void;
  onLanguageChange: (lang: Lang) => void;
}

export const ShellTopRows: React.FC<ShellTopRowsProps> = ({
  mode,
  marketingVersion,
  mobileTab,
  language,
  onPrimaryAction,
  onOpenSettings,
  onSelectMap,
  onSelectHexipedia,
  onLanguageChange,
}) => {
  const mapLabel = mobileTab === 'map' ? 'MAP' : 'map';
  const labLabel = mobileTab === 'lab' ? 'LAB' : 'lab';
  const hexiLabel = mobileTab === 'hexipedia' ? 'HEXI' : 'hexi';

  return (
    <div className="shell-top-rows">
      <div className="mobile-tab-bar mobile-tab-bar--header shell-top-row shell-top-row--header">
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
                onClick={onPrimaryAction}
                title={mode === 'session' ? t('action.disconnect') : t('action.loadSession')}
              >
                {mode === 'session' ? 'STOP' : 'RUN'}
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

      {mode === 'session' ? (
        <div className="mobile-tab-bar mobile-tab-bar--tabs shell-top-row shell-top-row--tabs" role="tablist" aria-label={t('tab.hexipedia')}>
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
      ) : (
        <div className="mobile-tab-bar mobile-tab-bar--tabs shell-top-row shell-top-row--tabs" role="region" aria-label={t('settings.language')}>
          <div className="mobile-tabs-container shell-mode-strip">
            <span className="shell-mode-strip-label">START</span>
            <span className="mobile-tab-separator" aria-hidden="true">|</span>
            <label className="shell-mode-strip-language" htmlFor="shell-top-language">LANG</label>
            <select
              id="shell-top-language"
              className="shell-mode-strip-select"
              value={language}
              onChange={(event) => {
                onLanguageChange(event.target.value as Lang);
              }}
            >
              <option value="en">EN</option>
              <option value="ru">RU</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShellTopRows;
