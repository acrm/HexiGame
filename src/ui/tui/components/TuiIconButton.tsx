import React from 'react';

type TuiIconButtonVariant = 'default' | 'danger' | 'confirm';

interface TuiIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TuiIconButtonVariant;
}

export const TuiIconButton: React.FC<TuiIconButtonProps> = ({
  variant = 'default',
  className,
  children,
  ...rest
}) => {
  const disableBrackets = typeof className === 'string' && className.includes('gs-icon-btn');

  return (
    <button
      type="button"
      className={[
        'tui-icon-btn',
        `tui-icon-btn--${variant}`,
        disableBrackets ? 'tui-icon-btn--no-brackets' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
};

export default TuiIconButton;
