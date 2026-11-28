import type { QwenAction, SimulationState } from '../types/simulation';

export type SimEventType =
  | 'birth'
  | 'death'
  | 'marriage'
  | 'construction'
  | 'discovery'
  | 'crisis_start'
  | 'crisis_resolved'
  | 'tradition_born'
  | 'festival'
  | 'diplomacy_trade'
  | 'era_change'
  | 'law_changed';

export interface SimEvent {
  id: number;
  day: number;
  type: SimEventType;
  summary: string;
  agentId?: number;
  metadata?: Record<string, string | number | boolean>;
}

type SimEventListener = (state: SimulationState, event: SimEvent) => void;
type QwenActionExtensionHandler = (state: SimulationState, action: QwenAction) => string | null;

const listeners = new Map<SimEventType | '*', Set<SimEventListener>>();
const qwenActionExtensions = new Map<QwenAction['type'], QwenActionExtensionHandler>();
let recentEventsBuffer: SimEvent[] = [];
let totalEventsDispatched = 0;

export function registerQwenActionExtension(
  type: QwenAction['type'],
  handler: QwenActionExtensionHandler
): void {
  qwenActionExtensions.set(type, handler);
}

export function dispatchQwenActionExtension(
  state: SimulationState,
  action: QwenAction
): string | null {
  const handler = qwenActionExtensions.get(action.type);
  if (!handler) return null;
  return handler(state, action);
}

export function subscribeSimEvent(
  type: SimEventType | '*',
  listener: SimEventListener
): () => void {
  const existing = listeners.get(type) ?? new Set<SimEventListener>();
  existing.add(listener);
  listeners.set(type, existing);
  return () => {
    existing.delete(listener);
  };
}

export function emitSimEvent(
  state: SimulationState,
  type: SimEventType,
  summary: string,
  agentId?: number,
  metadata?: Record<string, string | number | boolean>
): SimEvent {
  const event: SimEvent = {
    id: state.nextId++,
    day: state.day,
    type,
    summary,
    agentId,
    metadata,
  };
  totalEventsDispatched += 1;
  recentEventsBuffer.unshift(event);
  if (recentEventsBuffer.length > 80) {
    recentEventsBuffer = recentEventsBuffer.slice(0, 80);
  }

  const typed = listeners.get(type);
  if (typed) {
    for (const fn of typed) {
      try {
        fn(state, event);
      } catch {
        // Isolar fallos de suscriptores para no detener el tick
      }
    }
  }
  const wildcard = listeners.get('*');
  if (wildcard) {
    for (const fn of wildcard) {
      try {
        fn(state, event);
      } catch {
        // Isolar fallos de suscriptores
      }
    }
  }
  return event;
}

export function getRecentSimEvents(): SimEvent[] {
  return recentEventsBuffer;
}

export function getTotalDispatchedEventsCount(): number {
  return totalEventsDispatched;
}

export function resetSimEventBusForTest(): void {
  recentEventsBuffer = [];
  totalEventsDispatched = 0;
}
