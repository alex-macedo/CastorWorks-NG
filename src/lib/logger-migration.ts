/**
 * Migration helper to replace console.log statements with proper logger usage
 * This file provides utility functions for systematic replacement of console statements
 */

import { logger, type LogContext } from './logger';

/**
 * Replace console.log with logger.info
 */
export const logInfo = (message: string, data?: unknown) => {
  const context: LogContext = typeof data === 'object' && data !== null 
    ? { ...data as Record<string, unknown> } 
    : { data };
  logger.info(message, context);
};

/**
 * Replace console.error with logger.error  
 */
export const logError = (message: string, data?: unknown) => {
  const context: LogContext = typeof data === 'object' && data !== null 
    ? { ...data as Record<string, unknown> } 
    : { data };
  logger.error(message, context);
};

/**
 * Replace console.warn with logger.warn
 */
export const logWarn = (message: string, data?: unknown) => {
  const context: LogContext = typeof data === 'object' && data !== null 
    ? { ...data as Record<string, unknown> } 
    : { data };
  logger.warn(message, context);
};

/**
 * Replace console.debug with logger.debug
 */
export const logDebug = (message: string, data?: unknown) => {
  const context: LogContext = typeof data === 'object' && data !== null 
    ? { ...data as Record<string, unknown> } 
    : { data };
  logger.debug(message, context);
};

/**
 * Hook for logging React component lifecycle and state changes
 */
export const useComponentLogger = (componentName: string) => {
  return {
    mount: (props?: unknown) => logInfo(`[${componentName}] Component mounted`, props),
    unmount: () => logInfo(`[${componentName}] Component unmounted`),
    update: (props?: unknown) => logInfo(`[${componentName}] Component updated`, props),
    error: (error: Error, context?: unknown) => logError(`[${componentName}] Component error`, { error, context }),
    stateChange: (state: string, value: unknown) => logDebug(`[${componentName}] State change`, { state, value }),
  };
};
