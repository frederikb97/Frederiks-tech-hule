// Datalag: gemmer hele app-tilstanden som ét JSON-dokument.
// `adapter` skal bare have getItem/setItem (localStorage, en Map-wrapper til test,
// eller senere en server), så resten af appen kender ikke til lagringen.
import { SCHEMA_VERSION } from '../domain/model.js';

export const STORAGE_KEY = 'budgetmodel';

/** @returns {import('../domain/model.js').AppState} */
export const emptyState = () => ({ schemaVersion: SCHEMA_VERSION, activeBudgetId: null, budgets: [] });

/** Trin-for-trin-migreringer: MIGRATIONS[n] løfter data fra version n til n+1. */
const MIGRATIONS = {};

export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.budgets)) return emptyState();
  let state = raw;
  let v = Number(state.schemaVersion) || 1;
  if (v > SCHEMA_VERSION) throw new Error('Data er gemt af en nyere version af appen.');
  while (v < SCHEMA_VERSION) {
    state = MIGRATIONS[v](state);
    v += 1;
  }
  state.schemaVersion = SCHEMA_VERSION;
  state.budgets = state.budgets.filter(isBudget);
  return state;
}

export function isBudget(b) {
  return !!b && typeof b === 'object' && typeof b.id === 'string' && typeof b.name === 'string' &&
    Array.isArray(b.incomes) && Array.isArray(b.expenses) && !!b.profile && !!b.tax;
}

export function memoryAdapter() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

export function createRepository(adapter, key = STORAGE_KEY) {
  return {
    load() {
      try {
        return migrate(JSON.parse(adapter.getItem(key) ?? 'null'));
      } catch (err) {
        console.error('Kunne ikke læse gemte data', err);
        return emptyState();
      }
    },
    save(state) {
      adapter.setItem(key, JSON.stringify(state));
    },
  };
}
