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
          <div style={{ marginBottom: 8, fontSize: 15, fontWeight: 'bold' }}>Controls</div>
          <div>Joystick = move cursor between hexs</div>
          <div>CAP = hold to capture a hex under cursor</div>
          <div>REL = drop carried hex</div>
          <div>EAT = consume carried hex</div>
        </div>
      </div>
    </>
  );
};

export default ControlsMobile;
