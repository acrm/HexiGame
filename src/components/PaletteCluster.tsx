import React from 'react';

interface PaletteClusterProps {
  colorPalette: readonly string[];
  playerBaseColorIndex: number;
  antagonistIndex: number;
  hoverColorIndex: number | null;
  chance: number | null;
}

const PaletteCluster: React.FC<PaletteClusterProps> = ({
  colorPalette,
  playerBaseColorIndex,
  antagonistIndex,
  hoverColorIndex,
  chance,
}) => {
  const uniformHexSize = 40; // px, box size per hex (width/height of SVG)
  const hexRadius = uniformHexSize / 2; // px, actual hex radius for spacing
  // Diamond cluster of 8 hexes (flat-top), center empty gap
  // Positions arranged in color wheel order 0→1→2→3→4→5→6→7
  // Flat-top axial -> Cartesian: x = 1.5*q*R, y = √3*(r+q/2)*R, where R = hexRadius
  
  return (
    <div style={{ position: 'relative', width: '100%', height: 120 }}>
      {/* ring hexes with grid overlay */}
      {[
        { q: 0, r: -1, colorIdx: 0 },
        { q: 1, r: -1, colorIdx: 1 },
        { q: 2, r: -1, colorIdx: 2 },
        { q: 1, r: 0, colorIdx: 3 },
        { q: 0, r: 1, colorIdx: 4 },
        { q: -1, r: 1, colorIdx: 5 },
        { q: -2, r: 1, colorIdx: 6 },
        { q: -1, r: 0, colorIdx: 7 },
      ].map(({ q, r, colorIdx }) => {
        const sqrt3 = Math.sqrt(3);
        const pos = {
          x: 1.5 * q * hexRadius,
          y: sqrt3 * (r + q / 2) * hexRadius,
        };
        const color = colorPalette[colorIdx];
        const isHover = colorIdx === hoverColorIndex;

        return (
          <svg
            key={colorIdx}
            width={uniformHexSize}
            height={uniformHexSize}
            viewBox="-1 -1 2 2"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(${pos.x - uniformHexSize / 2}px, ${pos.y - uniformHexSize / 2}px)`,
            }}
          >
            {/* colored hex */}
            <polygon
              points={Array.from({ length: 6 }, (_, k) => {
                const ang = (Math.PI / 180) * (60 * k); // flat-top
                const r = 0.98;
                const px = r * Math.cos(ang);
                const py = r * Math.sin(ang);
                return `${px},${py}`;
              }).join(' ')}
              fill={color}
              stroke={isHover ? '#FFFFFF' : '#BBBBBB'}
              strokeWidth={0.12}
            />
          </svg>
        );
      })}
      {/* center hex with chance/state */}
      <svg
        width={uniformHexSize}
        height={uniformHexSize}
        viewBox="-1 -1 2 2"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(${-uniformHexSize / 2}px, ${-uniformHexSize / 2}px)`,
        }}
      >
        <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize="0.7" fill="#FFFFFF">
          {chance !== null && hoverColorIndex !== null ? `${chance}%` : ''}
        </text>
      </svg>
    </div>
  );
};

export default PaletteCluster;
