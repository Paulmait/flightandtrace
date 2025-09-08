import React from 'react';
import './EmptyState.css';

const EmptyState = ({ 
  icon,
  title, 
  description, 
  action, 
  className = '',
  variant = 'default' // 'default', 'error', 'search', 'feature-locked'
}) => {
  const getIcon = () => {
    if (icon) return icon;
    
    switch (variant) {
      case 'error':
        return '⚠️';
      case 'search':
        return '🔍';
      case 'feature-locked':
        return '🔒';
      default:
        return '📭';
    }
  };

  return (
    <div className={`empty-state empty-state-${variant} ${className}`}>
      <div className="empty-state-icon">{getIcon()}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {action && (
        <div className="empty-state-action">{action}</div>
      )}
    </div>
  );
};

// Preset empty state components for common scenarios
export const NoFlightsEmpty = ({ onRefresh, className = '' }) => (
  <EmptyState
    variant="search"
    title="No flights found"
    description="There are no flights matching your current filters or in the selected area."
    action={
      onRefresh && (
        <button className="btn-secondary" onClick={onRefresh}>
          Refresh Map
        </button>
      )
    }
    className={`no-flights-empty ${className}`}
  />
);

export const NoAlertsEmpty = ({ onCreateAlert, canCreate = true, className = '' }) => (
  <EmptyState
    variant={canCreate ? 'default' : 'feature-locked'}
    title={canCreate ? "No alert rules yet" : "Alert rules locked"}
    description={
      canCreate 
        ? "Create your first alert rule to get notified when flights match your conditions."
        : "Upgrade to Premium or higher to create alert rules and get notified about flight events."
    }
    action={
      canCreate ? (
        onCreateAlert && (
          <button className="btn-primary" onClick={onCreateAlert}>
            Create Alert Rule
          </button>
        )
      ) : (
        <button className="btn-upgrade" onClick={() => window.location.href = '/pricing'}>
          View Pricing
        </button>
      )
    }
    className={`no-alerts-empty ${className}`}
  />
);

export const ConnectionErrorEmpty = ({ onRetry, className = '' }) => (
  <EmptyState
    variant="error"
    title="Connection lost"
    description="Unable to connect to flight data services. Please check your internet connection and try again."
    action={
      onRetry && (
        <button className="btn-primary" onClick={onRetry}>
          Try Again
        </button>
      )
    }
    className={`connection-error-empty ${className}`}
  />
);

export const SearchEmpty = ({ query, onClear, className = '' }) => (
  <EmptyState
    variant="search"
    title={`No results for "${query}"`}
    description="Try adjusting your search terms or filters. You can search by flight number, aircraft registration, or airport code."
    action={
      onClear && (
        <button className="btn-secondary" onClick={onClear}>
          Clear Search
        </button>
      )
    }
    className={`search-empty ${className}`}
  />
);

export const FeatureLockedEmpty = ({ feature, tier, className = '' }) => (
  <EmptyState
    variant="feature-locked"
    title={`${feature} requires ${tier}`}
    description={`Upgrade to ${tier} to unlock ${feature.toLowerCase()} and other advanced features.`}
    action={
      <button className="btn-upgrade" onClick={() => window.location.href = '/pricing'}>
        Upgrade to {tier}
      </button>
    }
    className={`feature-locked-empty ${className}`}
  />
);

export const MaintenanceEmpty = ({ className = '' }) => (
  <EmptyState
    variant="error"
    title="Scheduled maintenance"
    description="This feature is temporarily unavailable due to scheduled maintenance. We'll be back shortly."
    className={`maintenance-empty ${className}`}
  />
);

export const DataLoadingEmpty = ({ message = "Loading data...", className = '' }) => (
  <div className={`data-loading-empty ${className}`}>
    <div className="loading-spinner">
      <div className="spinner-circle"></div>
    </div>
    <p className="loading-message">{message}</p>
  </div>
);

export default EmptyState;