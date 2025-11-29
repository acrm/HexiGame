import React from 'react';

interface PaletteClusterProps {
  colorPalette: readonly string[];
  playerBaseColorIndex: number;
  antagonistIndex: number;
  eatenCounts: Record<string, number>;
  hoverColorIndex: number | null;
  capturedCell: boolean;
  chance: number | null;
}

const PaletteCluster: React.FC<PaletteClusterProps> = ({
  colorPalette,
  playerBaseColorIndex,
  antagonistIndex,
  eatenCounts,
  hoverColorIndex,
  capturedCell,
  chance,
}) => {
  const uniformHexSize = 40; // px, larger across panel
  // Diamond cluster of 8 hexes (flat-top), center empty gap
  // Positions relative to center: two lines of 3 and singles left/right
  const clusterPositions = [
    { x: 0, y: 0 }, // center gap
    // Top line of 3
    { x: -uniformHexSize * 0.87, y: -uniformHexSize * 0.5 },
    { x: 0, y: -uniformHexSize * 1 },
    { x: +uniformHexSize * 0.87, y: -uniformHexSize * 0.5 },
    // Bottom line of 3
    { x: -uniformHexSize * 0.87, y: +uniformHexSize * 0.5 },
    { x: 0, y: +uniformHexSize * 1 },
    { x: +uniformHexSize * 0.87, y: +uniformHexSize * 0.5 },
    // Singles left/right
    { x: -uniformHexSize * 1.74, y: 0 },
    { x: +uniformHexSize * 1.74, y: 0 },
  ];
  // Diamond cluster fills 8 ring positions clockwise from leftmost:
  // Based on image: pink top-left, orange top-right, purple left, protagonist top-center,
  // yellow bottom-center, pink right, arrange spectrum between key colors
  // clusterPositions.slice(1) order: [0]=top-left, [1]=top-center, [2]=top-right,
  //                                  [3]=bottom-left, [4]=bottom-center, [5]=bottom-right,
  //                                  [6]=left, [7]=right
  // Map palette indices to positions per image layout
  const ringOrder = [
    7,  // 0: top-left = pink (#FF99FF)
    0,  // 1: top-center = orange (#FF8000) protagonist
    1,  // 2: top-right = darker orange (#CC6600)
    5,  // 3: bottom-left = purple (#9933FF)
    2,  // 4: bottom-center = yellow (#996600)
    6,  // 5: bottom-right = light purple (#CC66FF)
    4,  // 6: left = dark purple (#660099) antagonist
    3,  // 7: right = dark yellow (#666600)
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: 120 }}>
      {/* ring hexes */}
      {clusterPositions.slice(1).map((pos, i) => {
        const colorIdx = ringOrder[i % ringOrder.length];
        const color = colorPalette[colorIdx];
        const cnt = eatenCounts[color] || 0;
        const isHover = colorIdx === hoverColorIndex;
        return (
          <svg
            key={color + i}
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
              stroke={isHover ? '#FFFFFF' : '#BBBBBB'}
              strokeWidth={0.12}
            />
            {cnt > 0 ? (
              <text
                x={0}
                y={0.08}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="0.9"
                fill="#FFFFFF"
              >
                {cnt}
              </text>
            ) : null}
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
