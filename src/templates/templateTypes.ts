// Template system types for HexiGame

import type { Axial } from '../logic/pureLogic';

/**
 * Relative color value: percentage offset from base color in the palette.
 * Range: -50 to +50
 * - 0: Same color as anchor
 * - 25: Quarter palette ahead (2 steps in 8-color palette)
 * - -25: Quarter palette behind
 * - ±50: Opposite/antagonist color (4 steps in 8-color palette)
 */
export type RelativeColor = number; // -50..50

/**
 * A single cell in a build template with relative color specification
 */
export interface TemplateCell {
  q: number;
  r: number;
  /**
   * Relative color offset from base color.
   * null means this cell should remain empty in the template.
   */
  relativeColor: RelativeColor | null;
}

/**
 * A build template definition
 */
export interface BuildTemplate {
  id: string;
  name: {
    en: string;
    ru: string;
  };
  description?: {
    en: string;
    ru: string;
  };
  difficulty: 'easy' | 'medium' | 'hard';
  
  /**
   * Anchor cell coordinates (relative to template origin).
   * This is the starting point where the first hex will be placed.
   * Typically has relativeColor: 0
   */
  anchorCell: Axial;
  
  /**
   * All cells in the template (including anchor).
   * Coordinates are relative to the anchor point.
   */
  cells: TemplateCell[];
  
  /**
   * Optional hints for the player
   */
  hints?: {
    en?: string[];
    ru?: string[];
  };
}

/**
 * Active template state in the game
 */
export interface ActiveTemplateState {
  templateId: string;
  
  /**
   * If null, template is in "flickering" mode (attached to focus).
   * If set, template is anchored in the world at this position.
   */
  anchoredAt: {
    q: number;
    r: number;
    baseColorIndex: number; // Color of the first placed hex
    rotation: number;        // 0-5, rotation from original orientation
  } | null;
  
  /**
   * Validation status: true if any cells have wrong colors
   */
  hasErrors: boolean;
  
  /**
   * Set of correctly filled cell keys in format "q,r"
   */
  filledCells: Set<string>;
  
  /**
   * Tick when template was completed
   */
  completedAtTick?: number;
}
