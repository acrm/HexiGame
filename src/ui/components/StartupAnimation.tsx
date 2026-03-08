import React, { useEffect, useRef, useState } from 'react';
import './StartupAnimation.css';

interface StartupAnimationProps {
  onComplete: () => void;
  playerColor: string;
}

export const StartupAnimation: React.FC<StartupAnimationProps> = ({ onComplete, playerColor }) => {
  const [phase, setPhase] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),      // Center hex appears
      setTimeout(() => setPhase(2), 600),      // Surrounding hexes appear
      setTimeout(() => setPhase(3), 2000),     // Form turtle
      setTimeout(() => setPhase(4), 3500),     // Eyes appear
      setTimeout(() => setPhase(5), 4000),     // Shrink to game size
      setTimeout(() => setPhase(6), 5500),     // Reveal game
      setTimeout(() => onCompleteRef.current(), 6500),    // Complete
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  // Hexagon path for SVG
  const hexPath = (size: number) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = size * Math.cos(angle);
      const y = size * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  };

  return (
    <div className={`startup-animation ${phase >= 6 ? 'fade-out' : ''}`}>
      <svg className={`startup-svg ${phase >= 5 ? 'shrink-to-game' : ''}`} viewBox="-300 -300 600 600" width="100%" height="100%">
        {/* Center hexagon (body) */}
        <g className={`hex-center ${phase >= 1 ? 'visible' : ''}`}>
          <polygon points={hexPath(50)} fill={playerColor} stroke="#FFFFFF" strokeWidth="2" />
        </g>

        {/* Top hexagon */}
        <g transform="translate(25, -43.3)">
          <g className={`hex-surround hex-top ${phase >= 2 ? 'visible' : ''} ${phase >= 3 ? 'to-leg' : ''}`}>
            <polygon points={hexPath(50)} fill={playerColor} stroke="#FFFFFF" strokeWidth="2" />
          </g>
        </g>

        {/* Top-right hexagon */}
        <g transform="translate(43.3, -25)">
          <g className={`hex-surround hex-top-right ${phase >= 2 ? 'visible' : ''} ${phase >= 3 ? 'to-leg' : ''}`}>
            <polygon points={hexPath(50)} fill={playerColor} stroke="#FFFFFF" strokeWidth="2" />
          </g>
        </g>

        {/* Bottom-right hexagon */}
        <g transform="translate(43.3, 25)">
          <g className={`hex-surround hex-bottom-right ${phase >= 2 ? 'visible' : ''} ${phase >= 3 ? 'to-leg' : ''}`}>
            <polygon points={hexPath(50)} fill={playerColor} stroke="#FFFFFF" strokeWidth="2" />
          </g>
        </g>

        {/* Bottom hexagon */}
        <g transform="translate(25, 43.3)">
          <g className={`hex-surround hex-bottom ${phase >= 2 ? 'visible' : ''} ${phase >= 3 ? 'to-leg' : ''}`}>
            <polygon points={hexPath(50)} fill={playerColor} stroke="#FFFFFF" strokeWidth="2" />
          </g>
        </g>

        {/* Top-left hexagon (head) */}
        <g transform="translate(-43.3, -25)">
          <g className={`hex-surround hex-top-left ${phase >= 2 ? 'visible' : ''} ${phase >= 3 ? 'to-head' : ''}`}>
            <polygon points={hexPath(50)} fill={playerColor} stroke="#FFFFFF" strokeWidth="2" />
          </g>
        </g>

        {/* Eyes */}
        {phase >= 4 && (
          <g className="turtle-eyes">
            <circle cx="-53" cy="-30" r="4" fill="#000000" className="eye-left" />
            <circle cx="-33" cy="-30" r="4" fill="#000000" className="eye-right" />
          </g>
        )}

      </svg>
    </div>
  );
};

export default StartupAnimation;
