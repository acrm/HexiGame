// Helper functions for rendering build templates on canvas

import { GameState, Params, Axial } from '../logic/pureLogic';
import { getTemplateById } from '../templates/templateLibrary';
import { getTemplateCellsWithWorldPos } from '../templates/templateLogic';

const HEX_SIZE = 10; // Match GameField's HEX_SIZE

/**
 * Draw a single hex for template overlay
 */
function drawTemplateHex(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fill: string,
  stroke: string,
  lineWidth: number = 2
) {
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
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/**
 * Helper: axial -> pixel (pointy-top)
 */
function hexToPixel(q: number, r: number) {
  const x = HEX_SIZE * 1.5 * q;
  const y = HEX_SIZE * Math.sqrt(3) * (r + q / 2);
return { x, y };
}

/**
 * Render template overlay on canvas
 * @param ctx Canvas rendering context
 * @param state Current game state
 * @param params Game parameters
 * @param offsetX Canvas offset X
 * @param offsetY Canvas offset Y
 * @param tick Current tick for animations
 * @param scale Scaling factor for the game field
 */
export function renderTemplateOverlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  params: Params,
  offsetX: number,
  offsetY: number,
  tick: number,
  scale: number
) {
  if (!state.activeTemplate) return;

  const template = getTemplateById(state.activeTemplate.templateId);
  if (!template) return;

  // Determine anchor position based on template state
  let anchorPos: Axial;
  let rotation: number;
  let baseColorIndex: number | undefined;

  if (state.activeTemplate.anchoredAt) {
    // Template is anchored
    anchorPos = state.activeTemplate.anchoredAt;
    rotation = state.activeTemplate.anchoredAt.rotation;
    baseColorIndex = state.activeTemplate.anchoredAt.baseColorIndex;
  } else {
    // Template is in flickering mode (attached to focus)
    anchorPos = state.focus;
    rotation = state.facingDirIndex;
  }

  // Get all template cells with world positions
  const cells = getTemplateCellsWithWorldPos(
    template,
    anchorPos,
    baseColorIndex ?? 0,
    rotation,
    params.ColorPalette.length
  );

  // Determine stroke color based on template state
  const strokeColor = state.activeTemplate.hasErrors ? '#000000' : '#FFFFFF';

  // Flickering animation for unanchored template
  const isFlickering = !state.activeTemplate.anchoredAt;
  let opacity = 0.4;
  if (isFlickering) {
    // Sine wave flicker between 0.2 and 0.6
    opacity = 0.4 + 0.2 * Math.sin((tick / 6) * Math.PI);
  }

  ctx.save();

  // Render each template cell
  for (const cell of cells) {
    const { worldPos, expectedColorIndex } = cell;
    const { x, y } = hexToPixel(worldPos.q, worldPos.r);
    const screenX = offsetX + x * scale;
    const screenY = offsetY + y * scale;

    // Skip cells that should be empty in template
    if (expectedColorIndex === null) continue;

    // Determine fill color
    let fillColor: string;
    if (baseColorIndex !== undefined) {
      // Template is anchored, use actual expected color
      fillColor = params.ColorPalette[expectedColorIndex];
    } else {
      // Template is flickering, use semi-transparent white
      fillColor = `rgba(255, 255, 255, ${opacity})`;
    }

    // For anchored templates, check if cell is filled correctly
    const cellKey = `${worldPos.q},${worldPos.r}`;
    const isCorrectlyFilled = state.activeTemplate.filledCells.has(cellKey);

    if (state.activeTemplate.anchoredAt) {
      if (isCorrectlyFilled) {
        // Cell is correctly filled - don't draw overlay (let actual hex show)
        continue;
      } else {
        // Cell needs to be filled - show template preview
        ctx.globalAlpha = opacity;
        drawTemplateHex(ctx, screenX, screenY, HEX_SIZE * scale, fillColor, strokeColor, 2);
        ctx.globalAlpha = 1;
      }
    } else {
      // Flickering mode - draw all cells
      ctx.globalAlpha = opacity;
      drawTemplateHex(ctx, screenX, screenY, HEX_SIZE * scale, fillColor, strokeColor, 2);
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}
