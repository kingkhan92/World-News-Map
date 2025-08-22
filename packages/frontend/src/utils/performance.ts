// Performance monitoring and optimization utilities

interface PerformanceMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    try {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            this.recordNavigationMetrics(entry as PerformanceNavigationTiming);
          }
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            this.recordResourceMetrics(entry as PerformanceResourceTiming);
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Observe largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.recordMetric('lcp', {
            name: 'Largest Contentful Paint',
            startTime: 0,
            endTime: lastEntry.startTime,
            duration: lastEntry.startTime,
            metadata: {
              element: (lastEntry as any).element?.tagName,
              url: (lastEntry as any).url,
            },
          });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // Observe first input delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric('fid', {
            name: 'First Input Delay',
            startTime: entry.startTime,
            endTime: entry.startTime + (entry as any).processingStart,
            duration: (entry as any).processingStart,
            metadata: {
              eventType: (entry as any).name,
            },
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (error) {
      console.warn('Performance observers not supported:', error);
    }
  }

  /**
   * Record navigation metrics
   */
  private recordNavigationMetrics(entry: PerformanceNavigationTiming) {
    const metrics = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      ssl: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
      ttfb: entry.responseStart - entry.requestStart,
      download: entry.responseEnd - entry.responseStart,
      domParse: entry.domContentLoadedEventStart - entry.responseEnd,
      domReady: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      total: entry.loadEventEnd - entry.navigationStart,
    };

    this.recordMetric('navigation', {
      name: 'Navigation Timing',
      startTime: entry.navigationStart,
      endTime: entry.loadEventEnd,
      duration: metrics.total,
      metadata: metrics,
    });
  }

  /**
   * Record resource metrics
   */
  private recordResourceMetrics(entry: PerformanceResourceTiming) {
    // Only track significant resources
    if (entry.duration < 10) return;

    const resourceType = this.getResourceType(entry.name);
    const metrics = {
      type: resourceType,
      size: entry.transferSize || 0,
      duration: entry.duration,
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      ssl: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
      ttfb: entry.responseStart - entry.requestStart,
      download: entry.responseEnd - entry.responseStart,
    };

    this.recordMetric(`resource-${resourceType}`, {
      name: `Resource: ${entry.name}`,
      startTime: entry.startTime,
      endTime: entry.responseEnd,
      duration: entry.duration,
      metadata: metrics,
    });
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  /**
   * Start timing a custom metric
   */
  startTiming(name: string, metadata?: Record<string, any>): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * End timing a custom metric
   */
  endTiming(name: string, additionalMetadata?: Record<string, any>): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`No timing started for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    const updatedMetric: PerformanceMetrics = {
      ...metric,
      endTime,
      duration,
      metadata: {
        ...metric.metadata,
        ...additionalMetadata,
      },
    };

    this.metrics.set(name, updatedMetric);
    return duration;
  }

  /**
   * Record a metric directly
   */
  recordMetric(name: string, metric: PerformanceMetrics): void {
    this.metrics.set(name, metric);
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get specific metric
   */
  getMetric(name: string): PerformanceMetrics | undefined {
    return this.metrics.get(name);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    navigation?: PerformanceMetrics;
    lcp?: PerformanceMetrics;
    fid?: PerformanceMetrics;
    resources: {
      scripts: number;
      stylesheets: number;
      images: number;
      api: number;
      other: number;
    };
    customMetrics: PerformanceMetrics[];
  } {
    const metrics = this.getMetrics();
    const resources = {
      scripts: 0,
      stylesheets: 0,
      images: 0,
      api: 0,
      other: 0,
    };

    const customMetrics: PerformanceMetrics[] = [];

    metrics.forEach((metric) => {
      if (metric.name.startsWith('Resource:')) {
        const type = metric.metadata?.type;
        if (type && type in resources) {
          resources[type as keyof typeof resources]++;
        }
      } else if (!['navigation', 'lcp', 'fid'].includes(metric.name)) {
        customMetrics.push(metric);
      }
    });

    return {
      navigation: this.getMetric('navigation'),
      lcp: this.getMetric('lcp'),
      fid: this.getMetric('fid'),
      resources,
      customMetrics,
    };
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers = [];
    this.clearMetrics();
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const startTiming = React.useCallback((name: string, metadata?: Record<string, any>) => {
    performanceMonitor.startTiming(name, metadata);
  }, []);

  const endTiming = React.useCallback((name: string, metadata?: Record<string, any>) => {
    return performanceMonitor.endTiming(name, metadata);
  }, []);

  const getMetrics = React.useCallback(() => {
    return performanceMonitor.getMetrics();
  }, []);

  const getSummary = React.useCallback(() => {
    return performanceMonitor.getSummary();
  }, []);

  return {
    startTiming,
    endTiming,
    getMetrics,
    getSummary,
  };
}

// Higher-order component for measuring component render time
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const PerformanceMonitoredComponent: React.FC<P> = (props) => {
    const renderStartRef = React.useRef<number>(0);

    React.useLayoutEffect(() => {
      renderStartRef.current = performance.now();
    });

    React.useLayoutEffect(() => {
      const renderTime = performance.now() - renderStartRef.current;
      performanceMonitor.recordMetric(`render-${displayName}`, {
        name: `Render: ${displayName}`,
        startTime: renderStartRef.current,
        endTime: performance.now(),
        duration: renderTime,
        metadata: {
          componentName: displayName,
          propsCount: Object.keys(props || {}).length,
        },
      });
    });

    return <WrappedComponent {...props} />;
  };

  PerformanceMonitoredComponent.displayName = `withPerformanceMonitoring(${displayName})`;
  return PerformanceMonitoredComponent;
}

// Utility functions
export const performanceUtils = {
  /**
   * Measure function execution time
   */
  measureFunction: <T extends (...args: any[]) => any>(
    fn: T,
    name?: string
  ): T => {
    return ((...args: Parameters<T>) => {
      const functionName = name || fn.name || 'anonymous';
      performanceMonitor.startTiming(`function-${functionName}`);
      
      try {
        const result = fn(...args);
        
        // Handle promises
        if (result && typeof result.then === 'function') {
          return result.finally(() => {
            performanceMonitor.endTiming(`function-${functionName}`);
          });
        }
        
        performanceMonitor.endTiming(`function-${functionName}`);
        return result;
      } catch (error) {
        performanceMonitor.endTiming(`function-${functionName}`, { error: true });
        throw error;
      }
    }) as T;
  },

  /**
   * Debounce function for performance
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): T => {
    let timeout: NodeJS.Timeout;
    
    return ((...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    }) as T;
  },

  /**
   * Throttle function for performance
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): T => {
    let inThrottle: boolean;
    
    return ((...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    }) as T;
  },

  /**
   * Check if device has good performance characteristics
   */
  isHighPerformanceDevice: (): boolean => {
    if (typeof navigator === 'undefined') return true;
    
    // Check for hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 1;
    
    // Check for device memory (if available)
    const memory = (navigator as any).deviceMemory || 4;
    
    // Check for connection speed
    const connection = (navigator as any).connection;
    const effectiveType = connection?.effectiveType || '4g';
    
    return cores >= 4 && memory >= 4 && ['4g', '5g'].includes(effectiveType);
  },

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations: (): string[] => {
    const recommendations: string[] = [];
    const summary = performanceMonitor.getSummary();
    
    // Check LCP
    if (summary.lcp && summary.lcp.duration && summary.lcp.duration > 2500) {
      recommendations.push('Largest Contentful Paint is slow. Consider optimizing images and critical resources.');
    }
    
    // Check FID
    if (summary.fid && summary.fid.duration && summary.fid.duration > 100) {
      recommendations.push('First Input Delay is high. Consider reducing JavaScript execution time.');
    }
    
    // Check resource counts
    if (summary.resources.scripts > 10) {
      recommendations.push('Too many script resources. Consider bundling or code splitting.');
    }
    
    if (summary.resources.images > 20) {
      recommendations.push('Many image resources detected. Consider lazy loading and image optimization.');
    }
    
    return recommendations;
  },
};

// Import React for hooks
import React from 'react';