/**
 * Saved Aircraft Page
 * Track specific aircraft with rich statistics
 */

import React, { useState, useEffect, useContext } from 'react';
import { SubscriptionContext } from '../contexts/SubscriptionContext';
import { supabaseHelpers } from '../lib/supabase';
import { Link } from 'react-router-dom';

const SavedAircraft = () => {
  const { subscription, user } = useContext(SubscriptionContext);
  const [savedAircraft, setSavedAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [sortBy, setSortBy] = useState('lastSeen');

  useEffect(() => {
    if (user) {
      fetchSavedAircraft();
    }
  }, [user, selectedPeriod]);

  const fetchSavedAircraft = async () => {
    setLoading(true);
    try {
      const aircraft = await supabaseHelpers.getUserSavedAircraft(user.id);
      
      // Enrich with statistics
      const enrichedAircraft = await Promise.all(
        aircraft.map(async (ac) => {
          const stats = await fetchAircraftStats(ac.registration || ac.icao24, selectedPeriod);
          const liveData = await fetchLiveAircraftData(ac.icao24);
          return { ...ac, stats, liveData };
        })
      );
      
      setSavedAircraft(enrichedAircraft);
    } catch (error) {
      console.error('Error fetching saved aircraft:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAircraftStats = async (identifier, period) => {
    try {
      const response = await fetch(`/api/aircraft/${identifier}/stats?period=${period}`);
      const data = await response.json();
      
      return {
        totalFlights: data.totalFlights || 0,
        totalDistance: data.totalDistance || 0,
        totalFlightTime: data.totalFlightTime || 0,
        uniqueAirports: data.uniqueAirports || 0,
        averageAltitude: data.averageAltitude || 0,
        maxAltitude: data.maxAltitude || 0,
        averageSpeed: data.averageSpeed || 0,
        maxSpeed: data.maxSpeed || 0,
        countries: data.countries || [],
        routes: data.routes || [],
        lastSeen: data.lastSeen || null,
        utilization: data.utilization || 0 // percentage of days active
      };
    } catch (error) {
      console.error(`Error fetching stats for ${identifier}:`, error);
      return {
        totalFlights: 0,
        totalDistance: 0,
        totalFlightTime: 0,
        uniqueAirports: 0,
        averageAltitude: 0,
        maxAltitude: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        countries: [],
        routes: [],
        lastSeen: null,
        utilization: 0
      };
    }
  };

  const fetchLiveAircraftData = async (icao24) => {
    try {
      const response = await fetch(`/api/aircraft/${icao24}/live`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const removeAircraft = async (aircraftId) => {
    try {
      await supabaseHelpers.removeSavedAircraft(user.id, aircraftId);
      setSavedAircraft(prev => prev.filter(ac => ac.id !== aircraftId));
    } catch (error) {
      console.error('Error removing aircraft:', error);
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h ${mins}m`;
    }
    return `${hours}h ${mins}m`;
  };

  const formatDistance = (km) => {
    if (km > 1000000) {
      return `${(km / 1000000).toFixed(1)}M km`;
    } else if (km > 1000) {
      return `${(km / 1000).toFixed(0)}K km`;
    }
    return `${km} km`;
  };

  const getStatusColor = (aircraft) => {
    if (aircraft.liveData) {
      if (aircraft.liveData.onGround) return 'grounded';
      return 'flying';
    }
    
    const lastSeen = aircraft.stats.lastSeen;
    if (!lastSeen) return 'unknown';
    
    const daysSince = (Date.now() - new Date(lastSeen)) / (1000 * 60 * 60 * 24);
    if (daysSince < 1) return 'recent';
    if (daysSince < 7) return 'week';
    return 'old';
  };

  const sortAircraft = (aircraft) => {
    return [...aircraft].sort((a, b) => {
      switch (sortBy) {
        case 'lastSeen':
          const aTime = a.stats.lastSeen || 0;
          const bTime = b.stats.lastSeen || 0;
          return new Date(bTime) - new Date(aTime);
        case 'flights':
          return b.stats.totalFlights - a.stats.totalFlights;
        case 'distance':
          return b.stats.totalDistance - a.stats.totalDistance;
        case 'registration':
          return (a.registration || '').localeCompare(b.registration || '');
        default:
          return 0;
      }
    });
  };

  const AircraftCard = ({ aircraft }) => {
    const status = getStatusColor(aircraft);
    
    return (
      <div className={`aircraft-card status-${status}`}>
        <div className="aircraft-header">
          <div className="aircraft-info">
            <h3>
              <Link to={`/aircraft/${aircraft.registration || aircraft.icao24}`}>
                {aircraft.registration || aircraft.icao24}
              </Link>
            </h3>
            <div className="aircraft-details">
              <span className="type">{aircraft.aircraft_type || 'Unknown Type'}</span>
              {aircraft.airline && (
                <span className="airline">{aircraft.airline}</span>
              )}
            </div>
            <div className="aircraft-status">
              <span className={`status-indicator status-${status}`} />
              {aircraft.liveData ? (
                aircraft.liveData.onGround ? 'On Ground' : 'In Flight'
              ) : (
                aircraft.stats.lastSeen ? 
                  `Last seen ${new Date(aircraft.stats.lastSeen).toLocaleDateString()}` :
                  'No recent activity'
              )}
            </div>
          </div>
          
          <button 
            className="remove-btn"
            onClick={() => removeAircraft(aircraft.id)}
            title="Remove from watchlist"
          >
            ❌
          </button>
        </div>

        {aircraft.liveData && !aircraft.liveData.onGround && (
          <div className="live-info">
            <div className="live-badge">🔴 LIVE</div>
            <div className="live-stats">
              <span>Alt: {aircraft.liveData.altitude?.toLocaleString()}ft</span>
              <span>Speed: {aircraft.liveData.groundSpeed}kts</span>
              <span>Heading: {aircraft.liveData.heading}°</span>
            </div>
          </div>
        )}

        <div className="aircraft-stats">
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-value">{aircraft.stats.totalFlights}</div>
              <div className="stat-label">Flights</div>
            </div>
            <div className="stat">
              <div className="stat-value">{formatDistance(aircraft.stats.totalDistance)}</div>
              <div className="stat-label">Distance</div>
            </div>
            <div className="stat">
              <div className="stat-value">{formatDuration(aircraft.stats.totalFlightTime)}</div>
              <div className="stat-label">Flight Time</div>
            </div>
            <div className="stat">
              <div className="stat-value">{aircraft.stats.uniqueAirports}</div>
              <div className="stat-label">Airports</div>
            </div>
          </div>

          <div className="performance-stats">
            <div className="perf-stat">
              <span className="label">Max Altitude:</span>
              <span className="value">{aircraft.stats.maxAltitude?.toLocaleString()}ft</span>
            </div>
            <div className="perf-stat">
              <span className="label">Max Speed:</span>
              <span className="value">{aircraft.stats.maxSpeed}kts</span>
            </div>
            <div className="perf-stat">
              <span className="label">Utilization:</span>
              <span className="value">{aircraft.stats.utilization}%</span>
            </div>
          </div>

          <div className="routes-section">
            <h4>Popular Routes</h4>
            <div className="routes-list">
              {aircraft.stats.routes.slice(0, 3).map((route, idx) => (
                <div key={idx} className="route">
                  <span className="route-airports">
                    {route.origin} → {route.destination}
                  </span>
                  <span className="route-count">{route.flights} flights</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="aircraft-actions">
          <Link 
            to={`/aircraft/${aircraft.registration || aircraft.icao24}`} 
            className="btn secondary"
          >
            View History
          </Link>
          {aircraft.liveData && (
            <Link 
              to={`/aircraft/${aircraft.registration || aircraft.icao24}/live`}
              className="btn primary"
            >
              Track Live
            </Link>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="saved-aircraft-page">
        <div className="page-header">
          <h1>My Aircraft Watchlist</h1>
        </div>
        <div className="loading-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="aircraft-card skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const sortedAircraft = sortAircraft(savedAircraft);

  return (
    <div className="saved-aircraft-page">
      <div className="page-header">
        <div className="header-content">
          <h1>My Aircraft Watchlist</h1>
          <p>{savedAircraft.length} aircraft tracked</p>
        </div>
        
        <div className="header-controls">
          <div className="period-selector">
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
          
          <div className="sort-selector">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="lastSeen">Last Seen</option>
              <option value="flights">Total Flights</option>
              <option value="distance">Distance Flown</option>
              <option value="registration">Registration</option>
            </select>
          </div>
        </div>
      </div>

      {savedAircraft.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🛩️</div>
          <h2>No Aircraft in Watchlist</h2>
          <p>
            Add aircraft to your watchlist to track their movements, routes, and statistics over time.
          </p>
          <Link to="/search" className="btn primary">
            Search Aircraft
          </Link>
        </div>
      ) : (
        <>
          <div className="watchlist-summary">
            <div className="summary-stats">
              <div className="summary-stat">
                <span className="stat-value">
                  {sortedAircraft.filter(ac => ac.liveData && !ac.liveData.onGround).length}
                </span>
                <span className="stat-label">Currently Flying</span>
              </div>
              <div className="summary-stat">
                <span className="stat-value">
                  {sortedAircraft.reduce((sum, ac) => sum + ac.stats.totalFlights, 0)}
                </span>
                <span className="stat-label">Total Flights</span>
              </div>
              <div className="summary-stat">
                <span className="stat-value">
                  {formatDistance(sortedAircraft.reduce((sum, ac) => sum + ac.stats.totalDistance, 0))}
                </span>
                <span className="stat-label">Total Distance</span>
              </div>
            </div>
          </div>

          <div className="aircraft-grid">
            {sortedAircraft.map(aircraft => (
              <AircraftCard key={aircraft.id} aircraft={aircraft} />
            ))}
          </div>
        </>
      )}

      {subscription?.tier === 'free' && (
        <div className="upgrade-prompt">
          <h3>Enhanced Aircraft Tracking</h3>
          <p>
            Upgrade to Plus for extended flight history, route analytics, 
            and unlimited aircraft saves.
          </p>
          <Link to="/pricing" className="btn primary">
            Upgrade Now
          </Link>
        </div>
      )}
    </div>
  );
};

export default SavedAircraft;