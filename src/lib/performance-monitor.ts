/**
 * Performance Monitoring System for HelloChicago
 *
 * This module provides comprehensive performance monitoring capabilities
 * including database query monitoring, page load performance, and error tracking.
 */

import { supabase } from './supabase';

// Performance metrics interface
export interface PerformanceMetrics {
  timestamp: number;
  type: 'page_load' | 'api_call' | 'database_query' | 'component_render';
  name: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

// Error tracking interface
export interface ErrorMetrics {
  timestamp: number;
  error: string;
  stack?: string;
  component?: string;
  userAgent?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

// Database performance interface
export interface DatabaseMetrics {
  timestamp: number;
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  duration: number;
  rowCount?: number;
  query?: string;
}

// パフォーマンス監視の設定
const PERFORMANCE_CONFIG = {
  // モバイル対応の設定
  isMobile:
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ),

  // モバイルではより厳しい閾値
  thresholds: {
    mobile: {
      pageLoad: 3000, // 3秒
      apiResponse: 2000, // 2秒
      cacheHit: 100, // 100ms
      memoryUsage: 50 * 1024 * 1024, // 50MB
    },
    desktop: {
      pageLoad: 5000, // 5秒
      apiResponse: 3000, // 3秒
      cacheHit: 200, // 200ms
      memoryUsage: 100 * 1024 * 1024, // 100MB
    },
  },

  // モバイルではより頻繁な監視
  monitoringInterval:
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
      ? 10000
      : 30000, // モバイル: 10秒、デスクトップ: 30秒
};

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private errors: ErrorMetrics[] = [];
  private dbMetrics: DatabaseMetrics[] = [];
  private isEnabled: boolean = true;
  private maxMetrics: number = 1000;
  private flushInterval: number = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  // モバイルデバイス判定
  private isMobile: boolean = false;

  constructor() {
    this.startPeriodicFlush();
    this.setupGlobalErrorHandling();
    this.setupPerformanceObserver();

    // モバイルデバイス判定
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // モバイルでは監視頻度を調整
    if (this.isMobile) {
      this.maxMetrics = 500; // メトリクス数を削減
      this.flushInterval = 60000; // フラッシュ間隔を1分に延長
    }
  }

  /**
   * Start periodic flushing of metrics to the server
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);
  }

  /**
   * Setup global error handling
   */
  private setupGlobalErrorHandling(): void {
    window.addEventListener('error', event => {
      this.trackError(event.error || event.message, event.error?.stack);
    });

    window.addEventListener('unhandledrejection', event => {
      this.trackError(
        event.reason?.message || 'Unhandled Promise Rejection',
        event.reason?.stack
      );
    });
  }

  /**
   * Setup performance observer for navigation timing
   */
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        const navigationObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.trackPageLoad({
                name: window.location.pathname,
                duration: navEntry.loadEventEnd - navEntry.loadEventStart,
                metadata: {
                  domContentLoaded:
                    navEntry.domContentLoadedEventEnd -
                    navEntry.domContentLoadedEventStart,
                  firstPaint: navEntry.loadEventEnd - navEntry.fetchStart,
                  totalTime: navEntry.loadEventEnd - navEntry.fetchStart,
                },
              });
            }
          }
        });

        navigationObserver.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('PerformanceObserver setup failed:', error);
      }
    }
  }

  /**
   * Track page load performance
   */
  trackPageLoad(data: {
    name: string;
    duration: number;
    metadata?: Record<string, unknown>;
  }): void {
    if (!this.isEnabled) return;

    this.metrics.push({
      timestamp: Date.now(),
      type: 'page_load',
      name: data.name,
      duration: data.duration,
      metadata: data.metadata,
    });

    this.checkMetricsLimit();
  }

  /**
   * Track API call performance
   */
  trackApiCall(
    name: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.isEnabled) return;

    this.metrics.push({
      timestamp: Date.now(),
      type: 'api_call',
      name,
      duration,
      metadata,
    });

    this.checkMetricsLimit();
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(data: {
    table: string;
    operation: string;
    duration: number;
    rowCount?: number;
    query?: string;
  }): void {
    if (!this.isEnabled) return;

    this.dbMetrics.push({
      timestamp: Date.now(),
      table: data.table,
      operation: data.operation as 'select' | 'insert' | 'update' | 'delete',
      duration: data.duration,
      rowCount: data.rowCount,
      query: data.query,
    });

    this.checkMetricsLimit();
  }

  /**
   * Track component render performance
   */
  trackComponentRender(
    componentName: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.isEnabled) return;

    this.metrics.push({
      timestamp: Date.now(),
      type: 'component_render',
      name: componentName,
      duration,
      metadata,
    });

    this.checkMetricsLimit();
  }

  /**
   * Track error occurrence
   */
  trackError(
    error: string,
    stack?: string,
    component?: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.isEnabled) return;

    this.errors.push({
      timestamp: Date.now(),
      error,
      stack,
      component,
      userAgent: navigator.userAgent,
      url: window.location.href,
      metadata,
    });

    this.checkMetricsLimit();
  }

  /**
   * Track performance metric
   */
  trackMetric(
    type: PerformanceMetrics['type'],
    name: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.isEnabled) return;

    // モバイルでは軽量なメトリクスのみ収集
    if (this.isMobile && type === 'component_render') {
      // コンポーネントレンダリングはモバイルでは制限
      if (duration < 100) return; // 100ms未満は記録しない
    }

    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      type,
      name,
      duration,
      metadata,
    };

    this.metrics.push(metric);
    this.checkMetricsLimit();
  }

  /**
   * Check if metrics arrays exceed limits
   */
  private checkMetricsLimit(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2);
    }
    if (this.errors.length > this.maxMetrics) {
      this.errors = this.errors.slice(-this.maxMetrics / 2);
    }
    if (this.dbMetrics.length > this.maxMetrics) {
      this.dbMetrics = this.dbMetrics.slice(-this.maxMetrics / 2);
    }
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary(): {
    totalMetrics: number;
    totalErrors: number;
    totalDbMetrics: number;
    averagePageLoad: number;
    averageApiCall: number;
    errorRate: number;
  } {
    const pageLoads = this.metrics.filter(m => m.type === 'page_load');
    const apiCalls = this.metrics.filter(m => m.type === 'api_call');

    const averagePageLoad =
      pageLoads.length > 0
        ? pageLoads.reduce((sum, m) => sum + m.duration, 0) / pageLoads.length
        : 0;

    const averageApiCall =
      apiCalls.length > 0
        ? apiCalls.reduce((sum, m) => sum + m.duration, 0) / apiCalls.length
        : 0;

    const totalRequests = pageLoads.length + apiCalls.length;
    const errorRate =
      totalRequests > 0 ? (this.errors.length / totalRequests) * 100 : 0;

    return {
      totalMetrics: this.metrics.length,
      totalErrors: this.errors.length,
      totalDbMetrics: this.dbMetrics.length,
      averagePageLoad,
      averageApiCall,
      errorRate,
    };
  }

  /**
   * Flush metrics to the server
   */
  private async flushMetrics(): Promise<void> {
    if (
      this.metrics.length === 0 &&
      this.errors.length === 0 &&
      this.dbMetrics.length === 0
    ) {
      return;
    }

    try {
      const metricsToSend = [...this.metrics];
      const errorsToSend = [...this.errors];
      const dbMetricsToSend = [...this.dbMetrics];

      // Clear local arrays
      this.metrics = [];
      this.errors = [];
      this.dbMetrics = [];

      // Send to server (if configured)
      if (process.env.NODE_ENV === 'production') {
        await this.sendMetricsToServer({
          metrics: metricsToSend,
          errors: errorsToSend,
          dbMetrics: dbMetricsToSend,
        });
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group('Performance Metrics Flushed');
        console.log('Performance Metrics:', metricsToSend.length);
        console.log('Errors:', errorsToSend.length);
        console.log('Database Metrics:', dbMetricsToSend.length);
        console.groupEnd();
      }
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Restore metrics on failure
      this.metrics.unshift(...this.metrics);
      this.errors.unshift(...this.errors);
      this.dbMetrics.unshift(...this.dbMetrics);
    }
  }

  /**
   * Send metrics to server
   */
  private async sendMetricsToServer(data: {
    metrics: PerformanceMetrics[];
    errors: ErrorMetrics[];
    dbMetrics: DatabaseMetrics[];
  }): Promise<void> {
    try {
      // Store in local storage as backup
      const backupKey = `performance_metrics_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(data));

      // Send to Supabase (if table exists)
      const { error } = await supabase.from('performance_metrics').insert({
        timestamp: new Date().toISOString(),
        metrics: data.metrics,
        errors: data.errors,
        db_metrics: data.dbMetrics,
      });

      if (error) {
        console.warn('Failed to store metrics in database:', error);
      }

      // Clean up old backups (keep last 10)
      this.cleanupOldBackups();
    } catch (error) {
      console.error('Failed to send metrics to server:', error);
    }
  }

  /**
   * Clean up old backup metrics
   */
  private cleanupOldBackups(): void {
    const keys = Object.keys(localStorage).filter(key =>
      key.startsWith('performance_metrics_')
    );
    if (keys.length > 10) {
      keys
        .sort()
        .slice(0, keys.length - 10)
        .forEach(key => localStorage.removeItem(key));
    }
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get monitoring status
   */
  isMonitoringEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Manual flush of metrics
   */
  async flush(): Promise<void> {
    await this.flushMetrics();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushMetrics();
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export convenience functions
export const trackPageLoad = (data: {
  name: string;
  duration: number;
  metadata?: Record<string, unknown>;
}) => {
  performanceMonitor.trackPageLoad(data);
};

export const trackApiCall = (
  name: string,
  duration: number,
  metadata?: Record<string, unknown>
) => {
  performanceMonitor.trackApiCall(name, duration, metadata);
};

export const trackDatabaseQuery = (data: {
  table: string;
  operation: string;
  duration: number;
  rowCount?: number;
  query?: string;
}) => {
  performanceMonitor.trackDatabaseQuery(data);
};

export const trackComponentRender = (
  componentName: string,
  duration: number,
  metadata?: Record<string, unknown>
) => {
  performanceMonitor.trackComponentRender(componentName, duration, metadata);
};

export const trackError = (
  error: string,
  stack?: string,
  component?: string,
  metadata?: Record<string, unknown>
) => {
  performanceMonitor.trackError(error, stack, component, metadata);
};

export const getPerformanceSummary = () =>
  performanceMonitor.getPerformanceSummary();

// Auto-cleanup on page unload
window.addEventListener('beforeunload', () => {
  performanceMonitor.destroy();
});

export { PerformanceMonitor };
export default performanceMonitor;
