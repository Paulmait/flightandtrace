// AdminLoginEventsChart.test.js
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
jest.mock('victory-native', () => ({
  VictoryChart: ({ children }) => <>{children}</>,
  VictoryBar: () => <></>,
  VictoryAxis: () => <></>,
  VictoryTheme: {},
}));

import AdminLoginEventsChart from './AdminLoginEventsChart';
import * as adminAnalytics from '../utils/adminAnalytics';

jest.mock('../utils/adminAnalytics');

describe('AdminLoginEventsChart', () => {
  it('renders loading, error, empty, and data states', async () => {
    // Loading
    let resolve;
    adminAnalytics.fetchLoginEvents.mockReturnValue(new Promise(r => { resolve = r; }));
    const { getByTestId, rerender, getByText, queryByText } = render(<AdminLoginEventsChart />);
    expect(getByTestId('login-events-loading')).toBeTruthy();
    // Error
  adminAnalytics.fetchLoginEvents.mockRejectedValueOnce(new Error('fail'));
  const { getByText: getByText2 } = render(<AdminLoginEventsChart />);
  await waitFor(() => getByText2(/fail/));
    // Empty
  adminAnalytics.fetchLoginEvents.mockResolvedValueOnce([]);
  const { getByText: getByText3 } = render(<AdminLoginEventsChart />);
  await waitFor(() => getByText3(/No login events data/));
    // Data
    adminAnalytics.fetchLoginEvents.mockResolvedValueOnce([
      { timestamp: '2025-08-01T12:00:00Z' }, { timestamp: '2025-08-01T13:00:00Z' }, { timestamp: '2025-08-02T10:00:00Z' }
    ]);
    const { getByText: getByText4 } = render(<AdminLoginEventsChart />);
    await waitFor(() => getByText4(/Login Events/));
    expect(getByText4('2025-08-01')).toBeTruthy();
    expect(getByText4('2025-08-02')).toBeTruthy();
  });
});
