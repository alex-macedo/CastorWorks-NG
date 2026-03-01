type RouteChange = { path: string };

type Listener = (payload: RouteChange) => void;

export const routeEmitter = (() => {
  const listeners = new Set<Listener>();

  return {
    on(fn: Listener) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    off(fn: Listener) {
      listeners.delete(fn);
    },
    emit(payload: RouteChange) {
      for (const l of Array.from(listeners)) {
        try {
          l(payload);
        } catch (e) {
          // swallow listener errors to avoid breaking emitter
          console.error('routeEmitter listener error', e);
        }
      }
    },
  } as const;
})();

export type { RouteChange, Listener };
