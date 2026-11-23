import type { LengthUnit, LoadUnit, MetricKind } from './types';

export const LB_PER_KG = 2.2046226218;
export const CM_PER_IN = 2.54;

export function kgToDisplay(kg: number, unit: LoadUnit): number {
  return unit === 'kg' ? kg : kg * LB_PER_KG;
}
export function displayToKg(value: number, unit: LoadUnit): number {
  return unit === 'kg' ? value : value / LB_PER_KG;
}
export function cmToDisplay(cm: number, unit: LengthUnit): number {
  return unit === 'cm' ? cm : cm / CM_PER_IN;
}
export function displayToCm(value: number, unit: LengthUnit): number {
  return unit === 'cm' ? value : value * CM_PER_IN;
}

/** Round for display only; never used to rewrite stored values. */
export function round(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** `22.5`, `20`, `49.6` — trims a trailing `.0`. */
export function fmtNumber(value: number, decimals = 1): string {
  const r = round(value, decimals);
  return Number.isInteger(r) ? String(r) : r.toFixed(decimals);
}

/** Always one decimal, used for body measurements (93.0 kg). */
export function fmtFixed(value: number, decimals = 1): string {
  return round(value, decimals).toFixed(decimals);
}

export function fmtLoad(kg: number, unit: LoadUnit): string {
  return fmtNumber(kgToDisplay(kg, unit), 1);
}

export function loadUnitLabel(unit: LoadUnit, perHand: boolean): string {
  return perHand ? `${unit} / hand` : unit;
}

/** Parse user input in display units. Accepts comma decimals. Returns NaN for invalid input. */
export function parseDecimal(input: string): number {
  const t = input.trim().replace(',', '.');
  if (!/^\d*\.?\d+$|^\d+\.$/.test(t)) return NaN;
  return Number(t);
}

export function metricUnit(metric: MetricKind, loadUnit: LoadUnit, lengthUnit: LengthUnit): string {
  return metric === 'weight' ? loadUnit : metric === 'waist' ? lengthUnit : '%';
}

export function measurementToDisplay(metric: MetricKind, value: number, loadUnit: LoadUnit, lengthUnit: LengthUnit): number {
  if (metric === 'weight') return kgToDisplay(value, loadUnit);
  if (metric === 'waist') return cmToDisplay(value, lengthUnit);
  return value;
}

export function measurementFromDisplay(metric: MetricKind, value: number, unit: string): number {
  if (metric === 'weight') return displayToKg(value, unit as LoadUnit);
  if (metric === 'waist') return displayToCm(value, unit as LengthUnit);
  return value;
}

export function canonicalUnit(metric: MetricKind): string {
  return metric === 'weight' ? 'kg' : metric === 'waist' ? 'cm' : '%';
}

export const METRIC_LABEL: Record<MetricKind, string> = { weight: 'Weight', waist: 'Waist', bodyfat: 'Body fat' };

/** Plausibility bounds in canonical units. */
export const METRIC_BOUNDS: Record<MetricKind, [number, number]> = {
  weight: [20, 400],
  waist: [30, 250],
  bodyfat: [2, 70],
};
