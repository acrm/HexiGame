export interface StorageReader {
  getItem: (key: string) => string | null;
}

export interface StorageWriter {
  setItem: (key: string, value: string) => void;
}

export type StorageLike = StorageReader & StorageWriter;

export const SETTINGS_KEYS = {
  soundEnabled: 'hexigame.soundEnabled',
  soundVolume: 'hexigame.soundVolume',
  musicEnabled: 'hexigame.musicEnabled',
  musicVolume: 'hexigame.musicVolume',
  showFPS: 'hexigame.showFPS',
  isLeftHanded: 'hexigame.isLeftHanded',
  selectedColorIndex: 'hexigame.selectedColorIndex',
  autoBaseColorEnabled: 'hexigame.autoBaseColorEnabled',
  showColorWidget: 'hexigame.showColorWidget',
  legacySound: 'hexigame.sound',
} as const;

export interface UserSettingsState {
  soundEnabled: boolean;
  soundVolume: number;
  musicEnabled: boolean;
  musicVolume: number;
  showFPS: boolean;
  isLeftHanded: boolean;
  selectedColorIndex: number;
  autoBaseColorEnabled: boolean;
  showColorWidget: boolean;
}

export type UserSettingsCommand =
  | { type: 'SET_SOUND_ENABLED'; enabled: boolean }
  | { type: 'SET_SOUND_VOLUME'; volume: number }
  | { type: 'SET_MUSIC_ENABLED'; enabled: boolean }
  | { type: 'SET_MUSIC_VOLUME'; volume: number }
  | { type: 'SET_SHOW_FPS'; show: boolean }
  | { type: 'SET_LEFT_HANDED'; isLeft: boolean }
  | { type: 'SET_SELECTED_COLOR_INDEX'; index: number }
  | { type: 'SET_AUTO_BASE_COLOR_ENABLED'; enabled: boolean }
  | { type: 'SET_SHOW_COLOR_WIDGET'; visible: boolean }
  | { type: 'TOGGLE_AUTO_BASE_COLOR_ENABLED' };

function parseBool(raw: string | null, fallback: boolean): boolean {
  if (raw === null) return fallback;
  return raw === 'true';
}

function parseNumber(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function loadSoundEnabled(storage: StorageReader): boolean {
  const direct = storage.getItem(SETTINGS_KEYS.soundEnabled);
  if (direct !== null) return direct === 'true';
  const legacy = storage.getItem(SETTINGS_KEYS.legacySound);
  if (legacy !== null) return legacy === 'true';
  return true;
}

function loadMusicEnabled(storage: StorageReader): boolean {
  const direct = storage.getItem(SETTINGS_KEYS.musicEnabled);
  if (direct !== null) return direct === 'true';
  const legacy = storage.getItem(SETTINGS_KEYS.legacySound);
  if (legacy !== null) return legacy === 'true';
  return true;
}

export function createInitialUserSettingsState(
  storage: StorageReader,
  playerBaseColorIndex: number,
): UserSettingsState {
  return {
    soundEnabled: loadSoundEnabled(storage),
    soundVolume: parseNumber(storage.getItem(SETTINGS_KEYS.soundVolume), 0.6),
    musicEnabled: loadMusicEnabled(storage),
    musicVolume: parseNumber(storage.getItem(SETTINGS_KEYS.musicVolume), 0.5),
    showFPS: parseBool(storage.getItem(SETTINGS_KEYS.showFPS), false),
    isLeftHanded: parseBool(storage.getItem(SETTINGS_KEYS.isLeftHanded), false),
    selectedColorIndex: parseNumber(storage.getItem(SETTINGS_KEYS.selectedColorIndex), playerBaseColorIndex),
    autoBaseColorEnabled: parseBool(storage.getItem(SETTINGS_KEYS.autoBaseColorEnabled), false),
    showColorWidget: parseBool(storage.getItem(SETTINGS_KEYS.showColorWidget), true),
  };
}

export function userSettingsReducer(
  state: UserSettingsState,
  command: UserSettingsCommand,
): UserSettingsState {
  switch (command.type) {
    case 'SET_SOUND_ENABLED':
      return { ...state, soundEnabled: command.enabled };

    case 'SET_SOUND_VOLUME':
      return { ...state, soundVolume: command.volume };

    case 'SET_MUSIC_ENABLED':
      return { ...state, musicEnabled: command.enabled };

    case 'SET_MUSIC_VOLUME':
      return { ...state, musicVolume: command.volume };

    case 'SET_SHOW_FPS':
      return { ...state, showFPS: command.show };

    case 'SET_LEFT_HANDED':
      return { ...state, isLeftHanded: command.isLeft };

    case 'SET_SELECTED_COLOR_INDEX':
      return { ...state, selectedColorIndex: command.index };

    case 'SET_AUTO_BASE_COLOR_ENABLED':
      return { ...state, autoBaseColorEnabled: command.enabled };

    case 'SET_SHOW_COLOR_WIDGET':
      return { ...state, showColorWidget: command.visible };

    case 'TOGGLE_AUTO_BASE_COLOR_ENABLED':
      return { ...state, autoBaseColorEnabled: !state.autoBaseColorEnabled };

    default:
      return state;
  }
}

export function persistUserSettings(storage: StorageWriter, state: UserSettingsState): void {
  storage.setItem(SETTINGS_KEYS.soundEnabled, String(state.soundEnabled));
  storage.setItem(SETTINGS_KEYS.soundVolume, String(state.soundVolume));
  storage.setItem(SETTINGS_KEYS.musicEnabled, String(state.musicEnabled));
  storage.setItem(SETTINGS_KEYS.musicVolume, String(state.musicVolume));
  storage.setItem(SETTINGS_KEYS.showFPS, String(state.showFPS));
  storage.setItem(SETTINGS_KEYS.isLeftHanded, String(state.isLeftHanded));
  storage.setItem(SETTINGS_KEYS.selectedColorIndex, String(state.selectedColorIndex));
  storage.setItem(SETTINGS_KEYS.autoBaseColorEnabled, String(state.autoBaseColorEnabled));
  storage.setItem(SETTINGS_KEYS.showColorWidget, String(state.showColorWidget));
}
