import React from 'react';

const ControlsDesktop: React.FC = () => {
  return (
    <div style={{ padding: '6px 10px', color: '#fff', opacity: 0.9, fontSize: 13, lineHeight: 1.6 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Controls</div>
      <div>Arrows/WASD = move cursor between hexs</div>
      <div>Space (hold) = capture a hex under cursor</div>
      <div>Space = drop carried hex</div>
      <div>E = consume carried hex</div>
    </div>
  );
};

export default ControlsDesktop;
