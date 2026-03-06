import React from 'react';
import { t } from '../ui/i18n';

export const GuestStart: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  return (
    <div className="guest-start-screen">
      <div className="guest-start-content">
        <h1>HexiGame</h1>
        <button className="guest-start-button" onClick={onStart}>
          {t('action.startGuest')}
        </button>
      </div>
    </div>
  );
};

export default GuestStart;
