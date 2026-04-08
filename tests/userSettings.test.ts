import { describe, expect, it } from 'vitest';
import {
  SETTINGS_KEYS,
  createInitialUserSettingsState,
  persistUserSettings,
  userSettingsReducer,
} from '../src/appLogic/userSettings';

function createStorage(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    dump: () => data,
  };
}

describe('userSettings', () => {
  it('loads defaults with legacy sound fallback', () => {
    const storage = createStorage({ [SETTINGS_KEYS.legacySound]: 'false' });
    const state = createInitialUserSettingsState(storage, 3);

    expect(state.soundEnabled).toBe(false);
    expect(state.musicEnabled).toBe(false);
    expect(state.soundVolume).toBe(0.6);
    expect(state.musicVolume).toBe(0.5);
    expect(state.showFPS).toBe(false);
    expect(state.isLeftHanded).toBe(false);
    expect(state.selectedColorIndex).toBe(3);
    expect(state.autoBaseColorEnabled).toBe(false);
    expect(state.showColorWidget).toBe(true);
    expect(state.showSessionWidget).toBe(false);
  });

  it('loads explicit values and ignores invalid numbers', () => {
    const storage = createStorage({
      [SETTINGS_KEYS.soundEnabled]: 'true',
      [SETTINGS_KEYS.soundVolume]: 'invalid',
      [SETTINGS_KEYS.musicEnabled]: 'false',
      [SETTINGS_KEYS.musicVolume]: '0.9',
      [SETTINGS_KEYS.showFPS]: 'true',
      [SETTINGS_KEYS.isLeftHanded]: 'true',
      [SETTINGS_KEYS.selectedColorIndex]: '2',
      [SETTINGS_KEYS.autoBaseColorEnabled]: 'true',
      [SETTINGS_KEYS.showColorWidget]: 'false',
      [SETTINGS_KEYS.showSessionWidget]: 'true',
    });

    const state = createInitialUserSettingsState(storage, 0);

    expect(state.soundEnabled).toBe(true);
    expect(state.soundVolume).toBe(0.6);
    expect(state.musicEnabled).toBe(false);
    expect(state.musicVolume).toBe(0.9);
    expect(state.showFPS).toBe(true);
    expect(state.isLeftHanded).toBe(true);
    expect(state.selectedColorIndex).toBe(2);
    expect(state.autoBaseColorEnabled).toBe(true);
    expect(state.showColorWidget).toBe(false);
    expect(state.showSessionWidget).toBe(true);
  });

  it('reducer updates fields and toggles auto base mode', () => {
    const initial = createInitialUserSettingsState(createStorage(), 0);
    const afterSound = userSettingsReducer(initial, { type: 'SET_SOUND_ENABLED', enabled: false });
    const afterColor = userSettingsReducer(afterSound, { type: 'SET_SELECTED_COLOR_INDEX', index: 4 });
    const afterToggle = userSettingsReducer(afterColor, { type: 'TOGGLE_AUTO_BASE_COLOR_ENABLED' });

    expect(afterSound.soundEnabled).toBe(false);
    expect(afterColor.selectedColorIndex).toBe(4);
    expect(afterToggle.autoBaseColorEnabled).toBe(true);
  });

  it('persists all settings keys', () => {
    const storage = createStorage();
    const state = {
      soundEnabled: false,
      soundVolume: 0.11,
      musicEnabled: true,
      musicVolume: 0.22,
      showFPS: true,
      isLeftHanded: true,
      selectedColorIndex: 5,
      autoBaseColorEnabled: true,
      showColorWidget: false,
      showTaskWidget: true,
      showStructureWidget: false,
      showSessionWidget: true,
    };

    persistUserSettings(storage, state);

    const map = storage.dump();
    expect(map.get(SETTINGS_KEYS.soundEnabled)).toBe('false');
    expect(map.get(SETTINGS_KEYS.soundVolume)).toBe('0.11');
    expect(map.get(SETTINGS_KEYS.musicEnabled)).toBe('true');
    expect(map.get(SETTINGS_KEYS.musicVolume)).toBe('0.22');
    expect(map.get(SETTINGS_KEYS.showFPS)).toBe('true');
    expect(map.get(SETTINGS_KEYS.isLeftHanded)).toBe('true');
    expect(map.get(SETTINGS_KEYS.selectedColorIndex)).toBe('5');
    expect(map.get(SETTINGS_KEYS.autoBaseColorEnabled)).toBe('true');
    expect(map.get(SETTINGS_KEYS.showColorWidget)).toBe('false');
    expect(map.get(SETTINGS_KEYS.showTaskWidget)).toBe('true');
    expect(map.get(SETTINGS_KEYS.showStructureWidget)).toBe('false');
    expect(map.get(SETTINGS_KEYS.showSessionWidget)).toBe('true');
  });
});
