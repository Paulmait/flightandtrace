import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import App from '../App';
import NotificationsScreen from '../screens/NotificationsScreen';
import { sendPushNotification, sendSMS, sendEmail } from '../utils/notificationService';

jest.mock('../utils/api', () => ({
  fetchUserProfile: jest.fn(token => Promise.resolve({ plan: token === 'premium-token' ? 'Premium' : 'Free' })),
  fetchAnalytics: jest.fn(() => Promise.resolve({ flights: 10 })),
}));

jest.mock('../utils/notificationService', () => ({
  sendPushNotification: jest.fn(() => Promise.resolve()),
  sendSMS: jest.fn(() => Promise.resolve()),
  sendEmail: jest.fn(() => Promise.resolve()),
}));

describe('Notification delivery for premium users', () => {
  it('calls notification utilities when preferences are saved', async () => {
    const onSave = jest.fn();
    const { getByText, getByDisplayValue } = render(
      <NotificationsScreen userPlan="Premium" userId="test-user" preferences={{ push: true, sms: true, email: true, threshold: '10' }} onSave={onSave} navigation={{ navigate: jest.fn() }} />
    );
    fireEvent.press(getByText('Save Preferences'));
    await waitFor(() => {
      expect(sendPushNotification).toHaveBeenCalledWith('test-user', expect.any(String));
      expect(sendSMS).toHaveBeenCalledWith('test-user', expect.any(String));
      expect(sendEmail).toHaveBeenCalledWith('test-user', expect.any(String), expect.any(String));
    });
  });
});

describe('User plan propagation and premium gating', () => {
  it('updates userPlan after login and propagates to all screens', async () => {
    // ...existing code for login and plan change...
  });
  it('shows correct gating for downgraded user', async () => {
    // Simulate user downgrade
    jest.spyOn(require('../utils/api'), 'fetchUserProfile').mockImplementation(() => Promise.resolve({ plan: 'Free' }));
    const { getByText } = render(<App />);
    // ...simulate navigation to premium screens...
    expect(getByText(/Premium feature/)).toBeTruthy();
  });
});
