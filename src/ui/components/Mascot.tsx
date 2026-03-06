import React, { useEffect, useRef } from 'react';
import { t } from '../ui/i18n';

export const Mascot: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const padding = 20;
    const maxWidth = window.innerWidth - padding * 2;
    const maxHeight = window.innerHeight - padding * 2 - 60;
    const size = Math.max(300, Math.min(maxWidth, maxHeight));
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // Draw turtle exactly as in GameField
    const centerX = size / 2;
    const centerY = size / 2;
    // Scale HEX_SIZE so turtle fills most of the canvas
    // Turtle spans ~8 hex radii (from center to outer petals), so we want HEX_SIZE * 8 ≈ size/2
    const HEX_SIZE = size / 16;
    const scale = 8;

    const drawHex = (x: number, y: number, radius: number, fill: string, stroke: string, lineWidth: number) => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i);
        pts.push([x + radius * Math.cos(angle), y + radius * Math.sin(angle)]);
      }
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (lineWidth > 0) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    const parentRadius = HEX_SIZE * scale;
    const centerRadius = parentRadius / 3;
    const shellRadius = parentRadius / Math.sqrt(3);
    const turtleOffsetX = centerX;
    const turtleOffsetY = centerY;
    const baseColor = '#FF8000'; // orange

    // Petal centers
    const smallCenters: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 180) * (60 * i - 30);
      const ringRadius = centerRadius * 2.05;
      smallCenters.push({
        x: turtleOffsetX + ringRadius * Math.cos(ang),
        y: turtleOffsetY + ringRadius * Math.sin(ang),
      });
    }

    const headIndex = 0; // head pointing up
    const tailIndex = 3;

    // Draw petals
    for (let i = 0; i < smallCenters.length; i++) {
      if (i === tailIndex) continue;
      const c = smallCenters[i];
      const isHead = i === headIndex;
      const radius = isHead ? centerRadius : parentRadius / 9;
      const fill = isHead ? baseColor : 'rgba(255,255,255,0.6)';
      drawHex(c.x, c.y, radius, fill, '#FFFFFF', 0.8 * scale);
      if (isHead) {
        // Eyes perpendicular to head direction
        const hx2 = c.x - turtleOffsetX;
        const hy2 = c.y - turtleOffsetY;
        const len = Math.hypot(hx2, hy2) || 1;
        const ux = hx2 / len;
        const uy = hy2 / len;
        const px = -uy;
        const py = ux;
        const eyeOffset = radius * 0.35;
        const eyeSize = radius * 0.12;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(c.x + px * eyeOffset, c.y + py * eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(c.x - px * eyeOffset, c.y - py * eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Shell
    ctx.save();
    ctx.translate(turtleOffsetX, turtleOffsetY);
    ctx.rotate((30 * Math.PI) / 180);
    drawHex(0, 0, shellRadius, baseColor, '#FFFFFF', 0.8 * scale);
    ctx.restore();

    // Text - no text on canvas, moved to div below
  }, []);

  return (
    <div className="mascot-overlay" onClick={onClose}>
      <div className="mascot-display">
        <canvas ref={canvasRef} />
        <div className="mascot-text">🐢 Click anywhere to close</div>
      </div>
    </div>
  );
};

export default Mascot;
