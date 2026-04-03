import React from 'react';
import { t } from '../i18n';

interface GuestStartProps {
  hasResumableSession: boolean;
  onContinue: () => void;
  onStartNew: () => void;
  onOpenSettings: () => void;
  onDownloadSession: () => void;
}

export const GuestStart: React.FC<GuestStartProps> = ({
  hasResumableSession,
  onContinue,
  onStartNew,
  onOpenSettings,
  onDownloadSession,
}) => {
  const actionButtons = [
    ...(hasResumableSession
      ? [
          {
            key: 'continue',
            label: t('action.continueSession'),
            onClick: onContinue,
          },
        ]
      : []),
    {
      key: 'start',
      label: t('action.startNewSession'),
      onClick: onStartNew,
    },
    {
      key: 'settings',
      label: t('settings.title'),
      onClick: onOpenSettings,
    },
    ...(hasResumableSession
      ? [
          {
            key: 'download',
            label: t('action.downloadSession'),
            onClick: onDownloadSession,
          },
        ]
      : []),
  ];

  return (
    <div className="guest-start-screen">
      <div className="guest-start-content">
        <h1 className="guest-start-title">Hexi</h1>

        <div className="guest-start-actions">
          {actionButtons.map((button) => (
            <button
              key={button.key}
              type="button"
              className="guest-start-button"
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
