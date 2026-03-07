import React, { useEffect, useState } from 'react';
import './StartupAnimation.css';

interface StartupAnimationProps {
  onComplete: () => void;
  playerColor: string;
}

export const StartupAnimation: React.FC<StartupAnimationProps> = ({ onComplete, playerColor }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),      // Center hex appears
      setTimeout(() => setPhase(2), 600),      // Surrounding hexes appear
      setTimeout(() => setPhase(3), 2000),     // Form turtle
      setTimeout(() => setPhase(4), 3500),     // Eyes appear
      setTimeout(() => setPhase(5), 4000),     // Shrink to game size
      setTimeout(() => setPhase(6), 5500),     // Reveal game
      setTimeout(() => onComplete(), 6500),    // Complete
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

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
      <svg className="startup-svg" viewBox="-300 -300 600 600" width="100%" height="100%">
        {/* Center hexagon (body) */}
        <g className={`hex-center ${phase >= 1 ? 'visible' : ''}`}>
          <polygon points={hexPath(50)} fill={playerColor} stroke="#FFFFFF" strokeWidth="2" />
        </g>

        {/* Top hexagon */}
        <g 
          className={`hex-surround hex-top ${phase >= 2 ? 'visible' : ''} ${phase >= 3 ? 'to-leg' : ''}`}
          style={{ '--target-x': '25px', '--target-y': '-43px', '--target-scale': '0.33' } as React.CSSProperties}
        >
          <polygon points={hexPath(50)} fill={playerColor} stroke="#FFFFFF" strokeWidth="2" transform="translate(0, -86.6)" />
        </g>

        {/* Top-right hexagon */}
        <g 
          className={`hex-surround hex-top-right ${phase >= 2 ? 'visible' : ''} ${phase >= 3 ? 'to-leg' : ''}`}
          style={{ '--target-x': '43px', '--target-y': '-25px', '--target-scale': '0.33' } as React.CSSProperties}
        >
          <polygon points={hexPath(50)} fill={playerColor} stroke="#FFFFFF" strokeWidth="2" transform="translate(75, -43.3)" />
        </g>

        {/* Bottom-right hexagon */}
        <g 
          className={`hex-surround hex-bottom-right ${phase >= 2 ? 'visible' : ''} ${phase >= 3 ? 'to-leg' : ''}`}
          style={{ '--target-x': '43px', '--target-y': '25px', '--target-scale': '0.33' } as React.CSSProperties}
        >
          <polygon points={hexPath(50)} fill={playerColor} stroke="#FFFFFF" strokeWidth="2" transform="translate(75, 43.3)" />
        </g>

        {/* Bottom hexagon */}
        <g 
          className={`hex-surround hex-bottom ${phase >= 2 ? 'visible' : ''} ${phase >= 3 ? 'to-leg' : ''}`}
          style={{ '--target-x': '25px', '--target-y': '43px', '--target-scale': '0.33' } as React.CSSProperties}
        >
          <polygon points={hexPath(50)} fill={playerColor} stroke="#FFFFFF" strokeWidth="2" transform="translate(0, 86.6)" />
        </g>

        {/* Top-left hexagon (head) */}
        <g 
          className={`hex-surround hex-top-left ${phase >= 2 ? 'visible' : ''} ${phase >= 3 ? 'to-head' : ''}`}
          style={{ '--target-x': '-43px', '--target-y': '-25px', '--target-scale': '0.59' } as React.CSSProperties}
        >
          <polygon points={hexPath(50)} fill={playerColor} stroke="#FFFFFF" strokeWidth="2" transform="translate(-75, -43.3)" />
        </g>

        {/* Eyes */}
        {phase >= 4 && (
          <g className="turtle-eyes">
            <circle cx="-53" cy="-30" r="4" fill="#000000" className="eye-left" />
            <circle cx="-33" cy="-30" r="4" fill="#000000" className="eye-right" />
          </g>
        )}

        {/* Turtle group for final scaling */}
        <g className={`turtle-final ${phase >= 5 ? 'shrink-to-game' : ''}`} />
      </svg>
    </div>
  );
};

export default StartupAnimation;
