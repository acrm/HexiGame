import React from 'react';

interface ColorPaletteWidgetProps {
  colorPalette: readonly string[];
  focusColorIndex: number;
  playerBaseColorIndex: number;
  topOffset?: number;
}

/**
 * Calculate relative percentage of a color from focus color
 */
function calculateRelativePercent(
  colorIndex: number,
  focusColorIndex: number,
  paletteSize: number
): number {
  let distance = colorIndex - focusColorIndex;
  // Normalize to -paletteSize/2 ... paletteSize/2
  while (distance > paletteSize / 2) distance -= paletteSize;
  while (distance <= -paletteSize / 2) distance += paletteSize;
  // Convert to percentage (paletteSize/2 steps = 50%)
  return (distance * 100) / paletteSize;
}

function formatPercent(percent: number): string {
  if (percent === 0) return '0%';
  if (Math.abs(percent) === 50) return '±50%';
  const sign = percent > 0 ? '+' : '-';
  const absValue = Math.abs(percent);
  const rounded = absValue % 1 === 0 ? absValue.toString() : absValue.toFixed(1).replace(/\.0$/, '');
  return `${sign}${rounded}%`;
}

const ColorPaletteWidget: React.FC<ColorPaletteWidgetProps> = ({
  colorPalette,
  focusColorIndex,
  playerBaseColorIndex,
  topOffset = 8,
}) => {
  const paletteSize = colorPalette.length;
  const antagonistIndex = (playerBaseColorIndex + paletteSize / 2) % paletteSize;

  // Build display order: antagonist, then cycle to base color in center, then back to antagonist
  // For 8 colors with base=0, antagonist=4: display order is [4,5,6,7,0,1,2,3,4]
  const displayOrder: number[] = [];
  for (let i = 0; i < paletteSize + 1; i++) {
    const colorIndex = (antagonistIndex + i) % paletteSize;
    displayOrder.push(colorIndex);
  }

  return (
    <div style={{
      position: 'absolute',
      top: topOffset,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 16px)',
      maxWidth: 520,
      display: 'flex',
      gap: 2,
      padding: 8,
      background: 'rgba(0, 0, 0, 0.4)',
      borderRadius: 4,
      zIndex: 50,
    }}>
      {displayOrder.map((colorIndex, displayIndex) => {
        const color = colorPalette[colorIndex];
        const percent = calculateRelativePercent(colorIndex, focusColorIndex, paletteSize);
        const isFocusColor = colorIndex === focusColorIndex;
        const borderColor = isFocusColor ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)';
        const borderWidth = isFocusColor ? 2 : 1;

        return (
          <div
            key={`${displayIndex}-${colorIndex}`}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '4px 2px',
              background: color,
              border: `${borderWidth}px solid ${borderColor}`,
              borderRadius: 2,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: '8px',
                fontWeight: 'bold',
                color: '#FFFFFF',
                textShadow: '0 0 2px rgba(0,0,0,0.5)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%',
                textAlign: 'center',
              }}
            >
              {formatPercent(percent)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ColorPaletteWidget;
