import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Game.css';
import {
  DefaultParams,
  Params,
  GameState,
  RNG,
  mulberry32,
  createInitialState,
  tick as logicTick,
  attemptMoveByDeltaOnActive,
  attemptMoveTo,
  eatToHotbar,
  exchangeWithHotbarSlot,
  hoveredCellActive,
  performContextAction,
  startDrag,
  endDrag,
  dragMoveProtagonist,
  equalAxial,
  activateTemplate,
  deactivateTemplate,
} from '../logic/pureLogic';
import ControlsDesktop from './ControlsInfoDesktop';
import ControlsMobile from './ControlsInfoMobile';
import PaletteCluster from './PaletteCluster';
import GameField from './GameField';
import Settings from './Settings';
import { t } from '../ui/i18n';
import { integration } from '../appLogic/integration';
import { audioManager } from '../audio/audioManager';
import GuestStart from './GuestStart';
import HexiPedia from './HexiPedia';
import Mascot from './Mascot';
import { ColorScheme } from '../ui/colorScheme';
import TutorialProgressWidget from './TutorialProgressWidget';
import { getTutorialLevel, getNextTutorialLevel } from '../tutorial/tutorialLevels';
import { axialToKey, getHintForMode } from '../tutorial/tutorialState';

// Session persistence helpers
const SESSION_STORAGE_KEY = 'hexigame.session.state';

type SerializedCell = { q: number; r: number; colorIndex: number | null };
type SerializedActiveTemplate = {
  templateId: string;
  anchoredAt: {
    q: number;
    r: number;
    baseColorIndex: number;
    rotation: number;
  } | null;
  hasErrors: boolean;
  filledCells: string[];
  completedAtTick?: number;
};

type SerializedTutorialProgress = {
  visitedTargetKeys: string[];
  startTick: number;
  completedAtTick?: number;
};

type SerializedGameState = {
  tick?: number;
  remainingSeconds?: number;
  focus?: { q: number; r: number };
  protagonist?: { q: number; r: number };
  flash?: { type: 'success' | 'failure'; startedTick: number } | null;
  grid?: SerializedCell[];
  inventoryGrid?: SerializedCell[];
  activeField?: 'world' | 'inventory';
  hotbarSlots?: Array<number | null>;
  selectedHotbarIndex?: number;
  facingDirIndex?: number;
  isDragging?: boolean;
  autoMoveTarget?: { q: number; r: number } | null;
  autoMoveTicksRemaining?: number;
  autoFocusTarget?: { q: number; r: number } | null;
  worldViewCenter?: { q: number; r: number };
  activeTemplate?: SerializedActiveTemplate | null;
  completedTemplates?: string[];
  tutorialLevelId?: string | null;
  tutorialProgress?: SerializedTutorialProgress;
  tutorialInteractionMode?: 'desktop' | 'mobile';
  tutorialCompletedLevelIds?: string[];
};

type SessionState = {
  gameState: SerializedGameState;
  ui?: {
    mobileTab?: 'heximap' | 'hexilab' | 'hexipedia';
  };
};

function serializeGrid(grid: Map<string, { q: number; r: number; colorIndex: number | null }>): SerializedCell[] {
  return Array.from(grid.values()).map(cell => ({
    q: cell.q,
    r: cell.r,
    colorIndex: cell.colorIndex,
  }));
}

function deserializeGrid(cells: SerializedCell[] | undefined): Map<string, { q: number; r: number; colorIndex: number | null }> | undefined {
  if (!cells) return undefined;
  const next = new Map<string, { q: number; r: number; colorIndex: number | null }>();
  for (const cell of cells) {
    next.set(`${cell.q},${cell.r}`, { q: cell.q, r: cell.r, colorIndex: cell.colorIndex });
  }
  return next;
}

function serializeGameState(state: GameState): SerializedGameState {
  return {
    tick: state.tick,
    remainingSeconds: state.remainingSeconds,
    focus: state.focus,
    protagonist: state.protagonist,
    flash: state.flash,
    grid: serializeGrid(state.grid),
    inventoryGrid: serializeGrid(state.inventoryGrid),
    activeField: state.activeField,
    hotbarSlots: state.hotbarSlots,
    selectedHotbarIndex: state.selectedHotbarIndex,
    facingDirIndex: state.facingDirIndex,
    isDragging: state.isDragging,
    autoMoveTarget: state.autoMoveTarget,
    autoMoveTicksRemaining: state.autoMoveTicksRemaining,
    autoFocusTarget: state.autoFocusTarget,
    worldViewCenter: state.worldViewCenter,
    activeTemplate: state.activeTemplate ? {
      templateId: state.activeTemplate.templateId,
      anchoredAt: state.activeTemplate.anchoredAt,
      hasErrors: state.activeTemplate.hasErrors,
      filledCells: Array.from(state.activeTemplate.filledCells),
      completedAtTick: state.activeTemplate.completedAtTick,
    } : state.activeTemplate ?? null,
    completedTemplates: Array.from(state.completedTemplates ?? []),
    tutorialLevelId: state.tutorialLevelId ?? null,
    tutorialProgress: state.tutorialProgress ? {
      visitedTargetKeys: Array.from(state.tutorialProgress.visitedTargetKeys),
      startTick: state.tutorialProgress.startTick,
      completedAtTick: state.tutorialProgress.completedAtTick,
    } : undefined,
    tutorialInteractionMode: state.tutorialInteractionMode,
    tutorialCompletedLevelIds: Array.from(state.tutorialCompletedLevelIds ?? []),
  };
}

function deserializeGameState(serialized: SerializedGameState, fallback: GameState): GameState {
  const grid = deserializeGrid(serialized.grid) ?? fallback.grid;
  const inventoryGrid = deserializeGrid(serialized.inventoryGrid) ?? fallback.inventoryGrid;
  const activeTemplate = serialized.activeTemplate === undefined
    ? fallback.activeTemplate
    : serialized.activeTemplate
      ? {
          ...serialized.activeTemplate,
          filledCells: new Set(serialized.activeTemplate.filledCells ?? []),
        }
      : null;

  return {
    ...fallback,
    tick: serialized.tick ?? fallback.tick,
    remainingSeconds: serialized.remainingSeconds ?? fallback.remainingSeconds,
    focus: serialized.focus ?? fallback.focus,
    protagonist: serialized.protagonist ?? fallback.protagonist,
    flash: serialized.flash ?? fallback.flash,
    grid,
    inventoryGrid,
    activeField: serialized.activeField ?? fallback.activeField,
    hotbarSlots: serialized.hotbarSlots ?? fallback.hotbarSlots,
    selectedHotbarIndex: serialized.selectedHotbarIndex ?? fallback.selectedHotbarIndex,
    facingDirIndex: serialized.facingDirIndex ?? fallback.facingDirIndex,
    isDragging: serialized.isDragging ?? fallback.isDragging,
    autoMoveTarget: serialized.autoMoveTarget ?? fallback.autoMoveTarget,
    autoMoveTicksRemaining: serialized.autoMoveTicksRemaining ?? fallback.autoMoveTicksRemaining,
    autoFocusTarget: serialized.autoFocusTarget ?? fallback.autoFocusTarget,
    worldViewCenter: serialized.worldViewCenter ?? fallback.worldViewCenter,
    activeTemplate,
    completedTemplates: new Set(serialized.completedTemplates ?? Array.from(fallback.completedTemplates ?? [])),
    tutorialLevelId: serialized.tutorialLevelId ?? fallback.tutorialLevelId,
    tutorialProgress: serialized.tutorialProgress ? {
      visitedTargetKeys: new Set(serialized.tutorialProgress.visitedTargetKeys),
      startTick: serialized.tutorialProgress.startTick,
      completedAtTick: serialized.tutorialProgress.completedAtTick,
    } : fallback.tutorialProgress,
    tutorialInteractionMode: serialized.tutorialInteractionMode ?? fallback.tutorialInteractionMode,
    tutorialCompletedLevelIds: new Set(serialized.tutorialCompletedLevelIds ?? Array.from(fallback.tutorialCompletedLevelIds ?? [])),
  };
}

function normalizeSessionState(raw: any): SessionState | null {
  if (!raw) return null;
  if (raw.gameState) return raw as SessionState;

  const legacyProgress = raw.tutorialProgress;
  const legacyGameState: SerializedGameState = {
    tick: raw.tick,
    tutorialLevelId: raw.tutorialLevelId,
    tutorialCompletedLevelIds: raw.tutorialCompletedLevelIds,
    tutorialProgress: legacyProgress ? {
      visitedTargetKeys: legacyProgress.visitedTargetKeys ?? [],
      startTick: legacyProgress.startTick ?? 0,
      completedAtTick: legacyProgress.completedAtTick,
    } : undefined,
  };

  return { gameState: legacyGameState, ui: raw.ui };
}

function saveSessionState(state: GameState, ui?: SessionState['ui']) {
  try {
    const serialized: SessionState = {
      gameState: serializeGameState(state),
      ui,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(serialized));
  } catch (e) {
    console.warn('Failed to save session state:', e);
  }
}

function loadSessionState(): SessionState | null {
  try {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    return normalizeSessionState(saved ? JSON.parse(saved) : null);
  } catch (e) {
    console.warn('Failed to load session state:', e);
    return null;
  }
}

// React component
export const Game: React.FC<{ params?: Partial<Params>; seed?: number }> = ({ params, seed }) => {
  const initialSessionStateRef = useRef(loadSessionState());
  const mergedParams: Params = { ...DefaultParams, ...(params || {}) };
  const rngRef = useRef<RNG>(mulberry32(seed ?? Date.now()));
  const [gameState, setGameState] = useState<GameState>(() => {
    const guestStarted = !!localStorage.getItem('hexigame.guest.started');
    const initialState = createInitialState(mergedParams, rngRef.current);
    const initialSession = initialSessionStateRef.current;
    
    // If guest was already started (user returning after reload), restore session state
    if (guestStarted && initialSession?.gameState) {
      return deserializeGameState(initialSession.gameState, initialState);
    }
    
    return initialState;
  });
  const [fps, setFps] = useState(0);
  const spaceIsDownRef = useRef(false);
  const mouseIsDownRef = useRef(false);
  const [isMobileInfoOpen, setIsMobileInfoOpen] = useState(false);
  const [isInventory, setIsInventory] = useState(false);
  const [mobileTab, setMobileTab] = useState<'heximap' | 'hexilab' | 'hexipedia'>(() => {
    const savedTab = initialSessionStateRef.current?.ui?.mobileTab;
    if (savedTab) return savedTab;
    const hasTutorialStarted = localStorage.getItem('hexigame.tutorial.started');
    return hasTutorialStarted ? 'heximap' : 'hexipedia';
  });
  const [isPaused, setIsPaused] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'desktop' | 'mobile'>('mobile');
  const [guestStarted, setGuestStarted] = useState<boolean>(() => {
    return !!localStorage.getItem('hexigame.guest.started');
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMascotOpen, setIsMascotOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('hexigame.soundEnabled');
    if (saved !== null) return saved === 'true';
    const legacy = localStorage.getItem('hexigame.sound');
    return legacy ? legacy === 'true' : true;
  });
  const [soundVolume, setSoundVolume] = useState(() => {
    const saved = localStorage.getItem('hexigame.soundVolume');
    return saved ? parseFloat(saved) : 0.6;
  });
  const [musicEnabled, setMusicEnabled] = useState(() => {
    const saved = localStorage.getItem('hexigame.musicEnabled');
    if (saved !== null) return saved === 'true';
    const legacy = localStorage.getItem('hexigame.sound');
    return legacy ? legacy === 'true' : true;
  });
  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = localStorage.getItem('hexigame.musicVolume');
    return saved ? parseFloat(saved) : 0.5;
  });
  const [showFPS, setShowFPS] = useState(() => {
    const saved = localStorage.getItem('hexigame.showFPS');
    return saved ? saved === 'true' : false;
  });
  const [isLeftHanded, setIsLeftHanded] = useState(() => {
    const saved = localStorage.getItem('hexigame.isLeftHanded');
    return saved ? saved === 'true' : false;
  });
  const [tutorialLevelId, setTutorialLevelId] = useState<string | null>(() => {
    const savedLevelId = initialSessionStateRef.current?.gameState?.tutorialLevelId;
    if (savedLevelId !== undefined) return savedLevelId ?? null;
    // Start mandatory tutorial on first session
    const hasTutorialStarted = localStorage.getItem('hexigame.tutorial.started');
    return hasTutorialStarted ? null : 'tutorial_1_movement';
  });

  // Initialize audio manager with music settings
  useEffect(() => {
    audioManager.setMusicEnabled(musicEnabled);
  }, [musicEnabled]);

  // Apply music volume
  useEffect(() => {
    audioManager.setMusicVolume(musicVolume);
  }, [musicVolume]);

  // Apply sound settings
  useEffect(() => {
    audioManager.setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    audioManager.setSoundVolume(soundVolume);
  }, [soundVolume]);

  // Start audio on guest start (user interaction required)
  useEffect(() => {
    if (guestStarted && musicEnabled && !document.hidden) {
      audioManager.playMusic();
    }
  }, [guestStarted, musicEnabled]);

  // Retry music resume on first user interaction after page reload
  useEffect(() => {
    if (!guestStarted || !musicEnabled) return;

    const resumeOnInteraction = () => {
      audioManager.playMusic();
      window.removeEventListener('pointerdown', resumeOnInteraction);
      window.removeEventListener('keydown', resumeOnInteraction);
      window.removeEventListener('touchstart', resumeOnInteraction);
    };

    window.addEventListener('pointerdown', resumeOnInteraction, { passive: true, once: true });
    window.addEventListener('keydown', resumeOnInteraction, { once: true });
    window.addEventListener('touchstart', resumeOnInteraction, { passive: true, once: true });

    return () => {
      window.removeEventListener('pointerdown', resumeOnInteraction);
      window.removeEventListener('keydown', resumeOnInteraction);
      window.removeEventListener('touchstart', resumeOnInteraction);
    };
  }, [guestStarted, musicEnabled]);

  // Force mobile interaction mode (desktop temporarily disabled)
  useEffect(() => {
    setInteractionMode('mobile');
  }, []);

  // Tick loop (12 ticks/sec) - only runs after guest starts
  useEffect(() => {
    if (!guestStarted) return; // Don't start ticking until guest starts
    const interval = setInterval(() => {
      if (!isPaused) {
        setGameState(prev => logicTick(prev, mergedParams, rngRef.current));
      }
    }, 1000 / mergedParams.GameTickRate);
    return () => clearInterval(interval);
  }, [mergedParams, isPaused, guestStarted]);

  // Initialize tutorial in gameState when tutorial starts
  useEffect(() => {
    if (!tutorialLevelId) {
      setGameState(prev => {
        if (!prev.tutorialLevelId && !prev.tutorialProgress) return prev;
        return {
          ...prev,
          tutorialLevelId: null,
          tutorialProgress: undefined,
          tutorialInteractionMode: interactionMode,
        };
      });
      return;
    }
    setGameState(prev => {
      if (prev.tutorialLevelId === tutorialLevelId) return prev;
      return {
        ...prev,
        tutorialLevelId,
        tutorialProgress: {
          visitedTargetKeys: new Set(),
          startTick: prev.tick,
        },
        tutorialInteractionMode: interactionMode,
      };
    });
  }, [tutorialLevelId, interactionMode]);

  // Pause/resume on tab visibility change
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        setIsPaused(true);
        integration.onGameplayStop();
        audioManager.pause();
      } else {
        setIsPaused(false);
        if (guestStarted && !isSettingsOpen) {
          integration.onGameplayStart();
        }
        if (guestStarted && musicEnabled) {
          audioManager.playMusic().catch(() => console.log('[Audio] Autoplay blocked'));
        }
        audioManager.resume();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [guestStarted, isSettingsOpen]);

  // Pause/resume on settings open/close
  useEffect(() => {
    if (isSettingsOpen) {
      setIsPaused(true);
    } else if (guestStarted && !document.hidden) {
      setIsPaused(false);
    }
  }, [isSettingsOpen, guestStarted]);

  // Persist game state changes to localStorage
  useEffect(() => {
    if (guestStarted) {
      saveSessionState(gameState, { mobileTab });
    }
  }, [gameState, guestStarted, mobileTab]);

  // Handle template audio feedback
  const prevTemplateStateRef = useRef<GameState['activeTemplate']>(null);
  useEffect(() => {
    if (!gameState.activeTemplate || !prevTemplateStateRef.current) {
      prevTemplateStateRef.current = gameState.activeTemplate;
      return;
    }

    const prev = prevTemplateStateRef.current;
    const curr = gameState.activeTemplate;

    // Check for completion
    if (!prev.completedAtTick && curr.completedAtTick) {
      audioManager.templateCompleted();
    }
    // Check for error state change
    else if (!prev.hasErrors && curr.hasErrors) {
      audioManager.templateCellWrong();
    }
    // Check for correct cell fill
    else if (prev.filledCells.size < curr.filledCells.size && !curr.hasErrors) {
      audioManager.templateCellCorrect();
    }

    prevTemplateStateRef.current = curr;
  }, [gameState.activeTemplate]);

  // Signal game ready to SDK (LoadingAPI.ready for Yandex) - call as soon as loaded
  useEffect(() => {
    let mounted = true;
    Promise.resolve(integration.init()).then(() => {
      if (mounted) {
        integration.onGameReady();
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Gameplay lifecycle (start/stop based on game state and menu)
  useEffect(() => {
    if (guestStarted && !isPaused && !isSettingsOpen && !isMascotOpen) {
      Promise.resolve(integration.init()).then(() => integration.onGameplayStart());
    } else if (guestStarted) {
      integration.onGameplayStop();
    }
  }, [guestStarted, isPaused, isSettingsOpen, isMascotOpen]);

  // Keyboard input handlers
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (isHexiLabLocked) return;
        setIsInventory(v => !v);
        setGameState(prev => ({ ...prev, activeField: !isInventory ? 'inventory' : 'world' }));
        return;
      }
      if (e.key >= '1' && e.key <= '7') {
        const idx = Number(e.key) - 1;
        setGameState(prev => ({
          ...prev,
          selectedHotbarIndex: Math.max(0, Math.min(idx, (prev.hotbarSlots?.length ?? 7) - 1)),
        }));
        return;
      }
      if (e.code === 'Space') {
        if (spaceIsDownRef.current) {
          return; // already down
        }
        spaceIsDownRef.current = true;
        setGameState(prev => performContextAction(prev, mergedParams));
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        setGameState(prev => eatToHotbar(prev, mergedParams));
        return;
      }
      const moves: Record<string, [number, number]> = {
        ArrowUp: [0, -1], w: [0, -1],
        ArrowDown: [0, 1], s: [0, 1],
        ArrowLeft: [-1, 0], a: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0],
      };
      const delta = moves[e.key as keyof typeof moves];
      if (delta) {
        const [dq, dr] = delta;
        setGameState(prev => attemptMoveByDeltaOnActive(prev, mergedParams, dq, dr));
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        if (!spaceIsDownRef.current) {
          return;
        }
        spaceIsDownRef.current = false;
        // Action already performed on keydown, just reset the flag
      }
    }
    if (interactionMode === 'desktop') {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mergedParams, interactionMode]);

  // Derived HUD data
  const hoverColorIndex = hoveredCellActive(gameState)?.colorIndex ?? null;
  const hoverColor = hoverColorIndex !== null ? mergedParams.ColorPalette[hoverColorIndex] : '#000';

  const tutorialLevel = useMemo(() => {
    return tutorialLevelId ? getTutorialLevel(tutorialLevelId) : null;
  }, [tutorialLevelId]);

  const tutorialTargetKeys = useMemo(() => {
    return tutorialLevel?.targetCells?.map(axialToKey) ?? [];
  }, [tutorialLevel]);

  const visitedTargetCount = useMemo(() => {
    if (!gameState.tutorialProgress) return 0;
    return tutorialTargetKeys.filter(key => gameState.tutorialProgress?.visitedTargetKeys.has(key)).length;
  }, [gameState.tutorialProgress, tutorialTargetKeys]);

  const isTutorialTaskComplete = !!tutorialLevel && !!gameState.tutorialProgress
    ? tutorialLevel.winCondition(gameState, mergedParams, gameState.tutorialProgress)
    : false;
  const completedTutorialLevelIds = gameState.tutorialCompletedLevelIds ?? new Set<string>();
  const prevTutorialCompleteRef = useRef<boolean>(isTutorialTaskComplete);

  const completeTutorialLevel = (completedLevelId: string) => {
    setGameState(prev => {
      const completedSet = new Set(prev.tutorialCompletedLevelIds ?? []);
      completedSet.add(completedLevelId);
      const progress = prev.tutorialProgress;
      const nextProgress = progress && !progress.completedAtTick
        ? { ...progress, completedAtTick: prev.tick }
        : progress;
      return {
        ...prev,
        tutorialCompletedLevelIds: completedSet,
        tutorialProgress: nextProgress,
      };
    });

    const nextLevel = getNextTutorialLevel(completedLevelId);
    if (nextLevel) {
      setTutorialLevelId(nextLevel.id);
    } else {
      localStorage.setItem('hexigame.tutorial.started', '1');
      setTutorialLevelId(null);
    }
  };

  const handleSelectTutorialLevel = (levelId: string) => {
    if (completedTutorialLevelIds.has(levelId)) return;
    setTutorialLevelId(levelId);
    setMobileTab('hexipedia');
  };

  const handleRestartTutorialLevel = (levelId: string) => {
    setGameState(prev => {
      const completedSet = new Set(prev.tutorialCompletedLevelIds ?? []);
      completedSet.delete(levelId);
      return {
        ...prev,
        tutorialCompletedLevelIds: completedSet,
      };
    });
    setTutorialLevelId(levelId);
    setMobileTab('hexipedia');
  };

  useEffect(() => {
    if (!tutorialLevelId) {
      prevTutorialCompleteRef.current = false;
      return;
    }
    const wasComplete = prevTutorialCompleteRef.current;
    if (!wasComplete && isTutorialTaskComplete) {
      audioManager.playSound('audio/mixkit-small-win-2020.wav');
      completeTutorialLevel(tutorialLevelId);
    }
    prevTutorialCompleteRef.current = isTutorialTaskComplete;
  }, [isTutorialTaskComplete, tutorialLevelId]);

  const handleTutorialCompleteClick = () => {
    if (!tutorialLevelId || !tutorialLevel) return;
    if (!isTutorialTaskComplete) return;
    audioManager.playRandomSound();
    completeTutorialLevel(tutorialLevelId);
  };

  const handleViewTutorialTask = () => {
    audioManager.playRandomSound();
    setMobileTab('hexipedia');
  };

  const isMobileLayout = true;

  const isHexiLabLocked = tutorialLevel?.disableInventory ?? false;

  useEffect(() => {
    if (!tutorialLevel?.disableInventory) return;
    setIsInventory(false);
    setGameState(prev => ({ ...prev, activeField: 'world' }));
    if (mobileTab === 'hexilab') {
      setMobileTab('heximap');
    }
  }, [tutorialLevel?.disableInventory, mobileTab]);

  // Track focus visits on target cells
  useEffect(() => {
    if (!tutorialLevelId || !gameState.tutorialProgress) return;
    if (gameState.activeField === 'inventory') return;
    if (isMobileLayout && mobileTab !== 'heximap') return;

    const level = getTutorialLevel(tutorialLevelId);
    if (!level?.targetCells || level.targetCells.length === 0) return;

    const focusKey = axialToKey(gameState.focus);
    
    // Re-compute target keys from the level directly (don't rely on memoized value)
    const targetKeys = level.targetCells.map(axialToKey);
    if (!targetKeys.includes(focusKey)) return;

    if (gameState.tutorialProgress.visitedTargetKeys.has(focusKey)) return;

    // Play service bell sound on target cell visit
    audioManager.playSound('audio/mixkit-service-bell-931.wav');

    setGameState(prev => {
      if (!prev.tutorialProgress) return prev;
      if (prev.tutorialProgress.visitedTargetKeys.has(focusKey)) return prev;
      const nextVisited = new Set(prev.tutorialProgress.visitedTargetKeys);
      nextVisited.add(focusKey);
      return {
        ...prev,
        tutorialProgress: {
          ...prev.tutorialProgress,
          visitedTargetKeys: nextVisited,
        },
      };
    });
  }, [gameState.focus, gameState.activeField, gameState.tutorialProgress, tutorialLevelId, isMobileLayout, mobileTab]);

  const paletteLen = mergedParams.ColorPalette.length;
  const antagonistIndex = paletteLen > 0 ? Math.floor(paletteLen / 2) : 0;

  // Sync mobile tab selection with active field and inventory flag
  useEffect(() => {
    if (!isMobileLayout) return;
    const nextInventory = mobileTab === 'hexilab';
    setIsInventory(nextInventory);
    setGameState(prev => ({ ...prev, activeField: mobileTab === 'hexilab' ? 'inventory' : 'world' }));
  }, [isMobileLayout, mobileTab]);

  const effectiveIsInventory = isMobileLayout ? mobileTab === 'hexilab' : isInventory;

  // Determine background color based on active tab
  const backgroundColor = isMobileLayout 
    ? (mobileTab === 'heximap' ? ColorScheme.outside.background : mobileTab === 'hexilab' ? ColorScheme.inside.background : '#2f2f2f')
    : '#370152ff';

  const paletteTopOffset = isMobileLayout && mobileTab === 'heximap' && tutorialLevel ? 56 : 8;
  const currentTutorialHint = tutorialLevel ? getHintForMode(tutorialLevel.hints, interactionMode) : '';

  return (
    <div
      className="game-root mobile-forced"
      style={{ backgroundColor: '#3a3a3a', ['--game-bg' as any]: backgroundColor }}
    >
      {!isMobileLayout && (
        <div className="game-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', justifyContent: 'space-between' }}>
            {/* Palette cluster with center showing chance/state */}
            <PaletteCluster
              colorPalette={mergedParams.ColorPalette}
              playerBaseColorIndex={mergedParams.PlayerBaseColorIndex}
              antagonistIndex={antagonistIndex}
              hoverColorIndex={hoverColorIndex}
              chance={null}
            />
          </div>
          <ControlsDesktop />
        </div>
      )}
      {isMobileLayout && (
        <div className="mobile-tab-bar">
          <div className="mobile-tabs-container">
            <button
              className={`mobile-tab ${mobileTab === 'heximap' ? 'active' : ''}`}
              onClick={() => { audioManager.playRandomSound(); setMobileTab('heximap'); }}
            >
              {t('tab.heximap')}
            </button>
            <button
              className={`mobile-tab ${mobileTab === 'hexilab' ? 'active' : ''} disabled`}
              onClick={() => {}}
              disabled
            >
              {t('tab.hexilab')}
            </button>
            <button
              className={`mobile-tab ${mobileTab === 'hexipedia' ? 'active' : ''}`}
              onClick={() => { audioManager.playRandomSound(); setMobileTab('hexipedia'); }}
            >
              {t('tab.hexipedia')}
            </button>
          </div>
          {/* Settings gear on right side of tab bar */}
          <button className="settings-button" onClick={() => { audioManager.playRandomSound(); setIsSettingsOpen(true); }} title={t('settings.open')}>
            <i className="fas fa-cog"></i>
          </button>
        </div>
      )}
      <div className="game-main">
        <div className="game-field-area">
          {isMobileLayout && mobileTab === 'hexipedia' ? (
            <HexiPedia
              gameState={gameState}
              interactionMode={interactionMode}
              tutorialLevel={tutorialLevel}
              tutorialLevelId={tutorialLevelId}
              isTutorialTaskComplete={isTutorialTaskComplete}
              completedTutorialLevelIds={completedTutorialLevelIds}
              onSelectTutorialLevel={handleSelectTutorialLevel}
              onRestartTutorialLevel={handleRestartTutorialLevel}
              onSwitchTab={(tab) => {
                if (tab === 'heximap') setMobileTab('heximap');
              }}
              onActivateTemplate={(templateId) => {
                if (templateId === '') {
                  setGameState(prev => deactivateTemplate(prev));
                } else {
                  setGameState(prev => activateTemplate(prev, templateId));
                }
              }}
            />
          ) : (
            <GameField
              gameState={gameState}
              params={mergedParams}
              fps={fps}
              setFps={setFps}
              showFPS={showFPS}
              isInventory={effectiveIsInventory}
              onToggleInventory={() => {
                audioManager.playRandomSound();
                if (isMobileLayout) {
                  setMobileTab('heximap');
                } else {
                  if (isHexiLabLocked) return;
                  setIsInventory(v => !v);
                  setGameState(prev => ({ ...prev, activeField: !isInventory ? 'inventory' : 'world' }));
                }
              }}
              onCapture={() => {
                audioManager.playRandomSound();
                // Mobile press ACT -> perform instant context action
                setGameState(prev => performContextAction(prev, mergedParams));
              }}
              onRelease={() => {
                // Mobile release ACT -> action already performed on press
              }}
              onEat={() => {
                setGameState(prev => eatToHotbar(prev, mergedParams));
              }}
              onSetCursor={(q, r) => {
                audioManager.playRandomSound();
                // Check if clicking on focus or protagonist - start drag
                // Otherwise - start auto-move to target
                setGameState(prev => {
                  const clickedPos = { q, r };
                  const isFocus = equalAxial(clickedPos, prev.focus);
                  const isProtagonist = equalAxial(clickedPos, prev.protagonist);
                  
                  if (isFocus || isProtagonist) {
                    // Start drag mode
                    return startDrag(prev);
                  } else {
                    // Start auto-move to clicked cell
                    return attemptMoveTo(prev, mergedParams, clickedPos);
                  }
                });
              }}
              onCellClickDown={(q, r) => {
                // Handle LMB click on cell
                setGameState(prev => {
                  if (mouseIsDownRef.current) return prev; // Already down
                  mouseIsDownRef.current = true;
                  
                  const clickedPos = { q, r };
                  const isFocus = equalAxial(clickedPos, prev.focus);
                  
                  // If clicking on focus cell and not moving: perform context action
                  if (isFocus && !prev.isDragging && !prev.autoMoveTarget) {
                    return performContextAction(prev, mergedParams);
                  }
                  
                  const isProtagonist = equalAxial(clickedPos, prev.protagonist);
                  
                  if (isFocus || isProtagonist) {
                    // Start drag mode
                    return startDrag(prev);
                  } else {
                    // Start auto-move to clicked cell
                    return attemptMoveTo(prev, mergedParams, clickedPos);
                  }
                });
              }}
              onCellClickUp={(q, r) => {
                // Handle LMB release on cell - end drag if was dragging
                if (!mouseIsDownRef.current) return;
                mouseIsDownRef.current = false;
                setGameState(prev => {
                  if (prev.isDragging) {
                    return endDrag(prev);
                  }
                  return prev;
                });
              }}
              onCellDrag={(q, r) => {
                // Handle drag - move protagonist if in drag mode
                setGameState(prev => {
                  if (!prev.isDragging) return prev;
                  // Calculate delta from current position
                  const dq = q - prev.protagonist.q;
                  const dr = r - prev.protagonist.r;
                  return dragMoveProtagonist(prev, mergedParams, dq, dr);
                });
              }}
              onHotbarSlotClick={(slotIdx) => {
                audioManager.playRandomSound();
                // Handle hotbar slot click - exchange with slot
                setGameState(prev => exchangeWithHotbarSlot(prev, mergedParams, slotIdx));
              }}
              isLeftHanded={isLeftHanded}
              paletteTopOffset={paletteTopOffset}
              tutorialTargetCells={
                tutorialLevel && (!isMobileLayout || mobileTab === 'heximap')
                  ? (tutorialLevel.targetCells ?? [])
                  : []
              }
              visitedTutorialCells={gameState.tutorialProgress?.visitedTargetKeys ?? new Set()}
              hideHotbar={tutorialLevel?.hideHotbar ?? false}
            />
          )}
        </div>
        <div className="game-footer-controls" />
      </div>
      {isMobileLayout && mobileTab === 'heximap' && tutorialLevel && (
        <div className="tutorial-widget-overlay">
          <TutorialProgressWidget
            level={tutorialLevel}
            hintText={currentTutorialHint}
            visitedCount={visitedTargetCount}
            totalCount={tutorialTargetKeys.length}
            isComplete={isTutorialTaskComplete}
            onComplete={handleTutorialCompleteClick}
            onViewTask={handleViewTutorialTask}
          />
        </div>
      )}
      {!guestStarted && (
        <GuestStart onStart={() => {
          localStorage.setItem('hexigame.guest.started', '1');
          setGuestStarted(true);
          audioManager.playRandomSound();
          // Play music immediately on user interaction (required for mobile autoplay policy)
          if (musicEnabled) {
            audioManager.playMusic().catch(() => console.log('[Audio] Autoplay blocked'));
          }
        }} />
      )}
      {isSettingsOpen && (
        <Settings 
          onClose={() => setIsSettingsOpen(false)}
          onResetSession={() => {
            localStorage.removeItem('hexigame.guest.started');
            localStorage.removeItem('hexigame.tutorial.started');
            localStorage.removeItem(SESSION_STORAGE_KEY);
            setGuestStarted(false);
            setTutorialLevelId('tutorial_1_movement');
            setMobileTab('hexipedia');
            // Reset game state to initial
            setGameState(createInitialState(mergedParams, rngRef.current));
          }}
          onShowMascot={() => {
            setIsSettingsOpen(false);
            setIsMascotOpen(true);
          }}
          soundEnabled={soundEnabled}
          onToggleSound={(enabled) => {
            setSoundEnabled(enabled);
            localStorage.setItem('hexigame.soundEnabled', String(enabled));
          }}
          soundVolume={soundVolume}
          onSoundVolumeChange={(volume) => {
            setSoundVolume(volume);
            localStorage.setItem('hexigame.soundVolume', String(volume));
          }}
          musicEnabled={musicEnabled}
          onToggleMusic={(enabled) => {
            setMusicEnabled(enabled);
            localStorage.setItem('hexigame.musicEnabled', String(enabled));
          }}
          musicVolume={musicVolume}
          onMusicVolumeChange={(volume) => {
            setMusicVolume(volume);
            localStorage.setItem('hexigame.musicVolume', String(volume));
          }}
          showFPS={showFPS}
          onToggleShowFPS={(show) => {
            setShowFPS(show);
            localStorage.setItem('hexigame.showFPS', String(show));
          }}
          isLeftHanded={isLeftHanded}
          onToggleLeftHanded={(isLeft) => {
            setIsLeftHanded(isLeft);
            localStorage.setItem('hexigame.isLeftHanded', String(isLeft));
          }}
        />
      )}
      {isMascotOpen && <Mascot onClose={() => setIsMascotOpen(false)} />}
    </div>
  );
};

export default Game;
