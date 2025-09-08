/**
 * My Watchlist Component
 * Unified watchlist for flights, aircraft, and airports
 */

import React, { useState, useEffect, useContext } from 'react';
import { SubscriptionContext } from '../contexts/SubscriptionContext';
import { supabaseHelpers } from '../../lib/supabase';
import { Link } from 'react-router-dom';

const MyWatchlist = () => {
  const { subscription, user } = useContext(SubscriptionContext);
  const [watchlistData, setWatchlistData] = useState({
    flights: [],
    aircraft: [],
    airports: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (user) {
      fetchWatchlistData();
      fetchAlerts();
    }
  }, [user]);

  const fetchWatchlistData = async () => {
    setLoading(true);
    try {
      const [flights, aircraft, airports] = await Promise.all([
        supabaseHelpers.getUserWatchedFlights(user.id),
        supabaseHelpers.getUserSavedAircraft(user.id),
        supabaseHelpers.getUserSavedAirports(user.id)
      ]);

      // Enrich with live data
      const enrichedFlights = await Promise.all(
        flights.map(async (flight) => {
          const liveData = await fetchLiveFlightData(flight.flight_id);
          return { ...flight, liveData, type: 'flight' };
        })
      );

      const enrichedAircraft = await Promise.all(
        aircraft.slice(0, 10).map(async (ac) => {
          const liveData = await fetchLiveAircraftData(ac.icao24);
          return { ...ac, liveData, type: 'aircraft' };
        })
      );

      const enrichedAirports = airports.slice(0, 10).map(airport => ({
        ...airport,
        type: 'airport'
      }));

      setWatchlistData({
        flights: enrichedFlights,
        aircraft: enrichedAircraft,
        airports: enrichedAirports
      });
    } catch (error) {
      console.error('Error fetching watchlist data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const userAlerts = await supabaseHelpers.getUserAlerts(user.id);
      setAlerts(userAlerts.filter(alert => alert.status === 'active'));
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchLiveFlightData = async (flightId) => {
    try {
      const response = await fetch(`/api/flights/${flightId}/live`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      return null;
    }
  };

  const fetchLiveAircraftData = async (icao24) => {
    try {
      const response = await fetch(`/api/aircraft/${icao24}/live`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      return null;
    }
  };

  const removeFromWatchlist = async (item) => {
    try {
      switch (item.type) {
        case 'flight':
          await supabaseHelpers.removeWatchedFlight(user.id, item.id);
          setWatchlistData(prev => ({
            ...prev,
            flights: prev.flights.filter(f => f.id !== item.id)
          }));
          break;
        case 'aircraft':
          await supabaseHelpers.removeSavedAircraft(user.id, item.id);
          setWatchlistData(prev => ({
            ...prev,
            aircraft: prev.aircraft.filter(ac => ac.id !== item.id)
          }));
          break;
        case 'airport':
          await supabaseHelpers.removeSavedAirport(user.id, item.id);
          setWatchlistData(prev => ({
            ...prev,
            airports: prev.airports.filter(ap => ap.id !== item.id)
          }));
          break;
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  const WatchlistItem = ({ item }) => {
    switch (item.type) {
      case 'flight':
        return (
          <div className="watchlist-item flight-item">
            <div className="item-header">
              <div className="item-icon">✈️</div>
              <div className="item-info">
                <h4>
                  <Link to={`/flights/${item.flight_id}`}>
                    {item.callsign || item.flight_id}
                  </Link>
                </h4>
                <div className="item-details">
                  {item.route && `${item.route.origin} → ${item.route.destination}`}
                </div>
              </div>
              <div className="item-status">
                {item.liveData ? (
                  <span className="status-live">🔴 Live</span>
                ) : (
                  <span className="status-scheduled">Scheduled</span>
                )}
              </div>
            </div>
            
            {item.liveData && (
              <div className="live-details">
                <span>Alt: {item.liveData.altitude?.toLocaleString()}ft</span>
                <span>Speed: {item.liveData.groundSpeed}kts</span>
                <span>Progress: {item.liveData.progress || 0}%</span>
              </div>
            )}
            
            <button 
              className="remove-btn"
              onClick={() => removeFromWatchlist(item)}
            >
              Remove
            </button>
          </div>
        );

      case 'aircraft':
        return (
          <div className="watchlist-item aircraft-item">
            <div className="item-header">
              <div className="item-icon">🛩️</div>
              <div className="item-info">
                <h4>
                  <Link to={`/aircraft/${item.registration || item.icao24}`}>
                    {item.registration || item.icao24}
                  </Link>
                </h4>
                <div className="item-details">
                  {item.aircraft_type} {item.airline && `• ${item.airline}`}
                </div>
              </div>
              <div className="item-status">
                {item.liveData && !item.liveData.onGround ? (
                  <span className="status-flying">🔴 Flying</span>
                ) : item.liveData?.onGround ? (
                  <span className="status-ground">🟡 On Ground</span>
                ) : (
                  <span className="status-inactive">⚫ Inactive</span>
                )}
              </div>
            </div>
            
            {item.liveData && !item.liveData.onGround && (
              <div className="live-details">
                <span>Alt: {item.liveData.altitude?.toLocaleString()}ft</span>
                <span>Speed: {item.liveData.groundSpeed}kts</span>
                <span>Heading: {item.liveData.heading}°</span>
              </div>
            )}
            
            <button 
              className="remove-btn"
              onClick={() => removeFromWatchlist(item)}
            >
              Remove
            </button>
          </div>
        );

      case 'airport':
        return (
          <div className="watchlist-item airport-item">
            <div className="item-header">
              <div className="item-icon">🏢</div>
              <div className="item-info">
                <h4>
                  <Link to={`/airports/${item.icao_code}`}>
                    {item.name}
                  </Link>
                </h4>
                <div className="item-details">
                  {item.icao_code} • {item.city}, {item.country}
                </div>
              </div>
              <div className="item-status">
                <span className="status-monitoring">👁️ Monitoring</span>
              </div>
            </div>
            
            <button 
              className="remove-btn"
              onClick={() => removeFromWatchlist(item)}
            >
              Remove
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const getFilteredItems = () => {
    const allItems = [
      ...watchlistData.flights,
      ...watchlistData.aircraft,
      ...watchlistData.airports
    ];

    switch (activeTab) {
      case 'flights':
        return watchlistData.flights;
      case 'aircraft':
        return watchlistData.aircraft;
      case 'airports':
        return watchlistData.airports;
      case 'live':
        return allItems.filter(item => 
          (item.type === 'flight' && item.liveData) ||
          (item.type === 'aircraft' && item.liveData && !item.liveData.onGround)
        );
      default:
        return allItems;
    }
  };

  const totalItems = watchlistData.flights.length + 
                   watchlistData.aircraft.length + 
                   watchlistData.airports.length;

  const liveItems = [
    ...watchlistData.flights.filter(f => f.liveData),
    ...watchlistData.aircraft.filter(ac => ac.liveData && !ac.liveData.onGround)
  ].length;

  if (loading) {
    return (
      <div className="my-watchlist">
        <div className="watchlist-header">
          <h2>My Watchlist</h2>
        </div>
        <div className="watchlist-loading">
          {[1, 2, 3].map(i => (
            <div key={i} className="watchlist-item skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="my-watchlist">
      <div className="watchlist-header">
        <div className="header-content">
          <h2>My Watchlist</h2>
          <div className="watchlist-stats">
            <span className="stat">
              {totalItems} items tracked
            </span>
            {liveItems > 0 && (
              <span className="stat live">
                🔴 {liveItems} live
              </span>
            )}
          </div>
        </div>
        
        <div className="watchlist-controls">
          <div className="tab-selector">
            <button 
              className={`tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All ({totalItems})
            </button>
            <button 
              className={`tab ${activeTab === 'flights' ? 'active' : ''}`}
              onClick={() => setActiveTab('flights')}
            >
              Flights ({watchlistData.flights.length})
            </button>
            <button 
              className={`tab ${activeTab === 'aircraft' ? 'active' : ''}`}
              onClick={() => setActiveTab('aircraft')}
            >
              Aircraft ({watchlistData.aircraft.length})
            </button>
            <button 
              className={`tab ${activeTab === 'airports' ? 'active' : ''}`}
              onClick={() => setActiveTab('airports')}
            >
              Airports ({watchlistData.airports.length})
            </button>
            {liveItems > 0 && (
              <button 
                className={`tab ${activeTab === 'live' ? 'active' : ''}`}
                onClick={() => setActiveTab('live')}
              >
                🔴 Live ({liveItems})
              </button>
            )}
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="watchlist-alerts">
          <h3>Recent Alerts</h3>
          <div className="alerts-list">
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.id} className={`alert alert-${alert.severity}`}>
                <div className="alert-icon">
                  {alert.severity === 'high' ? '🚨' : 
                   alert.severity === 'medium' ? '⚠️' : 'ℹ️'}
                </div>
                <div className="alert-content">
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-time">
                    {new Date(alert.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="watchlist-content">
        {getFilteredItems().length === 0 ? (
          <div className="empty-watchlist">
            <div className="empty-icon">📋</div>
            <h3>
              {activeTab === 'all' ? 'Your watchlist is empty' : 
               `No ${activeTab} in your watchlist`}
            </h3>
            <p>
              Start tracking flights, aircraft, and airports to see them here.
            </p>
            <div className="empty-actions">
              <Link to="/search" className="btn primary">
                Search & Add Items
              </Link>
              <Link to="/flights" className="btn secondary">
                Browse Flights
              </Link>
            </div>
          </div>
        ) : (
          <div className="watchlist-items">
            {getFilteredItems().map(item => (
              <WatchlistItem key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </div>

      {subscription?.tier === 'free' && totalItems > 0 && (
        <div className="watchlist-upgrade">
          <h4>Get More from Your Watchlist</h4>
          <p>
            Upgrade to Plus for unlimited tracking, advanced alerts, 
            and detailed analytics.
          </p>
          <Link to="/pricing" className="btn primary">
            Upgrade Now
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyWatchlist;