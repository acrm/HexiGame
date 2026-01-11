import React, { useState } from 'react';
import { getLanguage, setLanguage, t } from '../ui/i18n';

interface SettingsProps {
  onClose: () => void;
  onResetSession: () => void;
  onShowMascot: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  showFPS: boolean;
  onToggleShowFPS: (show: boolean) => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  onClose, 
  onResetSession, 
  onShowMascot,
  soundEnabled,
  onToggleSound,
  showFPS,
  onToggleShowFPS,
}) => {
  const lang = getLanguage();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }
    onResetSession();
    onClose();
  };

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <span>{t('settings.title')}</span>
          <button className="settings-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="settings-row">
          <label>{t('settings.language')}</label>
          <select
            value={lang}
            onChange={(e) => setLanguage(e.target.value as any)}
          >
            <option value="en">{t('language.en')}</option>
          </select>
        </div>

        <div className="settings-row">
          <label>{t('settings.sound')}</label>
          <input 
            type="checkbox" 
            checked={soundEnabled}
            onChange={(e) => onToggleSound(e.target.checked)}
          />
        </div>

        <div className="settings-row">
          <label>{t('settings.showFPS')}</label>
          <input 
            type="checkbox" 
            checked={showFPS}
            onChange={(e) => onToggleShowFPS(e.target.checked)}
          />
        </div>

        <div className="settings-row">
          <button className="settings-action-button" onClick={onShowMascot}>
            {t('settings.mascot')}
          </button>
        </div>

        <div className="settings-row">
          {!showResetConfirm ? (
            <button className="settings-action-button settings-reset" onClick={handleReset}>
              {t('settings.resetSession')}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              <div style={{ fontSize: 12, color: '#ff9999' }}>{t('settings.resetConfirm')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="settings-action-button settings-reset" onClick={handleReset}>
                  {t('action.reset')}
                </button>
                <button className="settings-action-button" onClick={() => setShowResetConfirm(false)}>
                  {t('action.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
