import React from 'react';

interface ColorPaletteWidgetProps {
  colorPalette: readonly string[];
  selectedColorIndex: number;
  playerBaseColorIndex: number;
  topOffset?: number;
  onColorSelect?: (index: number) => void;
  onNavigateToPalette?: () => void;
}

/**
 * Calculate relative percentage of a color from selected color
 */
function calculateRelativePercent(
  colorIndex: number,
  selectedColorIndex: number,
  paletteSize: number
): number {
  let distance = colorIndex - selectedColorIndex;
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
  selectedColorIndex,
  playerBaseColorIndex,
  topOffset = 8,
  onColorSelect,
  onNavigateToPalette,
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
    <div
      style={{
        position: 'absolute',
        top: topOffset,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 16px)',
        background: '#333333',
        border: '1px solid #555555',
        borderRadius: '4px',
        padding: '8px',
        display: 'flex',
        flexDirection: 'row',
        gap: '6px',
        zIndex: 50,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
        }}
      >
        {displayOrder.map((colorIndex, displayIndex) => {
          const color = colorPalette[colorIndex];
          const percent = calculateRelativePercent(colorIndex, selectedColorIndex, paletteSize);
          const isSelectedColor = colorIndex === selectedColorIndex;
          const borderColor = isSelectedColor ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)';
          const borderWidth = isSelectedColor ? 2 : 1;

          return (
            <div
              key={`${displayIndex}-${colorIndex}`}
              onClick={() => onColorSelect?.(colorIndex)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: color,
                minWidth: 0,
                minHeight: 24,
                position: 'relative',
                cursor: onColorSelect ? 'pointer' : 'default',
                border: `${borderWidth}px solid ${borderColor}`,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                  textShadow: '0 0 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.5)',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                }}
              >
                {formatPercent(percent)}
              </div>
            </div>
          );
        })}
      </div>
      {onNavigateToPalette && (
        <button
          onClick={onNavigateToPalette}
          style={{
            background: '#444444',
            border: '1px solid #666666',
            borderRadius: '4px',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: 'bold',
            padding: '4px 8px',
            cursor: 'pointer',
            minWidth: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          »
        </button>
      )}
    </div>
  );
};

export default ColorPaletteWidget;
