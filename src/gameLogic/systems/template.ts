import type { GameState } from '../core/types';
import type { Params } from '../core/params';
import { getCell, updateCells, axialToKey } from '../core/grid';
import {
  validateTemplate,
  isTemplateCompleted,
  isTemplateEmpty,
  determineTemplateAnchor,
} from '../../templates/templateLogic';
import { getTemplateById } from '../../templates/templateLibrary';

function createStructureInstanceId(state: GameState, templateId: string): string {
  return `${templateId}_${state.tick}_${(state.structureInstances?.length ?? 0) + 1}`;
}

function syncStructureInstance(state: GameState): GameState {
  if (!state.activeTemplate) return state;

  const structureInstances = (state.structureInstances ?? []).map(instance => {
    if (instance.instanceId !== state.activeTemplate?.instanceId) {
      return instance;
    }

    return {
      ...instance,
      anchoredAt: state.activeTemplate.anchoredAt,
      hasErrors: state.activeTemplate.hasErrors,
      filledCells: new Set(state.activeTemplate.filledCells),
      completedAtTick: state.activeTemplate.completedAtTick,
    };
  });

  return { ...state, structureInstances };
}

export function activateTemplate(state: GameState, templateId: string): GameState {
  const template = getTemplateById(templateId);
  if (!template) return state;

  const instanceId = createStructureInstanceId(state, templateId);

  return {
    ...state,
    activeTemplate: {
      instanceId,
      templateId,
      anchoredAt: null,
      hasErrors: false,
      filledCells: new Set(),
    },
    completedTemplates: state.completedTemplates || new Set(),
    structureInstances: [
      ...(state.structureInstances ?? []),
      {
        instanceId,
        templateId,
        startedAtTick: state.tick,
        anchoredAt: null,
        hasErrors: false,
        filledCells: new Set(),
      },
    ],
  };
}

export function deactivateTemplate(state: GameState): GameState {
  return {
    ...state,
    activeTemplate: null,
  };
}

export function updateTemplateState(
  state: GameState,
  params: Params
): { state: GameState; event?: 'cell_correct' | 'cell_wrong' | 'template_completed' } {
  if (!state.activeTemplate) return { state };

  const template = getTemplateById(state.activeTemplate.templateId);
  if (!template) return { state };

  let nextState = { ...state };
  let event: 'cell_correct' | 'cell_wrong' | 'template_completed' | undefined;

  if (!state.activeTemplate.anchoredAt) {
    const focusCell = getCell(state.grid, state.focus);
    if (focusCell && focusCell.colorIndex !== null) {
      const anchor = determineTemplateAnchor(
        template,
        state.focus,
        focusCell.colorIndex,
        state.focus,
        state.facingDirIndex
      );

      if (anchor) {
        nextState = {
          ...nextState,
          activeTemplate: {
            ...state.activeTemplate,
            anchoredAt: {
              q: anchor.anchorPos.q,
              r: anchor.anchorPos.r,
              baseColorIndex: anchor.baseColorIndex,
              rotation: state.facingDirIndex,
            },
            filledCells: new Set([axialToKey(state.focus)]),
          },
        };
        event = 'cell_correct';
      }
    }
  } else {
    const validation = validateTemplate(
      template,
      state.activeTemplate.anchoredAt,
      state.activeTemplate.anchoredAt.baseColorIndex,
      state.activeTemplate.anchoredAt.rotation,
      state.grid,
      params.ColorPalette.length
    );

    const previousErrors = state.activeTemplate.hasErrors;
    const previousFilledCount = state.activeTemplate.filledCells.size;
    const newFilledCount = validation.correctCells.length;

    if (isTemplateEmpty(
      template,
      state.activeTemplate.anchoredAt,
      state.activeTemplate.anchoredAt.rotation,
      state.grid
    )) {
      nextState = {
        ...nextState,
        activeTemplate: {
          ...state.activeTemplate,
          anchoredAt: null,
          hasErrors: false,
          filledCells: new Set(),
        },
      };
    } else {
      nextState = {
        ...nextState,
        activeTemplate: {
          ...state.activeTemplate,
          hasErrors: validation.hasErrors,
          filledCells: new Set(validation.correctCells),
        },
      };

      if (newFilledCount > previousFilledCount) {
        event = validation.hasErrors ? 'cell_wrong' : 'cell_correct';
      } else if (!previousErrors && validation.hasErrors) {
        event = 'cell_wrong';
      }

      if (isTemplateCompleted(
        template,
        state.activeTemplate.anchoredAt,
        state.activeTemplate.anchoredAt.baseColorIndex,
        state.activeTemplate.anchoredAt.rotation,
        state.grid,
        params.ColorPalette.length
      )) {
        const completedTemplates = new Set(state.completedTemplates || []);
        completedTemplates.add(template.id);
        nextState = {
          ...nextState,
          activeTemplate: {
            ...nextState.activeTemplate!,
            completedAtTick: state.tick,
          },
          completedTemplates,
        };
        event = 'template_completed';
      }
    }
  }

  return { state: syncStructureInstance(nextState), event };
}
