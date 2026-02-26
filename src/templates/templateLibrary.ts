// Library of build templates for HexiGame

import type { BuildTemplate } from './templateTypes';

/**
 * Simple ring: 7 hexes of the same color forming a ring with center
 * Difficulty: Easy
 * Perfect for tutorial introduction to templates
 */
export const TEMPLATE_RING_R1: BuildTemplate = {
  id: 'ring_r1',
  name: {
    en: 'Simple Ring',
    ru: 'Простое кольцо',
  },
  description: {
    en: 'A ring of 7 hexes of the same color',
    ru: 'Кольцо из 7 гексов одного цвета',
  },
  difficulty: 'easy',
  anchorCell: { q: 0, r: 0 },
  cells: [
    // Center (anchor)
    { q: 0, r: 0, relativeColor: 0 },
    // Ring around center
    { q: 0, r: -1, relativeColor: 0 },   // North
    { q: 1, r: -1, relativeColor: 0 },   // North-East
    { q: 1, r: 0, relativeColor: 0 },    // South-East
    { q: 0, r: 1, relativeColor: 0 },    // South
    { q: -1, r: 1, relativeColor: 0 },   // South-West
    { q: -1, r: 0, relativeColor: 0 },   // North-West
  ],
  hints: {
    en: [
      'Start with any color',
      'Fill all 7 cells with the same color',
      'The template follows your turtle until you place the first hex',
    ],
    ru: [
      'Начните с любого цвета',
      'Заполните все 7 клеток одним цветом',
      'Шаблон следует за черепашкой, пока вы не поставите первый гекс',
    ],
  },
};

/**
 * Flower pattern: Center + 6 petals in alternating colors
 * Difficulty: Medium
 */
export const TEMPLATE_FLOWER: BuildTemplate = {
  id: 'flower',
  name: {
    en: 'Flower',
    ru: 'Цветок',
  },
  description: {
    en: 'A flower with alternating colored petals',
    ru: 'Цветок с чередующимися цветными лепестками',
  },
  difficulty: 'medium',
  anchorCell: { q: 0, r: 0 },
  cells: [
    // Center
    { q: 0, r: 0, relativeColor: 0 },
    // Alternating petals: base color and +25% (2 steps ahead)
    { q: 0, r: -1, relativeColor: 25 },
    { q: 1, r: -1, relativeColor: 0 },
    { q: 1, r: 0, relativeColor: 25 },
    { q: 0, r: 1, relativeColor: 0 },
    { q: -1, r: 1, relativeColor: 25 },
    { q: -1, r: 0, relativeColor: 0 },
  ],
  hints: {
    en: [
      'Use two colors that are 2 steps apart in the palette',
      'Petals alternate between the two colors',
    ],
    ru: [
      'Используйте два цвета, отстоящих на 2 шага в палитре',
      'Лепестки чередуются между двумя цветами',
    ],
  },
};

/**
 * Triangle: 3-hex triangle with gradient
 * Difficulty: Easy
 */
export const TEMPLATE_TRIANGLE: BuildTemplate = {
  id: 'triangle',
  name: {
    en: 'Rainbow Triangle',
    ru: 'Радужный треугольник',
  },
  description: {
    en: 'A small triangle with color gradient',
    ru: 'Маленький треугольник с градиентом цвета',
  },
  difficulty: 'easy',
  anchorCell: { q: 0, r: 0 },
  cells: [
    { q: 0, r: 0, relativeColor: 0 },
    { q: 1, r: 0, relativeColor: 12.5 },  // +1 step
    { q: 0, r: 1, relativeColor: 25 },    // +2 steps
  ],
  hints: {
    en: [
      'Three adjacent colors from the palette',
      'Forms a small corner shape',
    ],
    ru: [
      'Три соседних цвета из палитры',
      'Образует небольшой угол',
    ],
  },
};

/**
 * Yin-Yang pattern: Balanced opposing colors
 * Difficulty: Hard
 */
export const TEMPLATE_YIN_YANG: BuildTemplate = {
  id: 'yin_yang',
  name: {
    en: 'Yin-Yang',
    ru: 'Инь-Ян',
  },
  description: {
    en: 'Balance of opposite colors',
    ru: 'Баланс противоположных цветов',
  },
  difficulty: 'hard',
  anchorCell: { q: 0, r: 0 },
  cells: [
    // Center
    { q: 0, r: 0, relativeColor: 0 },
    // Left side (base color)
    { q: -1, r: 0, relativeColor: 0 },
    { q: -1, r: 1, relativeColor: 0 },
    // Right side (opposite color, +50% = 4 steps)
    { q: 1, r: -1, relativeColor: 50 },
    { q: 1, r: 0, relativeColor: 50 },
    // Top and bottom
    { q: 0, r: -1, relativeColor: 25 },
    { q: 0, r: 1, relativeColor: -25 },
  ],
  hints: {
    en: [
      'Uses opposite colors (4 steps apart)',
      'Creates a balanced symmetrical pattern',
    ],
    ru: [
      'Использует противоположные цвета (4 шага в палитре)',
      'Создаёт сбалансированный симметричный узор',
    ],
  },
};

/**
 * All available templates
 */
export const ALL_TEMPLATES: BuildTemplate[] = [
  TEMPLATE_RING_R1,
  TEMPLATE_TRIANGLE,
  TEMPLATE_FLOWER,
  TEMPLATE_YIN_YANG,
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): BuildTemplate | undefined {
  return ALL_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(
  difficulty: 'easy' | 'medium' | 'hard'
): BuildTemplate[] {
  return ALL_TEMPLATES.filter(t => t.difficulty === difficulty);
}
