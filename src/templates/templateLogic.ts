// Pure logic for build template system

import type { Axial, Grid } from '../logic/pureLogic';
import type { BuildTemplate, TemplateCell, RelativeColor, ActiveTemplateState } from './templateTypes';
import { axialToKey, getCell } from '../logic/pureLogic';

/**
 * Convert relative color to absolute palette index
 * @param relativeColor -50 to +50 (percentage of palette)
 * @param baseColorIndex Base color index (0-7 for 8-color palette)
 * @param paletteSize Size of the color palette (default: 8)
 */
export function getAbsoluteColor(
  relativeColor: RelativeColor,
  baseColorIndex: number,
  paletteSize: number = 8
): number {
  // Convert percentage to palette steps
  const offset = Math.round((relativeColor / 100) * paletteSize);
  return (baseColorIndex + offset + paletteSize) % paletteSize;
}

/**
 * Rotate an axial coordinate around origin by N steps clockwise
 * @param pos Original position
 * @param rotation 0-5 (0 = no rotation, 1 = 60° CW, etc.)
 */
export function rotateAxial(pos: Axial, rotation: number): Axial {
  const r = rotation % 6;
  if (r === 0) return pos;
  
  let { q, r: rowR } = pos;
  
  for (let i = 0; i < r; i++) {
    // 60° CW rotation: (q, r) → (-r, q + r)
    const newQ = -rowR;
    const newR = q + rowR;
    q = newQ;
    rowR = newR;
  }
  
  return { q, r: rowR };
}

/**
 * Get world coordinates for a template cell given anchor position and rotation
 */
export function getTemplateCellWorldPos(
  templateCell: TemplateCell,
  anchorWorldPos: Axial,
  rotation: number
): Axial {
  // Rotate cell position relative to anchor
  const rotated = rotateAxial(
    { q: templateCell.q, r: templateCell.r },
    rotation
  );
  
  // Translate to world coordinates
  return {
    q: anchorWorldPos.q + rotated.q,
    r: anchorWorldPos.r + rotated.r,
  };
}

/**
 * Get all template cells with their world positions and expected colors
 */
export function getTemplateCellsWithWorldPos(
  template: BuildTemplate,
  anchorWorldPos: Axial,
  baseColorIndex: number,
  rotation: number,
  paletteSize: number = 8
): Array<{
  templateCell: TemplateCell;
  worldPos: Axial;
  expectedColorIndex: number | null;
}> {
  return template.cells.map(cell => {
    const worldPos = getTemplateCellWorldPos(cell, anchorWorldPos, rotation);
    const expectedColorIndex = cell.relativeColor !== null
      ? getAbsoluteColor(cell.relativeColor, baseColorIndex, paletteSize)
      : null;
    
    return {
      templateCell: cell,
      worldPos,
      expectedColorIndex,
    };
  });
}

/**
 * Validate template against current world grid
 * Returns arrays of correct, incorrect, and missing cells
 */
export function validateTemplate(
  template: BuildTemplate,
  anchorWorldPos: Axial,
  baseColorIndex: number,
  rotation: number,
  grid: Grid,
  paletteSize: number = 8
): {
  correctCells: string[];    // Keys of correctly filled cells
  incorrectCells: string[];  // Keys of cells with wrong color
  emptyCells: string[];      // Keys of cells that should be filled but are empty
  hasErrors: boolean;
} {
  const cells = getTemplateCellsWithWorldPos(
    template,
    anchorWorldPos,
    baseColorIndex,
    rotation,
    paletteSize
  );
  
  const correctCells: string[] = [];
  const incorrectCells: string[] = [];
  const emptyCells: string[] = [];
  
  for (const { worldPos, expectedColorIndex } of cells) {
    // Skip cells that should be empty
    if (expectedColorIndex === null) continue;
    
    const worldCell = getCell(grid, worldPos);
    const cellKey = axialToKey(worldPos);
    
    if (!worldCell || worldCell.colorIndex === null) {
      // Cell is empty but should have a color
      emptyCells.push(cellKey);
    } else if (worldCell.colorIndex === expectedColorIndex) {
      // Cell has correct color
      correctCells.push(cellKey);
    } else {
      // Cell has wrong color
      incorrectCells.push(cellKey);
    }
  }
  
  return {
    correctCells,
    incorrectCells,
    emptyCells,
    hasErrors: incorrectCells.length > 0,
  };
}

/**
 * Check if template is fully completed (all cells correctly filled)
 */
export function isTemplateCompleted(
  template: BuildTemplate,
  anchorWorldPos: Axial,
  baseColorIndex: number,
  rotation: number,
  grid: Grid,
  paletteSize: number = 8
): boolean {
  const validation = validateTemplate(
    template,
    anchorWorldPos,
    baseColorIndex,
    rotation,
    grid,
    paletteSize
  );
  
  return (
    validation.incorrectCells.length === 0 &&
    validation.emptyCells.length === 0 &&
    validation.correctCells.length > 0
  );
}

/**
 * Check if all template cells are empty (template should reset to flickering mode)
 */
export function isTemplateEmpty(
  template: BuildTemplate,
  anchorWorldPos: Axial,
  rotation: number,
  grid: Grid
): boolean {
  const cells = template.cells.filter(c => c.relativeColor !== null);
  
  for (const cell of cells) {
    const worldPos = getTemplateCellWorldPos(cell, anchorWorldPos, rotation);
    const worldCell = getCell(grid, worldPos);
    
    if (worldCell && worldCell.colorIndex !== null) {
      return false; // Found a filled cell
    }
  }
  
  return true; // All cells are empty
}

/**
 * Determine base color and anchor for a template when first hex is placed
 * @param template The template definition
 * @param placedHexPos World position where hex was placed
 * @param placedColorIndex Color index of the placed hex
 * @param focusPos Current focus position (where template anchor is attached)
 * @param rotation Current rotation of the template (from facingDirIndex)
 */
export function determineTemplateAnchor(
  template: BuildTemplate,
  placedHexPos: Axial,
  placedColorIndex: number,
  focusPos: Axial,
  rotation: number
): { anchorPos: Axial; baseColorIndex: number } | null {
  // Template anchors only when hex is placed at focus (where anchor cell is)
  // Anchor cell MUST be at { q: 0, r: 0 } with relativeColor: 0
  if (placedHexPos.q !== focusPos.q || placedHexPos.r !== focusPos.r) {
    return null; // Only anchor when placing on focus
  }
  
  // Anchor at focus, base color is the placed color
  return {
    anchorPos: focusPos,
    baseColorIndex: placedColorIndex,
  };
}
