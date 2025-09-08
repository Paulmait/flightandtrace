import React, { useState, useEffect } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import FeatureGate from '../FeatureGate/FeatureGate';
import AlertRuleForm from './AlertRuleForm';
import AlertRuleList from './AlertRuleList';
import AlertStats from './AlertStats';
import './AlertRuleManager.css';

const AlertRuleManager = () => {
  const { subscription, featureGate } = useSubscription();
  const { checkFeature } = useFeatureGate();
  const [rules, setRules] = useState([]);
  const [stats, setStats] = useState(null);
  const [quota, setQuota] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAlertData();
  }, []);

  const loadAlertData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [rulesData, statsData, quotaData] = await Promise.all([
        fetch('/api/alerts/rules', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json()),
        
        fetch('/api/alerts/stats', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json()),
        
        fetch('/api/alerts/quota', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json())
      ]);

      setRules(rulesData.rules || []);
      setStats(statsData);
      setQuota(quotaData);
    } catch (err) {
      setError('Failed to load alert data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (ruleData) => {
    try {
      const response = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(ruleData)
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.upgradeRequired) {
          throw new Error(result.reason);
        }
        throw new Error(result.error || 'Failed to create rule');
      }

      setRules(prev => [result.rule, ...prev]);
      setShowCreateForm(false);
      await loadAlertData(); // Refresh quota
    } catch (err) {
      throw err; // Let form handle the error
    }
  };

  const handleUpdateRule = async (ruleId, ruleData) => {
    try {
      const response = await fetch(`/api/alerts/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(ruleData)
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update rule');
      }

      const result = await response.json();
      setRules(prev => prev.map(rule => rule.id === ruleId ? result.rule : rule));
      setEditingRule(null);
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this alert rule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/alerts/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete rule');
      }

      setRules(prev => prev.filter(rule => rule.id !== ruleId));
      await loadAlertData(); // Refresh quota
    } catch (err) {
      setError('Failed to delete rule: ' + err.message);
    }
  };

  const handleToggleRule = async (ruleId, enabled) => {
    try {
      const response = await fetch(`/api/alerts/rules/${ruleId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ enabled })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to toggle rule');
      }

      const result = await response.json();
      setRules(prev => prev.map(rule => rule.id === ruleId ? result.rule : rule));
    } catch (err) {
      setError('Failed to toggle rule: ' + err.message);
    }
  };

  const canCreateAlert = () => {
    if (!quota) return false;
    return quota.canCreateMore;
  };

  const getCreateButtonText = () => {
    if (!quota) return 'Loading...';
    
    if (!quota.canCreateMore) {
      if (quota.maxRules === 'unlimited') {
        return 'Create Alert Rule';
      }
      return `Limit Reached (${quota.currentRules}/${quota.maxRules})`;
    }
    
    return 'Create Alert Rule';
  };

  const alertAccessCheck = checkFeature('unlimitedAlerts');

  if (loading) {
    return (
      <div className="alert-manager loading">
        <div className="loading-spinner">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div className="alert-manager" role="main" aria-label="Alert Rules Management">
      <div className="alert-header">
        <div className="header-content">
          <h1 id="alert-rules-title">Alert Rules</h1>
          <p>Monitor flights and get notified when conditions are met</p>
        </div>
        
        <div className="header-actions">
          <FeatureGate
            feature="unlimitedAlerts"
            fallback={(result) => (
              <div className="upgrade-prompt-inline">
                <span className="quota-info">
                  {quota ? `${quota.currentRules}/${quota.maxRules} alerts used` : ''}
                </span>
                <button 
                  className="btn-upgrade-inline"
                  onClick={() => window.location.href = '/pricing'}
                  aria-label="Upgrade plan for more alerts"
                >
                  Upgrade for {result.remaining === 0 ? 'More' : 'Unlimited'} Alerts
                </button>
              </div>
            )}
          >
            <button
              className="btn-primary"
              onClick={() => setShowCreateForm(true)}
              disabled={!canCreateAlert()}
              aria-label={canCreateAlert() ? 'Create new alert rule' : 'Alert creation disabled - quota limit reached'}
            >
              {getCreateButtonText()}
            </button>
          </FeatureGate>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert" aria-live="assertive">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error message">×</button>
        </div>
      )}

      <div className="alert-content">
        <main className="alert-main" aria-labelledby="alert-rules-title">
          {showCreateForm && (
            <AlertRuleForm
              onSubmit={handleCreateRule}
              onCancel={() => setShowCreateForm(false)}
              quota={quota}
            />
          )}

          {editingRule && (
            <AlertRuleForm
              rule={editingRule}
              onSubmit={(data) => handleUpdateRule(editingRule.id, data)}
              onCancel={() => setEditingRule(null)}
              quota={quota}
            />
          )}

          <AlertRuleList
            rules={rules}
            onEdit={setEditingRule}
            onDelete={handleDeleteRule}
            onToggle={handleToggleRule}
            quota={quota}
          />
        </main>

        <aside className="alert-sidebar" aria-label="Alert information and quota details">
          {stats && <AlertStats stats={stats} />}
          
          <div className="quota-card" role="region" aria-labelledby="quota-title">
            <h3 id="quota-title">Alert Quota</h3>
            {quota ? (
              <div className="quota-details">
                <div className="quota-usage">
                  <span className="usage-count">{quota.currentRules}</span>
                  <span className="usage-separator">/</span>
                  <span className="usage-limit">
                    {quota.maxRules === 'unlimited' ? '∞' : quota.maxRules}
                  </span>
                  <span className="usage-label">alerts</span>
                </div>

                <div className="quota-bar" role="progressbar" 
                     aria-valuenow={quota.currentRules} 
                     aria-valuemax={quota.maxRules === 'unlimited' ? 100 : quota.maxRules}
                     aria-label={`Alert quota: ${quota.currentRules} of ${quota.maxRules === 'unlimited' ? 'unlimited' : quota.maxRules} alerts used`}>
                  <div 
                    className="quota-fill"
                    style={{
                      width: quota.maxRules === 'unlimited' 
                        ? '20%' 
                        : `${Math.min(100, (quota.currentRules / quota.maxRules) * 100)}%`
                    }}
                  />
                </div>

                <div className="tier-info">
                  <span className="tier-name">{quota.tier} Plan</span>
                  {quota.maxRules !== 'unlimited' && !quota.canCreateMore && (
                    <button 
                      className="btn-upgrade-small"
                      onClick={() => window.location.href = '/pricing'}
                      aria-label="Upgrade plan to increase alert quota"
                    >
                      Upgrade
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="quota-loading">Loading quota...</div>
            )}
          </div>

          <div className="help-card" role="region" aria-labelledby="help-title">
            <h4 id="help-title">Alert Types Available</h4>
            <ul className="alert-types-list" role="list">
              <li className="available">✓ Status Changes</li>
              <li className="available">✓ Takeoff & Landing</li>
              
              <FeatureGate 
                feature="unlimitedAlerts" 
                showUpgradePrompt={false}
                fallback={() => (
                  <>
                    <li className="locked">🔒 Off Schedule</li>
                    <li className="locked">🔒 Gate Changes</li>
                    <li className="locked">🔒 Diversions</li>
                    <li className="locked">🔒 Altitude Bands</li>
                  </>
                )}
              >
                <li className="available">✓ Off Schedule</li>
                <li className="available">✓ Gate Changes</li>
                <li className="available">✓ Diversions</li>
                <li className="available">✓ Altitude Bands</li>
                <li className="available">✓ Route Deviations</li>
                <li className="available">✓ Proximity Alerts</li>
              </FeatureGate>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AlertRuleManager;