import React from 'react';
import './ColorPaletteWidget.css';
import './OverlayWidget.css';

interface ColorPaletteWidgetProps {
  colorPalette: readonly string[];
  selectedColorIndex: number;
  relativeBaseColorIndex: number | null;
  playerBaseColorIndex: number;
  isAutoBaseColorEnabled: boolean;
  topOffset?: number;
  onColorSelect?: (index: number) => void;
  onToggleAutoBaseColor?: () => void;
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
  relativeBaseColorIndex,
  playerBaseColorIndex,
  isAutoBaseColorEnabled,
  topOffset = 8,
  onColorSelect,
  onToggleAutoBaseColor,
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
      className="overlay-widget-shell color-palette-widget"
      style={{ top: topOffset }}
    >
      <div className="overlay-widget-body color-palette-widget__body">
        <button
          type="button"
          onClick={onToggleAutoBaseColor}
          disabled={!onToggleAutoBaseColor}
          aria-pressed={isAutoBaseColorEnabled}
          title={isAutoBaseColorEnabled ? 'Auto base color: on' : 'Auto base color: off'}
          className={`color-palette-widget__auto-button ${isAutoBaseColorEnabled ? 'is-active' : ''}`}
        >
          <i className="fas fa-crosshairs" aria-hidden="true" />
        </button>
        <div className="color-palette-widget__palette">
        {displayOrder.map((colorIndex, displayIndex) => {
          const color = colorPalette[colorIndex];
          const percent = relativeBaseColorIndex === null
            ? null
            : calculateRelativePercent(colorIndex, relativeBaseColorIndex, paletteSize);
          const isManuallySelectedColor = !isAutoBaseColorEnabled && colorIndex === selectedColorIndex;
          const canSelectColor = !isAutoBaseColorEnabled && !!onColorSelect;

          return (
            <button
              key={`${displayIndex}-${colorIndex}`}
              type="button"
              onClick={canSelectColor ? () => onColorSelect(colorIndex) : undefined}
              disabled={!canSelectColor}
              className={[
                'color-palette-widget__swatch',
                canSelectColor ? 'is-clickable' : '',
                isManuallySelectedColor ? 'is-selected' : '',
              ].filter(Boolean).join(' ')}
              style={{ ['--swatch-color' as string]: color }}
            >
              <span className="color-palette-widget__percent">
                {percent !== null ? formatPercent(percent) : ''}
              </span>
            </button>
          );
        })}
        </div>
      </div>
      {onNavigateToPalette && (
        <button
          type="button"
          onClick={onNavigateToPalette}
          title="Open palette details"
          aria-label="Open palette details"
          className="overlay-widget-edge-button color-palette-widget__navigate-button"
        >
          »
        </button>
      )}
    </div>
  );
};

export default ColorPaletteWidget;
