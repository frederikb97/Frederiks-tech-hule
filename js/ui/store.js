// Lille state-container: én sandhed, gemmes ved hver ændring.
import { activeBudget } from '../domain/model.js';

export function createStore(repo) {
  const state = repo.load();
  const subs = new Set();
  return {
    get: () => state,
    subscribe: (fn) => (subs.add(fn), () => subs.delete(fn)),
    /** `silent` gemmer uden at tegne siden om (bruges mens man skriver i et felt). */
    update(mutate, { silent = false } = {}) {
      mutate(state);
      const b = activeBudget(state);
      if (b) b.updatedAt = new Date().toISOString();
      repo.save(state);
      if (!silent) subs.forEach((fn) => fn(state));
    },
  };
}
