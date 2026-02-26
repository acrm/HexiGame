import React from 'react';

interface ColorPaletteWidgetProps {
  colorPalette: readonly string[];
  focusColorIndex: number;
}

/**
 * Calculate relative color percentage based on distance from focus color
 * in a cyclic palette
 */
function calculateRelativePercent(
  fromColorIndex: number,
  toColorIndex: number,
  paletteSize: number
): number {
  let distance = toColorIndex - fromColorIndex;
  // Normalize to -paletteSize/2 ... paletteSize/2
  while (distance > paletteSize / 2) distance -= paletteSize;
  while (distance <= -paletteSize / 2) distance += paletteSize;
  // Convert to percentage (paletteSize/2 steps = 50%)
  return (distance * 100) / paletteSize;
}

function formatPercent(percent: number): string {
  if (percent === 0) return '0%';
  const sign = percent > 0 ? '+' : '';
  const rounded = percent % 1 === 0 ? Math.abs(percent).toString() : Math.abs(percent).toFixed(1).replace(/\.0$/, '');
  return `${sign}${rounded}%`;
}

const ColorPaletteWidget: React.FC<ColorPaletteWidgetProps> = ({ colorPalette, focusColorIndex }) => {
  const paletteSize = colorPalette.length;
  const hexWidth = 100 / paletteSize; // percentage of container width

  return (
    <div style={{
      position: 'absolute',
      top: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 16px)',
      maxWidth: 480,
      display: 'flex',
      gap: 2,
      padding: 8,
      background: 'rgba(0, 0, 0, 0.4)',
      borderRadius: 4,
      zIndex: 50,
    }}>
      {colorPalette.map((color, index) => {
        const percent = calculateRelativePercent(focusColorIndex, index, paletteSize);
        const isFocusColor = index === focusColorIndex;
        const borderColor = isFocusColor ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)';
        const borderWidth = isFocusColor ? 2 : 1;

        return (
          <div
            key={index}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '4px 2px',
              background: color,
              border: `${borderWidth}px solid ${borderColor}`,
              borderRadius: 2,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: Math.max(
                  parseInt(color.slice(1, 3), 16),
                  parseInt(color.slice(3, 5), 16),
                  parseInt(color.slice(5, 7), 16)
                ) > 128 ? '#000000' : '#FFFFFF',
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
