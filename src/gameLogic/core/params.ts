import type { RNG } from './types';

export interface Params {
  GridRadius: number;
  InitialColorProbability: number;
  ColorPaletteStartHue: number;
  ColorPaletteHueStep: number;
  ColorSaturation: number;
  ColorValue: number;
  ColorPalette: string[];
  TurtleOutlineColor: string;
  PlayerBaseColorIndex: number;
  TimerInitialSeconds: number;
  CaptureHoldDurationTicks: number;
  CaptureFailureCooldownTicks: number;
  CaptureFlashDurationTicks: number;
  ChanceBasePercent: number;
  ChancePenaltyPerPaletteDistance: number;
  CarryFlickerCycleTicks: number;
  CarryFlickerOnFraction: number;
  CarryingMoveRequiresEmpty: boolean;
  GameTickRate: number;
  CameraLagTicks: number;
}

export function mulberry32(seed: number): RNG {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hsvToHex(h: number, s: number, v: number): string {
  s = s / 100;
  v = v / 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generatePaletteHues(startHue: number, hueStep: number, colorCount: number): number[] {
  const hues: number[] = [];
  for (let i = 0; i < colorCount; i++) {
    hues.push((startHue + i * hueStep) % 360);
  }
  return hues;
}

const paletteStartHue = 30;
const paletteHueStep = 60;
const colorCount = 6;
const saturation = 70;
const value = 80;
const paletteHues = generatePaletteHues(paletteStartHue, paletteHueStep, colorCount);

export const DefaultParams: Params = {
  GridRadius: 5,
  InitialColorProbability: 0.15,
  ColorPaletteStartHue: paletteStartHue,
  ColorPaletteHueStep: paletteHueStep,
  ColorSaturation: saturation,
  ColorValue: value,
  ColorPalette: paletteHues.map(h => hsvToHex(h, saturation, value)),
  TurtleOutlineColor: '#FFFFFF',
  PlayerBaseColorIndex: 0,
  TimerInitialSeconds: 300,
  CaptureHoldDurationTicks: 6,
  CaptureFailureCooldownTicks: 12,
  CaptureFlashDurationTicks: 2,
  ChanceBasePercent: 100,
  ChancePenaltyPerPaletteDistance: 20,
  CarryFlickerCycleTicks: 6,
  CarryFlickerOnFraction: 0.5,
  CarryingMoveRequiresEmpty: true,
  GameTickRate: 12,
  CameraLagTicks: 2,
};
