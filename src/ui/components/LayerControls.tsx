import React from 'react';

interface LayerControlsProps {
  activeLayerIndex: number;
  onSwitchLayer?: (delta: 1 | -1) => void;
}

const MIN_LAYER = -2;
const MAX_LAYER = 2;

export const LayerControls: React.FC<LayerControlsProps> = ({ activeLayerIndex, onSwitchLayer }) => {
  const canGoShallower = activeLayerIndex < MAX_LAYER;
  const canGoDeeper = activeLayerIndex > MIN_LAYER;

  const btnStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '1.5px solid rgba(255,255,255,0.55)',
    background: 'rgba(30,20,40,0.72)',
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: '1',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.15s',
  };

  const disabledStyle: React.CSSProperties = {
    ...btnStyle,
    opacity: 0.3,
    cursor: 'default',
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        zIndex: 10,
      }}
    >
      <button
        style={canGoShallower ? btnStyle : disabledStyle}
        disabled={!canGoShallower}
        onClick={() => onSwitchLayer?.(1)}
        title="Crупнее (шаллоу)"
        aria-label="Layer up"
      >
        +
      </button>
      <span
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: 10,
          fontFamily: 'monospace',
          userSelect: 'none',
        }}
      >
        {activeLayerIndex > 0 ? `+${activeLayerIndex}` : String(activeLayerIndex)}
      </span>
      <button
        style={canGoDeeper ? btnStyle : disabledStyle}
        disabled={!canGoDeeper}
        onClick={() => onSwitchLayer?.(-1)}
        title="Глубже (мельче)"
        aria-label="Layer down"
      >
        −
      </button>
    </div>
  );
};
