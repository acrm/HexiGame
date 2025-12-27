import React, { useEffect, useRef, useState } from 'react';

const HEX_SIZE = 10; // pixels
const GRID_STROKE_COLOR = '#635572ff';
const SELECTED_STROKE_COLOR = '#ffffff';
const HOVER_STROKE_COLOR = '#ffffff80';

const HOTBAR_CELLS: Array<{ q: number; r: number }> = [
  { q: -3, r: 2 },
  { q: -2, r: 1 },
  { q: -1, r: 1 },
  { q: 0, r: 0 },
  { q: 1, r: 0 },
  { q: 2, r: -1 },
  { q: 3, r: -1 },
];

function hexToPixel(q: number, r: number) {
  const x = HEX_SIZE * 1.5 * q;
  const y = HEX_SIZE * Math.sqrt(3) * (r + q / 2);
  return { x, y };
}

function drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, stroke: string, lineWidth: number) {
  const angleDeg = 60;
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (angleDeg * i);
    pts.push([x + size * Math.cos(angle), y + size * Math.sin(angle)]);
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = 'transparent';
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function pixelToHotbarIndex(px: number, py: number, centerX: number, centerY: number, scale: number): number | null {
  for (let i = 0; i < HOTBAR_CELLS.length; i++) {
    const cell = HOTBAR_CELLS[i];
    const pos = hexToPixel(cell.q, cell.r);
    const x = centerX + pos.x * scale;
    const y = centerY + pos.y * scale;
    const dist = Math.hypot(px - x, py - y);
    if (dist < HEX_SIZE * scale) {
      return i;
    }
  }
  return null;
}

export const Hotbar: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(3); // default center slot
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const scaleRef = useRef<number>(1);
  const centerXRef = useRef<number>(0);
  const centerYRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const draw = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Compute logical bounds of hotbar cells
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const cell of HOTBAR_CELLS) {
        const pos = hexToPixel(cell.q, cell.r);
        const halfW = HEX_SIZE * 1.0;
        const halfH = HEX_SIZE * Math.sqrt(3) * 0.5;
        minX = Math.min(minX, pos.x - halfW);
        maxX = Math.max(maxX, pos.x + halfW);
        minY = Math.min(minY, pos.y - halfH);
        maxY = Math.max(maxY, pos.y + halfH);
      }

      const logicalWidth = maxX - minX;
      const logicalHeight = maxY - minY;
      const padding = 12;
      const scale = Math.min(
        (w - padding * 2) / logicalWidth,
        (h - padding * 2) / logicalHeight,
      );

      canvas.width = Math.max(1, Math.floor(w));
      canvas.height = Math.max(1, Math.floor(h));

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2 - ((minX + maxX) / 2) * scale;
      const centerY = canvas.height / 2 - ((minY + maxY) / 2) * scale;

      scaleRef.current = scale;
      centerXRef.current = centerX;
      centerYRef.current = centerY;

      const lineWidth = 1 * scale;

      // Layer 1: Draw all cells with base color
      for (let i = 0; i < HOTBAR_CELLS.length; i++) {
        const cell = HOTBAR_CELLS[i];
        const pos = hexToPixel(cell.q, cell.r);
        const x = centerX + pos.x * scale;
        const y = centerY + pos.y * scale;
        drawHex(ctx, x, y, HEX_SIZE * scale, GRID_STROKE_COLOR, lineWidth);
      }

      // Layer 2: Draw hover highlight on top (if not selected)
      if (hoveredIndex !== null && hoveredIndex !== selectedIndex) {
        const cell = HOTBAR_CELLS[hoveredIndex];
        const pos = hexToPixel(cell.q, cell.r);
        const x = centerX + pos.x * scale;
        const y = centerY + pos.y * scale;
        drawHex(ctx, x, y, HEX_SIZE * scale, HOVER_STROKE_COLOR, lineWidth);
      }

      // Layer 3: Draw selected highlight on top
      {
        const cell = HOTBAR_CELLS[selectedIndex];
        const pos = hexToPixel(cell.q, cell.r);
        const x = centerX + pos.x * scale;
        const y = centerY + pos.y * scale;
        drawHex(ctx, x, y, HEX_SIZE * scale, SELECTED_STROKE_COLOR, lineWidth);
      }
    };

    const ro = new ResizeObserver(draw);
    ro.observe(container);
    draw();

    return () => {
      ro.disconnect();
    };
  }, [selectedIndex, hoveredIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleMouseMove(ev: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      const idx = pixelToHotbarIndex(px, py, centerXRef.current, centerYRef.current, scaleRef.current);
      setHoveredIndex(idx);
    }

    function handleMouseLeave() {
      setHoveredIndex(null);
    }

    function handleClick(ev: MouseEvent) {
      ev.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      const idx = pixelToHotbarIndex(px, py, centerXRef.current, centerYRef.current, scaleRef.current);
      if (idx !== null) {
        setSelectedIndex(idx);
      }
    }

    function handleTouchStart(ev: TouchEvent) {
      ev.preventDefault();
      if (ev.touches.length > 0) {
        const t = ev.touches[0];
        const rect = canvas!.getBoundingClientRect();
        const px = t.clientX - rect.left;
        const py = t.clientY - rect.top;
        const idx = pixelToHotbarIndex(px, py, centerXRef.current, centerYRef.current, scaleRef.current);
        if (idx !== null) {
          setSelectedIndex(idx);
        }
      }
    }

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleTouchStart as any);
    };
  }, []);

  return (
    <div className="hotbar" ref={containerRef}>
      <canvas ref={canvasRef} style={{ display: 'block', cursor: 'pointer' }} />
    </div>
  );
};

export default Hotbar;
