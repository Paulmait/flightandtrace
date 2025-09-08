import React, { useState } from 'react';
import './FilterPane.css';

const FilterPane = ({ filters, onFilterChange, onApply, onReset }) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (filterType, value) => {
    const updated = {
      ...localFilters,
      [filterType]: value
    };
    setLocalFilters(updated);
    if (onFilterChange) {
      onFilterChange(updated);
    }
  };

  const handleApply = () => {
    if (onApply) {
      onApply(localFilters);
    }
  };

  const handleReset = () => {
    const defaultFilters = {
      callsign: '',
      registration: '',
      operator: '',
      aircraftType: '',
      altitudeMin: 0,
      altitudeMax: 50000,
      speedMin: 0,
      speedMax: 600,
      onGround: null,
      dataSource: 'all'
    };
    setLocalFilters(defaultFilters);
    if (onReset) {
      onReset();
    }
  };

  return (
    <div className={`filter-pane ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="filter-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>Filters</h3>
        <button className="filter-toggle">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="filter-content">
          <div className="filter-section">
            <h4>Flight Information</h4>
            
            <div className="filter-group">
              <label htmlFor="callsign">Callsign</label>
              <input
                id="callsign"
                type="text"
                value={localFilters.callsign || ''}
                onChange={(e) => handleFilterChange('callsign', e.target.value)}
                placeholder="e.g., UAL123"
              />
            </div>

            <div className="filter-group">
              <label htmlFor="registration">Registration</label>
              <input
                id="registration"
                type="text"
                value={localFilters.registration || ''}
                onChange={(e) => handleFilterChange('registration', e.target.value)}
                placeholder="e.g., N12345"
              />
            </div>

            <div className="filter-group">
              <label htmlFor="operator">Operator</label>
              <input
                id="operator"
                type="text"
                value={localFilters.operator || ''}
                onChange={(e) => handleFilterChange('operator', e.target.value)}
                placeholder="e.g., United Airlines"
              />
            </div>

            <div className="filter-group">
              <label htmlFor="aircraftType">Aircraft Type</label>
              <select
                id="aircraftType"
                value={localFilters.aircraftType || ''}
                onChange={(e) => handleFilterChange('aircraftType', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="landplane">Landplane</option>
                <option value="helicopter">Helicopter</option>
                <option value="seaplane">Seaplane</option>
                <option value="drone">Drone</option>
                <option value="balloon">Balloon</option>
              </select>
            </div>
          </div>

          <div className="filter-section">
            <h4>Altitude Range (ft)</h4>
            <div className="range-inputs">
              <div className="filter-group">
                <label htmlFor="altitudeMin">Min</label>
                <input
                  id="altitudeMin"
                  type="number"
                  value={localFilters.altitudeMin || 0}
                  onChange={(e) => handleFilterChange('altitudeMin', parseInt(e.target.value))}
                  min="0"
                  max="50000"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="altitudeMax">Max</label>
                <input
                  id="altitudeMax"
                  type="number"
                  value={localFilters.altitudeMax || 50000}
                  onChange={(e) => handleFilterChange('altitudeMax', parseInt(e.target.value))}
                  min="0"
                  max="50000"
                />
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h4>Speed Range (knots)</h4>
            <div className="range-inputs">
              <div className="filter-group">
                <label htmlFor="speedMin">Min</label>
                <input
                  id="speedMin"
                  type="number"
                  value={localFilters.speedMin || 0}
                  onChange={(e) => handleFilterChange('speedMin', parseInt(e.target.value))}
                  min="0"
                  max="600"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="speedMax">Max</label>
                <input
                  id="speedMax"
                  type="number"
                  value={localFilters.speedMax || 600}
                  onChange={(e) => handleFilterChange('speedMax', parseInt(e.target.value))}
                  min="0"
                  max="600"
                />
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h4>Status</h4>
            <div className="filter-group">
              <label>Ground Status</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="onGround"
                    value="all"
                    checked={localFilters.onGround === null}
                    onChange={() => handleFilterChange('onGround', null)}
                  />
                  All
                </label>
                <label>
                  <input
                    type="radio"
                    name="onGround"
                    value="airborne"
                    checked={localFilters.onGround === false}
                    onChange={() => handleFilterChange('onGround', false)}
                  />
                  Airborne
                </label>
                <label>
                  <input
                    type="radio"
                    name="onGround"
                    value="ground"
                    checked={localFilters.onGround === true}
                    onChange={() => handleFilterChange('onGround', true)}
                  />
                  On Ground
                </label>
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h4>Data Source</h4>
            <div className="filter-group">
              <select
                value={localFilters.dataSource || 'all'}
                onChange={(e) => handleFilterChange('dataSource', e.target.value)}
              >
                <option value="all">All Sources</option>
                <option value="opensky">OpenSky Network</option>
                <option value="adsb_exchange">ADS-B Exchange</option>
              </select>
            </div>
          </div>

          <div className="filter-actions">
            <button className="btn-apply" onClick={handleApply}>
              Apply Filters
            </button>
            <button className="btn-reset" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPane;