// =============================================================================
// TEST SETUP - Polyfills and mocks MUST be configured before any imports
// =============================================================================

// Polyfills and test environment shims MUST be installed before importing
// any modules that may access `localStorage` or `storage` (e.g. Supabase client).

// Unified in-memory storage for tests (sync API + async aliases) - MUST be first
(() => {
  const store = new Map<string, string>();

  const unified: any = {
    getItem(key: string) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
      return undefined;
    },
    removeItem(key: string) {
      store.delete(key);
      return undefined;
    },
    clear() {
      store.clear();
      return undefined;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
    // Async aliases
    async getItemAsync(k: string) {
      return this.getItem(k);
    },
    async setItemAsync(k: string, v: string) {
      return this.setItem(k, v);
    },
    async removeItemAsync(k: string) {
      return this.removeItem(k);
    },
    async clearAsync() {
      return this.clear();
    },
  } as Storage & Record<string, any>;

  try {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: unified,
    });
  } catch (err) {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: unified,
    });
  }

  // Also expose `storage` (some SDKs reference window.storage)
  try {
    (globalThis as any).storage = unified;
    if (typeof window !== 'undefined') (window as any).storage = unified;
  } catch (e) {
    // swallow
  }

  // Debug: help diagnose test env issues when storage isn't what we expect
  // (these logs are harmless in CI but useful during local dev)

  console.debug('[setup] localStorage.getItem type:', typeof (globalThis as any).localStorage?.getItem);

  console.debug('[setup] storage.getItem type:', typeof (globalThis as any).storage?.getItem);
})();

// Silence noisy Node warnings in test output
const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = ((warning: string | Error, ...args: any[]) => {
  const message = typeof warning === 'string' ? warning : warning?.message;
  if (message?.includes('--localstorage-file')) {
    return;
  }
  return originalEmitWarning(warning as any, ...args);
}) as typeof process.emitWarning;

// Mock navigator API for browser language detection
Object.defineProperty(window, 'navigator', {
  writable: true,
  value: {
    language: 'en-US',
    languages: ['en-US', 'en'],
    userAgent: 'Mozilla/5.0 (Test Browser)',
    platform: 'TestPlatform',
  },
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// =============================================================================
// IMPORTS - All imports must come BEFORE any mocks
// =============================================================================

// Import vitest before any mocks that use it
import { vi } from 'vitest';
import { expect, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
// =============================================================================
// MOCKS - All vi.mock() calls must come AFTER imports
// =============================================================================

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: (_url: string, _key: string, opts?: any) => {
      const maybeStorage = opts?.auth?.storage ?? (globalThis as any).localStorage;
      const storageKey = opts?.auth?.storageKey ?? 'supabase.auth.token';

      // Ensure the storage supports async aliases used by helpers
      const ensureAsync = (s: any) => {
        if (!s.getItemAsync) s.getItemAsync = async (k: string) => s.getItem(k);
        if (!s.setItemAsync) s.setItemAsync = async (k: string, v: string) => s.setItem(k, v);
        if (!s.removeItemAsync) s.removeItemAsync = async (k: string) => s.removeItem(k);
      };
      try { ensureAsync(maybeStorage); } catch (e) { /* ignore */ }

      // Simple in-memory session management backed by the provided storage
      const subscribers: Array<(event: string, session: any) => void> = [];

      const loadSession = async () => {
        try {
          const raw = await maybeStorage.getItemAsync(storageKey);
          if (!raw) return null;
          return JSON.parse(raw);
        } catch (e) {
          return null;
        }
      };

      const saveSession = async (session: any) => {
        try {
          await maybeStorage.setItemAsync(storageKey, JSON.stringify(session));
        } catch (e) {
          // swallow during tests
        }
      };

      const removeSession = async () => {
        try {
          await maybeStorage.removeItemAsync(storageKey);
        } catch (e) {
          // swallow
        }
      };

      const notify = (event: string, session: any) => {
        for (const cb of subscribers) {
          try { cb(event, session); } catch (e) { /* swallow */ }
        }
      };

      const auth = {
        // Return the user (if any) stored in session
        getUser: async () => {
          const s = await loadSession();
          return { data: { user: s?.user ?? { id: 'test-user', email: 'test@example.com' } }, error: null };
        },
        // Return full session object
        getSession: async () => {
          const s = await loadSession();
          const fallback = { access_token: 'test-access-token', refresh_token: 'test-refresh-token', expires_at: Math.floor(Date.now() / 1000) + 60 * 60, user: { id: 'test-user', email: 'test@example.com' } };
          return { data: { session: s ?? fallback }, error: null };
        },
        // Subscribe to auth events
        onAuthStateChange: (cb: any) => {
          const fn = (event: string, session: any) => cb(event, { session });
          subscribers.push(fn);
          return { data: null, unsubscribe: () => {
            const i = subscribers.indexOf(fn);
            if (i !== -1) subscribers.splice(i, 1);
          }};
        },
        // Simulated sign-in which persists a minimal session and notifies subscribers
        signInWithPassword: async (_creds?: any) => {
          const fakeSession = {
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
            user: { id: 'test-user', email: 'test@example.com' },
          };
          await saveSession(fakeSession);
          notify('SIGNED_IN', fakeSession);
          return { data: { session: fakeSession }, error: null };
        },
        // Simulated sign-out which clears session and notifies subscribers
        signOut: async () => {
          await removeSession();
          notify('SIGNED_OUT', null);
          return { data: null, error: null };
        },
      };

      const storage = {
        from: (_bucket: string) => ({
          createSignedUrl: async (_path: string, _expires: number) => ({ data: { signedUrl: '' } }),
          download: async (_path: string) => ({ data: null, error: null }),
          upload: async (_path: string, _file: any) => ({ data: null, error: null }),
        }),
        // expose the raw storage passed in for code that reads it directly
        _raw: maybeStorage,
      };

      // Enhanced in-memory dataset and thenable QueryBuilder to support
      // supabase.from(...).select().eq().limit().single(), insert, update, delete.
      const _dataStore: Record<string, any[]> = {
        user_roles: [ { user_id: 'test-user', role: 'admin' } ],
        templates: [ { id: 1, is_system: true }, { id: 2, is_system: false } ],
        // Common seeds to reduce per-test fixture boilerplate
        projects: [
          { id: 'proj-1', name: 'Demo Project', owner_id: 'test-user', status: 'active' },
          { id: 'proj-2', name: 'Archived Project', owner_id: 'other-user', status: 'archived' },
        ],
        project_team_members: [
          { id: 1, project_id: 'proj-1', user_id: 'test-user', role: 'manager' },
          { id: 2, project_id: 'proj-1', user_id: 'other-user', role: 'engineer' },
        ],
        project_materials: [
          { id: 1, project_id: 'proj-1', description: 'Cement', unit: 'bag', quantity: 100 },
        ],
        purchase_orders: [
          { id: 'po-1', project_id: 'proj-1', supplier: 'Acme Supplies', total: 1200.5, status: 'open' },
        ],
      };

      const protectedTables = new Set([
        'app_settings', 'company_settings', 'backup_jobs', 'backup_settings', 'integration_settings',
        'failed_login_attempts', 'project_benchmarks', 'exchange_rates', 'project_budget_items', 'project_activities', 'currencies',
      ]);

      const getCurrentUser = async () => {
        const s = await loadSession();
        return s?.user ?? { id: 'test-user', email: 'test@example.com' };
      };

      const queryBuilder = (table: string) => {
        const state: any = {
          _table: table,
          _select: '*',
          _filters: [] as Array<{ type: string; col: string; val: any }>,
          _limit: null as number | null,
          _order: null as any,
          _operation: 'select' as string,
          _payload: null as any,
        };

        const exec = async () => {
          const tableName = state._table;
          const operation = state._operation;
          const user = await getCurrentUser();
          const userRoles = (_dataStore['user_roles'] || []).filter(r => r.user_id === user.id).map(r => r.role);

          const isProtected = protectedTables.has(tableName);
          const isAdmin = userRoles.includes('admin');

          const tableData = Array.isArray(_dataStore[tableName]) ? [..._dataStore[tableName]] : [];

          if (isProtected && !isAdmin) {
            const err = { message: `row-level security policy prevents access to table "${tableName}"`, code: '42501' };
            return { data: null, error: err };
          }

           if (operation === 'select') {
            let results = tableData;
            for (const f of state._filters) {
              if (f.type === 'eq') results = results.filter((r: any) => r[f.col] === f.val);
              if (f.type === 'in') results = results.filter((r: any) => Array.isArray(f.val) && f.val.includes(r[f.col]));
            }
            // Apply sorting if specified
            if (state._order) {
              results = results.sort((a: any, b: any) => {
                const aVal = a[state._order.col];
                const bVal = b[state._order.col];
                const direction = state._order.dir === 'desc' ? -1 : 1;
                if (aVal < bVal) return -1 * direction;
                if (aVal > bVal) return 1 * direction;
                return 0;
              });
            }
            if (state._limit != null) results = results.slice(0, state._limit);
            return { data: results, error: null };
          }

          if (operation === 'insert') {
            const payload = state._payload;
            const rows = Array.isArray(payload) ? payload : [payload];
            for (const row of rows) {
              if (row.id == null) row.id = Math.floor(Math.random() * 1000000);
              _dataStore[tableName] = _dataStore[tableName] || [];
              _dataStore[tableName].push(row);
            }
            return { data: rows, error: null };
          }

          if (operation === 'update') {
            const payload = state._payload;
            const updated: any[] = [];
            _dataStore[tableName] = _dataStore[tableName] || [];
            _dataStore[tableName] = _dataStore[tableName].map((r: any) => {
              const match = state._filters.every((f: any) => f.type === 'eq' ? r[f.col] === f.val : true);
              if (match) {
                const newRow = { ...r, ...payload };
                updated.push(newRow);
                return newRow;
              }
              return r;
            });
            return { data: updated, error: null };
          }

          if (operation === 'delete') {
            const before = _dataStore[tableName] || [];
            const remaining = before.filter((r: any) => !state._filters.every((f: any) => f.type === 'eq' ? r[f.col] === f.val : true));
            const deleted = before.filter((r: any) => !remaining.includes(r));
            _dataStore[tableName] = remaining;
            return { data: deleted, error: null };
          }

          return { data: null, error: null };
        };

        const builder: any = {};
        Object.assign(builder, {
          select(cols?: string) { state._select = cols ?? '*'; return builder; },
          eq(col: string, val: any) { state._filters.push({ type: 'eq', col, val }); return builder; },
          in(col: string, vals: any[]) { state._filters.push({ type: 'in', col, val: vals }); return builder; },
          limit(n: number) { state._limit = n; return builder; },
          order(_col: string, _options?: { ascending?: boolean }) { state._order = { col: _col, dir: _options?.ascending === false ? 'desc' : 'asc' }; return builder; },
          single() { return (async () => { const res = await exec(); if (res.error) return { data: null, error: res.error }; return { data: res.data && res.data.length > 0 ? res.data[0] : null, error: null }; })(); },
          maybeSingle() { return (async () => { const res = await exec(); if (res.error) return { data: null, error: res.error }; return { data: res.data && res.data.length > 0 ? res.data[0] : null, error: null }; })(); },
          insert(payload: any) { state._operation = 'insert'; state._payload = payload; return builder; },
          update(payload: any) { state._operation = 'update'; state._payload = payload; return builder; },
          delete() { state._operation = 'delete'; return builder; },
          then(resolve: any, reject: any) { return exec().then(resolve, reject); },
          catch(cb: any) { return exec().catch(cb); },
        });

        return builder;
      };

      return {
        auth,
        storage,
        from: (table: string) => queryBuilder(table),
        functions: {
          invoke: async () => ({ data: null }),
        },
        // keep a minimal rpc helper
        rpc: async () => ({ data: null }),
      };
    },
  };
});

// Mock '@testing-library/react' so `render` automatically wraps UI with a
// lightweight provider that supplies QueryClient + LocalizationContext but
// does NOT include a Router. This avoids accidental nested Router errors in
// tests that already provide their own Router.
vi.mock('@testing-library/react', async () => {
  const actual = await vi.importActual<any>('@testing-library/react');
  const tp = await vi.importActual<any>('@/test/utils/TestProviders');
  const { LocalizationContext } = await vi.importActual<any>('../contexts/LocalizationContext');
  const { QueryClientProvider } = await vi.importActual<any>('@tanstack/react-query');
  const ReactImport = await vi.importActual<any>('react');
  const ReactLocal = ReactImport.default || ReactImport;

  const { createTestQueryClient } = tp;

  const Wrapper = ({ children }: any) => {
    const qc = createTestQueryClient();
    return ReactLocal.createElement(
      QueryClientProvider,
      { client: qc },
      ReactLocal.createElement(LocalizationContext.Provider, {
        value: {
          language: 'en-US',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          timeZone: 'America/New_York',
          weatherLocation: 'New York, USA',
          temperatureUnit: 'F',
          numberFormat: 'compact',
          setLanguage: () => {},
          setCurrency: () => {},
          setDateFormat: () => {},
          setTimeZone: () => {},
          setWeatherLocation: () => {},
          setTemperatureUnit: () => {},
          setNumberFormat: () => {},
          updateSettings: () => {},
          t: (k: string) => k,
          loadTranslationsForRoute: () => {},
        },
      },
      children
    ));
  };

  const { render: actualRender, ...rest } = actual;
  return {
    ...rest,
    render: (ui: any, options?: any) => actualRender(ui, { wrapper: Wrapper as any, ...options }),
  };
});

// =============================================================================
// TEST CONFIGURATION - Initialize test helpers and setup
// =============================================================================

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Basic fetch interceptor to mock Supabase REST calls during tests
const ORIGINAL_FETCH = typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : undefined;
if (typeof window !== 'undefined' && ORIGINAL_FETCH) {
  (window as any).fetch = async (input: RequestInfo, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url && url.includes('.supabase.co/rest/v1')) {
        const tableMatch = url.match(new RegExp('/rest/v1/([^?/]+)(?:[?/]|$)'));
        const table = tableMatch ? tableMatch[1] : 'unknown';
        const hasUndefinedQuery = url.includes('=undefined') || url.includes('=eq.undefined');

        if ((init?.method === 'GET' || !init?.method) && url.includes('?select=')) {
          return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        const protectedTables = new Set([
          'app_settings', 'company_settings', 'backup_jobs', 'backup_settings', 'integration_settings',
          'failed_login_attempts', 'project_benchmarks', 'exchange_rates', 'project_budget_items', 'project_activities', 'currencies',
        ]);

        const allowedTables = new Set(['activity_templates']);

        if (init?.method === 'POST') {
          if (allowedTables.has(table)) {
            return new Response(JSON.stringify({ id: 1 }), { status: 201, headers: { 'Content-Type': 'application/json' } });
          }
          if (protectedTables.has(table) || (hasUndefinedQuery && protectedTables.has(table))) {
            const resp = { code: '42501', message: `row-level security policy prevents inserting into table "${table}"`, details: null, hint: null };
            return new Response(JSON.stringify(resp), { status: 403, headers: { 'Content-Type': 'application/json' } });
          }
          return new Response(JSON.stringify({ id: 1 }), { status: 201, headers: { 'Content-Type': 'application/json' } });
        }

        if (init?.method === 'PATCH' || init?.method === 'PUT' || init?.method === 'DELETE' || init?.method === 'GET') {
          if (allowedTables.has(table)) {
            if ((init?.method === 'GET' || !init?.method) && url.includes('?select=')) {
              return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
          if (protectedTables.has(table) || (hasUndefinedQuery && protectedTables.has(table))) {
            const resp = { code: '42501', message: `row-level security policy prevents access to table "${table}"`, details: null, hint: null };
            return new Response(JSON.stringify(resp), { status: 403, headers: { 'Content-Type': 'application/json' } });
          }
        }

        return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (e) {
      // fall through to original fetch on any error
    }
    return ORIGINAL_FETCH ? ORIGINAL_FETCH(input, init) : new Response('', { status: 500 });
  };
}
