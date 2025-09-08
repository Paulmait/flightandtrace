import React, { useState } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import './BillingDashboard.css';

const BillingDashboard = () => {
  const { 
    subscription, 
    featureGate, 
    isTrialing, 
    getTrialDaysRemaining,
    cancelSubscription,
    reactivateSubscription,
    createCheckoutSession
  } = useSubscription();
  
  const { gates, tier } = useFeatureGate();
  const [loading, setLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleUpgrade = async (targetTier) => {
    setLoading(true);
    try {
      const priceId = `price_${targetTier}_monthly`;
      await createCheckoutSession(priceId, 0);
    } catch (error) {
      console.error('Failed to upgrade:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (immediately = false) => {
    setLoading(true);
    try {
      await cancelSubscription(!immediately);
      setShowCancelModal(false);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    setLoading(true);
    try {
      await reactivateSubscription();
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#2ECC71';
      case 'trialing': return '#3498DB';
      case 'past_due': return '#F39C12';
      case 'canceled': return '#E74C3C';
      default: return '#95A5A6';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'trialing': return `Trial (${getTrialDaysRemaining()} days left)`;
      case 'past_due': return 'Past Due';
      case 'canceled': return 'Canceled';
      default: return status;
    }
  };

  const getUpgradeOptions = () => {
    const options = [];
    if (tier !== 'premium') options.push({ id: 'premium', name: 'Premium', price: '$7.99/mo' });
    if (tier !== 'pro') options.push({ id: 'pro', name: 'Pro', price: '$24.99/mo' });
    if (tier !== 'business') options.push({ id: 'business', name: 'Business', price: '$99.99/mo' });
    return options;
  };

  if (!subscription) {
    return <div className="billing-dashboard loading">Loading billing information...</div>;
  }

  return (
    <div className="billing-dashboard">
      <div className="dashboard-header">
        <h1>Billing & Subscription</h1>
        <p>Manage your FlightTrace subscription and usage</p>
      </div>

      <div className="dashboard-grid">
        {/* Current Plan Card */}
        <div className="card current-plan-card">
          <div className="card-header">
            <h2>Current Plan</h2>
            <div 
              className="status-badge"
              style={{ backgroundColor: getStatusColor(subscription.status) }}
            >
              {getStatusText(subscription.status)}
            </div>
          </div>
          
          <div className="plan-details">
            <div className="plan-name">
              {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
            </div>
            
            {subscription.tier !== 'free' && (
              <div className="billing-info">
                <div className="billing-cycle">
                  {subscription.billingInterval === 'yearly' ? 'Annual' : 'Monthly'} billing
                </div>
                <div className="next-billing">
                  {subscription.status === 'canceled' 
                    ? `Access until ${formatDate(subscription.currentPeriodEnd)}`
                    : `Next billing: ${formatDate(subscription.currentPeriodEnd)}`
                  }
                </div>
              </div>
            )}

            <div className="plan-actions">
              {subscription.tier === 'free' && (
                <button 
                  className="btn-primary"
                  onClick={() => handleUpgrade('premium')}
                  disabled={loading}
                >
                  Start Free Trial
                </button>
              )}
              
              {subscription.tier !== 'free' && subscription.status !== 'canceled' && (
                <>
                  <button 
                    className="btn-secondary"
                    onClick={() => setShowCancelModal(true)}
                    disabled={loading}
                  >
                    Cancel Subscription
                  </button>
                  
                  {getUpgradeOptions().length > 0 && (
                    <div className="upgrade-options">
                      <span>Upgrade to:</span>
                      {getUpgradeOptions().map(option => (
                        <button
                          key={option.id}
                          className="btn-upgrade"
                          onClick={() => handleUpgrade(option.id)}
                          disabled={loading}
                        >
                          {option.name} {option.price}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {subscription.status === 'canceled' && (
                <button 
                  className="btn-primary"
                  onClick={handleReactivate}
                  disabled={loading}
                >
                  Reactivate Subscription
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Usage Stats Card */}
        <div className="card usage-card">
          <div className="card-header">
            <h2>Usage Statistics</h2>
          </div>
          
          <div className="usage-stats">
            {/* API Usage */}
            <div className="usage-item">
              <div className="usage-label">API Calls Today</div>
              <div className="usage-value">
                {featureGate?.usage?.apiCalls || 0}
                {featureGate?.features?.apiCalls?.daily !== 'unlimited' && (
                  <span className="usage-limit">
                    / {featureGate?.features?.apiCalls?.daily}
                  </span>
                )}
              </div>
              {featureGate?.features?.apiCalls?.daily !== 'unlimited' && (
                <div className="usage-bar">
                  <div 
                    className="usage-fill"
                    style={{
                      width: `${Math.min(100, (featureGate?.usage?.apiCalls / featureGate?.features?.apiCalls?.daily) * 100)}%`
                    }}
                  />
                </div>
              )}
            </div>

            {/* Alerts Usage */}
            <div className="usage-item">
              <div className="usage-label">Active Alerts</div>
              <div className="usage-value">
                {featureGate?.usage?.alerts || 0}
                {featureGate?.features?.maxAlerts !== 'unlimited' && (
                  <span className="usage-limit">
                    / {featureGate?.features?.maxAlerts}
                  </span>
                )}
              </div>
              {featureGate?.features?.maxAlerts !== 'unlimited' && (
                <div className="usage-bar">
                  <div 
                    className="usage-fill"
                    style={{
                      width: `${Math.min(100, (featureGate?.usage?.alerts / featureGate?.features?.maxAlerts) * 100)}%`
                    }}
                  />
                </div>
              )}
            </div>

            {/* Data Delay */}
            <div className="usage-item">
              <div className="usage-label">Data Delay</div>
              <div className="usage-value">
                {featureGate?.features?.dataDelay === 0 
                  ? 'Real-time' 
                  : `${Math.floor(featureGate?.features?.dataDelay / 60)} minutes`
                }
              </div>
            </div>

            {/* History Access */}
            <div className="usage-item">
              <div className="usage-label">History Access</div>
              <div className="usage-value">
                {featureGate?.features?.historyDays} days
              </div>
            </div>
          </div>
        </div>

        {/* Features Card */}
        <div className="card features-card">
          <div className="card-header">
            <h2>Available Features</h2>
          </div>
          
          <div className="feature-list">
            <div className={`feature-item ${featureGate?.features?.realTimeData ? 'enabled' : 'disabled'}`}>
              <span className="feature-icon">
                {featureGate?.features?.realTimeData ? '✓' : '×'}
              </span>
              <span className="feature-name">Real-time Data</span>
            </div>
            
            <div className={`feature-item ${featureGate?.features?.weatherOverlay ? 'enabled' : 'disabled'}`}>
              <span className="feature-icon">
                {featureGate?.features?.weatherOverlay ? '✓' : '×'}
              </span>
              <span className="feature-name">Weather Overlay</span>
            </div>
            
            <div className={`feature-item ${featureGate?.features?.export?.api ? 'enabled' : 'disabled'}`}>
              <span className="feature-icon">
                {featureGate?.features?.export?.api ? '✓' : '×'}
              </span>
              <span className="feature-name">API Access</span>
            </div>
            
            <div className={`feature-item ${featureGate?.features?.export?.csv ? 'enabled' : 'disabled'}`}>
              <span className="feature-icon">
                {featureGate?.features?.export?.csv ? '✓' : '×'}
              </span>
              <span className="feature-name">CSV Export</span>
            </div>
            
            <div className={`feature-item ${!featureGate?.features?.adsEnabled ? 'enabled' : 'disabled'}`}>
              <span className="feature-icon">
                {!featureGate?.features?.adsEnabled ? '✓' : '×'}
              </span>
              <span className="feature-name">Ad-free Experience</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Cancel Subscription</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCancelModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <p>Are you sure you want to cancel your subscription?</p>
              <div className="cancel-options">
                <div className="cancel-option">
                  <input 
                    type="radio" 
                    id="cancel-end" 
                    name="cancelType" 
                    value="end" 
                    defaultChecked 
                  />
                  <label htmlFor="cancel-end">
                    <strong>Cancel at period end</strong>
                    <span>Keep access until {formatDate(subscription.currentPeriodEnd)}</span>
                  </label>
                </div>
                
                <div className="cancel-option">
                  <input 
                    type="radio" 
                    id="cancel-now" 
                    name="cancelType" 
                    value="now" 
                  />
                  <label htmlFor="cancel-now">
                    <strong>Cancel immediately</strong>
                    <span>Lose access right away (no refund)</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Subscription
              </button>
              <button 
                className="btn-danger"
                onClick={() => {
                  const cancelNow = document.querySelector('input[name="cancelType"]:checked').value === 'now';
                  handleCancel(cancelNow);
                }}
                disabled={loading}
              >
                {loading ? 'Canceling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingDashboard;