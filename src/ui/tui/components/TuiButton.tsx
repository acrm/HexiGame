import React from 'react';

type TuiButtonVariant = 'primary' | 'secondary';

interface TuiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TuiButtonVariant;
}

export const TuiButton: React.FC<TuiButtonProps> = ({ variant = 'primary', className, children, ...rest }) => {
  const disableBrackets = typeof className === 'string' && className.includes('gs-nav-btn');

  return (
    <button
      type="button"
      className={['tui-btn', `tui-btn--${variant}`, disableBrackets ? 'tui-btn--no-brackets' : '', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
};

export default TuiButton;
