import React, { useState } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import TrialBanner from '../TrialBanner/TrialBanner';
import './PricingPage.css';

const PricingPage = () => {
  const { createCheckoutSession, subscription } = useSubscription();
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [loading, setLoading] = useState(null);

  // Updated pricing tiers aligned with FR24 and FlightAware
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: { monthly: 0, yearly: 0 },
      description: 'Basic flight tracking for casual users',
      features: [
        'Real-time flight map¹',
        '24-48h flight history²',
        '2 alert rules³',
        'Basic search',
        'Community support'
      ],
      limitations: [
        'Includes ads',
        'No weather overlay',
        'No advanced filters',
        'No data export'
      ],
      cta: 'Current Plan',
      popular: false
    },
    {
      id: 'plus',
      name: 'Plus',
      price: { monthly: 4.99, yearly: 39.99 },
      description: 'Enhanced tracking with more history and no ads',
      trialDays: 7,
      features: [
        'Ad-free experience',
        '30-day flight history²',
        '20 alert rules³',
        'Weather overlay⁴',
        'Advanced filters',
        'Email support'
      ],
      cta: 'Start Free Trial',
      popular: true,
      competitor: 'Matches FR24 Silver pricing'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: { monthly: 14.99, yearly: 119.99 },
      description: 'Advanced analytics and unlimited alerts for serious users',
      trialDays: 7,
      features: [
        'Everything in Plus',
        '365-day flight history²',
        'Unlimited alert rules³',
        'API access (10,000/day)⁵',
        'CSV & XML export⁶',
        'Priority support'
      ],
      cta: 'Start Free Trial',
      competitor: 'Better value than FlightAware Premium'
    },
    {
      id: 'business',
      name: 'Business',
      price: { monthly: 39.99, yearly: 349.99 },
      description: 'Enterprise solution with team management and SLA',
      features: [
        'Everything in Pro',
        '3-year flight history²',
        'Team seats & SSO⁷',
        'Unlimited API access⁵',
        'All export formats⁶',
        'Custom integrations',
        '99.9% SLA⁹',
        'Dedicated support'
      ],
      cta: 'Start 14-Day Trial',
      trialDays: 14
    }
  ];

  const handleSelectPlan = async (plan) => {
    if (plan.id === 'free') return;
    
    if (plan.id === 'business') {
      window.location.href = '/contact-sales';
      return;
    }

    const priceId = billingInterval === 'monthly' 
      ? `price_${plan.id}_monthly` 
      : `price_${plan.id}_yearly`;

    setLoading(plan.id);
    try {
      await createCheckoutSession(priceId, plan.trialDays);
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    } finally {
      setLoading(null);
    }
  };

  const getButtonText = (plan) => {
    if (loading === plan.id) return 'Loading...';
    if (subscription?.tier === plan.id) return 'Current Plan';
    return plan.cta;
  };

  const getButtonClass = (plan) => {
    const baseClass = 'plan-cta';
    if (loading === plan.id) return `${baseClass} loading`;
    if (subscription?.tier === plan.id) return `${baseClass} current`;
    if (plan.popular) return `${baseClass} popular`;
    if (plan.id === 'free') return `${baseClass} disabled`;
    return baseClass;
  };

  const yearlyDiscount = (plan) => {
    if (plan.price.monthly === 0) return 0;
    const monthlyTotal = plan.price.monthly * 12;
    const savings = monthlyTotal - plan.price.yearly;
    return Math.round((savings / monthlyTotal) * 100);
  };

  return (
    <div className="pricing-page">
      <TrialBanner />
      
      <div className="pricing-header">
        <h1>Choose Your Plan</h1>
        <p>Get the flight tracking features you need with transparent pricing</p>
        
        <div className="billing-toggle">
          <button 
            className={billingInterval === 'monthly' ? 'active' : ''}
            onClick={() => setBillingInterval('monthly')}
          >
            Monthly
          </button>
          <button 
            className={billingInterval === 'yearly' ? 'active' : ''}
            onClick={() => setBillingInterval('yearly')}
          >
            Yearly
            <span className="discount-badge">Save up to 17%</span>
          </button>
        </div>
      </div>

      <div className="pricing-grid">
        {plans.map((plan) => (
          <div key={plan.id} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
            {plan.popular && <div className="popular-badge">Most Popular</div>}
            
            <div className="plan-header">
              <h3>{plan.name}</h3>
              <div className="price">
                <span className="currency">$</span>
                <span className="amount">
                  {plan.price[billingInterval]}
                </span>
                <span className="period">
                  /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                </span>
                {billingInterval === 'yearly' && plan.price.monthly > 0 && (
                  <div className="yearly-note">
                    ${(plan.price.yearly / 12).toFixed(2)}/mo
                    {yearlyDiscount(plan) > 0 && (
                      <span className="savings">Save {yearlyDiscount(plan)}%</span>
                    )}
                  </div>
                )}
              </div>
              <p className="plan-description">{plan.description}</p>
            </div>

            <div className="plan-features">
              <ul>
                {plan.features.map((feature, index) => (
                  <li key={index}>
                    <span className="check">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              
              {plan.limitations && (
                <div className="limitations">
                  <h4>Not included:</h4>
                  <ul>
                    {plan.limitations.map((limitation, index) => (
                      <li key={index}>
                        <span className="cross">×</span>
                        {limitation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              className={getButtonClass(plan)}
              onClick={() => handleSelectPlan(plan)}
              disabled={loading === plan.id || subscription?.tier === plan.id}
            >
              {getButtonText(plan)}
            </button>

            {plan.trialDays && (
              <div className="trial-info">
                {plan.trialDays}-day free trial • No commitment
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="competitive-comparison">
        <h2>How We Compare to the Competition</h2>
        <div className="comparison-table">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>FlightTrace Plus</th>
                <th>FlightTrace Pro</th>
                <th>Flightradar24 Gold¹⁰</th>
                <th>FlightAware Premium¹¹</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Monthly Price</td>
                <td><strong>$4.99</strong></td>
                <td><strong>$14.99</strong></td>
                <td>$3.99</td>
                <td>$39.95</td>
              </tr>
              <tr>
                <td>Historical Data</td>
                <td>30 days</td>
                <td><strong>365 days</strong></td>
                <td>365 days</td>
                <td>6 months</td>
              </tr>
              <tr>
                <td>Alert Rules</td>
                <td>20</td>
                <td><strong>Unlimited</strong></td>
                <td>Unlimited</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Ad-free Experience</td>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Weather Overlay</td>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>API Access</td>
                <td>1,000/day</td>
                <td><strong>10,000/day</strong></td>
                <td>✗</td>
                <td>500/month</td>
              </tr>
              <tr>
                <td>Data Export</td>
                <td>✗</td>
                <td><strong>CSV/XML</strong></td>
                <td>✗</td>
                <td>Limited CSV</td>
              </tr>
              <tr>
                <td>Free Trial</td>
                <td><strong>7 days</strong></td>
                <td><strong>7 days</strong></td>
                <td>7 days</td>
                <td>✗</td>
              </tr>
              <tr>
                <td><strong>Value Score</strong></td>
                <td><strong>Best Entry-level</strong></td>
                <td><strong>Best Overall Value</strong></td>
                <td>Basic Premium</td>
                <td>Expensive Enterprise</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="comparison-highlights">
          <div className="highlight">
            <h4>💡 Why Choose FlightTrace Plus?</h4>
            <p>Perfect balance of features and price. Get ad-free tracking with weather overlay and 30-day history for just $4.99/month - competitive with FR24 while offering better API access.</p>
          </div>
          <div className="highlight">
            <h4>🚀 Why Choose FlightTrace Pro?</h4>
            <p>Best value for power users. Get 365-day history, unlimited alerts, and 10,000 API calls/day for $25 less than FlightAware Premium. Includes data export that FR24 doesn't offer.</p>
          </div>
        </div>
      </div>

      <div className="pricing-footnotes">
        <h3>Footnotes</h3>
        <ol>
          <li>Real-time data subject to data provider availability and coverage areas</li>
          <li>Historical data retention varies by data source and geographic region</li>
          <li>Alert rules include flight status changes, route deviations, and custom triggers</li>
          <li>Weather overlay includes precipitation, clouds, and atmospheric conditions</li>
          <li>API rate limits reset daily at 00:00 UTC. Fair usage policy applies</li>
          <li>Export formats include CSV, GeoJSON, and KML. Size limits apply</li>
          <li>Team features include shared workspaces and collaborative alert management</li>
          <li>SSO integration supports SAML 2.0 and OAuth providers</li>
          <li>SLA covers 99.9% uptime with credits for service interruptions</li>
          <li>Flightradar24 pricing and features from flightradar24.com (Sept 2025)</li>
          <li>FlightAware pricing and features from flightaware.com (Sept 2025)</li>
        </ol>
        
        <div className="pricing-sources">
          <h4>Sources & Verification</h4>
          <p>
            Competitor pricing is sourced directly from public websites and is accurate as of September 2025. 
            Features may vary by plan tier. We recommend checking competitor sites for current pricing and feature details.
            Prices shown exclude applicable taxes and may vary by region.
          </p>
          <p>
            <strong>Last Updated:</strong> September 8, 2025<br/>
            <strong>Next Review:</strong> October 2025
          </p>
        </div>
      </div>

      <div className="pricing-faq">
        <h3>Frequently Asked Questions</h3>
        <div className="faq-grid">
          <div className="faq-item">
            <h4>Can I cancel anytime?</h4>
            <p>Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
          </div>
          <div className="faq-item">
            <h4>What happens after my trial ends?</h4>
            <p>If you don't cancel during your 7-day trial, you'll be charged for your selected plan and your subscription will continue.</p>
          </div>
          <div className="faq-item">
            <h4>Do you offer refunds?</h4>
            <p>We offer a 30-day money-back guarantee for all paid plans. Contact support for assistance with refunds.</p>
          </div>
          <div className="faq-item">
            <h4>Can I change plans later?</h4>
            <p>Yes, you can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;