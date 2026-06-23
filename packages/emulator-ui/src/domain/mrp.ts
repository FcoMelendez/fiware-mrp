export type MoState = 'draft' | 'confirmed' | 'waitingComponents' | 'ready' | 'inProgress' | 'blocked' | 'done';
export type WoState = 'waiting' | 'ready' | 'inProgress' | 'paused' | 'blocked' | 'done';
export type WcState = 'available' | 'busy' | 'unavailable' | 'maintenance';

export const MO_STATE_COLOR: Record<MoState, string> = {
  draft: '#9ca3af',
  confirmed: '#3b82f6',
  waitingComponents: '#f59e0b',
  ready: '#22c55e',
  inProgress: '#3b82f6',
  blocked: '#ef4444',
  done: '#16a34a',
};

export const WO_STATE_COLOR: Record<WoState, string> = {
  waiting: '#f59e0b',
  ready: '#22c55e',
  inProgress: '#3b82f6',
  paused: '#f59e0b',
  blocked: '#ef4444',
  done: '#16a34a',
};

export const WO_STATE_LABEL: Record<WoState, string> = {
  waiting: 'waiting',
  ready: 'ready',
  inProgress: 'inProgress',
  paused: 'paused',
  blocked: 'blocked',
  done: 'done',
};
