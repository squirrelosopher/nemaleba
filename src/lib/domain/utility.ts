export const Utility = {
  Electricity: 'electricity',
  Water: 'water'
} as const;

export type Utility = (typeof Utility)[keyof typeof Utility];

export const OutageKind = {
  Planned: 'planned',
  Emergency: 'emergency'
} as const;

export type OutageKind = (typeof OutageKind)[keyof typeof OutageKind];

export const UTILITIES: Utility[] = [Utility.Electricity, Utility.Water];
