/**
 * Performance Monitoring and SLO Tracking System
 * Monitors p95 map render times and system performance metrics
 */

const EventEmitter = require('events');
const { PerformanceObserver, performance, monitorEventLoopDelay } = require('perf_hooks');

class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      // SLO targets
      mapRenderSLO: options.mapRenderSLO || 100, // ms
      apiResponseSLO: options.apiResponseSLO || 500, // ms
      databaseQuerySLO: options.databaseQuerySLO || 200, // ms
      
      // Monitoring settings
      sampleRate: options.sampleRate || 1.0, // 100% sampling
      alertThreshold: options.alertThreshold || 0.95, // Alert if >95% SLO violations
      measurementWindow: options.measurementWindow || 300000, // 5 minutes
      
      // Retention
      metricsRetention: options.metricsRetention || 86400000, // 24 hours
    };
    
    // Metrics storage
    this.metrics = {
      mapRender: new TimeSeriesBuffer(1000),
      apiResponse: new TimeSeriesBuffer(1000),
      databaseQuery: new TimeSeriesBuffer(1000),
      systemMetrics: new TimeSeriesBuffer(1000),
      userActions: new TimeSeriesBuffer(1000)
    };
    
    // SLO tracking
    this.sloMetrics = {
      mapRender: new SLOTracker(this.config.mapRenderSLO),
      apiResponse: new SLOTracker(this.config.apiResponseSLO),
      databaseQuery: new SLOTracker(this.config.databaseQuerySLO)
    };
    
    // Performance observers
    this.observers = new Map();
    this.eventLoopMonitor = null;
    
    // Alert state
    this.alertStates = new Map();
    this.lastAlertTime = new Map();
    
    this.initializeMonitoring();
    this.startSystemMetricsCollection();
  }

  /**
   * Initialize performance monitoring
   */
  initializeMonitoring() {
    // HTTP Request monitoring
    this.createPerformanceObserver('http', (entries) => {
      entries.forEach(entry => {
        this.recordAPIResponse(entry.name, entry.duration, {
          method: entry.detail?.method,
          status: entry.detail?.status,
          route: entry.detail?.route
        });
      });
    });
    
    // Database query monitoring
    this.createPerformanceObserver('database', (entries) => {
      entries.forEach(entry => {
        this.recordDatabaseQuery(entry.name, entry.duration, {
          query: entry.detail?.query,
          table: entry.detail?.table,
          type: entry.detail?.type
        });
      });
    });
    
    // User interaction monitoring
    this.createPerformanceObserver('user', (entries) => {
      entries.forEach(entry => {
        this.recordUserAction(entry.name, entry.duration, {
          action: entry.detail?.action,
          component: entry.detail?.component
        });
      });
    });
    
    // Event loop monitoring
    this.eventLoopMonitor = monitorEventLoopDelay({ resolution: 20 });
    this.eventLoopMonitor.enable();
  }

  /**
   * Create performance observer for specific entry types
   */
  createPerformanceObserver(type, callback) {
    const observer = new PerformanceObserver(callback);
    observer.observe({ entryTypes: ['measure'] });
    this.observers.set(type, observer);
  }

  /**
   * Record map render performance
   */
  recordMapRender(renderTime, metadata = {}) {
    const timestamp = Date.now();
    
    const measurement = {
      timestamp,
      duration: renderTime,
      metadata: {
        viewport: metadata.viewport,
        flightCount: metadata.flightCount,
        zoom: metadata.zoom,
        cacheHit: metadata.cacheHit,
        ...metadata
      }
    };
    
    this.metrics.mapRender.add(measurement);
    this.sloMetrics.mapRender.record(renderTime);
    
    // Check for SLO violations
    if (renderTime > this.config.mapRenderSLO) {
      this.handleSLOViolation('mapRender', renderTime, measurement);
    }
    
    this.emit('mapRender', measurement);
  }

  /**
   * Record API response time
   */
  recordAPIResponse(endpoint, responseTime, metadata = {}) {
    const timestamp = Date.now();
    
    const measurement = {
      timestamp,
      endpoint,
      duration: responseTime,
      metadata: {
        method: metadata.method || 'GET',
        status: metadata.status || 200,
        route: metadata.route,
        userAgent: metadata.userAgent,
        ...metadata
      }
    };
    
    this.metrics.apiResponse.add(measurement);
    this.sloMetrics.apiResponse.record(responseTime);
    
    if (responseTime > this.config.apiResponseSLO) {
      this.handleSLOViolation('apiResponse', responseTime, measurement);
    }
    
    this.emit('apiResponse', measurement);
  }

  /**
   * Record database query performance
   */
  recordDatabaseQuery(query, queryTime, metadata = {}) {
    const timestamp = Date.now();
    
    const measurement = {
      timestamp,
      query,
      duration: queryTime,
      metadata: {
        table: metadata.table,
        type: metadata.type || 'SELECT',
        rowCount: metadata.rowCount,
        cacheHit: metadata.cacheHit,
        ...metadata
      }
    };
    
    this.metrics.databaseQuery.add(measurement);
    this.sloMetrics.databaseQuery.record(queryTime);
    
    if (queryTime > this.config.databaseQuerySLO) {
      this.handleSLOViolation('databaseQuery', queryTime, measurement);
    }
    
    this.emit('databaseQuery', measurement);
  }

  /**
   * Record user action performance
   */
  recordUserAction(action, duration, metadata = {}) {
    const timestamp = Date.now();
    
    const measurement = {
      timestamp,
      action,
      duration,
      metadata: {
        component: metadata.component,
        userId: metadata.userId,
        sessionId: metadata.sessionId,
        ...metadata
      }
    };
    
    this.metrics.userActions.add(measurement);
    this.emit('userAction', measurement);
  }

  /**
   * Start system metrics collection
   */
  startSystemMetricsCollection() {
    this.systemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 10000); // Every 10 seconds
  }

  /**
   * Collect system performance metrics
   */
  collectSystemMetrics() {
    const timestamp = Date.now();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const eventLoopDelay = this.eventLoopMonitor.mean / 1000000; // Convert to ms
    
    const metrics = {
      timestamp,
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      eventLoop: {
        delay: eventLoopDelay,
        utilization: this.calculateEventLoopUtilization()
      },
      gc: this.getGCMetrics()
    };
    
    this.metrics.systemMetrics.add(metrics);
    
    // Check for system performance issues
    this.checkSystemHealth(metrics);
    
    this.emit('systemMetrics', metrics);
  }

  /**
   * Calculate event loop utilization
   */
  calculateEventLoopUtilization() {
    const elu = performance.eventLoopUtilization();
    return elu.utilization;
  }

  /**
   * Get garbage collection metrics
   */
  getGCMetrics() {
    // This would require additional setup with GC performance hooks
    // For now, return placeholder data
    return {
      collections: 0,
      duration: 0,
      type: 'unknown'
    };
  }

  /**
   * Check system health against thresholds
   */
  checkSystemHealth(metrics) {
    const checks = [
      {
        name: 'highMemoryUsage',
        condition: metrics.memory.heapUsed > 1024 * 1024 * 1024, // 1GB
        severity: 'warning'
      },
      {
        name: 'highEventLoopDelay', 
        condition: metrics.eventLoop.delay > 100, // 100ms
        severity: 'critical'
      },
      {
        name: 'lowEventLoopUtilization',
        condition: metrics.eventLoop.utilization > 0.9, // 90%
        severity: 'warning'
      }
    ];
    
    checks.forEach(check => {
      if (check.condition) {
        this.handleSystemAlert(check.name, check.severity, metrics);
      }
    });
  }

  /**
   * Handle SLO violations
   */
  handleSLOViolation(metricType, value, measurement) {
    const violation = {
      type: 'slo_violation',
      metric: metricType,
      value,
      threshold: this.config[`${metricType}SLO`],
      timestamp: Date.now(),
      measurement
    };
    
    // Check if we should alert (rate limiting)
    const lastAlert = this.lastAlertTime.get(metricType) || 0;
    const alertCooldown = 60000; // 1 minute
    
    if (Date.now() - lastAlert > alertCooldown) {
      this.emit('sloViolation', violation);
      this.lastAlertTime.set(metricType, Date.now());
    }
  }

  /**
   * Handle system alerts
   */
  handleSystemAlert(alertType, severity, metrics) {
    const alert = {
      type: 'system_alert',
      alertType,
      severity,
      timestamp: Date.now(),
      metrics
    };
    
    const lastAlert = this.lastAlertTime.get(alertType) || 0;
    const alertCooldown = severity === 'critical' ? 30000 : 300000; // 30s or 5min
    
    if (Date.now() - lastAlert > alertCooldown) {
      this.emit('systemAlert', alert);
      this.lastAlertTime.set(alertType, Date.now());
    }
  }

  /**
   * Get performance summary for time window
   */
  getPerformanceSummary(windowMs = this.config.measurementWindow) {
    const now = Date.now();
    const startTime = now - windowMs;
    
    return {
      timeWindow: { start: startTime, end: now, duration: windowMs },
      mapRender: this.calculateMetricsSummary(this.metrics.mapRender, startTime),
      apiResponse: this.calculateMetricsSummary(this.metrics.apiResponse, startTime),
      databaseQuery: this.calculateMetricsSummary(this.metrics.databaseQuery, startTime),
      sloCompliance: {
        mapRender: this.sloMetrics.mapRender.getCompliance(windowMs),
        apiResponse: this.sloMetrics.apiResponse.getCompliance(windowMs),
        databaseQuery: this.sloMetrics.databaseQuery.getCompliance(windowMs)
      },
      systemHealth: this.getSystemHealthSummary(startTime)
    };
  }

  /**
   * Calculate summary statistics for metrics
   */
  calculateMetricsSummary(metricsBuffer, startTime) {
    const measurements = metricsBuffer.getRange(startTime, Date.now());
    
    if (measurements.length === 0) {
      return { count: 0 };
    }
    
    const durations = measurements.map(m => m.duration).sort((a, b) => a - b);
    
    return {
      count: measurements.length,
      min: durations[0],
      max: durations[durations.length - 1],
      avg: durations.reduce((a, b) => a + b) / durations.length,
      p50: durations[Math.floor(durations.length * 0.5)],
      p90: durations[Math.floor(durations.length * 0.9)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)]
    };
  }

  /**
   * Get system health summary
   */
  getSystemHealthSummary(startTime) {
    const systemMetrics = this.metrics.systemMetrics.getRange(startTime, Date.now());
    
    if (systemMetrics.length === 0) {
      return {};
    }
    
    const latest = systemMetrics[systemMetrics.length - 1];
    const memoryTrend = this.calculateTrend(systemMetrics.map(m => m.memory.heapUsed));
    const eventLoopDelayTrend = this.calculateTrend(systemMetrics.map(m => m.eventLoop.delay));
    
    return {
      current: {
        memoryUsage: latest.memory.heapUsed,
        eventLoopDelay: latest.eventLoop.delay,
        eventLoopUtilization: latest.eventLoop.utilization
      },
      trends: {
        memory: memoryTrend,
        eventLoopDelay: eventLoopDelayTrend
      },
      sampleCount: systemMetrics.length
    };
  }

  /**
   * Calculate trend direction for time series data
   */
  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const first = values.slice(0, Math.floor(values.length / 3));
    const last = values.slice(-Math.floor(values.length / 3));
    
    const firstAvg = first.reduce((a, b) => a + b) / first.length;
    const lastAvg = last.reduce((a, b) => a + b) / last.length;
    
    const change = (lastAvg - firstAvg) / firstAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(format = 'prometheus') {
    const summary = this.getPerformanceSummary();
    
    switch (format) {
      case 'prometheus':
        return this.exportPrometheus(summary);
      case 'json':
        return JSON.stringify(summary, null, 2);
      default:
        return summary;
    }
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(summary) {
    const lines = [];
    
    // Map render metrics
    if (summary.mapRender.count > 0) {
      lines.push(`# HELP flighttrace_map_render_duration_ms Map render duration in milliseconds`);
      lines.push(`# TYPE flighttrace_map_render_duration_ms histogram`);
      lines.push(`flighttrace_map_render_duration_ms_count ${summary.mapRender.count}`);
      lines.push(`flighttrace_map_render_duration_ms_sum ${summary.mapRender.avg * summary.mapRender.count}`);
      lines.push(`flighttrace_map_render_duration_ms{quantile="0.5"} ${summary.mapRender.p50}`);
      lines.push(`flighttrace_map_render_duration_ms{quantile="0.95"} ${summary.mapRender.p95}`);
      lines.push(`flighttrace_map_render_duration_ms{quantile="0.99"} ${summary.mapRender.p99}`);
    }
    
    // SLO compliance
    lines.push(`# HELP flighttrace_slo_compliance_ratio SLO compliance ratio`);
    lines.push(`# TYPE flighttrace_slo_compliance_ratio gauge`);
    lines.push(`flighttrace_slo_compliance_ratio{metric="map_render"} ${summary.sloCompliance.mapRender.ratio}`);
    lines.push(`flighttrace_slo_compliance_ratio{metric="api_response"} ${summary.sloCompliance.apiResponse.ratio}`);
    lines.push(`flighttrace_slo_compliance_ratio{metric="database_query"} ${summary.sloCompliance.databaseQuery.ratio}`);
    
    // System metrics
    if (summary.systemHealth.current) {
      lines.push(`# HELP flighttrace_memory_usage_bytes Memory usage in bytes`);
      lines.push(`# TYPE flighttrace_memory_usage_bytes gauge`);
      lines.push(`flighttrace_memory_usage_bytes ${summary.systemHealth.current.memoryUsage}`);
      
      lines.push(`# HELP flighttrace_event_loop_delay_ms Event loop delay in milliseconds`);
      lines.push(`# TYPE flighttrace_event_loop_delay_ms gauge`);
      lines.push(`flighttrace_event_loop_delay_ms ${summary.systemHealth.current.eventLoopDelay}`);
    }
    
    return lines.join('\n') + '\n';
  }

  /**
   * Cleanup and shutdown monitoring
   */
  shutdown() {
    // Stop intervals
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
    }
    
    // Disconnect observers
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    
    // Stop event loop monitoring
    if (this.eventLoopMonitor) {
      this.eventLoopMonitor.disable();
    }
    
    console.log('✅ Performance monitoring shutdown complete');
  }
}

/**
 * Time series buffer for storing measurements
 */
class TimeSeriesBuffer {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.data = [];
  }

  add(measurement) {
    this.data.push(measurement);
    
    if (this.data.length > this.maxSize) {
      this.data.shift();
    }
  }

  getRange(startTime, endTime) {
    return this.data.filter(m => 
      m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  clear() {
    this.data = [];
  }
}

/**
 * SLO (Service Level Objective) tracker
 */
class SLOTracker {
  constructor(threshold) {
    this.threshold = threshold;
    this.measurements = [];
    this.maxSize = 10000;
  }

  record(value) {
    const measurement = {
      value,
      timestamp: Date.now(),
      violation: value > this.threshold
    };
    
    this.measurements.push(measurement);
    
    if (this.measurements.length > this.maxSize) {
      this.measurements.shift();
    }
  }

  getCompliance(windowMs = 300000) {
    const now = Date.now();
    const startTime = now - windowMs;
    
    const windowMeasurements = this.measurements.filter(m => 
      m.timestamp >= startTime && m.timestamp <= now
    );
    
    if (windowMeasurements.length === 0) {
      return { ratio: 1.0, total: 0, violations: 0 };
    }
    
    const violations = windowMeasurements.filter(m => m.violation).length;
    const ratio = 1.0 - (violations / windowMeasurements.length);
    
    return {
      ratio,
      total: windowMeasurements.length,
      violations,
      threshold: this.threshold
    };
  }
}

module.exports = { PerformanceMonitor, TimeSeriesBuffer, SLOTracker };