/**
 * Safe logger that only outputs in development mode.
 * Prevents leaking system internals in production.
 */
export const logger = {
  error: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.error(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.warn(...args);
    }
  },
  log: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  },
};
