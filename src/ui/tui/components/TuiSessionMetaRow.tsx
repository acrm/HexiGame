import React from 'react';

interface TuiSessionMetaRowProps {
  children: React.ReactNode;
  className?: string;
}

export const TuiSessionMetaRow: React.FC<TuiSessionMetaRowProps> = ({ children, className }) => {
  return <div className={['tui-session-meta-row', className].filter(Boolean).join(' ')}>{children}</div>;
};

export default TuiSessionMetaRow;
