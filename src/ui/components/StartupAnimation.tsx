import React, { useEffect, useRef, useState } from 'react';
import './StartupAnimation.css';

interface StartupAnimationProps {
  onComplete: () => void;
}

const MASCOT_BASE_COLOR = '#FF8000';
const SHELL_RADIUS = 92;
const HEAD_RADIUS = SHELL_RADIUS / Math.sqrt(3);
const LIMB_SCALE = 1 / 3;
const PETAL_RING_RADIUS = HEAD_RADIUS * 2.05;

const PETALS: ReadonlyArray<{ id: string; angleDeg: number; type: 'head' | 'limb' }> = [
  { id: 'head', angleDeg: -30, type: 'head' },
  { id: 'limb-right', angleDeg: 30, type: 'limb' },
  { id: 'limb-bottom', angleDeg: 90, type: 'limb' },
  { id: 'limb-left', angleDeg: 210, type: 'limb' },
  { id: 'limb-top', angleDeg: 270, type: 'limb' },
];

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const angle = (Math.PI / 180) * angleDeg;
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
  };
}

function hexPath(radius: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

export const StartupAnimation: React.FC<StartupAnimationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3500),
      setTimeout(() => setPhase(5), 4000),
      setTimeout(() => setPhase(6), 5500),
      setTimeout(() => onCompleteRef.current(), 6500),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const headCenter = polar(-30, PETAL_RING_RADIUS);
  const headLength = Math.hypot(headCenter.x, headCenter.y) || 1;
  const headUx = headCenter.x / headLength;
  const headUy = headCenter.y / headLength;
  const headPx = -headUy;
  const headPy = headUx;
  const eyeOffset = HEAD_RADIUS * 0.35;
  const eyeRadius = HEAD_RADIUS * 0.12;

  const leftEye = {
    x: headCenter.x + headPx * eyeOffset,
    y: headCenter.y + headPy * eyeOffset,
  };

  const rightEye = {
    x: headCenter.x - headPx * eyeOffset,
    y: headCenter.y - headPy * eyeOffset,
  };

  return (
    <div className={`startup-animation ${phase >= 6 ? 'fade-out' : ''}`}>
      <svg className={`startup-svg ${phase >= 5 ? 'shrink-to-game' : ''}`} viewBox="-280 -280 560 560" width="100%" height="100%">
        <g className={`hex-shell ${phase >= 1 ? 'visible' : ''}`}>
          <g transform="rotate(30)">
            <polygon points={hexPath(SHELL_RADIUS)} fill={MASCOT_BASE_COLOR} stroke="#FFFFFF" strokeWidth="2" />
          </g>
        </g>

        {PETALS.map((petal) => {
          const center = polar(petal.angleDeg, PETAL_RING_RADIUS);
          const fill = petal.type === 'head'
            ? MASCOT_BASE_COLOR
            : phase >= 3
              ? 'rgba(255,255,255,0.6)'
              : MASCOT_BASE_COLOR;

          return (
            <g key={petal.id} transform={`translate(${center.x}, ${center.y})`}>
              <g
                className={`hex-surround ${petal.type === 'head' ? 'hex-head' : 'hex-limb'} ${phase >= 2 ? 'visible' : ''} ${phase >= 3 ? (petal.type === 'head' ? 'to-head' : 'to-limb') : ''}`}
                style={{ '--limb-scale': LIMB_SCALE } as React.CSSProperties}
              >
                <polygon points={hexPath(HEAD_RADIUS)} fill={fill} stroke="#FFFFFF" strokeWidth="2" />
              </g>
            </g>
          );
        })}

        {phase >= 4 && (
          <g className="turtle-eyes">
            <circle cx={leftEye.x} cy={leftEye.y} r={eyeRadius} fill="#000000" className="eye-left" />
            <circle cx={rightEye.x} cy={rightEye.y} r={eyeRadius} fill="#000000" className="eye-right" />
          </g>
        )}
      </svg>
    </div>
  );
};

export default StartupAnimation;
