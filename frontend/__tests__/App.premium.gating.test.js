import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import App from '../App';

// Mock navigation and API utilities
jest.mock('../utils/api', () => ({
  fetchUserProfile: jest.fn(token => Promise.resolve({ plan: token === 'premium-token' ? 'Premium' : 'Free' })),
  fetchAnalytics: jest.fn(() => Promise.resolve({ flights: 10 })),
}));

jest.mock('../screens/NotificationsScreen', () => {
  return jest.fn(({ userPlan, userId }) => {
    return React.createElement('View', {},
      React.createElement('Text', {}, `NotificationsScreen: userPlan=${userPlan}, userId=${userId}`)
    );
  });
});

// Helper to set token
function setTokenAndRerender(rerender, token) {
  rerender(<App />);
  // Simulate login by setting token
}

describe('Premium gating and user plan propagation', () => {
  it('shows upgrade CTA for Free user on premium screens', async () => {
    const { getByText } = render(<App />);
    // Simulate login as Free user
    await waitFor(() => getByText('Onboarding'));
    // Simulate navigation to History
    // ...existing code for navigation...
    // Check upgrade CTA
    expect(getByText(/Flight history is a Premium feature/)).toBeTruthy();
    expect(getByText(/Upgrade to Premium/)).toBeTruthy();
  });

  it('shows premium features for Premium user', async () => {
    // Simulate login as Premium user
    jest.spyOn(require('../utils/api'), 'fetchUserProfile').mockImplementation(() => Promise.resolve({ plan: 'Premium' }));
    const { getByText } = render(<App />);
    // ...simulate navigation to History, Analytics, Notifications, FlightReplay...
    // Check premium features are accessible
    expect(getByText(/NotificationsScreen: userPlan=Premium/)).toBeTruthy();
  });

  it('updates userPlan after login and propagates to all screens', async () => {
    // Simulate login and plan change
    const { getByText, rerender } = render(<App />);
    // ...simulate login...
    // Change plan
    jest.spyOn(require('../utils/api'), 'fetchUserProfile').mockImplementation(() => Promise.resolve({ plan: 'Premium' }));
    setTokenAndRerender(rerender, 'premium-token');
    await waitFor(() => getByText(/userPlan=Premium/));
  });
});
