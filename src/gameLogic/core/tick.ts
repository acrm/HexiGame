import type { GameState, RNG } from './types';
import type { Params } from './params';
import {
  axialDirections,
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

  if (next.autoMoveTarget && !next.isDragging) {
    if (next.autoMoveTicksRemaining === undefined || next.autoMoveTicksRemaining <= 0) {
      if (next.protagonist.q === next.autoMoveTarget.q && next.protagonist.r === next.autoMoveTarget.r) {
        if (next.autoFocusTarget) {
          const dirTowardFocus = findDirectionToward(
            next.protagonist.q, next.protagonist.r,
            next.autoFocusTarget.q, next.autoFocusTarget.r
          );
          if (dirTowardFocus !== null) {
            next = { ...next, facingDirIndex: dirTowardFocus };
          }
        }
        next = updateFocusPosition(next);
        next = { ...next, autoMoveTarget: null, autoMoveTicksRemaining: 0, autoFocusTarget: null };
      } else {
        const dirIndex = findDirectionToward(
          next.protagonist.q, next.protagonist.r,
          next.autoMoveTarget.q, next.autoMoveTarget.r
        );
        if (dirIndex !== null) {
          const dir = axialDirections[dirIndex];
          const newPos = { q: next.protagonist.q + dir.q, r: next.protagonist.r + dir.r };
          next = { ...next, protagonist: newPos, facingDirIndex: dirIndex, autoMoveTicksRemaining: 2 };
          next = updateFocusPosition(next);
        } else {
          next = { ...next, autoMoveTarget: null, autoMoveTicksRemaining: 0 };
          next = updateFocusPosition(next);
        }
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

  if (!next.isDragging) {
    next = updateFocusPosition(next);
  }

  next = ensureGeneratedAround(next, params, rng);
  next = updateWorldViewCenter(next, params);

  return next;
}
