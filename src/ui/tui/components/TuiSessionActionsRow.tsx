import React from 'react';
import { TuiBorderRow } from './TuiBorderRow';

interface TuiSessionActionsRowProps {
  children: React.ReactNode;
  className?: string;
}

export const TuiSessionActionsRow: React.FC<TuiSessionActionsRowProps> = ({ children, className }) => {
  return (
    <TuiBorderRow
      className={['tui-session-actions-row', className].filter(Boolean).join(' ')}
      left="║ "
      right="║"
      fillClassName="tui-session-actions-fill"
    >
      {children}
    </TuiBorderRow>
  );
};

export default TuiSessionActionsRow;
