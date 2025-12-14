import React from 'react';

const ControlsMobile: React.FC<{ onClose: () => void; topOffset?: number }> = ({ onClose, topOffset = 64 }) => {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 900 }} onClick={onClose} />
      <div style={{ position: 'absolute', right: 8, top: topOffset, zIndex: 1001 }}>
        <div
          style={{
            background: '#2a0845',
            border: '2px solid #b36bff',
            borderRadius: 8,
            padding: 12,
            width: 260,
            color: '#fff',
            fontSize: 13,
            lineHeight: 1.6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          <div style={{ marginBottom: 8, fontSize: 15, fontWeight: 'bold' }}>Goal</div>
          <div>Collect hexes of different colors into your inventory.</div>

          <div style={{ margin: '10px 0 6px', fontSize: 15, fontWeight: 'bold' }}>Controls</div>
          <div>Tap a hex = move cursor; turtle walks toward the cursor</div>
          <div>Long press (or hold ACT) = if cursor is on the turtle's hex, it tries to eat that hex; otherwise it jumps toward the cursor</div>
          <div>INV/WRL = toggle World ↔ Inventory</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 6 }}>Eat success depends on color difference; turtle color drifts toward hexes it travels over</div>
        </div>
      </div>
    </>
  );
};

export default ControlsMobile;
