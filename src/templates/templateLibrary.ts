// Library of build templates for HexiGame

import type { BuildTemplate } from './templateTypes';

// Anchor convention: (0,0) is the edge cell closest to the turtle.
// Templates are authored for turtle facing up; rotation keeps them oriented to the head.

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
    // Anchor edge (closest to turtle)
    { q: 0, r: 0, relativeColor: 0 },
    // Ring around center
    { q: 0, r: -1, relativeColor: 0 },   // Center
    { q: 0, r: -2, relativeColor: 0 },   // North
    { q: 1, r: -2, relativeColor: 0 },   // North-East
    { q: 1, r: -1, relativeColor: 0 },   // South-East
    { q: -1, r: 0, relativeColor: 0 },   // South-West
    { q: -1, r: -1, relativeColor: 0 },  // North-West
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
    // Anchor edge (closest to turtle)
    { q: 0, r: 0, relativeColor: 0 },
    // Center
    { q: 0, r: -1, relativeColor: 0 },
    // Alternating petals: base color and +33.33% (2 steps ahead)
    { q: 0, r: -2, relativeColor: 33.33 },
    { q: 1, r: -2, relativeColor: 0 },
    { q: 1, r: -1, relativeColor: 33.33 },
    { q: -1, r: 0, relativeColor: 33.33 },
    { q: -1, r: -1, relativeColor: 0 },
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
    { q: 0, r: 0, relativeColor: 0 },     // Anchor at focus (0%) - bottom edge
    { q: 0, r: -1, relativeColor: 33.33 },   // Away from turtle (upward)
    { q: 1, r: -1, relativeColor: 16.67 }, // +1 step (upward-right)
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
    // Anchor at focus (0%)
    { q: 0, r: 0, relativeColor: 0 },
    // Center
    { q: 0, r: -1, relativeColor: 33.33 },
    // Left side (base color)
    { q: -1, r: -1, relativeColor: 33.33 },
    { q: -1, r: 0, relativeColor: 33.33 },
    // Right side (opposite color, ±50% = 3 steps)
    { q: 1, r: -2, relativeColor: -33.33 },
    { q: 1, r: -1, relativeColor: -33.33 },
    // Top
    { q: 0, r: -2, relativeColor: 50 },
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
 * Hexagon: Ring of 6 cells with alternating colors
 * Difficulty: Medium
 */
export const TEMPLATE_HEXAGON: BuildTemplate = {
  id: 'hexagon',
  name: {
    en: 'Hexagon Ring',
    ru: 'Гексагон',
  },
  description: {
    en: 'A ring of 6 cells with alternating colors',
    ru: 'Кольцо из 6 клеток с чередующимися цветами',
  },
  difficulty: 'medium',
  anchorCell: { q: 0, r: 0 },
  cells: [
    // Anchor at focus (0%)
    { q: 0, r: 0, relativeColor: 0 },
    // Ring cells only, alternating colors
    { q: 0, r: -2, relativeColor: -33.33 },    // North
    { q: 1, r: -2, relativeColor: 0 },      // NE
    { q: 1, r: -1, relativeColor: -33.33 },    // SE
    { q: -1, r: 0, relativeColor: -33.33 },    // W
    { q: -1, r: -1, relativeColor: 0 },     // NW
  ],
  hints: {
    en: [
      'Six-sided ring without center',
      'Alternate between base and +25% colors',
      'Creates a radiating pattern',
    ],
    ru: [
      'Шестиугольное кольцо без центра',
      'Чередуется между базовым и +25% цветами',
      'Создаёт радиальный узор',
    ],
  },
};

/**
 * Star: Central hub with 6 rays extending outward
 * Difficulty: Medium
 */
export const TEMPLATE_STAR: BuildTemplate = {
  id: 'star',
  name: {
    en: 'Star',
    ru: 'Звезда',
  },
  description: {
    en: 'Center with 6 extending rays',
    ru: 'Центр с 6 лучами в разных цветах',
  },
  difficulty: 'medium',
  anchorCell: { q: 0, r: 0 },
  cells: [
    // Anchor at focus (0%)
    { q: 0, r: 0, relativeColor: 0 },
    // Center
    { q: 0, r: -2, relativeColor: -33.33 },
    // Six rays (immediate neighbors + one layer out)
    // Ray 1: North
    { q: 0, r: -3, relativeColor: -33.33 },
    { q: 0, r: -4, relativeColor: 0 },
    // Ray 2: NE
    { q: 1, r: -3, relativeColor: -33.33 },
    { q: 2, r: -4, relativeColor: 0 },
    // Ray 3: SE
    { q: 1, r: -2, relativeColor: -33.33 },
    { q: 2, r: -2, relativeColor: 0 },
    // Ray 4: South
    { q: 0, r: -1, relativeColor: -33.33 },
    // Ray 5: SW
    { q: -1, r: -1, relativeColor: -33.33 },
    { q: -2, r: 0, relativeColor: 0 },
    // Ray 6: NW
    { q: -1, r: -2, relativeColor: -33.33 },
    { q: -2, r: -2, relativeColor: 0 },
  ],
  hints: {
    en: [
      'Six spikes radiating from center',
      'Base color for inner rays, +25% for outer tips',
      'Creates a geometric star pattern',
    ],
    ru: [
      'Шесть шипов, радиирующих из центра',
      'Базовый цвет для внутренних лучей, +25% для внешних',
      'Создаёт геометрическую звезду',
    ],
  },
};

/**
 * Rainbow Spiral: Gradient flowing in spiral direction
 * Difficulty: Hard
 */
export const TEMPLATE_RAINBOW_SPIRAL: BuildTemplate = {
  id: 'rainbow_spiral',
  name: {
    en: 'Rainbow Spiral',
    ru: 'Радужная спираль',
  },
  description: {
    en: 'Spiral gradient with smooth color transitions',
    ru: 'Спиральный градиент с плавным переходом цветов',
  },
  difficulty: 'hard',
  anchorCell: { q: 0, r: 0 },
  cells: [
    // Spiral from anchor through all 6 colors + extra cells
    { q: 0, r: 0, relativeColor: 0 },      // Anchor at focus
    { q: 0, r: -1, relativeColor: -33.33 },   // 2 steps back
    { q: 0, r: -2, relativeColor: -16.67 },// 1 step back
    { q: 1, r: -2, relativeColor: 0 }, // back to 0
    { q: 1, r: -1, relativeColor: 16.67 },     // 1 step forward
    { q: 1, r: 0, relativeColor: 33.33 },   // 2 steps forward
    { q: -1, r: 0, relativeColor: 50 }, // opposite (3 steps)
    { q: -1, r: -1, relativeColor: -33.33 },// 2 steps back
    { q: -1, r: -2, relativeColor: -16.67 },  // 1 step back
  ],
  hints: {
    en: [
      'Nine cells forming a spiral path',
      'Colors rotate through the entire palette',
      'Creates a rainbow gradient effect',
      'Most challenging template',
    ],
    ru: [
      'Девять клеток, образующих спираль',
      'Цвета вращаются через всю палитру',
      'Создаёт эффект радужного градиента',
      'Самый сложный шаблон',
    ],
  },
};

/**
 * Cross: Simple + shaped pattern
 * Difficulty: Easy
 */
export const TEMPLATE_CROSS: BuildTemplate = {
  id: 'cross',
  name: {
    en: 'Cross',
    ru: 'Крест',
  },
  description: {
    en: 'Plus-shaped pattern with 5 cells',
    ru: 'Крестообразный узор из 5 клеток',
  },
  difficulty: 'easy',
  anchorCell: { q: 0, r: 0 },
  cells: [
    // Anchor edge (closest to turtle)
    { q: 0, r: 0, relativeColor: 0 },
    // Four cardinal directions
    { q: 0, r: -1, relativeColor: 0 },     // Center
    { q: 0, r: -2, relativeColor: 0 },     // North
    { q: 1, r: -1, relativeColor: 0 },     // East
    { q: -1, r: -1, relativeColor: 0 },    // West
  ],
  hints: {
    en: [
      'Five cells in a + shape',
      'All cells use the same base color',
      'Good practice for rotation',
    ],
    ru: [
      'Пять клеток в форме +',
      'Все клетки используют базовый цвет',
      'Хорошая практика для ротации',
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
  TEMPLATE_HEXAGON,
  TEMPLATE_STAR,
  TEMPLATE_RAINBOW_SPIRAL,
  TEMPLATE_CROSS,
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
