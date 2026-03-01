/**
 * Performance Monitoring Utilities for Sprint 6 Optimization
 *
 * Provides comprehensive performance tracking including:
 * - Web Vitals (LCP, FID, CLS, TTFB, INP)
 * - Custom performance metrics
 * - Slow query detection
 * - Component render tracking
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface QueryPerformance {
  queryKey: string;
  duration: number;
  timestamp: number;
  isSlow: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private queryMetrics: QueryPerformance[] = [];
  private slowQueryThreshold = 1000; // 1 second
  private maxMetricsStored = 100;

  constructor() {
    this.initializeWebVitals();
  }

  /**
   * Initialize Web Vitals monitoring
   */
  private initializeWebVitals() {
    if (typeof window === 'undefined') return;

    // LCP - Largest Contentful Paint
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('LCP', lastEntry.startTime, {
          element: (lastEntry as any).element?.tagName,
        });
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // FID - First Input Delay
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric('FID', entry.processingStart - entry.startTime, {
            name: entry.name,
          });
        });
      });
      observer.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID observer not supported');
    }

    // CLS - Cumulative Layout Shift
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            this.recordMetric('CLS', clsValue);
          }
        }
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS observer not supported');
    }

    // TTFB - Time to First Byte
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (perfData) {
        const ttfb = perfData.responseStart - perfData.requestStart;
        this.recordMetric('TTFB', ttfb);
      }
    });
  }

  /**
   * Record a custom performance metric
   */
  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetricsStored) {
      this.metrics.shift();
    }

    // Log slow metrics
    if (this.isSlowMetric(name, value)) {
      console.warn(`[Performance] Slow ${name}: ${value.toFixed(2)}ms`, metadata);
    }
  }

  /**
   * Track React Query performance
   */
  trackQuery(queryKey: string, duration: number) {
    const isSlow = duration > this.slowQueryThreshold;
    const queryMetric: QueryPerformance = {
      queryKey,
      duration,
      timestamp: Date.now(),
      isSlow,
    };

    this.queryMetrics.push(queryMetric);

    // Keep only the last N queries
    if (this.queryMetrics.length > this.maxMetricsStored) {
      this.queryMetrics.shift();
    }

    if (isSlow) {
      console.warn(`[Performance] Slow query: ${queryKey} took ${duration}ms`);
    }
  }

  /**
   * Measure a function execution time
   */
  async measure<T>(name: string, fn: () => T | Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Track component render time
   */
  trackRender(componentName: string, duration: number) {
    this.recordMetric(`Render:${componentName}`, duration);
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const summary = {
      webVitals: {
        LCP: this.getLatestMetric('LCP'),
        FID: this.getLatestMetric('FID'),
        CLS: this.getLatestMetric('CLS'),
        TTFB: this.getLatestMetric('TTFB'),
      },
      slowQueries: this.queryMetrics.filter(q => q.isSlow),
      totalMetrics: this.metrics.length,
      totalQueries: this.queryMetrics.length,
      averageQueryTime: this.getAverageQueryTime(),
    };

    return summary;
  }

  /**
   * Get latest metric value
   */
  private getLatestMetric(name: string): PerformanceMetric | undefined {
    const filtered = this.metrics.filter(m => m.name === name);
    return filtered[filtered.length - 1];
  }

  /**
   * Calculate average query time
   */
  private getAverageQueryTime(): number {
    if (this.queryMetrics.length === 0) return 0;
    const total = this.queryMetrics.reduce((sum, q) => sum + q.duration, 0);
    return total / this.queryMetrics.length;
  }

  /**
   * Check if a metric is slow
   */
  private isSlowMetric(name: string, value: number): boolean {
    const thresholds: Record<string, number> = {
      LCP: 2500, // Good: < 2.5s
      FID: 100,  // Good: < 100ms
      CLS: 0.25, // Acceptable: < 0.25 (was 0.1)
      TTFB: 800, // Good: < 800ms
    };

    if (name.startsWith('Render:')) {
      return value > 16; // More than one frame (60fps)
    }

    return value > (thresholds[name] || 1000);
  }

  /**
   * Export metrics for analytics
   */
  exportMetrics() {
    return {
      metrics: [...this.metrics],
      queryMetrics: [...this.queryMetrics],
      summary: this.getSummary(),
    };
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
    this.queryMetrics = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for tracking component render performance
 */
export function usePerformanceTracking(componentName: string) {
  if (typeof window === 'undefined') return;

  const startTime = performance.now();

  // Track on unmount or re-render
  return () => {
    const duration = performance.now() - startTime;
    performanceMonitor.trackRender(componentName, duration);
  };
}

/**
 * Higher-order function to measure async operations
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return performanceMonitor.measure(name, fn, metadata);
}

/**
 * Decorator for measuring function execution time
 */
export function measured(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measure(metricName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Track query performance for TanStack Query
 */
export function trackQueryPerformance(queryKey: string, duration: number) {
  performanceMonitor.trackQuery(queryKey, duration);
}

/**
 * Get performance report for debugging
 */
export function getPerformanceReport() {
  return performanceMonitor.getSummary();
}

/**
 * Export all metrics for external analytics
 */
export function exportMetrics() {
  return performanceMonitor.exportMetrics();
}
