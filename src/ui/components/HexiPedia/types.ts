/**
 * Type definitions for HexiPedia component
 */

export type SectionId = 
  | 'tasks'
  | 'stats'
  | 'templates'
  | 'colors';

export interface HexiPediaSection {
  id: SectionId;
  name: { en: string; ru: string };
  icon: string; // Font Awesome class
  searchKeywords: { en: string[]; ru: string[] };
}

export interface HexiPediaSectionState {
  sectionId: SectionId;
  isPinned: boolean;
  isExpanded: boolean;
  order: number;
}

export interface HexiPediaState {
  searchQuery: string;
  sections: Map<SectionId, HexiPediaSectionState>;
  activeTab?: SectionId;
}

export interface SessionHistoryRecord {
  id: string;
  startTime: number;
  endTime: number;
  gameTicks: number;
  gameTime: string;
}
