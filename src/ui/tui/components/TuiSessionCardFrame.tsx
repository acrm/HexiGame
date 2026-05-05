import React from 'react';

interface TuiSessionCardFrameProps {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const TuiSessionCardFrame: React.FC<TuiSessionCardFrameProps> = ({ active = false, children, className }) => {
  return (
    <div
      className={[
        'tui-session-card-frame',
        active ? 'tui-session-card-frame--active' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
};

export default TuiSessionCardFrame;
