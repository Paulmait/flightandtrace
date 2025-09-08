/**
 * Position Update Throttling and Batching System
 * Optimized for high-frequency flight data updates at FR24 scale
 */

export class PositionThrottler {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 100;
    this.throttleInterval = options.throttleInterval || 50; // ms
    this.maxQueueSize = options.maxQueueSize || 5000;
    this.priority = options.priority || 'normal'; // 'high', 'normal', 'low'
    
    // Internal state
    this.updateQueue = new Map(); // flightId -> update data
    this.pendingUpdates = new Map(); // flightId -> timestamp
    this.isProcessing = false;
    this.lastProcessTime = 0;
    this.processCount = 0;
    this.droppedUpdates = 0;
    
    // Callbacks
    this.onBatchReady = options.onBatchReady || (() => {});
    this.onOverflow = options.onOverflow || (() => {});
    this.onError = options.onError || console.error;
    
    // Performance tracking
    this.metrics = {
      updatesReceived: 0,
      updatesProcessed: 0,
      batchesProcessed: 0,
      averageBatchSize: 0,
      averageProcessTime: 0,
      queueOverflows: 0
    };
    
    this.startThrottling();
  }

  /**
   * Queue a position update for processing
   */
  queueUpdate(flightId, updateData) {
    if (!flightId || !updateData) return false;

    this.metrics.updatesReceived++;

    // Check queue overflow
    if (this.updateQueue.size >= this.maxQueueSize) {
      this.handleOverflow(flightId, updateData);
      return false;
    }

    // Add timestamp and priority scoring
    const enrichedUpdate = {
      ...updateData,
      timestamp: Date.now(),
      flightId,
      priority: this.calculatePriority(updateData)
    };

    // Replace existing update for same flight (keep latest)
    const existingUpdate = this.updateQueue.get(flightId);
    if (existingUpdate) {
      // Merge important data but keep latest position
      enrichedUpdate.previousPosition = existingUpdate.position;
      enrichedUpdate.velocityChanged = this.detectVelocityChange(existingUpdate, enrichedUpdate);
    }

    this.updateQueue.set(flightId, enrichedUpdate);
    this.pendingUpdates.set(flightId, Date.now());

    return true;
  }

  /**
   * Calculate update priority based on flight characteristics
   */
  calculatePriority(updateData) {
    let priority = 0;
    
    // Higher altitude = higher priority (more visible)
    priority += Math.min(10, (updateData.altitude || 0) / 5000);
    
    // Higher speed = higher priority (more dynamic)
    priority += Math.min(10, (updateData.groundSpeed || 0) / 100);
    
    // Commercial flights = higher priority
    if (updateData.callsign && updateData.callsign.length > 0) {
      priority += 5;
    }
    
    // Emergency/special situations = highest priority
    if (updateData.emergency || updateData.specialCode) {
      priority += 50;
    }
    
    // Recent course changes = higher priority
    if (updateData.headingChanged || updateData.altitudeChanged) {
      priority += 15;
    }
    
    return priority;
  }

  /**
   * Detect significant velocity changes
   */
  detectVelocityChange(oldUpdate, newUpdate) {
    if (!oldUpdate.position || !newUpdate.position) return false;
    
    const speedDiff = Math.abs((newUpdate.groundSpeed || 0) - (oldUpdate.groundSpeed || 0));
    const headingDiff = Math.abs((newUpdate.heading || 0) - (oldUpdate.heading || 0));
    
    // Normalize heading difference (handle wrap-around)
    const normalizedHeadingDiff = Math.min(headingDiff, 360 - headingDiff);
    
    return speedDiff > 50 || normalizedHeadingDiff > 15; // Significant changes
  }

  /**
   * Handle queue overflow by dropping least important updates
   */
  handleOverflow(newFlightId, newUpdateData) {
    this.metrics.queueOverflows++;
    
    // Find lowest priority update to drop
    let lowestPriority = Infinity;
    let dropFlightId = null;
    
    for (const [flightId, update] of this.updateQueue.entries()) {
      if (update.priority < lowestPriority) {
        lowestPriority = update.priority;
        dropFlightId = flightId;
      }
    }
    
    // Only drop if new update has higher priority
    const newPriority = this.calculatePriority(newUpdateData);
    if (newPriority > lowestPriority) {
      this.updateQueue.delete(dropFlightId);
      this.pendingUpdates.delete(dropFlightId);
      this.droppedUpdates++;
      
      // Add new update
      this.queueUpdate(newFlightId, newUpdateData);
    } else {
      this.droppedUpdates++;
    }
    
    this.onOverflow({
      droppedFlightId: dropFlightId,
      newFlightId,
      queueSize: this.updateQueue.size,
      droppedCount: this.droppedUpdates
    });
  }

  /**
   * Start the throttling process
   */
  startThrottling() {
    if (this.throttleTimer) return;
    
    this.throttleTimer = setInterval(() => {
      this.processBatch();
    }, this.throttleInterval);
  }

  /**
   * Stop the throttling process
   */
  stopThrottling() {
    if (this.throttleTimer) {
      clearInterval(this.throttleTimer);
      this.throttleTimer = null;
    }
  }

  /**
   * Process a batch of updates
   */
  async processBatch() {
    if (this.isProcessing || this.updateQueue.size === 0) {
      return;
    }

    this.isProcessing = true;
    const startTime = performance.now();

    try {
      // Get updates sorted by priority
      const updates = Array.from(this.updateQueue.values())
        .sort((a, b) => b.priority - a.priority)
        .slice(0, this.batchSize);

      if (updates.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Remove processed updates from queue
      for (const update of updates) {
        this.updateQueue.delete(update.flightId);
        this.pendingUpdates.delete(update.flightId);
      }

      // Process the batch
      await this.onBatchReady(updates);

      // Update metrics
      const processTime = performance.now() - startTime;
      this.metrics.updatesProcessed += updates.length;
      this.metrics.batchesProcessed++;
      this.metrics.averageBatchSize = this.metrics.updatesProcessed / this.metrics.batchesProcessed;
      this.metrics.averageProcessTime = 
        (this.metrics.averageProcessTime * (this.metrics.batchesProcessed - 1) + processTime) / 
        this.metrics.batchesProcessed;

      this.lastProcessTime = performance.now();
      this.processCount++;

    } catch (error) {
      this.onError('Error processing batch:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Force process all pending updates immediately
   */
  async flushAll() {
    while (this.updateQueue.size > 0) {
      await this.processBatch();
      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueSize: this.updateQueue.size,
      pendingCount: this.pendingUpdates.size,
      isProcessing: this.isProcessing,
      droppedUpdates: this.droppedUpdates,
      lastProcessTime: this.lastProcessTime,
      processCount: this.processCount,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const now = Date.now();
    const timeSinceLastProcess = now - this.lastProcessTime;
    
    return {
      ...this.metrics,
      currentQueueSize: this.updateQueue.size,
      droppedUpdates: this.droppedUpdates,
      processingEfficiency: this.metrics.updatesReceived > 0 ? 
        (this.metrics.updatesProcessed / this.metrics.updatesReceived) * 100 : 0,
      timeSinceLastProcess,
      averageLatency: this.metrics.averageProcessTime,
      throughput: this.metrics.updatesProcessed / (now - (this.startTime || now)) * 1000
    };
  }

  /**
   * Clear all pending updates
   */
  clear() {
    this.updateQueue.clear();
    this.pendingUpdates.clear();
    this.droppedUpdates = 0;
    this.metrics = {
      updatesReceived: 0,
      updatesProcessed: 0,
      batchesProcessed: 0,
      averageBatchSize: 0,
      averageProcessTime: 0,
      queueOverflows: 0
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopThrottling();
    this.clear();
    this.onBatchReady = null;
    this.onOverflow = null;
    this.onError = null;
  }
}

/**
 * Specialized throttler for different update types
 */
export class FlightUpdateThrottler {
  constructor() {
    // High priority for emergency/critical updates
    this.criticalThrottler = new PositionThrottler({
      batchSize: 50,
      throttleInterval: 25, // 40 fps
      maxQueueSize: 1000,
      priority: 'high'
    });

    // Normal priority for regular position updates
    this.normalThrottler = new PositionThrottler({
      batchSize: 200,
      throttleInterval: 50, // 20 fps
      maxQueueSize: 3000,
      priority: 'normal'
    });

    // Low priority for static/slow-moving aircraft
    this.lowThrottler = new PositionThrottler({
      batchSize: 500,
      throttleInterval: 200, // 5 fps
      maxQueueSize: 5000,
      priority: 'low'
    });

    this.setupCallbacks();
  }

  /**
   * Setup callbacks for all throttlers
   */
  setupCallbacks() {
    const createCallback = (priority) => (updates) => {
      this.processBatchByPriority(updates, priority);
    };

    this.criticalThrottler.onBatchReady = createCallback('critical');
    this.normalThrottler.onBatchReady = createCallback('normal');
    this.lowThrottler.onBatchReady = createCallback('low');
  }

  /**
   * Route update to appropriate throttler
   */
  addUpdate(flightId, updateData) {
    const priority = this.categorizeUpdate(updateData);
    
    switch (priority) {
      case 'critical':
        return this.criticalThrottler.queueUpdate(flightId, updateData);
      case 'normal':
        return this.normalThrottler.queueUpdate(flightId, updateData);
      case 'low':
        return this.lowThrottler.queueUpdate(flightId, updateData);
      default:
        return this.normalThrottler.queueUpdate(flightId, updateData);
    }
  }

  /**
   * Categorize update priority
   */
  categorizeUpdate(updateData) {
    // Critical: Emergency, rapid altitude/speed changes
    if (updateData.emergency || 
        updateData.specialCode ||
        (updateData.verticalSpeed && Math.abs(updateData.verticalSpeed) > 2000) ||
        (updateData.groundSpeed && updateData.groundSpeed > 600)) {
      return 'critical';
    }

    // Low: Ground vehicles, slow aircraft, stationary
    if (updateData.groundSpeed < 50 || 
        updateData.altitude < 1000 ||
        updateData.onGround) {
      return 'low';
    }

    // Normal: Regular commercial/private flights
    return 'normal';
  }

  /**
   * Process batch based on priority
   */
  processBatchByPriority(updates, priority) {
    // This would integrate with your main update system
    if (this.onUpdateBatch) {
      this.onUpdateBatch(updates, priority);
    }
  }

  /**
   * Get combined metrics from all throttlers
   */
  getCombinedMetrics() {
    const critical = this.criticalThrottler.getMetrics();
    const normal = this.normalThrottler.getMetrics();
    const low = this.lowThrottler.getMetrics();

    return {
      critical,
      normal,
      low,
      total: {
        updatesReceived: critical.updatesReceived + normal.updatesReceived + low.updatesReceived,
        updatesProcessed: critical.updatesProcessed + normal.updatesProcessed + low.updatesProcessed,
        currentQueueSize: critical.currentQueueSize + normal.currentQueueSize + low.currentQueueSize,
        droppedUpdates: critical.droppedUpdates + normal.droppedUpdates + low.droppedUpdates
      }
    };
  }

  /**
   * Cleanup all throttlers
   */
  destroy() {
    this.criticalThrottler.destroy();
    this.normalThrottler.destroy();
    this.lowThrottler.destroy();
  }
}