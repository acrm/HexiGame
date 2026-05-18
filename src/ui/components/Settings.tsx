import React from 'react';
import { t, type Lang } from '../i18n';
import version from '../../../version.json';
import { audioController } from '../../appLogic/audioController';
import { TuiButton, TuiIconButton } from '../tui';
import WindowFrame from './WindowFrame';

interface SettingsProps {
  language: Lang;
  onLanguageChange: (lang: Lang) => void;
  onClose: () => void;
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
  language,
  onLanguageChange,
  onClose, 
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
  return (
    <div className="settings-overlay">
      <WindowFrame
        className="settings-window"
        title={t('settings.title')}
        showToggle={false}
        actions={(
          <TuiIconButton className="tui-icon-btn--no-brackets" onClick={() => { audioController.playRandomSound(soundEnabled, soundVolume); onClose(); }}>
            [X]
          </TuiIconButton>
        )}
        titleRowClassName="settings-title-row"
        separatorRowClassName="settings-separator-row"
        contentRowClassName="settings-content-row"
      >
        <div className="settings-body">
          <div className="settings-row">
            <label>{t('settings.language')}</label>
            <select
              value={language}
              onChange={(e) => {
                audioController.playRandomSound(soundEnabled, soundVolume);
                onLanguageChange(e.target.value as Lang);
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
              onChange={(e) => {
                const nextEnabled = e.target.checked;
                if (nextEnabled) {
                  audioController.playRandomSound(true, soundVolume);
                }
                onToggleSound(nextEnabled);
              }}
            />
          </div>

          <div className="settings-row settings-row--range">
            <label>{t('settings.soundVolume')}</label>
            <div className="settings-range-group">
              <input
                className="settings-range-input"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={soundVolume}
                onChange={(e) => onSoundVolumeChange(parseFloat(e.target.value))}
                disabled={!soundEnabled}
              />
              <span className="settings-range-value">{Math.round(soundVolume * 100)}%</span>
            </div>
          </div>

          <div className="settings-row">
            <label>{t('settings.musicEnabled')}</label>
            <input 
              type="checkbox" 
              checked={musicEnabled}
              onChange={(e) => { audioController.playRandomSound(soundEnabled, soundVolume); onToggleMusic(e.target.checked); }}
            />
          </div>

          <div className="settings-row settings-row--range">
            <label>{t('settings.musicVolume')}</label>
            <div className="settings-range-group">
              <input
                className="settings-range-input"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={musicVolume}
                onChange={(e) => onMusicVolumeChange(parseFloat(e.target.value))}
                disabled={!musicEnabled}
              />
              <span className="settings-range-value">{Math.round(musicVolume * 100)}%</span>
            </div>
          </div>

          <div className="settings-row">
            <label>{t('settings.showFPS')}</label>
            <input 
              type="checkbox" 
              checked={showFPS}
              onChange={(e) => { audioController.playRandomSound(soundEnabled, soundVolume); onToggleShowFPS(e.target.checked); }}
            />
          </div>

          <div className="settings-row">
            <label>{t('settings.handedness')}</label>
            <select
              value={isLeftHanded ? 'left' : 'right'}
              onChange={(e) => { audioController.playRandomSound(soundEnabled, soundVolume); onToggleLeftHanded(e.target.value === 'left'); }}
            >
              <option value="right">{t('settings.rightHanded')}</option>
              <option value="left">{t('settings.leftHanded')}</option>
            </select>
          </div>

          <div className="settings-row">
            <TuiButton variant="secondary" onClick={() => { audioController.playRandomSound(soundEnabled, soundVolume); onShowMascot(); }}>
              {t('settings.mascot')}
            </TuiButton>
          </div>

          <div className="settings-version">
            v{version.currentVersion}
          </div>
        </div>
      </WindowFrame>
    </div>
  );
};

export default Settings;
