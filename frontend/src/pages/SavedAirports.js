/**
 * Saved Airports Page
 * Rich stats and personalized airport tracking
 */

import React, { useState, useEffect, useContext } from 'react';
import { SubscriptionContext } from '../contexts/SubscriptionContext';
import { supabaseHelpers } from '../lib/supabase';
import { Link } from 'react-router-dom';

const SavedAirports = () => {
  const { subscription, user } = useContext(SubscriptionContext);
  const [savedAirports, setSavedAirports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    if (user) {
      fetchSavedAirports();
    }
  }, [user, selectedPeriod]);

  const fetchSavedAirports = async () => {
    setLoading(true);
    try {
      const airports = await supabaseHelpers.getUserSavedAirports(user.id);
      
      // Enrich with statistics
      const enrichedAirports = await Promise.all(
        airports.map(async (airport) => {
          const stats = await fetchAirportStats(airport.icao_code, selectedPeriod);
          return { ...airport, stats };
        })
      );
      
      setSavedAirports(enrichedAirports);
    } catch (error) {
      console.error('Error fetching saved airports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAirportStats = async (icaoCode, period) => {
    try {
      // This would call your analytics API
      const response = await fetch(`/api/airports/${icaoCode}/stats?period=${period}`);
      const data = await response.json();
      
      return {
        totalFlights: data.totalFlights || 0,
        arrivals: data.arrivals || 0,
        departures: data.departures || 0,
        averageDelay: data.averageDelay || 0,
        popularDestinations: data.popularDestinations || [],
        busyHours: data.busyHours || [],
        aircraftTypes: data.aircraftTypes || [],
        airlines: data.airlines || []
      };
    } catch (error) {
      console.error(`Error fetching stats for ${icaoCode}:`, error);
      return {
        totalFlights: 0,
        arrivals: 0,
        departures: 0,
        averageDelay: 0,
        popularDestinations: [],
        busyHours: [],
        aircraftTypes: [],
        airlines: []
      };
    }
  };

  const removeAirport = async (airportId) => {
    try {
      await supabaseHelpers.removeSavedAirport(user.id, airportId);
      setSavedAirports(prev => prev.filter(airport => airport.id !== airportId));
    } catch (error) {
      console.error('Error removing airport:', error);
    }
  };

  const AirportCard = ({ airport }) => (
    <div className="airport-card">
      <div className="airport-header">
        <div className="airport-info">
          <h3>
            <Link to={`/airports/${airport.icao_code}`}>
              {airport.name}
            </Link>
          </h3>
          <div className="airport-codes">
            <span className="icao">{airport.icao_code}</span>
            {airport.iata_code && (
              <span className="iata">{airport.iata_code}</span>
            )}
          </div>
          <div className="airport-location">
            📍 {airport.city}, {airport.country}
          </div>
        </div>
        
        <button 
          className="remove-btn"
          onClick={() => removeAirport(airport.id)}
          title="Remove from saved"
        >
          ❌
        </button>
      </div>

      <div className="airport-stats">
        <div className="stat-grid">
          <div className="stat">
            <div className="stat-value">{airport.stats.totalFlights.toLocaleString()}</div>
            <div className="stat-label">Total Flights</div>
          </div>
          <div className="stat">
            <div className="stat-value">{airport.stats.arrivals.toLocaleString()}</div>
            <div className="stat-label">Arrivals</div>
          </div>
          <div className="stat">
            <div className="stat-value">{airport.stats.departures.toLocaleString()}</div>
            <div className="stat-label">Departures</div>
          </div>
          <div className="stat">
            <div className="stat-value">
              {airport.stats.averageDelay > 0 ? 
                `+${Math.round(airport.stats.averageDelay)}m` : 
                'On Time'
              }
            </div>
            <div className="stat-label">Avg Delay</div>
          </div>
        </div>

        <div className="airport-details">
          <div className="detail-section">
            <h4>Popular Destinations</h4>
            <div className="destination-list">
              {airport.stats.popularDestinations.slice(0, 3).map((dest, idx) => (
                <div key={idx} className="destination">
                  <span className="destination-code">{dest.airport}</span>
                  <span className="flight-count">{dest.flights} flights</span>
                </div>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h4>Busy Hours</h4>
            <div className="busy-hours">
              {airport.stats.busyHours.slice(0, 3).map((hour, idx) => (
                <span key={idx} className="busy-hour">
                  {hour.hour}:00 ({hour.flights})
                </span>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h4>Top Airlines</h4>
            <div className="airline-list">
              {airport.stats.airlines.slice(0, 3).map((airline, idx) => (
                <div key={idx} className="airline">
                  <span className="airline-name">{airline.name}</span>
                  <span className="flight-count">{airline.flights}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="airport-actions">
        <Link 
          to={`/airports/${airport.icao_code}`} 
          className="btn secondary"
        >
          View Details
        </Link>
        <Link 
          to={`/airports/${airport.icao_code}/live`}
          className="btn primary"
        >
          Live Tracking
        </Link>
      </div>
    </div>
  );

  const AirportRow = ({ airport }) => (
    <tr className="airport-row">
      <td className="airport-name">
        <Link to={`/airports/${airport.icao_code}`}>
          <div className="name">{airport.name}</div>
          <div className="codes">
            {airport.icao_code} • {airport.city}
          </div>
        </Link>
      </td>
      <td className="stat-cell">{airport.stats.totalFlights.toLocaleString()}</td>
      <td className="stat-cell">{airport.stats.arrivals.toLocaleString()}</td>
      <td className="stat-cell">{airport.stats.departures.toLocaleString()}</td>
      <td className="stat-cell">
        {airport.stats.averageDelay > 0 ? 
          `+${Math.round(airport.stats.averageDelay)}m` : 
          'On Time'
        }
      </td>
      <td className="actions-cell">
        <Link to={`/airports/${airport.icao_code}/live`} className="btn-sm primary">
          Live
        </Link>
        <button 
          className="btn-sm secondary"
          onClick={() => removeAirport(airport.id)}
        >
          Remove
        </button>
      </td>
    </tr>
  );

  if (loading) {
    return (
      <div className="saved-airports-page">
        <div className="page-header">
          <h1>My Saved Airports</h1>
        </div>
        <div className="loading-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="airport-card skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="saved-airports-page">
      <div className="page-header">
        <div className="header-content">
          <h1>My Saved Airports</h1>
          <p>{savedAirports.length} airports saved</p>
        </div>
        
        <div className="header-controls">
          <div className="period-selector">
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          
          <div className="view-selector">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ⚏ Grid
            </button>
            <button 
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              ☰ Table
            </button>
          </div>
        </div>
      </div>

      {savedAirports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✈️</div>
          <h2>No Saved Airports</h2>
          <p>
            Save airports you're interested in to track their activity and get personalized insights.
          </p>
          <Link to="/airports" className="btn primary">
            Explore Airports
          </Link>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="airports-grid">
              {savedAirports.map(airport => (
                <AirportCard key={airport.id} airport={airport} />
              ))}
            </div>
          ) : (
            <div className="airports-table-container">
              <table className="airports-table">
                <thead>
                  <tr>
                    <th>Airport</th>
                    <th>Total Flights</th>
                    <th>Arrivals</th>
                    <th>Departures</th>
                    <th>Avg Delay</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedAirports.map(airport => (
                    <AirportRow key={airport.id} airport={airport} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {subscription?.tier === 'free' && (
        <div className="upgrade-prompt">
          <h3>Get More Insights</h3>
          <p>
            Upgrade to Plus for extended historical data, advanced analytics, 
            and unlimited airport saves.
          </p>
          <Link to="/pricing" className="btn primary">
            Upgrade Now
          </Link>
        </div>
      )}
    </div>
  );
};

export default SavedAirports;