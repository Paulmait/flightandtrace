import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Modal, Pressable } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from './ThemeProvider';
import { getFuelEstimate } from '../utils/api';

/**
 * FlightFuelCard Component
 * Displays detailed fuel and CO2 estimates for a specific flight
 */
const FlightFuelCard = ({ 
  flight, 
  expanded = false, 
  onToggleExpand = () => {},
  featureEnabled = true 
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [fuelData, setFuelData] = useState(null);
  const [error, setError] = useState(null);
  const [showPhases, setShowPhases] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState('kg'); // kg, L, gal, tCO2
  const [showWhyModal, setShowWhyModal] = useState(false);

  useEffect(() => {
    if (featureEnabled && expanded && !fuelData) {
      fetchFuelEstimate();
    }
  }, [expanded, featureEnabled]);

  const fetchFuelEstimate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getFuelEstimate(flight.id, flight.aircraftType);
      setFuelData(response);
    } catch (err) {
      console.error('Failed to fetch fuel estimate:', err);
      setError('Unable to calculate fuel estimate');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence?.toLowerCase()) {
      case 'high': return theme.colors.success;
      case 'medium': return theme.colors.info;
      case 'low': return theme.colors.warning;
      default: return theme.colors.textSecondary;
    }
  };

  const getPhaseIcon = (phase) => {
    const iconMap = {
      'taxi_out': 'local-taxi',
      'takeoff': 'flight-takeoff',
      'climb': 'trending-up',
      'cruise': 'flight',
      'descent': 'trending-down',
      'approach': 'flight-land',
      'taxi_in': 'local-taxi',
      'ground': 'domain',
    };
    return iconMap[phase] || 'flight';
  };

  const formatPhaseTime = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getDisplayValue = () => {
    if (!fuelData) return { value: 0, unit: 'kg', label: 'Fuel' };
    
    switch (selectedUnit) {
      case 'L':
        return { value: fuelData.fuelL, unit: 'L', label: 'Fuel Volume' };
      case 'gal':
        return { value: fuelData.fuelGal, unit: 'gal', label: 'Fuel Volume' };
      case 'tCO2':
        return { value: fuelData.co2Kg / 1000, unit: 't CO₂', label: 'Emissions' };
      default:
        return { value: fuelData.fuelKg, unit: 'kg', label: 'Fuel Weight' };
    }
  };

  const getEquivalents = () => {
    if (!fuelData) return null;
    
    // Car equivalents: assume 1 car ≈ 8L/day
    const carDays = Math.round(fuelData.fuelL / 8);
    
    // Tanker truck equivalents: 9,000 gal per truck
    const tankerTrucks = (fuelData.fuelGal / 9000).toFixed(2);
    
    return { carDays, tankerTrucks };
  };

  const UnitChip = ({ unit, label, isSelected, onPress }) => (
    <TouchableOpacity
      style={[
        styles.unitChip,
        {
          backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
        }
      ]}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={`Switch to ${label} unit`}
      accessibilityState={{ selected: isSelected }}
    >
      <Text style={[
        styles.unitChipText,
        { color: isSelected ? '#fff' : theme.colors.text }
      ]}>
        {unit}
      </Text>
    </TouchableOpacity>
  );

  const WhyEstimatesModal = () => (
    <Modal
      visible={showWhyModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowWhyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Why Estimates Vary
            </Text>
            <TouchableOpacity onPress={() => setShowWhyModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.reasonItem}>
              <MaterialIcons name="fitness-center" size={20} color={theme.colors.primary} />
              <Text style={[styles.reasonText, { color: theme.colors.text }]}>
                <Text style={styles.reasonTitle}>Aircraft Weight: </Text>
                Heavier loads require more fuel for climb and cruise
              </Text>
            </View>
            
            <View style={styles.reasonItem}>
              <MaterialIcons name="air" size={20} color={theme.colors.primary} />
              <Text style={[styles.reasonText, { color: theme.colors.text }]}>
                <Text style={styles.reasonTitle}>Wind Conditions: </Text>
                Headwinds increase consumption, tailwinds reduce it
              </Text>
            </View>
            
            <View style={styles.reasonItem}>
              <MaterialIcons name="business" size={20} color={theme.colors.primary} />
              <Text style={[styles.reasonText, { color: theme.colors.text }]}>
                <Text style={styles.reasonTitle}>Airline Procedures: </Text>
                Different airlines use varying speeds and altitudes
              </Text>
            </View>
            
            <View style={styles.reasonItem}>
              <MaterialIcons name="schedule" size={20} color={theme.colors.primary} />
              <Text style={[styles.reasonText, { color: theme.colors.text }]}>
                <Text style={styles.reasonTitle}>Taxi Delays: </Text>
                Ground congestion affects taxi fuel consumption
              </Text>
            </View>
            
            <View style={styles.reasonItem}>
              <MaterialIcons name="trending-up" size={20} color={theme.colors.primary} />
              <Text style={[styles.reasonText, { color: theme.colors.text }]}>
                <Text style={styles.reasonTitle}>Step Climbs: </Text>
                Multiple altitude changes during cruise for efficiency
              </Text>
            </View>
            
            <Text style={[styles.disclaimerText, { color: theme.colors.textSecondary }]}>
              These estimates are based on standard flight profiles and conservative burn rates. 
              Actual consumption may vary ±20% based on operational factors.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (!featureEnabled) {
    return null;
  }

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    }]}>
      <TouchableOpacity 
        onPress={onToggleExpand}
        style={styles.header}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <MaterialIcons 
            name="local-gas-station" 
            size={20} 
            color={theme.colors.primary} 
          />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Fuel & Emissions
          </Text>
        </View>

        {fuelData && !loading && (
          <View style={styles.headerRight}>
            <Text style={[styles.mainValue, { color: theme.colors.text }]}>
              {getDisplayValue().value.toFixed(selectedUnit === 'tCO2' ? 2 : 0)} {getDisplayValue().unit}
            </Text>
            <MaterialIcons
              name={expanded ? "expand-less" : "expand-more"}
              size={24}
              color={theme.colors.textSecondary}
            />
          </View>
        )}

        {loading && <ActivityIndicator size="small" color={theme.colors.primary} />}
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.content, { borderTopColor: theme.colors.border }]}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Calculating fuel estimate...
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={24} color={theme.colors.error} />
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {error}
              </Text>
              <TouchableOpacity onPress={fetchFuelEstimate} style={styles.retryButton}>
                <Text style={[styles.retryText, { color: theme.colors.primary }]}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {fuelData && !loading && (
            <>
              {/* Unit Selection Chips */}
              <View style={styles.unitChipsContainer}>
                <Text style={[styles.unitChipsLabel, { color: theme.colors.textSecondary }]}>
                  View as:
                </Text>
                <View style={styles.unitChipsRow}>
                  <UnitChip
                    unit="kg"
                    label="kilograms"
                    isSelected={selectedUnit === 'kg'}
                    onPress={() => setSelectedUnit('kg')}
                  />
                  <UnitChip
                    unit="L"
                    label="liters"
                    isSelected={selectedUnit === 'L'}
                    onPress={() => setSelectedUnit('L')}
                  />
                  <UnitChip
                    unit="gal"
                    label="gallons"
                    isSelected={selectedUnit === 'gal'}
                    onPress={() => setSelectedUnit('gal')}
                  />
                  <UnitChip
                    unit="t CO₂"
                    label="tons CO2"
                    isSelected={selectedUnit === 'tCO2'}
                    onPress={() => setSelectedUnit('tCO2')}
                  />
                </View>
              </View>

              <View style={styles.mainMetrics}>
                <View style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <MaterialIcons name="local-gas-station" size={16} color={theme.colors.primary} />
                    <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
                      Fuel Consumption
                    </Text>
                  </View>
                  <Text style={[styles.metricValue, { color: theme.colors.text }]}>
                    {fuelData.fuelKg.toFixed(1)} kg
                  </Text>
                  <Text style={[styles.metricSubvalue, { color: theme.colors.textSecondary }]}>
                    {fuelData.fuelL.toFixed(1)} L / {fuelData.fuelGal.toFixed(1)} gal
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <MaterialIcons name="eco" size={16} color={theme.colors.warning} />
                    <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
                      CO₂ Emissions
                    </Text>
                  </View>
                  <Text style={[styles.metricValue, { color: theme.colors.text }]}>
                    {fuelData.co2Kg.toFixed(1)} kg
                  </Text>
                  <Text style={[styles.metricSubvalue, { color: theme.colors.textSecondary }]}>
                    {(fuelData.co2Kg / 1000).toFixed(2)} metric tons
                  </Text>
                </View>
              </View>

              <View style={styles.confidenceContainer}>
                <Text style={[styles.confidenceLabel, { color: theme.colors.textSecondary }]}>
                  Estimate Confidence:
                </Text>
                <View style={styles.confidenceValue}>
                  <View style={[styles.confidenceDot, { 
                    backgroundColor: getConfidenceColor(fuelData.confidence) 
                  }]} />
                  <Text style={[styles.confidenceText, { 
                    color: getConfidenceColor(fuelData.confidence) 
                  }]}>
                    {fuelData.confidence}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setShowWhyModal(true)}
                    style={styles.whyLink}
                    accessibilityLabel="Why estimates vary"
                  >
                    <MaterialIcons name="help-outline" size={16} color={theme.colors.primary} />
                    <Text style={[styles.whyLinkText, { color: theme.colors.primary }]}>
                      Why estimates vary
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Equivalents Section */}
              {(() => {
                const equivalents = getEquivalents();
                return equivalents && (
                  <View style={styles.equivalentsContainer}>
                    <Text style={[styles.equivalentsTitle, { color: theme.colors.textSecondary }]}>
                      Equivalents:
                    </Text>
                    <View style={styles.equivalentsRow}>
                      <View style={styles.equivalentItem}>
                        <MaterialIcons name="directions-car" size={16} color={theme.colors.info} />
                        <Text style={[styles.equivalentText, { color: theme.colors.text }]}>
                          ≈ {equivalents.carDays.toLocaleString()} car-days of fuel
                        </Text>
                      </View>
                      <View style={styles.equivalentItem}>
                        <MaterialIcons name="local-shipping" size={16} color={theme.colors.info} />
                        <Text style={[styles.equivalentText, { color: theme.colors.text }]}>
                          ≈ {equivalents.tankerTrucks} tanker trucks
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })()}

              {fuelData.phases && fuelData.phases.length > 0 && (
                <>
                  <TouchableOpacity 
                    onPress={() => setShowPhases(!showPhases)}
                    style={styles.phasesToggle}
                  >
                    <Text style={[styles.phasesToggleText, { color: theme.colors.primary }]}>
                      {showPhases ? 'Hide' : 'Show'} Flight Phases ({fuelData.phases.length})
                    </Text>
                    <MaterialIcons
                      name={showPhases ? "expand-less" : "expand-more"}
                      size={20}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>

                  {showPhases && (
                    <ScrollView style={styles.phasesContainer} showsVerticalScrollIndicator={false}>
                      {fuelData.phases.map((phase, index) => (
                        <View key={index} style={[styles.phaseItem, { 
                          borderLeftColor: theme.colors.primary 
                        }]}>
                          <View style={styles.phaseHeader}>
                            <MaterialIcons 
                              name={getPhaseIcon(phase.phase)} 
                              size={16} 
                              color={theme.colors.primary} 
                            />
                            <Text style={[styles.phaseName, { color: theme.colors.text }]}>
                              {phase.phase.replace('_', ' ').toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.phaseDetails}>
                            <Text style={[styles.phaseDetail, { color: theme.colors.textSecondary }]}>
                              Duration: {formatPhaseTime(phase.duration_minutes)}
                            </Text>
                            <Text style={[styles.phaseDetail, { color: theme.colors.textSecondary }]}>
                              Fuel: {phase.fuel_burn_kg?.toFixed(1) || '0'} kg
                            </Text>
                            <Text style={[styles.phaseDetail, { color: theme.colors.textSecondary }]}>
                              Avg Alt: {Math.round(phase.average_altitude_ft).toLocaleString()} ft
                            </Text>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </>
              )}

              {fuelData.assumptions && (
                <TouchableOpacity 
                  onPress={() => console.log('Show assumptions:', fuelData.assumptions)}
                  style={styles.assumptionsLink}
                >
                  <MaterialIcons name="info-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.assumptionsText, { color: theme.colors.textSecondary }]}>
                    View calculation assumptions
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
      
      <WhyEstimatesModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  mainValue: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  content: {
    borderTopWidth: 1,
    padding: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mainMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    marginHorizontal: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    marginLeft: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 4,
  },
  metricSubvalue: {
    fontSize: 11,
    marginTop: 2,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  confidenceLabel: {
    fontSize: 12,
  },
  confidenceValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  phasesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  phasesToggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  phasesContainer: {
    maxHeight: 200,
    marginTop: 8,
  },
  phaseItem: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 12,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  phaseName: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  phaseDetails: {
    marginLeft: 22,
  },
  phaseDetail: {
    fontSize: 11,
    marginTop: 2,
  },
  assumptionsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  assumptionsText: {
    fontSize: 11,
    marginLeft: 4,
  },
  // New styles for enhanced features
  unitChipsContainer: {
    marginBottom: 12,
  },
  unitChipsLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  unitChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 50,
    alignItems: 'center',
  },
  unitChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  whyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  whyLinkText: {
    fontSize: 11,
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
  equivalentsContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  equivalentsTitle: {
    fontSize: 12,
    marginBottom: 6,
  },
  equivalentsRow: {
    gap: 8,
  },
  equivalentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  equivalentText: {
    fontSize: 11,
    marginLeft: 6,
    flex: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 12,
    maxWidth: 400,
    width: '100%',
    maxHeight: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 12,
  },
  reasonTitle: {
    fontWeight: '600',
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default FlightFuelCard;