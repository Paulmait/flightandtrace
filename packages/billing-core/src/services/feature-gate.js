/**
 * Feature Gating Service for FlightTrace Subscription Tiers
 * Enforces feature access based on subscription level
 */

import { PRICING_TIERS, getTier, hasFeature } from '../config/pricing-tiers.js';

export class FeatureGate {
  constructor(userTier = 'free') {
    this.userTier = userTier;
    this.tier = getTier(userTier);
  }

  /**
   * Check if user has access to a specific feature
   */
  hasAccess(feature) {
    return hasFeature(this.userTier, feature);
  }

  /**
   * Get feature value for current tier
   */
  getFeatureValue(feature) {
    return this.tier.features[feature];
  }

  /**
   * Get usage limits for current tier
   */
  getLimit(limitType) {
    return this.tier.limits[limitType];
  }

  /**
   * Check if user is within usage limits
   */
  isWithinLimit(limitType, currentUsage) {
    const limit = this.getLimit(limitType);
    if (limit === -1) return true; // Unlimited
    return currentUsage < limit;
  }

  /**
   * Feature-specific access checks
   */
  canAccessWeatherLayer() {
    return this.hasAccess('weatherLayer');
  }

  canAccessAdvancedFilters() {
    return this.hasAccess('advancedFilters');
  }

  canExportData(format = 'csv') {
    if (!this.hasAccess('csvExport')) return false;
    
    const supportedFormats = this.getFeatureValue('exportFormats') || [];
    return supportedFormats.includes(format);
  }

  canAccessHistoricalData(requestedDays) {
    const maxDays = this.getFeatureValue('historyDays');
    return requestedDays <= maxDays;
  }

  canCreateAlert(currentAlertCount) {
    return this.isWithinLimit('maxActiveAlerts', currentAlertCount);
  }

  canMakeAPICall(todaysCalls) {
    return this.isWithinLimit('maxAPIRequests', todaysCalls);
  }

  canSaveFlight(currentSavedFlights) {
    return this.isWithinLimit('maxSavedFlights', currentSavedFlights);
  }

  /**
   * Get upgrade suggestions for blocked features
   */
  getUpgradeInfo(feature) {
    const suggestedTiers = [];
    
    for (const [tierId, tier] of Object.entries(PRICING_TIERS)) {
      if (tier.features[feature] && tierId !== this.userTier) {
        suggestedTiers.push({
          id: tierId,
          name: tier.name,
          price: tier.price,
          description: tier.description
        });
      }
    }

    // Sort by price (lowest first)
    suggestedTiers.sort((a, b) => a.price.monthly - b.price.monthly);
    
    return suggestedTiers[0]; // Return cheapest upgrade option
  }

  /**
   * Generate feature gate response for API
   */
  generateGateResponse(feature, reason = null) {
    const hasAccess = this.hasAccess(feature);
    
    if (hasAccess) {
      return {
        allowed: true,
        tier: this.userTier,
        feature
      };
    }

    const upgrade = this.getUpgradeInfo(feature);
    
    return {
      allowed: false,
      tier: this.userTier,
      feature,
      reason: reason || `This feature requires ${upgrade?.name || 'a paid'} subscription`,
      upgrade: upgrade ? {
        name: upgrade.name,
        price: upgrade.price.monthly,
        url: '/pricing'
      } : null
    };
  }
}

/**
 * Feature Gate Middleware for Express
 */
export function requireFeature(feature) {
  return (req, res, next) => {
    const userTier = req.user?.subscription_tier || 'free';
    const gate = new FeatureGate(userTier);
    
    const response = gate.generateGateResponse(feature);
    
    if (response.allowed) {
      req.featureGate = gate;
      next();
    } else {
      res.status(403).json({
        error: 'Feature not available',
        ...response
      });
    }
  };
}

/**
 * React Hook for Feature Gating
 */
export function useFeatureGate(userTier) {
  const gate = new FeatureGate(userTier);
  
  return {
    gate,
    hasAccess: (feature) => gate.hasAccess(feature),
    canAccessWeatherLayer: () => gate.canAccessWeatherLayer(),
    canAccessAdvancedFilters: () => gate.canAccessAdvancedFilters(),
    canExportData: (format) => gate.canExportData(format),
    canAccessHistoricalData: (days) => gate.canAccessHistoricalData(days),
    canCreateAlert: (current) => gate.canCreateAlert(current),
    canMakeAPICall: (todaysCalls) => gate.canMakeAPICall(todaysCalls),
    canSaveFlight: (current) => gate.canSaveFlight(current),
    getUpgradeInfo: (feature) => gate.getUpgradeInfo(feature),
    currentTier: gate.tier
  };
}

/**
 * Component wrapper for feature gating
 */
export function FeatureGuard({ 
  feature, 
  userTier, 
  children, 
  fallback = null,
  showUpgrade = false 
}) {
  const gate = new FeatureGate(userTier);
  
  if (gate.hasAccess(feature)) {
    return children;
  }
  
  if (showUpgrade) {
    const upgrade = gate.getUpgradeInfo(feature);
    return fallback || (
      <div className="feature-upgrade-prompt">
        <h3>Upgrade Required</h3>
        <p>This feature requires a {upgrade?.name} subscription.</p>
        <button 
          className="upgrade-btn"
          onClick={() => window.location.href = '/pricing'}
        >
          Upgrade to {upgrade?.name} (${upgrade?.price.monthly}/mo)
        </button>
      </div>
    );
  }
  
  return fallback;
}

/**
 * Usage Indicator Component
 */
export function UsageIndicator({ 
  limitType, 
  currentUsage, 
  userTier, 
  showUpgradeWhenFull = true 
}) {
  const gate = new FeatureGate(userTier);
  const limit = gate.getLimit(limitType);
  
  if (limit === -1) {
    return (
      <div className="usage-indicator unlimited">
        <span className="usage-text">Unlimited</span>
      </div>
    );
  }
  
  const percentage = (currentUsage / limit) * 100;
  const isNearLimit = percentage > 80;
  const isAtLimit = currentUsage >= limit;
  
  return (
    <div className={`usage-indicator ${isNearLimit ? 'warning' : ''} ${isAtLimit ? 'full' : ''}`}>
      <div className="usage-bar">
        <div 
          className="usage-fill" 
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className="usage-text">
        {currentUsage} / {limit === -1 ? '∞' : limit}
      </span>
      
      {isAtLimit && showUpgradeWhenFull && (
        <button 
          className="upgrade-btn-small"
          onClick={() => window.location.href = '/pricing'}
        >
          Upgrade
        </button>
      )}
    </div>
  );
}

export default FeatureGate;