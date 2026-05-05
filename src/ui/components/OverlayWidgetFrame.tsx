import React from 'react';
import { TuiBorderRow } from '../tui';
import './OverlayWidget.css';

const FRAME_FILL = '─'.repeat(160);

interface OverlayWidgetFrameProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const OverlayWidgetFrame = React.forwardRef<HTMLDivElement, OverlayWidgetFrameProps>(
  ({ className, style, children }, ref) => {
    return (
      <div ref={ref} className={['overlay-widget-frame', className].filter(Boolean).join(' ')} style={style}>
        <TuiBorderRow className="overlay-widget-border-row overlay-widget-border-row--top" left="┌" right="┐">
          {FRAME_FILL}
        </TuiBorderRow>

        <TuiBorderRow className="overlay-widget-border-row overlay-widget-border-row--middle" left="│" right="│">
          {children}
        </TuiBorderRow>

        <TuiBorderRow className="overlay-widget-border-row overlay-widget-border-row--bottom" left="└" right="┘">
          {FRAME_FILL}
        </TuiBorderRow>
      </div>
    );
  },
);

OverlayWidgetFrame.displayName = 'OverlayWidgetFrame';

export default OverlayWidgetFrame;
