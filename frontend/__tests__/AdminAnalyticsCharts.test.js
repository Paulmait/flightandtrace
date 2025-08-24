import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AdminAnalyticsCharts from '../components/AdminAnalyticsCharts';

global.fetch = jest.fn((url) => {
  if (url.includes('flight-frequency')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ tail: 'N12345', count: 10 }]) });
  if (url.includes('delays')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ tail: 'N12345', delays: 2 }]) });
  if (url.includes('patterns')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ N12345: { 0: 1, 1: 2, 2: 3 } }) });
  return Promise.resolve({ ok: false });
});

describe('AdminAnalyticsCharts', () => {
  it('renders analytics charts with mock data', async () => {
    const { getByText } = render(<AdminAnalyticsCharts />);
    await waitFor(() => {
      expect(getByText(/Flight Frequency/)).toBeTruthy();
      expect(getByText(/Delays/)).toBeTruthy();
      expect(getByText(/Flight Patterns/)).toBeTruthy();
      expect(getByText('N12345')).toBeTruthy();
    });
  });
});
