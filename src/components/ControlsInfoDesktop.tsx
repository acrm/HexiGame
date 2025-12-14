import React from 'react';

const ControlsDesktop: React.FC = () => {
  return (
    <div style={{ padding: '6px 10px', color: '#fff', opacity: 0.9, fontSize: 13, lineHeight: 1.6 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Goal</div>
      <div>Collect hexes of different colors into your inventory.</div>

      <div style={{ fontWeight: 'bold', margin: '10px 0 6px' }}>Controls</div>
      <div>Arrows/WASD = move cursor (turtle walks toward the cursor)</div>
      <div>Space (hold) = if cursor matches turtle hex, try to eat it; otherwise the turtle jumps toward the cursor</div>
      <div>Tab = toggle World ↔ Inventory</div>
      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>Eat success depends on color difference; turtle color drifts toward hexes it walks over</div>
    </div>
  );
};

export default ControlsDesktop;
