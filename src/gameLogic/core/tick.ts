import type { GameState, RNG } from './types';
import type { Params } from './params';
import {
  axialDirections,
  axialDistance,
  findDirectionToward,
  ensureGeneratedAround,
  updateWorldViewCenter,
} from './grid';
import { updateFocusPosition } from '../systems/movement';

export function tick(state: GameState, params: Params, rng?: RNG): GameState {
  let next: GameState = { ...state, tick: state.tick + 1 };

  if (next.flash && (next.tick - next.flash.startedTick) >= params.CaptureFlashDurationTicks) {
    next = { ...next, flash: null };
  }

  // Auto-movement logic: move 1 cell every 2 ticks (via autoFocusTarget)
  if (next.autoFocusTarget && !next.isDragging) {
    if (next.autoMoveTicksRemaining === undefined || next.autoMoveTicksRemaining <= 0) {
      const distToFocusTarget = axialDistance(next.protagonist, next.autoFocusTarget);

      if (distToFocusTarget === 1) {
        // Adjacent — face target and stop
        const dirIndex = axialDirections.findIndex(
          d => next.protagonist.q + d.q === next.autoFocusTarget!.q &&
               next.protagonist.r + d.r === next.autoFocusTarget!.r
        );
        if (dirIndex !== -1) {
          next = { ...next, facingDirIndex: dirIndex };
          next = updateFocusPosition(next);
          next = { ...next, autoFocusTarget: null, autoMoveTicksRemaining: 0, autoMoveTarget: null, autoMoveTargetDir: null, autoMovePath: undefined };
        } else {
          next = { ...next, autoFocusTarget: null, autoMoveTicksRemaining: 0, autoMoveTarget: null, autoMoveTargetDir: null, autoMovePath: undefined };
        }
      } else if (distToFocusTarget > 1) {
        // Move one step closer
        const dirIndex = findDirectionToward(next.protagonist.q, next.protagonist.r, next.autoFocusTarget.q, next.autoFocusTarget.r);
        if (dirIndex !== null) {
          const dir = axialDirections[dirIndex];
          const newPos = { q: next.protagonist.q + dir.q, r: next.protagonist.r + dir.r };
          next = { ...next, protagonist: newPos, facingDirIndex: dirIndex, autoMoveTicksRemaining: 2 };
          next = updateFocusPosition(next);
          // Remove current position from path if it's at the front
          if (next.autoMovePath && next.autoMovePath.length > 0) {
            const firstPath = next.autoMovePath[0];
            if (firstPath.q === newPos.q && firstPath.r === newPos.r) {
              next = { ...next, autoMovePath: next.autoMovePath.slice(1) };
            }
          }
        } else {
          next = { ...next, autoFocusTarget: null, autoMoveTicksRemaining: 0, autoMoveTarget: null, autoMoveTargetDir: null, autoMovePath: undefined };
        }
      } else {
        // distToFocusTarget === 0 — protagonist ON target, clean up
        next = { ...next, autoFocusTarget: null, autoMoveTicksRemaining: 0, autoMoveTarget: null, autoMoveTargetDir: null, autoMovePath: undefined };
      }
    } else {
      next = { ...next, autoMoveTicksRemaining: next.autoMoveTicksRemaining - 1 };
    }
  }

  if (next.flash && (next.tick - next.flash.startedTick) >= params.CaptureFlashDurationTicks) {
    next = { ...next, flash: null };
  }

  if (next.tick % params.GameTickRate === 0 && next.remainingSeconds > 0) {
    next = { ...next, remainingSeconds: next.remainingSeconds - 1 };
  }

  // Always keep focus updated when not dragging and not auto-moving
  if (!next.isDragging && !next.autoFocusTarget) {
    next = updateFocusPosition(next);
  }

  next = ensureGeneratedAround(next, params, rng);
  next = updateWorldViewCenter(next, params);

  return next;
}
