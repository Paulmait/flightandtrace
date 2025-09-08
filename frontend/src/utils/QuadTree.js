/**
 * Spatial indexing with QuadTree for efficient hit-testing
 * Optimized for FlightRadar24-scale aircraft tracking
 */

export class QuadTree {
  constructor(bounds, capacity = 10, maxDepth = 8, depth = 0) {
    this.bounds = bounds; // { x, y, width, height }
    this.capacity = capacity;
    this.maxDepth = maxDepth;
    this.depth = depth;
    this.points = [];
    this.divided = false;
    
    // Child quadrants
    this.northwest = null;
    this.northeast = null;
    this.southwest = null;
    this.southeast = null;
  }

  /**
   * Insert a point into the quadtree
   */
  insert(point) {
    if (!this.contains(point)) {
      return false;
    }

    if (this.points.length < this.capacity && !this.divided) {
      this.points.push(point);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return (
      this.northwest.insert(point) ||
      this.northeast.insert(point) ||
      this.southwest.insert(point) ||
      this.southeast.insert(point)
    );
  }

  /**
   * Check if point is within bounds
   */
  contains(point) {
    return (
      point.x >= this.bounds.x &&
      point.x < this.bounds.x + this.bounds.width &&
      point.y >= this.bounds.y &&
      point.y < this.bounds.y + this.bounds.height
    );
  }

  /**
   * Check if range intersects with bounds
   */
  intersects(range) {
    return !(
      range.x > this.bounds.x + this.bounds.width ||
      range.x + range.width < this.bounds.x ||
      range.y > this.bounds.y + this.bounds.height ||
      range.y + range.height < this.bounds.y
    );
  }

  /**
   * Subdivide into four quadrants
   */
  subdivide() {
    if (this.depth >= this.maxDepth) {
      return;
    }

    const x = this.bounds.x;
    const y = this.bounds.y;
    const w = this.bounds.width / 2;
    const h = this.bounds.height / 2;

    this.northwest = new QuadTree(
      { x, y, width: w, height: h },
      this.capacity,
      this.maxDepth,
      this.depth + 1
    );

    this.northeast = new QuadTree(
      { x: x + w, y, width: w, height: h },
      this.capacity,
      this.maxDepth,
      this.depth + 1
    );

    this.southwest = new QuadTree(
      { x, y: y + h, width: w, height: h },
      this.capacity,
      this.maxDepth,
      this.depth + 1
    );

    this.southeast = new QuadTree(
      { x: x + w, y: y + h, width: w, height: h },
      this.capacity,
      this.maxDepth,
      this.depth + 1
    );

    this.divided = true;

    // Redistribute existing points
    for (const point of this.points) {
      this.northwest.insert(point) ||
      this.northeast.insert(point) ||
      this.southwest.insert(point) ||
      this.southeast.insert(point);
    }

    this.points = [];
  }

  /**
   * Query points within a range
   */
  query(range, found = []) {
    if (!this.intersects(range)) {
      return found;
    }

    // Check points in current node
    for (const point of this.points) {
      if (this.pointInRange(point, range)) {
        found.push(point);
      }
    }

    // Query children if divided
    if (this.divided) {
      this.northwest.query(range, found);
      this.northeast.query(range, found);
      this.southwest.query(range, found);
      this.southeast.query(range, found);
    }

    return found;
  }

  /**
   * Check if point is within query range
   */
  pointInRange(point, range) {
    return (
      point.x >= range.x &&
      point.x <= range.x + range.width &&
      point.y >= range.y &&
      point.y <= range.y + range.height
    );
  }

  /**
   * Find closest point to given coordinates
   */
  findClosest(x, y, maxDistance = Infinity) {
    let closest = null;
    let closestDistance = maxDistance;

    const searchRange = {
      x: x - maxDistance,
      y: y - maxDistance,
      width: maxDistance * 2,
      height: maxDistance * 2
    };

    const candidates = this.query(searchRange);

    for (const point of candidates) {
      const distance = Math.sqrt(
        Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)
      );

      if (distance < closestDistance) {
        closest = point;
        closestDistance = distance;
      }
    }

    return { point: closest, distance: closestDistance };
  }

  /**
   * Clear all points from the tree
   */
  clear() {
    this.points = [];
    this.divided = false;
    this.northwest = null;
    this.northeast = null;
    this.southwest = null;
    this.southeast = null;
  }

  /**
   * Get total number of points in tree
   */
  size() {
    let count = this.points.length;

    if (this.divided) {
      count += this.northwest.size();
      count += this.northeast.size();
      count += this.southwest.size();
      count += this.southeast.size();
    }

    return count;
  }

  /**
   * Get tree statistics for debugging
   */
  getStats() {
    const stats = {
      totalPoints: this.size(),
      depth: this.depth,
      maxDepth: this.maxDepth,
      capacity: this.capacity,
      nodeCount: 1
    };

    if (this.divided) {
      const childStats = [
        this.northwest.getStats(),
        this.northeast.getStats(),
        this.southwest.getStats(),
        this.southeast.getStats()
      ];

      stats.nodeCount += childStats.reduce((sum, child) => sum + child.nodeCount, 0);
      stats.maxDepth = Math.max(...childStats.map(child => child.maxDepth));
    }

    return stats;
  }
}

/**
 * Specialized QuadTree for flight symbols with aircraft-specific optimizations
 */
export class FlightQuadTree extends QuadTree {
  constructor(bounds, capacity = 20, maxDepth = 10) {
    super(bounds, capacity, maxDepth);
    this.lastUpdate = performance.now();
    this.updateCount = 0;
  }

  /**
   * Insert flight symbol with metadata
   */
  insertFlight(flight) {
    if (!flight.position || !flight.position.x || !flight.position.y) {
      return false;
    }

    const point = {
      x: flight.position.x,
      y: flight.position.y,
      flight: flight,
      altitude: flight.flight?.altitude || 0,
      speed: flight.flight?.speed || 0,
      callsign: flight.flight?.callsign || flight.id,
      timestamp: Date.now()
    };

    return this.insert(point);
  }

  /**
   * Batch update flights for better performance
   */
  batchUpdate(flights) {
    const startTime = performance.now();
    
    // Clear existing data
    this.clear();

    // Insert all flights
    let insertedCount = 0;
    for (const flight of flights) {
      if (this.insertFlight(flight)) {
        insertedCount++;
      }
    }

    const updateTime = performance.now() - startTime;
    this.lastUpdate = performance.now();
    this.updateCount++;

    return {
      inserted: insertedCount,
      total: flights.length,
      updateTime,
      performance: insertedCount / updateTime * 1000 // insertions per second
    };
  }

  /**
   * Find flights within screen coordinates for hit testing
   */
  findFlightsAt(screenX, screenY, hitRadius = 15) {
    const range = {
      x: screenX - hitRadius,
      y: screenY - hitRadius,
      width: hitRadius * 2,
      height: hitRadius * 2
    };

    const candidates = this.query(range);
    
    // Sort by distance and altitude for proper selection priority
    return candidates
      .map(point => ({
        ...point,
        distance: Math.sqrt(
          Math.pow(point.x - screenX, 2) + 
          Math.pow(point.y - screenY, 2)
        )
      }))
      .filter(point => point.distance <= hitRadius)
      .sort((a, b) => {
        // Prioritize by distance first, then altitude
        if (Math.abs(a.distance - b.distance) < 5) {
          return b.altitude - a.altitude;
        }
        return a.distance - b.distance;
      });
  }

  /**
   * Get flights within viewport bounds
   */
  getVisibleFlights(viewport) {
    const range = {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height
    };

    return this.query(range).map(point => point.flight);
  }

  /**
   * Find flights by altitude range
   */
  findFlightsByAltitude(minAlt, maxAlt) {
    const allPoints = this.query({
      x: 0,
      y: 0,
      width: this.bounds.width,
      height: this.bounds.height
    });

    return allPoints
      .filter(point => {
        const alt = point.altitude || 0;
        return alt >= minAlt && alt <= maxAlt;
      })
      .map(point => point.flight);
  }

  /**
   * Performance monitoring
   */
  getPerformanceMetrics() {
    const stats = this.getStats();
    const timeSinceUpdate = performance.now() - this.lastUpdate;

    return {
      ...stats,
      updateCount: this.updateCount,
      timeSinceLastUpdate: timeSinceUpdate,
      averagePointsPerNode: stats.totalPoints / stats.nodeCount,
      efficiency: stats.totalPoints > 0 ? stats.nodeCount / stats.totalPoints : 0
    };
  }
}