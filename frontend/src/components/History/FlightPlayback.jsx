import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Calendar, Clock, Download } from 'lucide-react';

const FlightPlayback = ({ 
  subscription = 'free',
  onTimeChange,
  onFlightDataUpdate 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeRange, setTimeRange] = useState({ start: null, end: null });
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const playbackInterval = useRef(null);
  const dataCache = useRef(new Map());

  // Check if playback is available for user's subscription
  const isAvailable = subscription !== 'free';
  const maxHistoryDays = {
    basic: 7,
    pro: 30,
    enterprise: 365
  }[subscription] || 0;

  useEffect(() => {
    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, []);

  const fetchHistoricalData = useCallback(async (date, startTime, endTime) => {
    const cacheKey = `${date.toISOString()}_${startTime}_${endTime}`;
    
    // Check cache first
    if (dataCache.current.has(cacheKey)) {
      return dataCache.current.get(cacheKey);
    }

    setLoading(true);
    try {
      // Fetch historical data from API
      const response = await fetch('/api/history/flights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          date: date.toISOString(),
          startTime,
          endTime,
          interval: 60 // seconds between snapshots
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }

      const data = await response.json();
      
      // Cache the result
      dataCache.current.set(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      // Return mock data for demo
      return generateMockHistoricalData(date, startTime, endTime);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateMockHistoricalData = (date, startTime, endTime) => {
    // Generate realistic mock historical flight data
    const snapshots = [];
    const duration = endTime - startTime;
    const interval = 60000; // 1 minute intervals
    const numSnapshots = Math.floor(duration / interval);
    
    for (let i = 0; i <= numSnapshots; i++) {
      const timestamp = new Date(startTime + (i * interval));
      const flights = [];
      
      // Generate 50-200 flights per snapshot
      const numFlights = 50 + Math.floor(Math.random() * 150);
      
      for (let j = 0; j < numFlights; j++) {
        const baseLatitude = 40 + Math.random() * 20;
        const baseLongitude = -10 + Math.random() * 30;
        
        flights.push({
          icao24: `MOCK${j.toString().padStart(4, '0')}`,
          callsign: `FL${100 + j}`,
          position: {
            latitude: baseLatitude + (Math.sin(i * 0.1 + j) * 2),
            longitude: baseLongitude + (Math.cos(i * 0.1 + j) * 3),
            altitude: 20000 + Math.random() * 20000,
            heading: (i * 2 + j * 10) % 360,
            groundSpeed: 400 + Math.random() * 200,
            verticalRate: -500 + Math.random() * 1000
          },
          status: Math.random() > 0.9 ? 'ON_GROUND' : 'EN_ROUTE',
          timestamp: timestamp.toISOString()
        });
      }
      
      snapshots.push({
        timestamp,
        flights,
        count: flights.length
      });
    }
    
    return { snapshots, duration, interval };
  };

  const handleDateSelect = async (date) => {
    // Check if date is within allowed range
    const maxDate = new Date();
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - maxHistoryDays);
    
    if (date > maxDate || date < minDate) {
      alert(`Historical data available for last ${maxHistoryDays} days only`);
      return;
    }
    
    setSelectedDate(date);
    
    // Set default time range (last 24 hours of selected date)
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(23, 59, 59, 999);
    
    setTimeRange({ start: startTime, end: endTime });
    
    // Fetch data for selected date
    const data = await fetchHistoricalData(date, startTime.getTime(), endTime.getTime());
    setHistoricalData(data.snapshots || []);
    setCurrentTime(startTime);
    setProgress(0);
  };

  const handlePlayPause = () => {
    if (!historicalData.length) return;
    
    if (isPlaying) {
      // Pause playback
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
        playbackInterval.current = null;
      }
      setIsPlaying(false);
    } else {
      // Start playback
      setIsPlaying(true);
      
      playbackInterval.current = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (1 / historicalData.length) * playbackSpeed;
          
          if (newProgress >= 1) {
            // Playback complete
            setIsPlaying(false);
            if (playbackInterval.current) {
              clearInterval(playbackInterval.current);
            }
            return 1;
          }
          
          // Update current snapshot
          const snapshotIndex = Math.floor(newProgress * historicalData.length);
          const snapshot = historicalData[snapshotIndex];
          
          if (snapshot) {
            setCurrentTime(new Date(snapshot.timestamp));
            if (onFlightDataUpdate) {
              onFlightDataUpdate(snapshot.flights);
            }
          }
          
          return newProgress;
        });
      }, 1000 / playbackSpeed);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    
    // Restart playback with new speed if playing
    if (isPlaying) {
      handlePlayPause(); // Pause
      setTimeout(() => handlePlayPause(), 100); // Resume with new speed
    }
  };

  const handleProgressChange = (e) => {
    const newProgress = parseFloat(e.target.value);
    setProgress(newProgress);
    
    // Update to corresponding snapshot
    const snapshotIndex = Math.floor(newProgress * historicalData.length);
    const snapshot = historicalData[snapshotIndex];
    
    if (snapshot) {
      setCurrentTime(new Date(snapshot.timestamp));
      if (onFlightDataUpdate) {
        onFlightDataUpdate(snapshot.flights);
      }
    }
  };

  const handleSkipBackward = () => {
    setProgress(Math.max(0, progress - 0.1));
    handleProgressChange({ target: { value: Math.max(0, progress - 0.1) } });
  };

  const handleSkipForward = () => {
    setProgress(Math.min(1, progress + 0.1));
    handleProgressChange({ target: { value: Math.min(1, progress + 0.1) } });
  };

  const exportHistoricalData = () => {
    if (!historicalData.length) return;
    
    // Convert to CSV or JSON based on user preference
    const dataStr = JSON.stringify(historicalData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `flight-history-${selectedDate.toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isAvailable) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Historical Playback</h3>
          <p className="text-gray-600 mb-4">
            Upgrade to Basic or higher to access flight history and playback
          </p>
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Upgrade Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Historical Playback
        </h3>
        {subscription === 'enterprise' && (
          <button
            onClick={exportHistoricalData}
            disabled={!historicalData.length}
            className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        )}
      </div>

      {/* Date Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Date
        </label>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => handleDateSelect(new Date(e.target.value))}
            max={new Date().toISOString().split('T')[0]}
            min={new Date(Date.now() - maxHistoryDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Time Display */}
      {timeRange.start && (
        <div className="mb-4 text-center">
          <div className="text-2xl font-bold">
            {currentTime.toLocaleTimeString()}
          </div>
          <div className="text-sm text-gray-600">
            {currentTime.toLocaleDateString()}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {historicalData.length > 0 && (
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={progress}
            onChange={handleProgressChange}
            className="w-full"
            disabled={loading}
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{timeRange.start?.toLocaleTimeString()}</span>
            <span>{Math.round(progress * 100)}%</span>
            <span>{timeRange.end?.toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={handleSkipBackward}
          disabled={!historicalData.length || loading}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        
        <button
          onClick={handlePlayPause}
          disabled={!historicalData.length || loading}
          className="p-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
        
        <button
          onClick={handleSkipForward}
          disabled={!historicalData.length || loading}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Speed Controls */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-gray-600">Speed:</span>
        {[0.5, 1, 2, 5, 10].map(speed => (
          <button
            key={speed}
            onClick={() => handleSpeedChange(speed)}
            className={`px-2 py-1 text-sm rounded ${
              playbackSpeed === speed 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>

      {/* Statistics */}
      {historicalData.length > 0 && (
        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Total Snapshots:</span>
            <span className="ml-2 font-semibold">{historicalData.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Avg Aircraft:</span>
            <span className="ml-2 font-semibold">
              {Math.round(
                historicalData.reduce((sum, s) => sum + s.count, 0) / historicalData.length
              )}
            </span>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">Loading historical data...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightPlayback;