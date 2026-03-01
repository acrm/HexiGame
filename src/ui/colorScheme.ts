/**
 * UI Color Scheme Configuration
 * Based on game palette colors with custom UI variations
 */

// Game palette indices:
// 0: #FF8000 (Orange)
// 1: #CC6600 (Dark Orange)
// 2: #996600 (Brown)
// 3: #666600 (Olive)
// 4: #660099 (Purple)
// 5: #9933FF (Light Purple)
// 6: #CC66FF (Lighter Purple)
// 7: #FF99FF (Pink)

export const ColorScheme = {
  // Outside tab (World) - Purple based
  outside: {
    active: '#00264C',      // Dark purple (screen background)
    inactive: '#2b0041',    // Even darker purple
    background: '#00264C',  // Screen background color
  },
  
  // Inside tab (Inventory) - Orange based
  inside: {
    active: '#994D00',      // Active tab
    inactive: '#663300',    // Inactive tab
    background: '#A85500',  // Screen background color
  },
  
  // UI elements
  ui: {
    text: '#FFFFFF',
    border: '#FFFFFF',
    accentLight: 'rgba(255,255,255,0.3)',
  },
} as const;

export type TabName = 'outside' | 'inside';

export function getTabColor(tabName: TabName, isActive: boolean): string {
  const tab = ColorScheme[tabName];
  return isActive ? tab.active : tab.inactive;
}
