import React, { useState, useEffect } from 'react';
import './FlightDetailsPanel.css';
import { calculateEmissions } from '../utils/emissionsCalculator';
import { getAirportInfo } from '../utils/airportDatabase';

const FlightDetailsPanel = ({ flight, onClose }) => {
  const [flightDetails, setFlightDetails] = useState(null);
  const [emissions, setEmissions] = useState(null);
  
  useEffect(() => {
    if (flight) {
      try {
        // Calculate emissions safely
        let emissionsData = null;
        try {
          emissionsData = calculateEmissions(flight);
        } catch (e) {
          console.warn('Could not calculate emissions:', e);
          emissionsData = { co2: 0, fuel: 0, perPassenger: 0 };
        }
        setEmissions(emissionsData);
        
        // Get airport information
        const departure = getAirportInfo(flight.origin || 'UNKNOWN');
        const arrival = getAirportInfo(flight.destination || 'UNKNOWN');
        
        // Calculate flight progress safely
        let totalDistance = 0;
        let currentDistance = 0;
        let progress = 0;
        
        if (departure.lat && departure.lon && arrival.lat && arrival.lon) {
          totalDistance = calculateDistance(
            departure.lat, departure.lon,
            arrival.lat, arrival.lon
          );
        }
        
        if (departure.lat && departure.lon && flight.latitude && flight.longitude) {
          currentDistance = calculateDistance(
            departure.lat, departure.lon,
            flight.latitude, flight.longitude
          );
        }
        
        if (totalDistance > 0) {
          progress = Math.min(100, (currentDistance / totalDistance) * 100);
        }
        
        // Format flight time
        const flightTime = flight.time_position ? new Date(flight.time_position * 1000) : new Date();
        
        setFlightDetails({
          departure,
          arrival,
          progress: isNaN(progress) ? 0 : progress,
          totalDistance: isNaN(totalDistance) ? 0 : totalDistance,
          currentDistance: isNaN(currentDistance) ? 0 : currentDistance,
          remainingDistance: Math.max(0, totalDistance - currentDistance),
          flightTime,
          altitude: flight.altitude || flight.geo_altitude || 0,
          speed: flight.velocity || 0,
          heading: flight.true_track || 0,
          verticalSpeed: flight.vertical_rate || 0,
          aircraft: flight.aircraft_type || 'Unknown',
          registration: flight.registration || flight.icao24 || 'N/A',
          airline: flight.airline || extractAirline(flight.callsign)
        });
      } catch (error) {
        console.error('Error setting flight details:', error);
        // Set default values to prevent crash
        setFlightDetails({
          departure: getAirportInfo('UNKNOWN'),
          arrival: getAirportInfo('UNKNOWN'),
          progress: 0,
          totalDistance: 0,
          currentDistance: 0,
          remainingDistance: 0,
          flightTime: new Date(),
          altitude: 0,
          speed: 0,
          heading: 0,
          verticalSpeed: 0,
          aircraft: 'Unknown',
          registration: flight?.icao24 || 'N/A',
          airline: 'Unknown'
        });
      }
    }
  }, [flight]);
  
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  const extractAirline = (callsign) => {
    if (!callsign) return 'Unknown Airline';
    const prefix = callsign.substring(0, 3);
    const airlines = {
      'AAL': 'American Airlines',
      'DAL': 'Delta Air Lines',
      'UAL': 'United Airlines',
      'SWA': 'Southwest Airlines',
      'JBU': 'JetBlue Airways',
      'ASA': 'Alaska Airlines',
      'BAW': 'British Airways',
      'DLH': 'Lufthansa',
      'AFR': 'Air France',
      'KLM': 'KLM Royal Dutch',
      'EIN': 'Aer Lingus',
      'RYR': 'Ryanair',
      'EZY': 'easyJet',
      'UAE': 'Emirates',
      'QTR': 'Qatar Airways',
      'SIA': 'Singapore Airlines',
      'CPA': 'Cathay Pacific',
      'ANA': 'All Nippon Airways',
      'JAL': 'Japan Airlines',
      'QFA': 'Qantas'
    };
    return airlines[prefix] || 'Unknown Airline';
  };
  
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  // Removed unused formatDuration function
  
  if (!flight || !flightDetails) return null;
  
  return (
    <div className="flight-details-panel">
      <div className="flight-details-header">
        <div className="flight-callsign">
          <h2>{flight.callsign || flight.icao24}</h2>
          <span className="aircraft-type">{flightDetails.aircraft}</span>
        </div>
        <button className="close-panel-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="airline-info">
        <div className="airline-name">{flightDetails.airline}</div>
        <div className="registration">Reg: {flightDetails.registration}</div>
      </div>
      
      <div className="route-section">
        <div className="airport-info departure">
          <div className="airport-code">{flightDetails.departure.iata}</div>
          <div className="city-name">{flightDetails.departure.city}</div>
          <div className="airport-name">{flightDetails.departure.name}</div>
          <div className="timezone">{flightDetails.departure.timezone}</div>
        </div>
        
        <div className="flight-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${flightDetails.progress}%` }}>
              <div className="plane-icon">✈</div>
            </div>
          </div>
          <div className="distance-info">
            <span>{Math.round(flightDetails.currentDistance)} km</span>
            <span>{Math.round(flightDetails.remainingDistance)} km</span>
          </div>
        </div>
        
        <div className="airport-info arrival">
          <div className="airport-code">{flightDetails.arrival.iata}</div>
          <div className="city-name">{flightDetails.arrival.city}</div>
          <div className="airport-name">{flightDetails.arrival.name}</div>
          <div className="timezone">{flightDetails.arrival.timezone}</div>
        </div>
      </div>
      
      <div className="emissions-section">
        <h3>🌱 Environmental Impact</h3>
        <div className="emissions-grid">
          <div className="emission-item">
            <span className="emission-label">CO₂ Emissions</span>
            <span className="emission-value">{(emissions?.co2 || 0).toFixed(1)} kg</span>
          </div>
          <div className="emission-item">
            <span className="emission-label">Fuel Burn</span>
            <span className="emission-value">{(emissions?.fuel || 0).toFixed(1)} kg</span>
          </div>
          <div className="emission-item">
            <span className="emission-label">Per Passenger</span>
            <span className="emission-value">{(emissions?.perPassenger || 0).toFixed(1)} kg CO₂</span>
          </div>
          <div className="emission-item">
            <span className="emission-label">Trees to Offset</span>
            <span className="emission-value">{Math.ceil((emissions?.co2 || 0) / 21.77)} trees/year</span>
          </div>
        </div>
      </div>
      
      <div className="flight-data">
        <h3>Flight Data</h3>
        <div className="data-grid">
          <div className="data-item">
            <span className="data-label">Altitude</span>
            <span className="data-value">{Math.round(flightDetails.altitude).toLocaleString()} ft</span>
          </div>
          <div className="data-item">
            <span className="data-label">Speed</span>
            <span className="data-value">{Math.round(flightDetails.speed)} km/h</span>
          </div>
          <div className="data-item">
            <span className="data-label">Heading</span>
            <span className="data-value">{Math.round(flightDetails.heading)}°</span>
          </div>
          <div className="data-item">
            <span className="data-label">Vertical Speed</span>
            <span className="data-value">{Math.round(flightDetails.verticalSpeed * 196.85)} ft/min</span>
          </div>
        </div>
      </div>
      
      <div className="last-update">
        Last updated: {formatTime(flightDetails.flightTime)}
      </div>
    </div>
  );
};

export default FlightDetailsPanel;