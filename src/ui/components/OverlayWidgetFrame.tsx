import React from 'react';
import { TuiBorderRow } from '../tui';
import './OverlayWidget.css';

const FRAME_FILL = '─'.repeat(160);

export type OverlayWidgetStackRole = 'single' | 'first' | 'middle' | 'last';

interface OverlayWidgetFrameProps {
  className?: string;
  style?: React.CSSProperties;
  stackRole?: OverlayWidgetStackRole;
  children: React.ReactNode;
}

export const OverlayWidgetFrame = React.forwardRef<HTMLDivElement, OverlayWidgetFrameProps>(
  ({ className, style, stackRole = 'single', children }, ref) => {
    const showTopBorder = stackRole === 'single' || stackRole === 'first';
    const showBottomBorder = stackRole === 'single' || stackRole === 'last';
    const showSeparatorBorder = stackRole === 'first' || stackRole === 'middle';

    return (
      <div ref={ref} className={['overlay-widget-frame', className].filter(Boolean).join(' ')} style={style}>
        {showTopBorder && (
          <TuiBorderRow className="overlay-widget-border-row overlay-widget-border-row--top" left="┌" right="┐">
            {FRAME_FILL}
          </TuiBorderRow>
        )}

        <TuiBorderRow className="overlay-widget-border-row overlay-widget-border-row--middle" left="│" right="│">
          {children}
        </TuiBorderRow>

        {showSeparatorBorder && (
          <TuiBorderRow className="overlay-widget-border-row overlay-widget-border-row--separator" left="├" right="┤">
            {FRAME_FILL}
          </TuiBorderRow>
        )}

        {showBottomBorder && (
          <TuiBorderRow className="overlay-widget-border-row overlay-widget-border-row--bottom" left="└" right="┘">
            {FRAME_FILL}
          </TuiBorderRow>
        )}
      </div>
    );
  },
);

OverlayWidgetFrame.displayName = 'OverlayWidgetFrame';

export default OverlayWidgetFrame;
