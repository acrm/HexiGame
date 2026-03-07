/**
 * Configuration and constants for HexiPedia
 */

import type { HexiPediaSection, SectionId } from './types';

/**
 * All available sections in HexiPedia
 * Extensible: add new sections here to automatically include them in the system
 */
export const HEXIPEDIA_SECTIONS: Record<SectionId, HexiPediaSection> = {
  tasks: {
    id: 'tasks',
    name: {
      en: 'Tutorial Tasks',
      ru: 'Задачи',
    },
    icon: 'fas fa-list-check',
    searchKeywords: {
      en: ['tasks', 'tutorial', 'levels', 'learn', 'guide'],
      ru: ['задач', 'туториал', 'уровень', 'обучение', 'гайд'],
    },
  },
  stats: {
    id: 'stats',
    name: {
      en: 'Statistics',
      ru: 'Статистика',
    },
    icon: 'fas fa-chart-bar',
    searchKeywords: {
      en: ['stats', 'history', 'records', 'sessions', 'progress'],
      ru: ['статистик', 'история', 'рекорд', 'сеанс', 'прогресс'],
    },
  },
  templates: {
    id: 'templates',
    name: {
      en: 'Build Templates',
      ru: 'Шаблоны',
    },
    icon: 'fas fa-shapes',
    searchKeywords: {
      en: ['templates', 'patterns', 'builds', 'shapes', 'designs'],
      ru: ['шаблон', 'паттерн', 'постройк', 'форм', 'дизайн'],
    },
  },
  colors: {
    id: 'colors',
    name: {
      en: 'Color Palette',
      ru: 'Палитра',
    },
    icon: 'fas fa-palette',
    searchKeywords: {
      en: ['colors', 'palette', 'color picker', 'hues', 'tones'],
      ru: ['цвет', 'палитра', 'выбор', 'оттенок', 'тон'],
    },
  },
};

// Ordered list of section IDs for default display order
export const DEFAULT_SECTION_ORDER: SectionId[] = ['tasks', 'stats', 'templates', 'colors'];

// Constants for UI behavior
export const SEARCH_DEBOUNCE_MS = 150;
export const PAGE_SIZE_ITEMS = 20; // For paginated sections (if needed in future)
