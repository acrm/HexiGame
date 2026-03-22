import React from 'react';
import { t, type Lang } from '../i18n';

interface GuestStartProps {
  currentLanguage: Lang;
  onLanguageChange: (lang: Lang) => void;
  hasResumableSession: boolean;
  onContinue: () => void;
  onRestart: () => void;
  onStartNew: () => void;
}

export const GuestStart: React.FC<GuestStartProps> = ({
  currentLanguage,
  onLanguageChange,
  hasResumableSession,
  onContinue,
  onRestart,
  onStartNew,
}) => {
  const actionButtons = hasResumableSession
    ? [
        {
          key: 'continue',
          label: t('action.continueSession'),
          className: 'guest-start-button guest-start-button-primary',
          onClick: onContinue,
        },
        {
          key: 'restart',
          label: t('action.restartSession'),
          className: 'guest-start-button guest-start-button-secondary',
          onClick: onRestart,
        },
      ]
    : [
        {
          key: 'start',
          label: t('action.startNewSession'),
          className: 'guest-start-button guest-start-button-primary',
          onClick: onStartNew,
        },
      ];

  return (
    <div className="guest-start-screen">
      <div className="guest-start-content">
        <div className="guest-start-brand">Hexi</div>
        <h1>{t('start.title')}</h1>
        <p className="guest-start-lead">
          {hasResumableSession ? t('start.resumeLead') : t('start.newLead')}
        </p>

        <div className="guest-start-language-block">
          <div className="guest-start-language-label">{t('start.languageLabel')}</div>
          <div className="guest-start-language-options" role="radiogroup" aria-label={t('start.languageLabel')}>
            {(['en', 'ru'] as Lang[]).map((lang) => (
              <button
                key={lang}
                type="button"
                className={`guest-start-language-option ${currentLanguage === lang ? 'is-active' : ''}`}
                onClick={() => onLanguageChange(lang)}
                aria-pressed={currentLanguage === lang}
              >
                {t(`language.${lang}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="guest-start-actions">
          {actionButtons.map((button) => (
            <button
              key={button.key}
              type="button"
              className={button.className}
              onClick={button.onClick}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GuestStart;
