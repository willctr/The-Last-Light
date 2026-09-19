import type { Engine } from './Engine';

let current: Engine | null = null;

export function registerEngine(e: Engine | null): void {
  current = e;
}

export function getEngine(): Engine | null {
  return current;
}
