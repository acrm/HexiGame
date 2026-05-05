import React from 'react';

interface TuiBorderRowProps {
  left: React.ReactNode;
  right: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  leftClassName?: string;
  fillClassName?: string;
  rightClassName?: string;
}

export const TuiBorderRow: React.FC<TuiBorderRowProps> = ({
  left,
  right,
  children,
  className,
  leftClassName,
  fillClassName,
  rightClassName,
}) => {
  return (
    <div className={['tui-border-row', className].filter(Boolean).join(' ')}>
      <span className={['tui-border-left', leftClassName].filter(Boolean).join(' ')}>{left}</span>
      <div className={['tui-border-fill', fillClassName].filter(Boolean).join(' ')}>{children}</div>
      <span className={['tui-border-right', rightClassName].filter(Boolean).join(' ')}>{right}</span>
    </div>
  );
};

export default TuiBorderRow;
