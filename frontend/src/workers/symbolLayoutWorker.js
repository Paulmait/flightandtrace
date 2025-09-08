/**
 * Web Worker for Flight Symbol Layout Processing
 * Handles heavy computation off the main thread for smooth UX
 */

class SymbolLayoutWorker {
  constructor() {
    this.aircraftSymbols = new Map();
    this.labelCache = new Map();
    this.collisionTree = null;
    
    // Performance counters
    this.processedCount = 0;
    this.lastProcessTime = 0;
  }

  /**
   * Process flight data for symbol layout
   */
  processFlightData(flights, viewport, zoom) {
    const startTime = performance.now();
    
    const visibleFlights = this.filterVisibleFlights(flights, viewport, zoom);
    const layoutedSymbols = this.calculateSymbolLayout(visibleFlights, viewport, zoom);
    const optimizedLabels = this.optimizeLabelPlacement(layoutedSymbols, viewport);
    
    const processTime = performance.now() - startTime;
    this.lastProcessTime = processTime;
    this.processedCount += flights.length;

    return {
      symbols: layoutedSymbols,
      labels: optimizedLabels,
      stats: {
        totalFlights: flights.length,
        visibleFlights: visibleFlights.length,
        processTime,
        symbolsPerSecond: Math.round(flights.length / (processTime / 1000))
      }
    };
  }

  /**
   * Filter flights visible in current viewport
   */
  filterVisibleFlights(flights, viewport, zoom) {
    const { bounds, width, height } = viewport;
    const buffer = this.getViewportBuffer(zoom);
    
    const extendedBounds = {
      north: bounds.north + buffer,
      south: bounds.south - buffer,
      east: bounds.east + buffer,
      west: bounds.west - buffer
    };

    return flights.filter(flight => {
      if (!flight.position) return false;
      
      const { latitude, longitude } = flight.position;
      
      return latitude >= extendedBounds.south &&
             latitude <= extendedBounds.north &&
             longitude >= extendedBounds.west &&
             longitude <= extendedBounds.east;
    });
  }

  /**
   * Calculate symbol layout with collision detection
   */
  calculateSymbolLayout(flights, viewport, zoom) {
    const symbols = [];
    const collisionMap = new Map();
    
    // Sort by priority (altitude, then speed)
    const sortedFlights = flights.sort((a, b) => {
      const altDiff = (b.position?.altitude || 0) - (a.position?.altitude || 0);
      if (altDiff !== 0) return altDiff;
      return (b.position?.groundSpeed || 0) - (a.position?.groundSpeed || 0);
    });

    for (const flight of sortedFlights) {
      const symbol = this.createFlightSymbol(flight, viewport, zoom);
      
      if (symbol && this.checkSymbolCollision(symbol, collisionMap, zoom)) {
        symbols.push(symbol);
        this.addToCollisionMap(symbol, collisionMap);
      }
    }

    return symbols;
  }

  /**
   * Create flight symbol with proper positioning
   */
  createFlightSymbol(flight, viewport, zoom) {
    const { position } = flight;
    if (!position) return null;

    const screenPos = this.latLngToScreen(
      position.latitude, 
      position.longitude, 
      viewport
    );

    // Skip if outside screen bounds
    if (screenPos.x < -50 || screenPos.x > viewport.width + 50 ||
        screenPos.y < -50 || screenPos.y > viewport.height + 50) {
      return null;
    }

    const symbolSize = this.getSymbolSize(zoom, position.altitude);
    const rotation = position.heading || 0;
    
    return {
      id: flight.id,
      type: 'aircraft',
      position: screenPos,
      size: symbolSize,
      rotation,
      flight: {
        callsign: flight.callsign,
        altitude: position.altitude,
        speed: position.groundSpeed,
        registration: flight.registration
      },
      bounds: {
        left: screenPos.x - symbolSize.width / 2,
        right: screenPos.x + symbolSize.width / 2,
        top: screenPos.y - symbolSize.height / 2,
        bottom: screenPos.y + symbolSize.height / 2
      }
    };
  }

  /**
   * Optimize label placement to avoid overlaps
   */
  optimizeLabelPlacement(symbols, viewport) {
    const labels = [];
    const labelGrid = this.createLabelGrid(viewport);
    
    // Sort symbols by importance for label priority
    const sortedSymbols = symbols.sort((a, b) => {
      const aImportance = this.getSymbolImportance(a);
      const bImportance = this.getSymbolImportance(b);
      return bImportance - aImportance;
    });

    for (const symbol of sortedSymbols) {
      const label = this.createOptimalLabel(symbol, labelGrid);
      if (label) {
        labels.push(label);
        this.markLabelArea(label, labelGrid);
      }
    }

    return labels;
  }

  /**
   * Check for symbol collisions
   */
  checkSymbolCollision(symbol, collisionMap, zoom) {
    const minDistance = this.getMinSymbolDistance(zoom);
    const gridKey = this.getGridKey(symbol.position, minDistance);
    
    // Check current and adjacent grid cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const checkKey = `${gridKey.x + dx},${gridKey.y + dy}`;
        const nearbySymbols = collisionMap.get(checkKey) || [];
        
        for (const nearby of nearbySymbols) {
          const distance = this.calculateDistance(symbol.position, nearby.position);
          if (distance < minDistance) {
            return false; // Collision detected
          }
        }
      }
    }
    
    return true; // No collision
  }

  /**
   * Add symbol to collision detection map
   */
  addToCollisionMap(symbol, collisionMap) {
    const minDistance = 20; // pixels
    const gridKey = this.getGridKey(symbol.position, minDistance);
    const key = `${gridKey.x},${gridKey.y}`;
    
    if (!collisionMap.has(key)) {
      collisionMap.set(key, []);
    }
    collisionMap.get(key).push(symbol);
  }

  /**
   * Utility functions
   */
  latLngToScreen(lat, lng, viewport) {
    // Web Mercator projection
    const { bounds, width, height } = viewport;
    
    const x = ((lng - bounds.west) / (bounds.east - bounds.west)) * width;
    const y = ((bounds.north - lat) / (bounds.north - bounds.south)) * height;
    
    return { x, y };
  }

  getSymbolSize(zoom, altitude) {
    const baseSize = Math.max(8, Math.min(24, zoom * 2));
    const altitudeFactor = Math.min(1.5, 1 + (altitude || 0) / 50000);
    
    return {
      width: Math.round(baseSize * altitudeFactor),
      height: Math.round(baseSize * altitudeFactor * 0.8)
    };
  }

  getViewportBuffer(zoom) {
    // Larger buffer for lower zoom levels
    return Math.max(0.1, 1.0 / Math.max(1, zoom - 2));
  }

  getMinSymbolDistance(zoom) {
    // Closer symbols allowed at higher zoom
    return Math.max(15, 40 - zoom * 3);
  }

  getSymbolImportance(symbol) {
    let importance = 0;
    
    // Higher altitude = higher importance
    importance += (symbol.flight.altitude || 0) / 1000;
    
    // Higher speed = higher importance
    importance += (symbol.flight.speed || 0) / 100;
    
    // Commercial flights (with callsigns) = higher importance
    if (symbol.flight.callsign && symbol.flight.callsign.length > 0) {
      importance += 10;
    }
    
    return importance;
  }

  getGridKey(position, gridSize) {
    return {
      x: Math.floor(position.x / gridSize),
      y: Math.floor(position.y / gridSize)
    };
  }

  calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  createLabelGrid(viewport) {
    const cellSize = 100; // pixels
    return {
      width: Math.ceil(viewport.width / cellSize),
      height: Math.ceil(viewport.height / cellSize),
      cellSize,
      occupied: new Set()
    };
  }

  createOptimalLabel(symbol, labelGrid) {
    const text = symbol.flight.callsign || symbol.flight.registration || symbol.id;
    if (!text) return null;

    const positions = [
      { x: 25, y: -10 }, // Top right
      { x: -25, y: -10 }, // Top left
      { x: 25, y: 20 },   // Bottom right
      { x: -25, y: 20 }   // Bottom left
    ];

    for (const offset of positions) {
      const labelPos = {
        x: symbol.position.x + offset.x,
        y: symbol.position.y + offset.y
      };

      if (this.canPlaceLabel(labelPos, text, labelGrid)) {
        return {
          text,
          position: labelPos,
          symbolId: symbol.id,
          bounds: this.getLabelBounds(labelPos, text)
        };
      }
    }

    return null; // No suitable position found
  }

  canPlaceLabel(position, text, labelGrid) {
    const bounds = this.getLabelBounds(position, text);
    const { cellSize, occupied } = labelGrid;

    const startX = Math.floor(bounds.left / cellSize);
    const endX = Math.floor(bounds.right / cellSize);
    const startY = Math.floor(bounds.top / cellSize);
    const endY = Math.floor(bounds.bottom / cellSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        if (occupied.has(`${x},${y}`)) {
          return false;
        }
      }
    }

    return true;
  }

  markLabelArea(label, labelGrid) {
    const { cellSize, occupied } = labelGrid;
    const bounds = label.bounds;

    const startX = Math.floor(bounds.left / cellSize);
    const endX = Math.floor(bounds.right / cellSize);
    const startY = Math.floor(bounds.top / cellSize);
    const endY = Math.floor(bounds.bottom / cellSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        occupied.add(`${x},${y}`);
      }
    }
  }

  getLabelBounds(position, text) {
    const charWidth = 7; // Approximate character width
    const height = 14;
    const width = text.length * charWidth;

    return {
      left: position.x,
      right: position.x + width,
      top: position.y - height / 2,
      bottom: position.y + height / 2
    };
  }
}

// Web Worker message handler
const worker = new SymbolLayoutWorker();

self.onmessage = function(e) {
  const { type, data } = e.data;

  switch (type) {
    case 'PROCESS_FLIGHTS':
      const { flights, viewport, zoom } = data;
      const result = worker.processFlightData(flights, viewport, zoom);
      
      self.postMessage({
        type: 'FLIGHTS_PROCESSED',
        data: result
      });
      break;

    case 'GET_STATS':
      self.postMessage({
        type: 'WORKER_STATS',
        data: {
          processedCount: worker.processedCount,
          lastProcessTime: worker.lastProcessTime,
          memoryUsage: self.performance?.memory ? {
            used: self.performance.memory.usedJSHeapSize,
            total: self.performance.memory.totalJSHeapSize,
            limit: self.performance.memory.jsHeapSizeLimit
          } : null
        }
      });
      break;

    case 'CLEAR_CACHE':
      worker.aircraftSymbols.clear();
      worker.labelCache.clear();
      worker.collisionTree = null;
      
      self.postMessage({
        type: 'CACHE_CLEARED'
      });
      break;

    default:
      console.warn('Unknown message type:', type);
  }
};