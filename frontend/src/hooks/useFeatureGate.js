import { useSubscription } from '../contexts/SubscriptionContext';
import { useMemo } from 'react';

export const useFeatureGate = () => {
  const { featureGate, subscription } = useSubscription();

  const gates = useMemo(() => {
    if (!featureGate) {
      return {
        realTimeData: () => ({ allowed: false, reason: 'Loading...' }),
        weatherOverlay: () => ({ allowed: false, reason: 'Loading...' }),
        csvExport: () => ({ allowed: false, reason: 'Loading...' }),
        geoJsonExport: () => ({ allowed: false, reason: 'Loading...' }),
        apiAccess: () => ({ allowed: false, reason: 'Loading...' }),
        unlimitedAlerts: () => ({ allowed: false, reason: 'Loading...' }),
        historicalData: () => ({ allowed: false, reason: 'Loading...', maxDays: 0 }),
        adsDisabled: () => ({ allowed: false, reason: 'Loading...' })
      };
    }

    const { features, tier } = featureGate;

    return {
      realTimeData: () => {
        if (!features.realTimeData) {
          return {
            allowed: false,
            reason: `Real-time data is not available in the ${tier} plan`,
            upgradeRequired: true,
            delaySeconds: features.dataDelay
          };
        }
        return { allowed: true };
      },

      weatherOverlay: () => {
        if (!features.weatherOverlay) {
          return {
            allowed: false,
            reason: `Weather overlay is not available in the ${tier} plan`,
            upgradeRequired: true,
            suggestedTier: 'premium'
          };
        }
        return { allowed: true };
      },

      csvExport: () => {
        if (!features.export.csv) {
          return {
            allowed: false,
            reason: `CSV export is not available in the ${tier} plan`,
            upgradeRequired: true,
            suggestedTier: 'pro'
          };
        }
        return { allowed: true };
      },

      geoJsonExport: () => {
        if (!features.export.geoJson) {
          return {
            allowed: false,
            reason: `GeoJSON export is not available in the ${tier} plan`,
            upgradeRequired: true,
            suggestedTier: 'pro'
          };
        }
        return { allowed: true };
      },

      apiAccess: () => {
        if (!features.export.api || features.apiCalls.daily === 0) {
          return {
            allowed: false,
            reason: `API access is not available in the ${tier} plan`,
            upgradeRequired: true,
            suggestedTier: 'premium'
          };
        }
        
        if (featureGate.limits.apiCallsRemaining === 0) {
          return {
            allowed: false,
            reason: 'Daily API limit reached',
            upgradeRequired: true,
            resetTime: 'tomorrow'
          };
        }
        
        return { 
          allowed: true,
          remaining: featureGate.limits.apiCallsRemaining,
          limit: features.apiCalls.daily
        };
      },

      unlimitedAlerts: () => {
        if (features.maxAlerts === 'unlimited') {
          return { allowed: true };
        }
        
        const remaining = featureGate.limits.alertsRemaining;
        if (remaining <= 0) {
          return {
            allowed: false,
            reason: `Alert limit reached (${features.maxAlerts} max)`,
            upgradeRequired: true,
            suggestedTier: 'pro'
          };
        }
        
        return { 
          allowed: true, 
          remaining,
          limit: features.maxAlerts
        };
      },

      historicalData: (requestedDays = 7) => {
        if (requestedDays > features.historyDays) {
          return {
            allowed: false,
            reason: `Historical data limited to ${features.historyDays} days in ${tier} plan`,
            upgradeRequired: true,
            maxDays: features.historyDays,
            requestedDays
          };
        }
        return { 
          allowed: true,
          maxDays: features.historyDays
        };
      },

      adsDisabled: () => {
        if (features.adsEnabled) {
          return {
            allowed: false,
            reason: `Ad-free experience not available in ${tier} plan`,
            upgradeRequired: true,
            suggestedTier: 'premium'
          };
        }
        return { allowed: true };
      }
    };
  }, [featureGate, subscription]);

  const checkFeature = (featureName, ...args) => {
    const gate = gates[featureName];
    return gate ? gate(...args) : { allowed: false, reason: 'Unknown feature' };
  };

  const requireFeature = (featureName, fallback, ...args) => {
    const result = checkFeature(featureName, ...args);
    return result.allowed ? null : (fallback || result);
  };

  const getDataDelay = () => {
    return featureGate?.features?.dataDelay || 300;
  };

  const getMaxHistoryDays = () => {
    return featureGate?.features?.historyDays || 7;
  };

  const shouldShowAds = () => {
    return featureGate?.features?.adsEnabled ?? true;
  };

  return {
    gates,
    checkFeature,
    requireFeature,
    getDataDelay,
    getMaxHistoryDays,
    shouldShowAds,
    tier: featureGate?.tier || 'free',
    features: featureGate?.features || {}
  };
};