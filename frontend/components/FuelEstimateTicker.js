import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from './ThemeProvider';

/**
 * FuelEstimateTicker Component
 * Displays real-time fuel and CO2 estimates for active flights on screen
 */
const FuelEstimateTicker = ({ activeFlights = [], featureEnabled = true }) => {
  const { theme } = useTheme();
  const [totalFuel, setTotalFuel] = useState({ kg: 0, liters: 0, gallons: 0 });
  const [totalCO2, setTotalCO2] = useState(0);
  const [animatedValue] = useState(new Animated.Value(0));
  const [isExpanded, setIsExpanded] = useState(false);

  // Core constants
  const JET_A_DENSITY_KG_PER_L = 0.8;
  const CO2_PER_KG_FUEL = 3.16;
  const GALLONS_PER_LITER = 0.264172;

  useEffect(() => {
    if (!featureEnabled) return;

    calculateTotals();
    
    // Animate ticker when values change
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeFlights, featureEnabled]);

  const calculateTotals = () => {
    let totalKg = 0;
    
    activeFlights.forEach(flight => {
      if (flight.fuelEstimate) {
        totalKg += flight.fuelEstimate.fuelKg || 0;
      }
    });

    const totalLiters = totalKg / JET_A_DENSITY_KG_PER_L;
    const totalGallons = totalLiters * GALLONS_PER_LITER;
    const totalCO2Kg = totalKg * CO2_PER_KG_FUEL;

    setTotalFuel({
      kg: totalKg,
      liters: totalLiters,
      gallons: totalGallons,
    });
    setTotalCO2(totalCO2Kg);
  };

  const formatNumber = (num, decimals = 1) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(decimals)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(decimals)}K`;
    }
    return num.toFixed(decimals);
  };

  const getConfidenceColor = () => {
    const confidenceLevels = activeFlights
      .filter(f => f.fuelEstimate?.confidence)
      .map(f => f.fuelEstimate.confidence);

    if (confidenceLevels.includes('low')) return theme.colors.warning;
    if (confidenceLevels.includes('medium')) return theme.colors.info;
    return theme.colors.success;
  };

  if (!featureEnabled || activeFlights.length === 0) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          transform: [{ scale: animatedValue }],
        },
      ]}
    >
      <TouchableOpacity 
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.header}
      >
        <View style={styles.iconContainer}>
          <MaterialIcons 
            name="local-gas-station" 
            size={20} 
            color={theme.colors.primary} 
          />
          <View style={[styles.badge, { backgroundColor: getConfidenceColor() }]}>
            <Text style={styles.badgeText}>{activeFlights.length}</Text>
          </View>
        </View>

        <View style={styles.mainStats}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Active Flights Fuel
          </Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {formatNumber(totalFuel.kg)} kg
          </Text>
        </View>

        <View style={styles.co2Container}>
          <MaterialIcons 
            name="eco" 
            size={16} 
            color={theme.colors.warning} 
          />
          <Text style={[styles.co2Value, { color: theme.colors.text }]}>
            {formatNumber(totalCO2)} kg CO₂
          </Text>
        </View>

        <MaterialIcons
          name={isExpanded ? "expand-less" : "expand-more"}
          size={24}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={[styles.details, { borderTopColor: theme.colors.border }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Fuel Volume:
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {formatNumber(totalFuel.liters)} L / {formatNumber(totalFuel.gallons)} gal
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Avg per Flight:
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {formatNumber(totalFuel.kg / activeFlights.length)} kg
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Confidence:
            </Text>
            <View style={styles.confidenceIndicator}>
              <View 
                style={[
                  styles.confidenceDot, 
                  { backgroundColor: getConfidenceColor() }
                ]} 
              />
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {activeFlights.some(f => f.fuelEstimate?.confidence === 'high') ? 'High' :
                 activeFlights.some(f => f.fuelEstimate?.confidence === 'medium') ? 'Medium' : 'Low'}
              </Text>
            </View>
          </View>

          <View style={styles.flightBreakdown}>
            {activeFlights.slice(0, 3).map((flight, index) => (
              <View key={flight.id || index} style={styles.flightItem}>
                <Text style={[styles.flightId, { color: theme.colors.textSecondary }]}>
                  {flight.flightNumber || flight.tailNumber}
                </Text>
                <Text style={[styles.flightFuel, { color: theme.colors.text }]}>
                  {formatNumber(flight.fuelEstimate?.fuelKg || 0)} kg
                </Text>
              </View>
            ))}
            {activeFlights.length > 3 && (
              <Text style={[styles.moreFlights, { color: theme.colors.textSecondary }]}>
                +{activeFlights.length - 3} more flights
              </Text>
            )}
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    right: 20,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 280,
    maxWidth: 350,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mainStats: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  co2Container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  co2Value: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  details: {
    borderTopWidth: 1,
    padding: 12,
    paddingTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  confidenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  flightBreakdown: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  flightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  flightId: {
    fontSize: 11,
  },
  flightFuel: {
    fontSize: 11,
    fontWeight: '500',
  },
  moreFlights: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
});

// Add missing import
import { TouchableOpacity } from 'react-native';

export default FuelEstimateTicker;