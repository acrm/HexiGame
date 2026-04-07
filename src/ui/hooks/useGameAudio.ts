import { useCallback, useEffect, useRef } from 'react';
import type { GameState, InvalidMoveTargetState } from '../../gameLogic/core/types';
import { audioController } from '../../appLogic/audioController';

export interface UseGameAudioOptions {
  musicEnabled: boolean;
  musicVolume: number;
  soundEnabled: boolean;
  soundVolume: number;
  activeTemplate: GameState['activeTemplate'];
  invalidMoveTarget?: InvalidMoveTargetState | null;
}

export interface UseGameAudioApi {
  playUiClick: () => void;
  playSound: (soundPath: string) => void;
  playMusicFromInteraction: () => void;
}

export function useGameAudio(options: UseGameAudioOptions): UseGameAudioApi {
  const {
    musicEnabled,
    musicVolume,
    soundEnabled,
    soundVolume,
    activeTemplate,
    invalidMoveTarget,
  } = options;

  useEffect(() => {
    // Pass the user-configured volumes immediately so the first track
    // is loaded at the correct volume, not the controller's hardcoded default.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    audioController.init(musicVolume, soundVolume);
  }, []);

  useEffect(() => {
    audioController.setMusicEnabled(musicEnabled);
  }, [musicEnabled]);

  useEffect(() => {
    audioController.setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    audioController.updateMusicVolume(musicVolume);
  }, [musicVolume]);

  useEffect(() => {
    audioController.updateSoundVolume(soundVolume);
  }, [soundVolume]);

  useEffect(() => {
    if (musicEnabled && !document.hidden) {
      audioController.playMusic(musicEnabled, musicVolume);
      return;
    }

    if (!musicEnabled) {
      audioController.pauseMusic();
    }
  }, [musicEnabled, musicVolume]);

  useEffect(() => {
    if (!musicEnabled) return;

    const resumeOnInteraction = () => {
      audioController.playMusic(musicEnabled, musicVolume);
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
  }, [musicEnabled, musicVolume]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        audioController.pauseMusic();
      } else {
        audioController.resumeMusic(musicEnabled, musicVolume);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [musicEnabled, musicVolume]);

  const previousTemplateRef = useRef<GameState['activeTemplate']>(null);
  useEffect(() => {
    if (!activeTemplate || !previousTemplateRef.current) {
      previousTemplateRef.current = activeTemplate;
      return;
    }

    const previousTemplate = previousTemplateRef.current;
    const currentTemplate = activeTemplate;

    if (!previousTemplate.completedAtTick && currentTemplate.completedAtTick) {
      audioController.templateCompleted(soundEnabled, soundVolume);
    } else if (!previousTemplate.hasErrors && currentTemplate.hasErrors) {
      audioController.templateCellWrong(soundEnabled, soundVolume);
    } else if (previousTemplate.filledCells.size < currentTemplate.filledCells.size && !currentTemplate.hasErrors) {
      audioController.templateCellCorrect(soundEnabled, soundVolume);
    }

    previousTemplateRef.current = currentTemplate;
  }, [activeTemplate, soundEnabled, soundVolume]);

  const previousInvalidMoveTargetRef = useRef<InvalidMoveTargetState | null | undefined>(null);
  useEffect(() => {
    const previousInvalidMoveTarget = previousInvalidMoveTargetRef.current;
    if (
      invalidMoveTarget && (
        !previousInvalidMoveTarget ||
        previousInvalidMoveTarget.startedTick !== invalidMoveTarget.startedTick ||
        previousInvalidMoveTarget.position.q !== invalidMoveTarget.position.q ||
        previousInvalidMoveTarget.position.r !== invalidMoveTarget.position.r
      )
    ) {
      audioController.invalidMove(soundEnabled, soundVolume);
    }

    previousInvalidMoveTargetRef.current = invalidMoveTarget;
  }, [invalidMoveTarget, soundEnabled, soundVolume]);

  const playUiClick = useCallback(() => {
    audioController.playRandomSound(soundEnabled, soundVolume);
  }, [soundEnabled, soundVolume]);

  const playSound = useCallback((soundPath: string) => {
    audioController.playSound(soundPath, soundEnabled, soundVolume);
  }, [soundEnabled, soundVolume]);

  const playMusicFromInteraction = useCallback(() => {
    audioController.playMusic(musicEnabled, musicVolume).catch(() => console.log('[Audio] Autoplay blocked'));
  }, [musicEnabled, musicVolume]);

  return {
    playUiClick,
    playSound,
    playMusicFromInteraction,
  };
}
