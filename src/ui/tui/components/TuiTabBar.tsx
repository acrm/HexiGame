import React from 'react';

interface TuiTabBarProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const TuiTabBar: React.FC<TuiTabBarProps> = ({ title, actions, className }) => {
  return (
    <div className={['tui-tab-bar', className].filter(Boolean).join(' ')}>
      <div className="tui-tab-bar-title">{title}</div>
      {actions}
    </div>
  );
};

export default TuiTabBar;
