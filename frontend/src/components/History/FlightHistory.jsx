import React, { useState, useEffect } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import FeatureGate from '../FeatureGate/FeatureGate';
import LoadingSkeleton from '../LoadingSkeleton/LoadingSkeleton';
import EmptyState from '../EmptyState/EmptyState';
import PlaybackControls from './PlaybackControls';
import ExportDialog from './ExportDialog';
import './FlightHistory.css';

const FlightHistory = () => {
  const { subscription } = useSubscription();
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [availableDateRange, setAvailableDateRange] = useState(null);
  const [retentionInfo, setRetentionInfo] = useState(null);

  useEffect(() => {
    loadHistoryData();
    loadRetentionInfo();
  }, [subscription]);

  const loadHistoryData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/history/flights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startTime: dateRange.start ? new Date(dateRange.start) : undefined,
          endTime: dateRange.end ? new Date(dateRange.end) : undefined,
          callsign: searchQuery || undefined,
          limit: 50
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load flight history');
      }

      const data = await response.json();
      setFlights(data.flights || []);
    } catch (error) {
      console.error('Failed to load flight history:', error);
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRetentionInfo = async () => {
    try {
      const response = await fetch('/api/history/retention-info', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRetentionInfo(data.policy);
        setAvailableDateRange(data.dateRange);
      }
    } catch (error) {
      console.error('Failed to load retention info:', error);
    }
  };

  const handleSearch = () => {
    loadHistoryData();
  };

  const handlePlayback = async (flight) => {
    try {
      const response = await fetch('/api/history/playback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          flightId: flight.id,
          settings: {
            showTrail: true,
            trailLength: 100,
            focusOnAircraft: true,
            showTelemetry: true
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start playback');
      }

      const session = await response.json();
      setSelectedFlight({ ...flight, playbackSession: session });
    } catch (error) {
      console.error('Failed to start playback:', error);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDistance = (nauticalMiles) => {
    if (!nauticalMiles) return 'Unknown';
    return `${nauticalMiles.toFixed(0)} NM`;
  };

  const getRetentionBadge = (tier) => {
    const badges = {
      free: { text: '2 days', color: '#95A5A6' },
      premium: { text: '30 days', color: '#3498DB' },
      pro: { text: '365 days', color: '#E67E22' },
      business: { text: '3 years', color: '#27AE60' }
    };
    
    const badge = badges[tier] || badges.free;
    return (
      <span 
        className="retention-badge" 
        style={{ backgroundColor: badge.color }}
      >
        {badge.text}
      </span>
    );
  };

  return (
    <div className="flight-history">
      <div className="history-header">
        <div className="header-content">
          <h1>Flight History</h1>
          <p>Search and replay historical flight data</p>
          {retentionInfo && (
            <div className="retention-info">
              <span>Data retention: {getRetentionBadge(subscription?.tier || 'free')}</span>
              {availableDateRange && (
                <span className="date-range">
                  Available from {new Date(availableDateRange.earliestDate).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>

        <FeatureGate
          feature="historicalSearch"
          fallback={() => (
            <div className="upgrade-prompt">
              <button 
                className="btn-upgrade"
                onClick={() => window.location.href = '/pricing'}
              >
                Upgrade for History Access
              </button>
            </div>
          )}
        >
          <div className="header-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowExportDialog(true)}
              disabled={flights.length === 0}
            >
              Export Data
            </button>
          </div>
        </FeatureGate>
      </div>

      <FeatureGate
        feature="historicalSearch"
        fallback={() => (
          <EmptyState
            variant="feature-locked"
            title="Flight History Locked"
            description="Upgrade to Premium or higher to access historical flight data, playback functionality, and data export features."
            action={
              <button 
                className="btn-upgrade"
                onClick={() => window.location.href = '/pricing'}
              >
                View Pricing Plans
              </button>
            }
          />
        )}
      >
        <div className="history-content">
          <div className="search-controls">
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Search by flight number, registration, or ICAO24..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="search-input"
              />
              <button onClick={handleSearch} className="btn-search">
                Search
              </button>
            </div>

            <div className="date-filter-group">
              <input
                type="date"
                placeholder="Start date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                min={availableDateRange?.earliestDate ? 
                  new Date(availableDateRange.earliestDate).toISOString().split('T')[0] : 
                  undefined
                }
                max={availableDateRange?.latestDate ? 
                  new Date(availableDateRange.latestDate).toISOString().split('T')[0] : 
                  undefined
                }
                className="date-input"
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                placeholder="End date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                min={dateRange.start || (availableDateRange?.earliestDate ? 
                  new Date(availableDateRange.earliestDate).toISOString().split('T')[0] : 
                  undefined)
                }
                max={availableDateRange?.latestDate ? 
                  new Date(availableDateRange.latestDate).toISOString().split('T')[0] : 
                  undefined
                }
                className="date-input"
              />
            </div>
          </div>

          <div className="history-results">
            {loading ? (
              <div className="loading-container">
                {Array(5).fill(0).map((_, index) => (
                  <div key={index} className="flight-card-skeleton">
                    <LoadingSkeleton variant="card" />
                  </div>
                ))}
              </div>
            ) : flights.length === 0 ? (
              <EmptyState
                variant="search"
                title="No flights found"
                description="Try adjusting your search criteria or date range to find historical flights."
                action={
                  <button className="btn-secondary" onClick={() => {
                    setSearchQuery('');
                    setDateRange({ start: '', end: '' });
                    handleSearch();
                  }}>
                    Clear Filters
                  </button>
                }
              />
            ) : (
              <div className="flight-list">
                {flights.map((flight) => (
                  <div key={flight.id} className="flight-card">
                    <div className="flight-header">
                      <div className="flight-identity">
                        <h3>{flight.callsign || flight.registration || 'Unknown'}</h3>
                        <span className="flight-id">{flight.icao24}</span>
                      </div>
                      <div className="flight-times">
                        <div className="time-item">
                          <span className="time-label">Start</span>
                          <span className="time-value">
                            {new Date(flight.startTime).toLocaleString()}
                          </span>
                        </div>
                        {flight.endTime && (
                          <div className="time-item">
                            <span className="time-label">End</span>
                            <span className="time-value">
                              {new Date(flight.endTime).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flight-stats">
                      <div className="stat-item">
                        <span className="stat-label">Duration</span>
                        <span className="stat-value">
                          {formatDuration(flight.statistics?.totalDuration)}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Distance</span>
                        <span className="stat-value">
                          {formatDistance(flight.statistics?.totalDistance)}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Max Alt</span>
                        <span className="stat-value">
                          {flight.statistics?.maxAltitude ? 
                            `${flight.statistics.maxAltitude.toLocaleString()} ft` : 
                            'Unknown'
                          }
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Positions</span>
                        <span className="stat-value">
                          {flight.totalPositions?.toLocaleString() || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <div className="flight-actions">
                      <FeatureGate
                        feature="playback"
                        fallback={() => (
                          <span className="feature-locked">
                            🔒 Playback requires Pro+
                          </span>
                        )}
                      >
                        <button
                          className="btn-playback"
                          onClick={() => handlePlayback(flight)}
                        >
                          ▶ Replay Flight
                        </button>
                      </FeatureGate>
                      
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          // Open flight details modal or page
                          console.log('View details for flight:', flight.id);
                        }}
                      >
                        View Details
                      </button>
                    </div>

                    {flight.statistics?.dataGaps?.length > 0 && (
                      <div className="data-quality-info">
                        <span className="data-gaps-indicator">
                          ⚠ {flight.statistics.dataGaps.length} data gaps
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedFlight && selectedFlight.playbackSession && (
          <PlaybackControls
            session={selectedFlight.playbackSession}
            flight={selectedFlight}
            onClose={() => setSelectedFlight(null)}
          />
        )}

        {showExportDialog && (
          <ExportDialog
            flights={flights}
            onClose={() => setShowExportDialog(false)}
            dateRange={dateRange}
            searchQuery={searchQuery}
          />
        )}
      </FeatureGate>
    </div>
  );
};

export default FlightHistory;