import React from 'react';
import { TuiBorderRow } from '../tui';
import './WindowFrame.css';

const FRAME_FILL = '─'.repeat(160);

export type WindowFrameVariant = 'window' | 'stack';
export type WindowFrameStackRole = 'single' | 'first' | 'middle' | 'last';

interface WindowFrameProps {
  className?: string;
  style?: React.CSSProperties;
  variant?: WindowFrameVariant;
  stackRole?: WindowFrameStackRole;
  title?: React.ReactNode;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
  actions?: React.ReactNode;
  showToggle?: boolean;
  collapseBehavior?: 'hide-body' | 'icon-only';
  children?: React.ReactNode;
  topRowClassName?: string;
  titleRowClassName?: string;
  contentRowClassName?: string;
  separatorRowClassName?: string;
  bottomRowClassName?: string;
}

function hasRenderableContent(content: React.ReactNode): boolean {
  return !(content === null || content === undefined || content === false);
}

export const WindowFrame = React.forwardRef<HTMLDivElement, WindowFrameProps>(
  ({
    className,
    style,
    variant = 'window',
    stackRole = 'single',
    title,
    isCollapsed = false,
    onToggleCollapsed,
    actions,
    showToggle = true,
    collapseBehavior = 'hide-body',
    children,
    topRowClassName,
    titleRowClassName,
    contentRowClassName,
    separatorRowClassName,
    bottomRowClassName,
  }, ref) => {
    const contentExists = hasRenderableContent(children);
    const showBody = contentExists && (collapseBehavior === 'icon-only' || !isCollapsed);

    if (variant === 'stack') {
      const showTopBorder = stackRole === 'single' || stackRole === 'first';
      const showBottomBorder = stackRole === 'single' || stackRole === 'last';
      const showSeparatorBorder = stackRole === 'first' || stackRole === 'middle';

      return (
        <div
          ref={ref}
          className={[
            'window-frame',
            'window-frame--stack',
            `window-frame--${stackRole}`,
            className,
          ].filter(Boolean).join(' ')}
          style={style}
        >
          {showTopBorder && (
            <TuiBorderRow
              className={[
                'window-frame-row',
                'window-frame-row--top',
                topRowClassName,
              ].filter(Boolean).join(' ')}
              left="┌"
              right="┐"
            >
              {FRAME_FILL}
            </TuiBorderRow>
          )}

          <TuiBorderRow
            className={[
              'window-frame-row',
              'window-frame-row--content',
              contentRowClassName,
            ].filter(Boolean).join(' ')}
            left="│"
            right="│"
          >
            <div className="window-frame-content">{children}</div>
          </TuiBorderRow>

          {showSeparatorBorder && (
            <TuiBorderRow
              className={[
                'window-frame-row',
                'window-frame-row--separator',
                separatorRowClassName,
              ].filter(Boolean).join(' ')}
              left="├"
              right="┤"
            >
              {FRAME_FILL}
            </TuiBorderRow>
          )}

          {showBottomBorder && (
            <TuiBorderRow
              className={[
                'window-frame-row',
                'window-frame-row--bottom',
                bottomRowClassName,
              ].filter(Boolean).join(' ')}
              left="└"
              right="┘"
            >
              {FRAME_FILL}
            </TuiBorderRow>
          )}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={['window-frame', 'window-frame--window', className].filter(Boolean).join(' ')}
        style={style}
      >
        <TuiBorderRow
          className={[
            'window-frame-row',
            'window-frame-row--top',
            topRowClassName,
          ].filter(Boolean).join(' ')}
          left="┌"
          right="┐"
        >
          {FRAME_FILL}
        </TuiBorderRow>

        <TuiBorderRow
          className={[
            'window-frame-row',
            'window-frame-row--title',
            titleRowClassName,
          ].filter(Boolean).join(' ')}
          left="│"
          right="│"
        >
          <div className="window-frame-title-shell">
            <button
              type="button"
              className={[
                'window-frame-title-trigger',
                !onToggleCollapsed ? 'window-frame-title-trigger--passive' : '',
              ].filter(Boolean).join(' ')}
              onClick={onToggleCollapsed}
              disabled={!onToggleCollapsed}
              aria-expanded={!isCollapsed}
            >
              {showToggle && (
                <span className="window-frame-title-toggle" aria-hidden="true">
                  {isCollapsed ? '►' : '▼'}
                </span>
              )}
              <span className="window-frame-title-text">{title}</span>
            </button>
            {actions && <div className="window-frame-actions">{actions}</div>}
          </div>
        </TuiBorderRow>

        {showBody && (
          <>
            <TuiBorderRow
              className={[
                'window-frame-row',
                'window-frame-row--separator',
                separatorRowClassName,
              ].filter(Boolean).join(' ')}
              left="├"
              right="┤"
            >
              {FRAME_FILL}
            </TuiBorderRow>

            <TuiBorderRow
              className={[
                'window-frame-row',
                'window-frame-row--content',
                contentRowClassName,
              ].filter(Boolean).join(' ')}
              left="│"
              right="│"
            >
              <div className="window-frame-content">{children}</div>
            </TuiBorderRow>
          </>
        )}

        <TuiBorderRow
          className={[
            'window-frame-row',
            'window-frame-row--bottom',
            bottomRowClassName,
          ].filter(Boolean).join(' ')}
          left="└"
          right="┘"
        >
          {FRAME_FILL}
        </TuiBorderRow>
      </div>
    );
  },
);

WindowFrame.displayName = 'WindowFrame';

export default WindowFrame;
