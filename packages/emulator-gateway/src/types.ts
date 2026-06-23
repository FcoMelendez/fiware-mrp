export interface NgsiLdEntity {
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface EmulatorEvent {
  eventId: string;
  eventType:
    | 'contextSnapshot'
    | 'entityChanged'
    | 'scenarioStarted'
    | 'checkpointPassed'
    | 'commandAccepted'
    | 'commandFailed';
  sessionId?: string;
  correlationId?: string;
  observedAt: string;
  entityId?: string;
  entityType?: string;
  changedAttributes?: string[];
  payload?: unknown;
  visualHint?: {
    bindingId?: string;
    animation?: string;
    target?: string;
  };
}

export interface ZoneLayout {
  id: string;
  label: string;
  kind: 'warehouse' | 'workCenter' | 'buffer' | 'quality' | 'finishedGoods';
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  entityId?: string;
}

export interface VisualBindingDef {
  id: string;
  entityId: string;
  entityType: string;
  attribute?: string;
  zoneId: string;
  displayKind: 'sprite' | 'card' | 'badge' | 'zone';
}

export interface SceneSnapshot {
  sceneId: string;
  mode: string;
  entities: NgsiLdEntity[];
  layout: {
    zones: ZoneLayout[];
    bindings: VisualBindingDef[];
  };
}

export interface CommandEnvelope {
  commandId: string;
  correlationId: string;
  idempotencyKey: string;
  sessionId?: string;
  scenarioId?: string;
  tutorialStepId?: string;
  targetEntity?: string;
  payload?: unknown;
}

export interface TutorialStep {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
}
