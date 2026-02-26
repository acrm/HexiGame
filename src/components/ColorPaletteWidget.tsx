import React from 'react';

interface ColorPaletteWidgetProps {
  colorPalette: readonly string[];
  focusColorIndex: number;
  topOffset?: number;
}

/**
 * Calculate relative color percentage based on distance from focus color
 * in a cyclic palette
 */
function getRelativeOffsets(paletteSize: number): number[] {
  const half = paletteSize / 2;
  const step = 100 / paletteSize;
  const offsets: number[] = [];
  for (let i = -half; i <= half; i++) {
    offsets.push(i * step);
  }
  return offsets;
}

function getColorIndexFromOffset(
  focusColorIndex: number,
  offsetPercent: number,
  paletteSize: number
): number {
  const offsetSteps = Math.round((offsetPercent / 100) * paletteSize);
  return (focusColorIndex + offsetSteps + paletteSize) % paletteSize;
}

function formatPercent(percent: number): string {
  if (percent === 0) return '0%';
  const sign = percent > 0 ? '+' : '';
  const rounded = percent % 1 === 0 ? Math.abs(percent).toString() : Math.abs(percent).toFixed(1).replace(/\.0$/, '');
  return `${sign}${rounded}%`;
}

const ColorPaletteWidget: React.FC<ColorPaletteWidgetProps> = ({
  colorPalette,
  focusColorIndex,
  topOffset = 8,
}) => {
  const paletteSize = colorPalette.length;
  const offsets = getRelativeOffsets(paletteSize);

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
      {offsets.map((percent, offsetIndex) => {
        const colorIndex = getColorIndexFromOffset(focusColorIndex, percent, paletteSize);
        const color = colorPalette[colorIndex];
        const isFocusColor = percent === 0;
        const borderColor = isFocusColor ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)';
        const borderWidth = isFocusColor ? 2 : 1;

        return (
          <div
            key={`${offsetIndex}-${colorIndex}`}
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
