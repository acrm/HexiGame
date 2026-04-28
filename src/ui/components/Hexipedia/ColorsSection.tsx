import React from 'react';
import type { Params } from '../../../gameLogic/core/params';
import SectionBase from './SectionBase';

interface ColorsSectionProps {
  params: Params;
  selectedColorIndex?: number;
  showColorWidget?: boolean;
  onColorSelect?: (index: number) => void;
  onToggleColorWidget?: (visible: boolean) => void;
  sectionOrder: string[];
  isCollapsed: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggleCollapse: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const ColorsSection: React.FC<ColorsSectionProps> = ({
  params,
  selectedColorIndex,
  showColorWidget = true,
  onColorSelect,
  onToggleColorWidget,
  sectionOrder,
  isCollapsed,
  canMoveUp,
  canMoveDown,
  onToggleCollapse,
  onMoveUp,
  onMoveDown,
}) => {
  const getColorNameByHue = (hue: number): string => {
    const h = ((hue % 360) + 360) % 360;
    if (h < 15 || h >= 345) return 'Красный';
    if (h < 45) return 'Оранжевый';
    if (h < 75) return 'Жёлтый';
    if (h < 105) return 'Лаймовый';
    if (h < 145) return 'Зелёный';
    if (h < 175) return 'Бирюзовый';
    if (h < 205) return 'Голубой';
    if (h < 235) return 'Синий';
    if (h < 265) return 'Индиго';
    if (h < 295) return 'Фиолетовый';
    if (h < 325) return 'Пурпурный';
    return 'Малиновый';
  };

  const getRelativePercent = (index: number): number => {
    const refIndex = selectedColorIndex ?? params.PlayerBaseColorIndex;
    const paletteSize = params.ColorPalette.length;
    let distance = index - refIndex;
    while (distance > paletteSize / 2) distance -= paletteSize;
    while (distance <= -paletteSize / 2) distance += paletteSize;
    return (distance * 100) / paletteSize;
  };

  const formatRelativePercent = (value: number): string => {
    if (value === 0) return '0%';
    const absValue = Math.abs(value);
    const rounded = Number.isInteger(absValue) ? absValue.toFixed(0) : absValue.toFixed(1);
    return `${value > 0 ? '+' : '-'}${rounded}%`;
  };

  const colorWidgetExtra = (
    <button
      className={`hexipedia-section-move hexipedia-widget-toggle ${showColorWidget ? 'on' : 'off'}`}
      onClick={() => onToggleColorWidget?.(!showColorWidget)}
      title={showColorWidget ? 'Скрыть виджет' : 'Показать виджет'}
      aria-label={showColorWidget ? 'Скрыть виджет' : 'Показать виджет'}
    >
      {showColorWidget ? '◉' : '◎'}
    </button>
  );

  return (
    <SectionBase
      sectionId="colors"
      title="Цвета"
      isCollapsed={isCollapsed}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      onToggleCollapse={onToggleCollapse}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      headerExtra={colorWidgetExtra}
    >
      <div className="hexipedia-colors-section">
        <div className="hexipedia-colors-grid">
          <div className="hexipedia-colors-column">
            <div className="hexipedia-color-wheel-wrap">
              <div className="hexipedia-color-wheel-ring" />
              <svg className="hexipedia-color-wheel-overlay" viewBox="0 0 300 300" width="200" height="200">
                {params.ColorPalette.map((color, idx) => {
                  const hue = (params.ColorPaletteStartHue + idx * params.ColorPaletteHueStep) % 360;
                  const angle = (hue - 90) * (Math.PI / 180);
                  const radius = 128;
                  const x = 150 + radius * Math.cos(angle);
                  const y = 150 + radius * Math.sin(angle);
                  const isSelected = idx === selectedColorIndex;
                  
                  return (
                    <g key={`dot-${idx}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r="16"
                        fill={color}
                        stroke={isSelected ? '#FFFFFF' : '#AAAAAA'}
                        strokeWidth={isSelected ? '3' : '2'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onColorSelect?.(idx)}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="hexipedia-colors-column">
            <div className="hexipedia-colors-list">
              {params.ColorPalette.map((color, idx) => {
                const hue = (params.ColorPaletteStartHue + idx * params.ColorPaletteHueStep) % 360;
                const colorName = getColorNameByHue(hue);
                const percent = formatRelativePercent(getRelativePercent(idx));
                const isSelected = idx === (selectedColorIndex ?? params.PlayerBaseColorIndex);

                return (
                  <div
                    key={idx}
                    className={`hexipedia-color-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => onColorSelect?.(idx)}
                  >
                    <div className="hexipedia-color-swatch" style={{ backgroundColor: color }}></div>
                    <span className="hexipedia-color-name">{colorName}</span>
                    <span className="hexipedia-color-percent">{percent}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </SectionBase>
  );
};

export default ColorsSection;
