import React from 'react';

const ControlsDesktop: React.FC = () => {
  return (
    <div style={{ padding: '6px 10px', color: '#fff', opacity: 0.9, fontSize: 13, lineHeight: 1.6 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Controls</div>
      <div>Arrows/WASD = move cursor</div>
      <div>Space (hold) = capture hex under cursor</div>
      <div>Space = drop carried hex</div>
      <div>E = eat carried hex (stores in inventory)</div>
      <div>Tab = toggle World ↔ Inventory</div>
      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>In Inventory: cursor & capture/move work on inventory grid</div>
    </div>
  );
};

export default ControlsDesktop;
