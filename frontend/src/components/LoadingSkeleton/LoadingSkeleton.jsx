import React from 'react';
import './LoadingSkeleton.css';

const LoadingSkeleton = ({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '4px',
  className = '',
  lines = 1,
  variant = 'text' // 'text', 'rectangular', 'circular', 'card'
}) => {
  const renderSkeleton = () => {
    if (variant === 'card') {
      return (
        <div className={`skeleton skeleton-card ${className}`}>
          <div className="skeleton-header">
            <div className="skeleton-item skeleton-circular" style={{ width: '40px', height: '40px' }} />
            <div className="skeleton-content">
              <div className="skeleton-item skeleton-line" style={{ width: '60%', height: '16px' }} />
              <div className="skeleton-item skeleton-line" style={{ width: '40%', height: '12px' }} />
            </div>
          </div>
          <div className="skeleton-body">
            <div className="skeleton-item skeleton-line" style={{ width: '100%', height: '14px' }} />
            <div className="skeleton-item skeleton-line" style={{ width: '80%', height: '14px' }} />
            <div className="skeleton-item skeleton-line" style={{ width: '90%', height: '14px' }} />
          </div>
        </div>
      );
    }

    if (variant === 'table-row') {
      return (
        <tr className={`skeleton skeleton-table-row ${className}`}>
          <td><div className="skeleton-item skeleton-line" style={{ width: '80%', height: '16px' }} /></td>
          <td><div className="skeleton-item skeleton-line" style={{ width: '60%', height: '16px' }} /></td>
          <td><div className="skeleton-item skeleton-line" style={{ width: '70%', height: '16px' }} /></td>
          <td><div className="skeleton-item skeleton-line" style={{ width: '50%', height: '16px' }} /></td>
        </tr>
      );
    }

    if (lines > 1) {
      return (
        <div className={`skeleton skeleton-multiline ${className}`}>
          {Array(lines).fill(0).map((_, index) => (
            <div
              key={index}
              className={`skeleton-item skeleton-${variant}`}
              style={{
                width: index === lines - 1 ? '75%' : width,
                height,
                borderRadius,
                marginBottom: index < lines - 1 ? '8px' : '0'
              }}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        className={`skeleton skeleton-item skeleton-${variant} ${className}`}
        style={{ width, height, borderRadius }}
      />
    );
  };

  return renderSkeleton();
};

// Preset skeleton components for common use cases
export const FlightCardSkeleton = ({ className = '' }) => (
  <LoadingSkeleton variant="card" className={`flight-card-skeleton ${className}`} />
);

export const AlertListSkeleton = ({ count = 3, className = '' }) => (
  <div className={`alert-list-skeleton ${className}`}>
    {Array(count).fill(0).map((_, index) => (
      <div key={index} className="alert-item-skeleton">
        <LoadingSkeleton width="24px" height="24px" variant="circular" />
        <div className="alert-content-skeleton">
          <LoadingSkeleton width="70%" height="16px" />
          <LoadingSkeleton width="50%" height="12px" />
        </div>
        <LoadingSkeleton width="60px" height="24px" borderRadius="12px" />
      </div>
    ))}
  </div>
);

export const MapSkeleton = ({ className = '' }) => (
  <div className={`map-skeleton ${className}`}>
    <div className="map-skeleton-content">
      <LoadingSkeleton variant="rectangular" width="100%" height="100%" />
      <div className="map-skeleton-overlay">
        <div className="map-loading-text">Loading map...</div>
      </div>
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, className = '' }) => (
  <table className={`table-skeleton ${className}`}>
    <tbody>
      {Array(rows).fill(0).map((_, index) => (
        <LoadingSkeleton key={index} variant="table-row" />
      ))}
    </tbody>
  </table>
);

export default LoadingSkeleton;