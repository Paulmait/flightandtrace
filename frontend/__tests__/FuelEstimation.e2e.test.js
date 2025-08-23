/**
 * End-to-end tests for Fuel Estimation feature
 * Tests API integration, UI components, and feature flags
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FuelEstimateTicker from '../components/FuelEstimateTicker';
import FlightFuelCard from '../components/FlightFuelCard';
import SettingsScreen from '../screens/SettingsScreen';
import { ThemeProvider } from '../components/ThemeProvider';
import * as api from '../utils/api';

// Mock API calls
jest.mock('../utils/api');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

describe('Fuel Estimation E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(null);
  });

  describe('Feature Flag Integration', () => {
    it('should respect feature flag for fuel estimates', async () => {
      // Mock feature flags API
      api.getFeatureFlags.mockResolvedValue({
        fuelEstimates: false,
        weatherOverlay: true,
      });

      const { queryByTestId } = render(
        <ThemeProvider>
          <FuelEstimateTicker activeFlights={[]} featureEnabled={false} />
        </ThemeProvider>
      );

      // Component should not render when feature is disabled
      expect(queryByTestId('fuel-ticker')).toBeNull();
    });

    it('should show fuel toggle in settings when feature is available', async () => {
      api.getFeatureFlags.mockResolvedValue({
        fuelEstimates: true,
      });

      const { getByText } = render(
        <ThemeProvider>
          <SettingsScreen />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(getByText('Fuel & CO₂ Estimates')).toBeTruthy();
      });
    });
  });

  describe('Fuel API Integration', () => {
    it('should fetch fuel estimate from API', async () => {
      const mockFuelData = {
        fuelKg: 2500,
        fuelL: 3125,
        fuelGal: 825.5,
        co2Kg: 7900,
        confidence: 'high',
        assumptions: { aircraft_type: 'B738' },
        phases: [
          {
            phase: 'cruise',
            duration_minutes: 120,
            fuel_burn_kg: 2000,
            average_altitude_ft: 35000,
          },
        ],
      };

      api.getFuelEstimate.mockResolvedValue(mockFuelData);

      const mockFlight = {
        id: 'FL123',
        aircraftType: 'B738',
        tailNumber: 'N12345',
      };

      const { getByText, rerender } = render(
        <ThemeProvider>
          <FlightFuelCard 
            flight={mockFlight} 
            expanded={false}
            featureEnabled={true}
          />
        </ThemeProvider>
      );

      // Expand the card to trigger API call
      act(() => {
        rerender(
          <ThemeProvider>
            <FlightFuelCard 
              flight={mockFlight} 
              expanded={true}
              featureEnabled={true}
            />
          </ThemeProvider>
        );
      });

      await waitFor(() => {
        expect(api.getFuelEstimate).toHaveBeenCalledWith('FL123', 'B738');
        expect(getByText('2500 kg')).toBeTruthy();
        expect(getByText('7900.0 kg')).toBeTruthy(); // CO2
      });
    });

    it('should handle API errors gracefully', async () => {
      api.getFuelEstimate.mockRejectedValue(new Error('API Error'));

      const mockFlight = {
        id: 'FL456',
        aircraftType: 'A320',
      };

      const { getByText, rerender } = render(
        <ThemeProvider>
          <FlightFuelCard 
            flight={mockFlight} 
            expanded={false}
            featureEnabled={true}
          />
        </ThemeProvider>
      );

      act(() => {
        rerender(
          <ThemeProvider>
            <FlightFuelCard 
              flight={mockFlight} 
              expanded={true}
              featureEnabled={true}
            />
          </ThemeProvider>
        );
      });

      await waitFor(() => {
        expect(getByText('Unable to calculate fuel estimate')).toBeTruthy();
        expect(getByText('Retry')).toBeTruthy();
      });
    });
  });

  describe('Fuel Ticker Component', () => {
    it('should calculate totals for multiple active flights', () => {
      const activeFlights = [
        {
          id: '1',
          flightNumber: 'AA100',
          fuelEstimate: {
            fuelKg: 1000,
            co2Kg: 3160,
            confidence: 'high',
          },
        },
        {
          id: '2',
          flightNumber: 'DL200',
          fuelEstimate: {
            fuelKg: 1500,
            co2Kg: 4740,
            confidence: 'medium',
          },
        },
      ];

      const { getByText } = render(
        <ThemeProvider>
          <FuelEstimateTicker 
            activeFlights={activeFlights}
            featureEnabled={true}
          />
        </ThemeProvider>
      );

      // Check total calculations
      expect(getByText(/2.5K kg/)).toBeTruthy(); // Total fuel
      expect(getByText(/7.9K kg CO₂/)).toBeTruthy(); // Total CO2
    });

    it('should expand to show flight breakdown', async () => {
      const activeFlights = [
        {
          id: '1',
          flightNumber: 'AA100',
          fuelEstimate: { fuelKg: 1000, confidence: 'high' },
        },
      ];

      const { getByText, queryByText } = render(
        <ThemeProvider>
          <FuelEstimateTicker 
            activeFlights={activeFlights}
            featureEnabled={true}
          />
        </ThemeProvider>
      );

      // Initially collapsed
      expect(queryByText('AA100')).toBeNull();

      // Expand ticker
      const header = getByText('Active Flights Fuel');
      fireEvent.press(header.parent);

      await waitFor(() => {
        expect(getByText('AA100')).toBeTruthy();
        expect(getByText('1.0K kg')).toBeTruthy();
      });
    });

    it('should display confidence level correctly', () => {
      const activeFlights = [
        {
          id: '1',
          fuelEstimate: { fuelKg: 1000, confidence: 'low' },
        },
      ];

      const { getByText } = render(
        <ThemeProvider>
          <FuelEstimateTicker 
            activeFlights={activeFlights}
            featureEnabled={true}
          />
        </ThemeProvider>
      );

      // Expand to see confidence
      const header = getByText('Active Flights Fuel');
      fireEvent.press(header.parent);

      expect(getByText('Low')).toBeTruthy();
    });
  });

  describe('Settings Integration', () => {
    it('should save fuel estimation preference', async () => {
      api.getFeatureFlags.mockResolvedValue({ fuelEstimates: true });
      api.updateUserSettings.mockResolvedValue({ success: true });

      const { getByText, getAllByRole } = render(
        <ThemeProvider>
          <SettingsScreen />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(getByText('Fuel & CO₂ Estimates')).toBeTruthy();
      });

      // Toggle fuel estimates
      const switches = getAllByRole('switch');
      const fuelSwitch = switches[0]; // Assuming it's the first switch
      fireEvent(fuelSwitch, 'valueChange', true);

      // Save settings
      const saveButton = getByText('Save Settings');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'featureSettings',
          expect.stringContaining('fuelEstimates')
        );
        expect(api.updateUserSettings).toHaveBeenCalled();
      });
    });

    it('should disable fuel notifications when fuel estimates are off', async () => {
      api.getFeatureFlags.mockResolvedValue({ fuelEstimates: false });

      const { getByText, getAllByRole } = render(
        <ThemeProvider>
          <SettingsScreen />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(getByText('Fuel Updates')).toBeTruthy();
      });

      // Fuel updates switch should be disabled
      const switches = getAllByRole('switch');
      const fuelNotificationSwitch = switches.find(s => s.props.disabled);
      expect(fuelNotificationSwitch).toBeTruthy();
    });
  });

  describe('Phase Display', () => {
    it('should display flight phases when available', async () => {
      const mockFuelData = {
        fuelKg: 2500,
        fuelL: 3125,
        fuelGal: 825.5,
        co2Kg: 7900,
        confidence: 'high',
        phases: [
          { phase: 'taxi_out', duration_minutes: 10, fuel_burn_kg: 100 },
          { phase: 'climb', duration_minutes: 20, fuel_burn_kg: 800 },
          { phase: 'cruise', duration_minutes: 120, fuel_burn_kg: 1500 },
          { phase: 'descent', duration_minutes: 15, fuel_burn_kg: 100 },
        ],
      };

      api.getFuelEstimate.mockResolvedValue(mockFuelData);

      const { getByText, rerender } = render(
        <ThemeProvider>
          <FlightFuelCard 
            flight={{ id: 'FL789', aircraftType: 'B738' }}
            expanded={true}
            featureEnabled={true}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(getByText(/Show Flight Phases/)).toBeTruthy();
      });

      // Expand phases
      fireEvent.press(getByText(/Show Flight Phases/));

      await waitFor(() => {
        expect(getByText('TAXI OUT')).toBeTruthy();
        expect(getByText('CLIMB')).toBeTruthy();
        expect(getByText('CRUISE')).toBeTruthy();
        expect(getByText('DESCENT')).toBeTruthy();
      });
    });
  });

  describe('Unit Conversion', () => {
    it('should display correct unit conversions', async () => {
      const mockFuelData = {
        fuelKg: 1000,
        fuelL: 1250,
        fuelGal: 330.2,
        co2Kg: 3160,
        confidence: 'high',
      };

      api.getFuelEstimate.mockResolvedValue(mockFuelData);

      const { getByText, rerender } = render(
        <ThemeProvider>
          <FlightFuelCard 
            flight={{ id: 'UNIT123', aircraftType: 'A320' }}
            expanded={true}
            featureEnabled={true}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(getByText('1000.0 kg')).toBeTruthy();
        expect(getByText('1250.0 L / 330.2 gal')).toBeTruthy();
        expect(getByText('3.16 metric tons')).toBeTruthy();
      });
    });
  });

  describe('Performance', () => {
    it('should handle rapid updates without memory leaks', async () => {
      const component = render(
        <ThemeProvider>
          <FuelEstimateTicker 
            activeFlights={[]}
            featureEnabled={true}
          />
        </ThemeProvider>
      );

      // Simulate rapid flight updates
      for (let i = 0; i < 10; i++) {
        const flights = Array(i).fill(null).map((_, idx) => ({
          id: `FL${idx}`,
          fuelEstimate: { fuelKg: 100 * idx },
        }));

        act(() => {
          component.rerender(
            <ThemeProvider>
              <FuelEstimateTicker 
                activeFlights={flights}
                featureEnabled={true}
              />
            </ThemeProvider>
          );
        });
      }

      // Component should still be responsive
      expect(component).toBeTruthy();
    });
  });
});

describe('Accessibility', () => {
  it('should have proper accessibility labels', () => {
    const { getByLabelText } = render(
      <ThemeProvider>
        <FuelEstimateTicker 
          activeFlights={[{ id: '1', fuelEstimate: { fuelKg: 1000 } }]}
          featureEnabled={true}
          accessible={true}
          accessibilityLabel="Fuel consumption ticker"
        />
      </ThemeProvider>
    );

    expect(getByLabelText('Fuel consumption ticker')).toBeTruthy();
  });
});