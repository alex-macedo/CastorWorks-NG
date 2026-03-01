/**
 * Centralized logging utility for the application
 * Provides environment-aware logging with support for different log levels
 * Enhanced for comprehensive AI agent troubleshooting
 */

import type { SupabaseClient } from '@supabase/supabase-js'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Error categories for grouping errors by system area
 */
type ErrorCategory = 
  | 'database' 
  | 'api' 
  | 'auth' 
  | 'validation' 
  | 'business' 
  | 'system' 
  | 'ui' 
  | 'network'
  | 'security'
  | 'performance'
  | 'integration'
  | 'configuration'

/**
 * Severity levels for business impact assessment
 */
type Severity = 'low' | 'medium' | 'high' | 'critical'

/**
 * Enhanced log context with structured metadata for AI agent troubleshooting
 */
export interface LogContext {
  // Error categorization
  category?: ErrorCategory
  component?: string
  errorCode?: string
  severity?: Severity
  
  // Error details
  error?: Error
  errorDetails?: string
  
  // Request context
  requestUrl?: string
  requestMethod?: string
  sessionId?: string
  requestId?: string
  userAgent?: string
  
  // Business context
  projectId?: string
  organizationId?: string
  
  // Tracing and correlation
  traceId?: string
  parentLogId?: string
  
  // Additional structured data
  [key: string]: unknown
}

interface LogEntry {
  level: LogLevel
  message: string
  data?: unknown
  context?: LogContext
  timestamp: string
}

/**
 * Auto-detect category from error message and context
 */
function detectCategory(message: string, error?: Error): ErrorCategory {
  const msg = message.toLowerCase()
  const errMsg = error?.message?.toLowerCase() || ''
  
  // Database errors
  if (msg.includes('database') || msg.includes('db ') || msg.includes('sql') || 
      msg.includes('connection') || msg.includes('timeout') || 
      errMsg.includes('database') || errMsg.includes('connection')) {
    return 'database'
  }
  
  // Auth errors
  if (msg.includes('auth') || msg.includes('login') || msg.includes('session') || 
      msg.includes('permission') || msg.includes('unauthorized') || msg.includes('forbidden') ||
      errMsg.includes('auth') || errMsg.includes('unauthorized')) {
    return 'auth'
  }
  
  // API errors
  if (msg.includes('api') || msg.includes('fetch') || msg.includes('request') || 
      msg.includes('response') || msg.includes('http') || msg.includes('status') ||
      errMsg.includes('api') || errMsg.includes('fetch')) {
    return 'api'
  }
  
  // Validation errors
  if (msg.includes('valid') || msg.includes('required') || msg.includes('invalid') || 
      msg.includes('format') || msg.includes('schema') ||
      errMsg.includes('valid') || errMsg.includes('required')) {
    return 'validation'
  }
  
  // Network errors
  if (msg.includes('network') || msg.includes('offline') || msg.includes('internet') || 
      msg.includes('cors') || errMsg.includes('network')) {
    return 'network'
  }
  
  // Security errors
  if (msg.includes('security') || msg.includes('xss') || msg.includes('injection') || 
      msg.includes('csrf') || msg.includes('sanitize')) {
    return 'security'
  }
  
  // Performance errors
  if (msg.includes('performance') || msg.includes('slow') || msg.includes('timeout') || 
      msg.includes('memory') || msg.includes('cpu')) {
    return 'performance'
  }
  
  // Integration errors
  if (msg.includes('integration') || msg.includes('webhook') || msg.includes('sync') || 
      msg.includes('third-party') || msg.includes('external')) {
    return 'integration'
  }
  
  // Configuration errors
  if (msg.includes('config') || msg.includes('environment') || msg.includes('setting') || 
      msg.includes('variable') || msg.includes('env')) {
    return 'configuration'
  }
  
  // Default to system
  return 'system'
}

/**
 * Auto-detect severity based on level and context
 */
function detectSeverity(level: LogLevel, category?: ErrorCategory, error?: Error): Severity {
  // Critical: Auth failures, security issues, data loss
  if (level === 'error' && (category === 'security' || category === 'auth')) {
    return 'critical'
  }
  
  // High: Database errors, unhandled exceptions, critical business logic
  if (level === 'error' && (category === 'database' || category === 'system')) {
    return 'high'
  }
  
  // High: Any error with specific critical keywords
  const msg = (error?.message || '').toLowerCase()
  if (msg.includes('fatal') || msg.includes('crash') || msg.includes('corrupt') || 
      msg.includes('data loss') || msg.includes('breach')) {
    return 'high'
  }
  
  // Medium: API errors, validation failures, network issues
  if (level === 'error' && (category === 'api' || category === 'validation' || category === 'network')) {
    return 'medium'
  }
  
  // Medium: Warnings that might indicate problems
  if (level === 'warn') {
    return 'medium'
  }
  
  // Low: Debug and info logs
  return 'low'
}

/**
 * Extract component name from error stack trace or caller
 */
function detectComponent(error?: Error): string {
  if (!error?.stack) {
    return 'unknown'
  }
  
  // Parse stack trace to find component name
  const stackLines = error.stack.split('\n')
  for (const line of stackLines) {
    // Look for patterns like "at ComponentName (" or "at functionName (file:line)"
    const match = line.match(/at\s+(\w+)(?:\.|\s*\()/)
    if (match) {
      const name = match[1]
      // Filter out common non-component names
      if (!['Error', 'Function', 'Object', 'Array', 'Promise', 'async', 'await'].includes(name)) {
        return name
      }
    }
  }
  
  return 'unknown'
}

/**
 * Generate a unique trace ID for request correlation
 */
function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Get current session ID from storage if available
 */
function getSessionId(): string | undefined {
  try {
    // Try to get from sessionStorage first
    const sessionId = sessionStorage.getItem('session_id')
    if (sessionId) return sessionId
    
    // Generate and store if not exists
    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    sessionStorage.setItem('session_id', newSessionId)
    return newSessionId
  } catch {
    return undefined
  }
}

/**
 * Hash IP address for privacy compliance
 */
function hashIp(ip: string): string {
  // Simple hash function for IP anonymization
  let hash = 0
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `ip_${Math.abs(hash).toString(16)}`
}

class Logger {
  private isDevelopment = import.meta.env.DEV
  private logs: LogEntry[] = []
  private maxLogs = 100
  private traceId: string
  private requestId: string
  private sessionId: string | undefined
  private appVersion: string
  private environment: string

  constructor() {
    this.traceId = generateTraceId()
    this.requestId = generateRequestId()
    this.sessionId = getSessionId()
    this.appVersion = import.meta.env.VITE_APP_VERSION || 'unknown'
    this.environment = import.meta.env.MODE || 'production'
  }

  /**
   * Debug level logging (dev only)
   */
  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context)
      this.addLog('debug', message, undefined, context)
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext) {
    console.info(`[INFO] ${message}`, context)
    this.addLog('info', message, undefined, context)
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext) {
    console.warn(`[WARN] ${message}`, context)
    this.addLog('warn', message, undefined, context)
  }

  /**
   * Error level logging
   */
  error(message: string, context?: LogContext) {
    console.error(`[ERROR] ${message}`, context)
    this.addLog('error', message, undefined, context)
  }

  /**
   * Get all stored logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * Clear stored logs
   */
  clearLogs() {
    this.logs = []
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * Get current trace ID for correlation
   */
  getTraceId(): string {
    return this.traceId
  }

  /**
   * Set project ID for all subsequent logs
   */
  setProjectId(projectId: string) {
    // Store in session for persistence across requests
    try {
      sessionStorage.setItem('current_project_id', projectId)
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Get stored project ID
   */
  getProjectId(): string | undefined {
    try {
      return sessionStorage.getItem('current_project_id') || undefined
    } catch {
      return undefined
    }
  }

  /**
   * Create a child logger with a specific component context
   */
  withComponent(component: string): ComponentLogger {
    return new ComponentLogger(this, component)
  }

  /**
   * Internal method to add log entry
   */
  private async addLog(
    level: LogLevel, 
    message: string, 
    data?: unknown, 
    context?: LogContext
  ) {
    const entry: LogEntry = {
      level,
      message,
      data,
      context,
      timestamp: new Date().toISOString(),
    }

    this.logs.push(entry)

    // Keep only recent logs to prevent memory issues
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Send to Supabase
    try {
      const { supabase } = await import('@/integrations/supabase/client')
      
      // Auto-detect fields if not provided
      const category = context?.category || detectCategory(message, context?.error)
      const severity = context?.severity || detectSeverity(level, category, context?.error)
      const component = context?.component || detectComponent(context?.error)
      
      // Get current URL and method
      const requestUrl = context?.requestUrl || window.location.href
      const requestMethod = context?.requestMethod || 'GET'
      
      // Get project ID from context or storage
      const projectId = context?.projectId || this.getProjectId()
      
      // Build enhanced context object
      const dataObj = typeof data === 'object' && data !== null ? data : {}
      const contextObj = context || {}
      const enhancedContext = {
        ...dataObj,
        ...contextObj,
        // Add auto-detected fields
        autoDetected: {
          category,
          severity,
          component,
          timestamp: new Date().toISOString(),
        },
        // Add system info
        system: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          screenSize: `${window.screen.width}x${window.screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
        // Add URL info
        url: {
          href: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
        },
        // Add performance metrics if available
        performance: this.getPerformanceMetrics(),
      }

      // Don't await this to avoid blocking
      supabase.rpc('log_message', {
        p_level: level,
        p_message: message,
        p_context: enhancedContext,
        p_category: category,
        p_component: component,
        p_error_code: context?.errorCode,
        p_severity: severity,
        p_project_id: projectId,
        p_trace_id: context?.traceId || this.traceId,
        p_request_url: requestUrl,
        p_request_method: requestMethod,
        p_stack_trace: context?.error?.stack,
        p_error_details: context?.errorDetails || context?.error?.message,
        p_environment: this.environment,
        p_app_version: this.appVersion,
      }).then(({ error }) => {
        if (error) console.error('[Logger] Failed to send log to server:', error)
      })
    } catch (err) {
      console.error('[Logger] Failed to import supabase or send log:', err)
    }
  }

  /**
   * Get performance metrics if available
   */
  private getPerformanceMetrics(): Record<string, number> | undefined {
    try {
      if (typeof window === 'undefined' || !window.performance) {
        return undefined
      }

      // Use PerformanceNavigationTiming API
      const navEntries = window.performance.getEntriesByType('navigation')
      if (navEntries.length > 0) {
        const nav = navEntries[0] as PerformanceNavigationTiming
        return {
          loadTime: nav.loadEventEnd - nav.startTime,
          domReady: nav.domContentLoadedEventEnd - nav.startTime,
          firstPaint: nav.responseEnd - nav.startTime,
        }
      }
      
      // Fallback to legacy PerformanceTiming API
      const timing = window.performance.timing
      if (timing && timing.loadEventEnd && timing.navigationStart) {
        return {
          loadTime: timing.loadEventEnd - timing.navigationStart,
          domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
          firstPaint: timing.responseEnd - timing.navigationStart,
        }
      }
      
      return undefined
    } catch {
      return undefined
    }
  }
}

/**
 * Component-specific logger wrapper
 */
class ComponentLogger {
  constructor(
    private parent: Logger,
    private component: string
  ) {}

  debug(message: string, context?: Omit<LogContext, 'component'>) {
    this.parent.debug(message, { ...context, component: this.component })
  }

  info(message: string, context?: Omit<LogContext, 'component'>) {
    this.parent.info(message, { ...context, component: this.component })
  }

  warn(message: string, context?: Omit<LogContext, 'component'>) {
    this.parent.warn(message, { ...context, component: this.component })
  }

  error(message: string, context?: Omit<LogContext, 'component'>) {
    this.parent.error(message, { ...context, component: this.component })
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger()

/**
 * Hook to get component-specific logger
 */
export function useComponentLogger(componentName: string): ComponentLogger {
  return logger.withComponent(componentName)
}

/**
 * Log an error with full context (convenience function)
 */
export function logError(
  message: string, 
  error: Error, 
  context?: Omit<LogContext, 'error' | 'errorDetails'>
) {
  logger.error(message, {
    ...context,
    error,
    errorDetails: error.message,
  })
}

/**
 * Log an API error with request context
 */
export function logApiError(
  message: string,
  error: Error,
  requestInfo: {
    url: string
    method: string
    statusCode?: number
    response?: Record<string, unknown>
  },
  context?: Omit<LogContext, 'error' | 'requestUrl' | 'requestMethod'>
) {
  const responseData = typeof requestInfo.response === 'object' && requestInfo.response !== null
    ? requestInfo.response
    : {}
    
  logger.error(message, {
    ...context,
    category: 'api',
    error,
    errorDetails: error.message,
    requestUrl: requestInfo.url,
    requestMethod: requestInfo.method,
    errorCode: requestInfo.statusCode ? `HTTP_${requestInfo.statusCode}` : undefined,
    ...responseData,
  })
}

/**
 * Log a database error
 */
export function logDatabaseError(
  message: string,
  error: Error,
  context?: Omit<LogContext, 'error' | 'category'>
) {
  logger.error(message, {
    ...context,
    category: 'database',
    error,
    errorDetails: error.message,
  })
}

/**
 * Log an authentication error
 */
export function logAuthError(
  message: string,
  error: Error,
  context?: Omit<LogContext, 'error' | 'category'>
) {
  logger.error(message, {
    ...context,
    category: 'auth',
    severity: 'critical',
    error,
    errorDetails: error.message,
  })
}

/**
 * Log a validation error
 */
export function logValidationError(
  message: string,
  validationErrors: Record<string, string[]>,
  context?: Omit<LogContext, 'category'>
) {
  logger.warn(message, {
    ...context,
    category: 'validation',
    validationErrors,
  })
}

/**
 * Set project context for all subsequent logs
 */
export function setLogProjectId(projectId: string) {
  logger.setProjectId(projectId)
}

/**
 * Get current trace ID for correlation
 */
export function getCurrentTraceId(): string {
  return logger.getTraceId()
}
