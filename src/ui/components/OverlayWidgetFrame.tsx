import React from 'react';
import WindowFrame, { type WindowFrameStackRole } from './WindowFrame';
import './OverlayWidget.css';

export type OverlayWidgetStackRole = WindowFrameStackRole;

interface OverlayWidgetFrameProps {
  className?: string;
  style?: React.CSSProperties;
  stackRole?: OverlayWidgetStackRole;
  children: React.ReactNode;
}

export const OverlayWidgetFrame = React.forwardRef<HTMLDivElement, OverlayWidgetFrameProps>(
  ({ className, style, stackRole = 'single', children }, ref) => {
    return (
      <WindowFrame
        ref={ref}
        variant="stack"
        stackRole={stackRole}
        className={['overlay-widget-frame', className].filter(Boolean).join(' ')}
        style={style}
        topRowClassName="overlay-widget-border-row overlay-widget-border-row--top"
        contentRowClassName="overlay-widget-border-row overlay-widget-border-row--middle"
        separatorRowClassName="overlay-widget-border-row overlay-widget-border-row--separator"
        bottomRowClassName="overlay-widget-border-row overlay-widget-border-row--bottom"
      >
        {children}
      </WindowFrame>
    );
  },
);

OverlayWidgetFrame.displayName = 'OverlayWidgetFrame';

export default OverlayWidgetFrame;
