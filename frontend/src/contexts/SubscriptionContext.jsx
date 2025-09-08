import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscriptionApi } from '../services/api';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [featureGate, setFeatureGate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const [subData, gateData] = await Promise.all([
        subscriptionApi.getSubscription(),
        subscriptionApi.getFeatureGate()
      ]);
      
      setSubscription(subData);
      setFeatureGate(gateData);
      setError(null);
    } catch (err) {
      console.error('Failed to load subscription:', err);
      setError(err.message);
      
      setSubscription({
        tier: 'free',
        status: 'active',
        trialEnd: null
      });
      setFeatureGate({
        tier: 'free',
        features: {
          realTimeData: false,
          dataDelay: 300,
          historyDays: 7,
          maxAlerts: 2,
          weatherOverlay: false,
          apiCalls: { daily: 0, rateLimitPerMinute: 0 },
          adsEnabled: true,
          export: { csv: false, geoJson: false, api: false },
          sso: false,
          sla: false
        },
        limits: {
          apiCallsRemaining: 0,
          alertsRemaining: 2
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const hasFeature = (featureName) => {
    if (!featureGate) return false;
    return featureGate.features[featureName];
  };

  const canAccessFeature = (featureName) => {
    if (!featureGate) return { allowed: false, reason: 'Loading...' };
    
    const hasAccess = featureGate.features[featureName];
    if (!hasAccess) {
      return {
        allowed: false,
        reason: `This feature is not available in your ${featureGate.tier} plan`,
        upgradeRequired: true
      };
    }
    
    return { allowed: true };
  };

  const isTrialing = () => {
    return subscription?.status === 'trialing';
  };

  const getTrialDaysRemaining = () => {
    if (!isTrialing() || !subscription?.trialEnd) return 0;
    
    const now = new Date();
    const trialEnd = new Date(subscription.trialEnd);
    const diffTime = trialEnd - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  const needsUpgrade = () => {
    return subscription?.tier === 'free' || 
           (isTrialing() && getTrialDaysRemaining() <= 3);
  };

  const createCheckoutSession = async (priceId, trialDays) => {
    try {
      const session = await subscriptionApi.createCheckoutSession({
        priceId,
        trialDays,
        successUrl: `${window.location.origin}/billing/success`,
        cancelUrl: `${window.location.origin}/billing/cancel`
      });
      
      window.location.href = session.url;
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      throw err;
    }
  };

  const cancelSubscription = async (cancelAtPeriodEnd = true) => {
    try {
      await subscriptionApi.cancelSubscription(cancelAtPeriodEnd);
      await loadSubscription();
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      throw err;
    }
  };

  const reactivateSubscription = async () => {
    try {
      await subscriptionApi.reactivateSubscription();
      await loadSubscription();
    } catch (err) {
      console.error('Failed to reactivate subscription:', err);
      throw err;
    }
  };

  const value = {
    subscription,
    featureGate,
    loading,
    error,
    hasFeature,
    canAccessFeature,
    isTrialing,
    getTrialDaysRemaining,
    needsUpgrade,
    createCheckoutSession,
    cancelSubscription,
    reactivateSubscription,
    reload: loadSubscription
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};