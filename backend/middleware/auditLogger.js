/**
 * Audit Logging System
 * Enterprise-grade logging for compliance and security
 */

const winston = require('winston');
const crypto = require('crypto');

class AuditLogger {
  constructor(options = {}) {
    this.config = {
      logLevel: options.logLevel || 'info',
      logDir: options.logDir || './logs',
      maxFileSize: options.maxFileSize || 100 * 1024 * 1024, // 100MB
      maxFiles: options.maxFiles || 30,
      enableEncryption: options.enableEncryption || false,
      encryptionKey: options.encryptionKey || process.env.AUDIT_ENCRYPTION_KEY,
      enableRemoteLogging: options.enableRemoteLogging || false,
      remoteConfig: options.remoteConfig || {}
    };

    this.logger = this.createLogger();
    this.setupEventListeners();
  }

  /**
   * Create Winston logger with enterprise features
   */
  createLogger() {
    const formats = [
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ];

    if (this.config.enableEncryption) {
      formats.push(winston.format.printf(info => {
        return this.encryptLogEntry(JSON.stringify(info));
      }));
    }

    const transports = [
      // File transport for audit logs
      new winston.transports.File({
        filename: `${this.config.logDir}/audit.log`,
        level: 'info',
        maxsize: this.config.maxFileSize,
        maxFiles: this.config.maxFiles,
        format: winston.format.combine(...formats)
      }),

      // Error-specific file
      new winston.transports.File({
        filename: `${this.config.logDir}/audit-errors.log`,
        level: 'error',
        maxsize: this.config.maxFileSize,
        maxFiles: this.config.maxFiles,
        format: winston.format.combine(...formats)
      }),

      // Security events file
      new winston.transports.File({
        filename: `${this.config.logDir}/security.log`,
        level: 'warn',
        maxsize: this.config.maxFileSize,
        maxFiles: this.config.maxFiles,
        format: winston.format.combine(...formats)
      })
    ];

    // Add console transport for development
    if (process.env.NODE_ENV !== 'production') {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      );
    }

    // Add remote logging transport if configured
    if (this.config.enableRemoteLogging) {
      // Add your remote logging service transport here
      // e.g., Datadog, Splunk, ELK stack, etc.
    }

    return winston.createLogger({
      level: this.config.logLevel,
      transports
    });
  }

  /**
   * Setup process event listeners for critical events
   */
  setupEventListeners() {
    // Log unhandled exceptions
    process.on('uncaughtException', (error) => {
      this.logSystemEvent('uncaught_exception', {
        error: error.message,
        stack: error.stack
      }, 'critical');
    });

    // Log unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logSystemEvent('unhandled_rejection', {
        reason: reason.toString(),
        promise: promise.toString()
      }, 'critical');
    });

    // Log process signals
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.on(signal, () => {
        this.logSystemEvent('process_signal', { signal }, 'info');
      });
    });
  }

  /**
   * Encrypt log entry if encryption is enabled
   */
  encryptLogEntry(data) {
    if (!this.config.enableEncryption || !this.config.encryptionKey) {
      return data;
    }

    try {
      const cipher = crypto.createCipher('aes-256-cbc', this.config.encryptionKey);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      return data; // Fallback to unencrypted
    }
  }

  /**
   * Log user authentication events
   */
  logAuthEvent(eventType, userId, metadata = {}) {
    this.logger.info({
      category: 'authentication',
      eventType,
      userId,
      timestamp: new Date().toISOString(),
      sessionId: metadata.sessionId,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      success: metadata.success,
      failureReason: metadata.failureReason,
      metadata
    });
  }

  /**
   * Log data access events
   */
  logDataAccess(userId, resourceType, resourceId, action, metadata = {}) {
    this.logger.info({
      category: 'data_access',
      userId,
      resourceType,
      resourceId,
      action, // read, write, update, delete
      timestamp: new Date().toISOString(),
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      tier: metadata.tier,
      success: metadata.success !== false,
      metadata
    });
  }

  /**
   * Log subscription and billing events
   */
  logBillingEvent(eventType, userId, metadata = {}) {
    this.logger.info({
      category: 'billing',
      eventType, // subscription_created, payment_failed, tier_changed, etc.
      userId,
      timestamp: new Date().toISOString(),
      subscriptionId: metadata.subscriptionId,
      tier: metadata.tier,
      amount: metadata.amount,
      currency: metadata.currency,
      paymentMethod: metadata.paymentMethod,
      stripeEventId: metadata.stripeEventId,
      metadata
    });
  }

  /**
   * Log security events
   */
  logSecurityEvent(eventType, severity, metadata = {}) {
    this.logger.warn({
      category: 'security',
      eventType, // rate_limit, suspicious_activity, abuse_detected, etc.
      severity, // low, medium, high, critical
      timestamp: new Date().toISOString(),
      userId: metadata.userId,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      details: metadata.details,
      blocked: metadata.blocked || false,
      metadata
    });
  }

  /**
   * Log admin actions
   */
  logAdminAction(adminUserId, action, targetUserId, metadata = {}) {
    this.logger.info({
      category: 'admin',
      adminUserId,
      action, // user_suspend, tier_change, data_export, etc.
      targetUserId,
      timestamp: new Date().toISOString(),
      ip: metadata.ip,
      reason: metadata.reason,
      oldValue: metadata.oldValue,
      newValue: metadata.newValue,
      metadata
    });
  }

  /**
   * Log API usage for billing and analytics
   */
  logAPIUsage(userId, endpoint, method, metadata = {}) {
    this.logger.info({
      category: 'api_usage',
      userId,
      endpoint,
      method,
      timestamp: new Date().toISOString(),
      responseStatus: metadata.responseStatus,
      responseTime: metadata.responseTime,
      requestSize: metadata.requestSize,
      responseSize: metadata.responseSize,
      tier: metadata.tier,
      cached: metadata.cached || false,
      rateLimited: metadata.rateLimited || false,
      metadata
    });
  }

  /**
   * Log data privacy events (GDPR compliance)
   */
  logPrivacyEvent(eventType, userId, metadata = {}) {
    this.logger.info({
      category: 'privacy',
      eventType, // data_request, data_deletion, consent_given, consent_withdrawn
      userId,
      timestamp: new Date().toISOString(),
      requestId: metadata.requestId,
      dataTypes: metadata.dataTypes, // Array of data types involved
      processingBasis: metadata.processingBasis, // Legal basis for processing
      retentionPeriod: metadata.retentionPeriod,
      automated: metadata.automated || false,
      metadata
    });
  }

  /**
   * Log system events
   */
  logSystemEvent(eventType, details, severity = 'info') {
    const logLevel = severity === 'critical' ? 'error' : 
                    severity === 'high' ? 'warn' : 'info';

    this.logger[logLevel]({
      category: 'system',
      eventType,
      severity,
      timestamp: new Date().toISOString(),
      hostname: require('os').hostname(),
      pid: process.pid,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      details
    });
  }

  /**
   * Log feature usage for analytics
   */
  logFeatureUsage(userId, feature, metadata = {}) {
    this.logger.info({
      category: 'feature_usage',
      userId,
      feature,
      timestamp: new Date().toISOString(),
      tier: metadata.tier,
      sessionId: metadata.sessionId,
      duration: metadata.duration,
      success: metadata.success !== false,
      errorCode: metadata.errorCode,
      metadata
    });
  }

  /**
   * Log compliance events
   */
  logComplianceEvent(eventType, metadata = {}) {
    this.logger.info({
      category: 'compliance',
      eventType, // data_retention_cleanup, privacy_scan, security_audit
      timestamp: new Date().toISOString(),
      automated: metadata.automated || true,
      recordsAffected: metadata.recordsAffected,
      retentionPolicy: metadata.retentionPolicy,
      policyVersion: metadata.policyVersion,
      metadata
    });
  }

  /**
   * Create audit middleware for Express
   */
  createMiddleware() {
    return (req, res, next) => {
      const start = Date.now();

      // Log request
      this.logAPIUsage(
        req.user?.id || 'anonymous',
        req.originalUrl || req.url,
        req.method,
        {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          tier: req.user?.subscription?.tier,
          requestSize: req.headers['content-length']
        }
      );

      // Capture response
      const originalSend = res.send;
      res.send = function(body) {
        const responseTime = Date.now() - start;
        
        // Log response details
        this.logAPIUsage(
          req.user?.id || 'anonymous',
          req.originalUrl || req.url,
          req.method,
          {
            responseStatus: res.statusCode,
            responseTime,
            responseSize: Buffer.byteLength(body, 'utf8'),
            tier: req.user?.subscription?.tier,
            cached: res.getHeader('x-cache-hit'),
            rateLimited: res.statusCode === 429
          }
        );

        originalSend.call(this, body);
      }.bind(this);

      next();
    };
  }

  /**
   * Query audit logs (for admin dashboard)
   */
  async queryLogs(filters = {}, limit = 100) {
    // This would integrate with your log storage system
    // For now, returning structure that shows what's available
    
    return {
      logs: [],
      pagination: {
        page: filters.page || 1,
        limit,
        total: 0
      },
      filters: {
        category: filters.category,
        userId: filters.userId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        severity: filters.severity
      }
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate, endDate) {
    return {
      period: { startDate, endDate },
      summary: {
        totalEvents: 0,
        categories: {},
        securityEvents: 0,
        privacyEvents: 0,
        dataBreaches: 0
      },
      details: {
        authentication: {},
        dataAccess: {},
        privacy: {},
        security: {}
      }
    };
  }

  /**
   * Cleanup old logs based on retention policy
   */
  async cleanupOldLogs() {
    // Implementation would clean up logs older than retention period
    const retentionDays = 365; // 1 year default
    const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
    
    this.logComplianceEvent('log_cleanup', {
      cutoffDate,
      retentionDays
    });

    return {
      cleanedUp: 0,
      cutoffDate
    };
  }
}

/**
 * Audit logging middleware factory
 */
function createAuditLogger(options = {}) {
  return new AuditLogger(options);
}

module.exports = { AuditLogger, createAuditLogger };