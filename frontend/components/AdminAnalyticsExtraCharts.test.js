// AdminAnalyticsExtraCharts.test.js
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
jest.mock('victory-native', () => ({
  VictoryChart: ({ children }) => <>{children}</>,
  VictoryBar: () => <></>,
  VictoryLine: () => <></>,
  VictoryAxis: () => <></>,
  VictoryTheme: {},
  VictoryLabel: () => <></>,
  VictoryPie: () => <></>,
}));

import AdminAnalyticsExtraCharts from './AdminAnalyticsExtraCharts';
import axios from 'axios';

jest.mock('axios');

describe('AdminAnalyticsExtraCharts', () => {
  it('renders loading and then charts', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('airport-congestion')) return Promise.resolve({ data: [{ airport: 'JFK', hour: '12', count: 10 }] });
      if (url.includes('route-trends')) return Promise.resolve({ data: [{ route: 'JFK-LAX', flights: 5, avg_minutes: 300, delays: 1 }] });
      if (url.includes('alert-response-times')) return Promise.resolve({ data: [{ event_id: 1, response_sec: 10, ack_sec: 5 }] });
      if (url.includes('weather-impact')) return Promise.resolve({ data: [{ weather_code: 'WX', delays: 2 }] });
      if (url.includes('fleet-utilization')) return Promise.resolve({ data: [{ tail: 'N12345', flights: 3, first: '2025-08-01', last: '2025-08-23' }] });
      if (url.includes('user-engagement')) return Promise.resolve({ data: [{ user_id: 'u1', actions: 7 }] });
      if (url.includes('subscription')) return Promise.resolve({ data: [{ plan: 'Pro', users: 2 }] });
      return Promise.resolve({ data: [] });
    });
  const { getByTestId, queryByTestId, getByText } = render(<AdminAnalyticsExtraCharts />);
  expect(getByTestId('analytics-loading')).toBeTruthy();
  await waitFor(() => expect(queryByTestId('analytics-loading')).toBeNull());
  expect(getByText(/Airport Congestion/)).toBeTruthy();
    expect(getByText(/Route Trends/)).toBeTruthy();
    expect(getByText(/Alert Response Times/)).toBeTruthy();
    expect(getByText(/Weather Impact/)).toBeTruthy();
    expect(getByText(/Fleet Utilization/)).toBeTruthy();
    expect(getByText(/User Engagement/)).toBeTruthy();
    expect(getByText(/Subscription Analytics/)).toBeTruthy();
  });
});
