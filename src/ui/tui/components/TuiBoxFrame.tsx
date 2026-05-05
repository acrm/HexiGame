import React from 'react';
import { TuiBorderRow } from './TuiBorderRow';

interface TuiBoxFrameProps {
  topLeft: React.ReactNode;
  topRight: React.ReactNode;
  topContent: React.ReactNode;
  bottomLeft: React.ReactNode;
  bottomRight: React.ReactNode;
  bottomContent: React.ReactNode;
  body: React.ReactNode;
  className?: string;
  topClassName?: string;
  bodyClassName?: string;
  bottomClassName?: string;
  topFillClassName?: string;
}

export const TuiBoxFrame: React.FC<TuiBoxFrameProps> = ({
  topLeft,
  topRight,
  topContent,
  bottomLeft,
  bottomRight,
  bottomContent,
  body,
  className,
  topClassName,
  bodyClassName,
  bottomClassName,
  topFillClassName,
}) => {
  return (
    <div className={['tui-box-frame', className].filter(Boolean).join(' ')}>
      <TuiBorderRow
        className={topClassName}
        left={topLeft}
        right={topRight}
        fillClassName={topFillClassName}
      >
        {topContent}
      </TuiBorderRow>
      <div className={bodyClassName}>{body}</div>
      <TuiBorderRow className={bottomClassName} left={bottomLeft} right={bottomRight}>
        {bottomContent}
      </TuiBorderRow>
    </div>
  );
};

export default TuiBoxFrame;
