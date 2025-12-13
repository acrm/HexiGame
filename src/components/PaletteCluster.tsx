import React from 'react';

interface PaletteClusterProps {
  colorPalette: readonly string[];
  playerBaseColorIndex: number;
  antagonistIndex: number;
  eatenCounts: Record<string, number>;
  hoverColorIndex: number | null;
  capturedCell: boolean;
  chance: number | null;
  turtleColorIndex?: number;
}

const PaletteCluster: React.FC<PaletteClusterProps> = ({
  colorPalette,
  playerBaseColorIndex,
  antagonistIndex,
  eatenCounts,
  hoverColorIndex,
  capturedCell,
  chance,
  turtleColorIndex,
}) => {
  const uniformHexSize = 40; // px, larger across panel
  // Diamond cluster of 8 hexes (flat-top), center empty gap
  // Positions arranged in color wheel order 0→1→2→3→4→5→6→7
  const clusterPositions = [
    { x: 0, y: 0 }, // center gap
    { x: 0, y: -uniformHexSize * 1 },                    // 0: top-center
    { x: +uniformHexSize * 0.87, y: -uniformHexSize * 0.5 }, // 1: top-right
    { x: +uniformHexSize * 1.74, y: 0 },                 // 2: right
    { x: +uniformHexSize * 0.87, y: +uniformHexSize * 0.5 }, // 3: bottom-right
    { x: 0, y: +uniformHexSize * 1 },                    // 4: bottom-center
    { x: -uniformHexSize * 0.87, y: +uniformHexSize * 0.5 }, // 5: bottom-left
    { x: -uniformHexSize * 1.74, y: 0 },                 // 6: left
    { x: -uniformHexSize * 0.87, y: -uniformHexSize * 0.5 }, // 7: top-left
  ];
  
  return (
    <div style={{ position: 'relative', width: '100%', height: 120 }}>
      {/* ring hexes */}
      {clusterPositions.slice(1).map((pos, colorIdx) => {
        const color = colorPalette[colorIdx];
        const cnt = eatenCounts[color] || 0;
        const isHover = colorIdx === hoverColorIndex;
        const isTurtleColor = turtleColorIndex !== undefined && colorIdx === turtleColorIndex;
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
            <polygon
              points={Array.from({ length: 6 }, (_, k) => {
                const ang = (Math.PI / 180) * (60 * k); // flat-top
                const r = 0.98;
                const px = r * Math.cos(ang);
                const py = r * Math.sin(ang);
                return `${px},${py}`;
              }).join(' ')}
              fill={color}
              stroke={isTurtleColor ? '#00FF00' : isHover ? '#FFFFFF' : '#BBBBBB'}
              strokeWidth={isTurtleColor ? 0.18 : 0.12}
            />
            <text
              x={0}
              y={0.08}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="0.9"
              fill="#FFFFFF"
            >
              {colorIdx}
            </text>
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
          {capturedCell ? 'Kept' : chance !== null && hoverColorIndex !== null ? `${chance}%` : ''}
        </text>
      </svg>
    </div>
  );
};

export default PaletteCluster;
