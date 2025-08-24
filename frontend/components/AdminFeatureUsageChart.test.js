// AdminFeatureUsageChart.test.js
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
jest.mock('victory-native', () => ({
  VictoryChart: ({ children }) => <>{children}</>,
  VictoryBar: () => <></>,
  VictoryAxis: () => <></>,
  VictoryTheme: {},
}));

import AdminFeatureUsageChart from './AdminFeatureUsageChart';
import * as adminAnalytics from '../utils/adminAnalytics';

jest.mock('../utils/adminAnalytics');

describe('AdminFeatureUsageChart', () => {
  it('renders loading, error, empty, and data states', async () => {
    // Loading
    let resolve;
    adminAnalytics.fetchFeatureUsage.mockReturnValue(new Promise(r => { resolve = r; }));
    const { getByTestId, rerender, getByText, queryByText } = render(<AdminFeatureUsageChart />);
    expect(getByTestId('feature-usage-loading')).toBeTruthy();
    // Error
  adminAnalytics.fetchFeatureUsage.mockRejectedValueOnce(new Error('fail'));
  const { getByText: getByText2 } = render(<AdminFeatureUsageChart />);
  await waitFor(() => getByText2(/fail/));
    // Empty
  adminAnalytics.fetchFeatureUsage.mockResolvedValueOnce([]);
  const { getByText: getByText3 } = render(<AdminFeatureUsageChart />);
  await waitFor(() => getByText3(/No feature usage data/));
    // Data
    adminAnalytics.fetchFeatureUsage.mockResolvedValueOnce([
      { feature: 'login' }, { feature: 'login' }, { feature: 'export' }
    ]);
    const { getByText: getByText4 } = render(<AdminFeatureUsageChart />);
    await waitFor(() => getByText4(/Feature Usage/));
    expect(getByText4('login')).toBeTruthy();
    expect(getByText4('export')).toBeTruthy();
  });
});
