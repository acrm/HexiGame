import React, { useState } from 'react';
import { getLanguage, setLanguage, t } from '../ui/i18n';
import version from '../../version.json';
import { audioManager } from '../audio/audioManager';

interface SettingsProps {
  onClose: () => void;
  onResetSession: () => void;
  onShowMascot: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  soundVolume: number;
  onSoundVolumeChange: (volume: number) => void;
  musicEnabled: boolean;
  onToggleMusic: (enabled: boolean) => void;
  musicVolume: number;
  onMusicVolumeChange: (volume: number) => void;
  showFPS: boolean;
  onToggleShowFPS: (show: boolean) => void;
  isLeftHanded: boolean;
  onToggleLeftHanded: (isLeft: boolean) => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  onClose, 
  onResetSession, 
  onShowMascot,
  soundEnabled,
  onToggleSound,
  soundVolume,
  onSoundVolumeChange,
  musicEnabled,
  onToggleMusic,
  musicVolume,
  onMusicVolumeChange,
  showFPS,
  onToggleShowFPS,
  isLeftHanded,
  onToggleLeftHanded,
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
          <button className="settings-close" onClick={() => { audioManager.playRandomSound(); onClose(); }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="settings-row">
          <label>{t('settings.language')}</label>
          <select
            value={lang}
            onChange={(e) => {
              audioManager.playRandomSound();
              setLanguage(e.target.value as any);
              window.location.reload();
            }}
          >
            <option value="en">{t('language.en')}</option>
            <option value="ru">{t('language.ru')}</option>
          </select>
        </div>

        <div className="settings-row">
          <label>{t('settings.soundEnabled')}</label>
          <input 
            type="checkbox" 
            checked={soundEnabled}
            onChange={(e) => { audioManager.playRandomSound(); onToggleSound(e.target.checked); }}
          />
        </div>

        <div className="settings-row">
          <label>{t('settings.soundVolume')}</label>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            value={soundVolume}
            onChange={(e) => onSoundVolumeChange(parseFloat(e.target.value))}
            disabled={!soundEnabled}
            style={{ flex: 1 }}
          />
          <span style={{ marginLeft: 8, minWidth: 40, textAlign: 'right' }}>
            {Math.round(soundVolume * 100)}%
          </span>
        </div>

        <div className="settings-row">
          <label>{t('settings.musicEnabled')}</label>
          <input 
            type="checkbox" 
            checked={musicEnabled}
            onChange={(e) => { audioManager.playRandomSound(); onToggleMusic(e.target.checked); }}
          />
        </div>

        <div className="settings-row">
          <label>{t('settings.musicVolume')}</label>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            value={musicVolume}
            onChange={(e) => onMusicVolumeChange(parseFloat(e.target.value))}
            disabled={!musicEnabled}
            style={{ flex: 1 }}
          />
          <span style={{ marginLeft: 8, minWidth: 40, textAlign: 'right' }}>
            {Math.round(musicVolume * 100)}%
          </span>
        </div>

        <div className="settings-row">
          <label>{t('settings.showFPS')}</label>
          <input 
            type="checkbox" 
            checked={showFPS}
            onChange={(e) => { audioManager.playRandomSound(); onToggleShowFPS(e.target.checked); }}
          />
        </div>

        <div className="settings-row">
          <label>{t('settings.handedness')}</label>
          <select
            value={isLeftHanded ? 'left' : 'right'}
            onChange={(e) => { audioManager.playRandomSound(); onToggleLeftHanded(e.target.value === 'left'); }}
          >
            <option value="right">{t('settings.rightHanded')}</option>
            <option value="left">{t('settings.leftHanded')}</option>
          </select>
        </div>

        <div className="settings-row">
          <button className="settings-action-button" onClick={() => { audioManager.playRandomSound(); onShowMascot(); }}>
            {t('settings.mascot')}
          </button>
        </div>

        <div className="settings-row">
          {!showResetConfirm ? (
            <button className="settings-action-button settings-reset" onClick={() => { audioManager.playRandomSound(); handleReset(); }}>
              {t('settings.resetSession')}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              <div style={{ fontSize: 12, color: '#ff9999' }}>{t('settings.resetConfirm')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="settings-action-button settings-reset" onClick={() => { audioManager.playRandomSound(); handleReset(); }}>
                  {t('action.reset')}
                </button>
                <button className="settings-action-button" onClick={() => { audioManager.playRandomSound(); setShowResetConfirm(false); }}>
                  {t('action.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
          v{version.currentVersion}
        </div>
      </div>
    </div>
  );
};

export default Settings;
