import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function ModernFlightCard({ 
  flight, 
  onPress, 
  onLongPress,
  isFamily = false,
  prediction = null 
}) {
  const [expanded, setExpanded] = useState(false);
  const animatedHeight = new Animated.Value(120);
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(1);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (onPress) onPress(flight);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onLongPress) onLongPress(flight);
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
    Animated.timing(animatedHeight, {
      toValue: expanded ? 120 : 280,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const getStatusColor = () => {
    switch (flight.status?.toLowerCase()) {
      case 'airborne':
      case 'in_flight':
        return ['#4CAF50', '#45a049'];
      case 'delayed':
        return ['#FF9800', '#F57C00'];
      case 'cancelled':
        return ['#F44336', '#D32F2F'];
      case 'landed':
        return ['#2196F3', '#1976D2'];
      default:
        return ['#9E9E9E', '#757575'];
    }
  };

  const getStatusIcon = () => {
    switch (flight.status?.toLowerCase()) {
      case 'airborne':
      case 'in_flight':
        return 'airplane';
      case 'delayed':
        return 'time-outline';
      case 'cancelled':
        return 'close-circle-outline';
      case 'landed':
        return 'checkmark-circle-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderPrediction = () => {
    if (!prediction) return null;

    return (
      <View style={styles.predictionContainer}>
        <BlurView intensity={80} style={styles.predictionBlur}>
          <View style={styles.predictionContent}>
            <Ionicons 
              name="bulb-outline" 
              size={16} 
              color="#FFD700" 
            />
            <Text style={styles.predictionText}>
              {prediction.probability > 0.7 
                ? `High delay risk: ${prediction.expected_delay}min`
                : prediction.probability > 0.4
                ? `Possible delay: ${prediction.expected_delay}min`
                : 'On-time arrival expected'}
            </Text>
          </View>
        </BlurView>
      </View>
    );
  };

  const renderFamilyBadge = () => {
    if (!isFamily) return null;

    return (
      <View style={styles.familyBadge}>
        <Ionicons name="people" size={12} color="#FFF" />
        <Text style={styles.familyBadgeText}>Family</Text>
      </View>
    );
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          height: animatedHeight,
        },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.9}
        delayLongPress={500}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8F9FA']}
          style={styles.cardGradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.tailNumberContainer}>
                <Text style={styles.tailNumber}>{flight.tail_number}</Text>
                {renderFamilyBadge()}
              </View>
              <Text style={styles.aircraft}>{flight.aircraft_type || 'Aircraft'}</Text>
            </View>
            
            <TouchableOpacity onPress={toggleExpanded} style={styles.expandButton}>
              <Ionicons 
                name={expanded ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          {/* Status Bar */}
          <LinearGradient
            colors={getStatusColor()}
            style={styles.statusBar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name={getStatusIcon()} size={16} color="#FFF" />
            <Text style={styles.statusText}>{flight.status || 'Unknown'}</Text>
            {flight.altitude && (
              <>
                <Text style={styles.statusDivider}>•</Text>
                <Text style={styles.statusText}>{flight.altitude.toLocaleString()}ft</Text>
              </>
            )}
            {flight.speed && (
              <>
                <Text style={styles.statusDivider}>•</Text>
                <Text style={styles.statusText}>{flight.speed}kts</Text>
              </>
            )}
          </LinearGradient>

          {/* Route Info */}
          <View style={styles.routeContainer}>
            <View style={styles.airport}>
              <Text style={styles.airportCode}>{flight.departure_airport || '---'}</Text>
              <Text style={styles.airportTime}>{formatTime(flight.departure_time)}</Text>
            </View>
            
            <View style={styles.routeLine}>
              <View style={styles.routeDot} />
              <View style={styles.routeDash} />
              <Ionicons 
                name="airplane" 
                size={20} 
                color="#2196F3" 
                style={styles.routePlane}
              />
              <View style={styles.routeDash} />
              <View style={styles.routeDot} />
            </View>
            
            <View style={styles.airport}>
              <Text style={styles.airportCode}>{flight.arrival_airport || '---'}</Text>
              <Text style={styles.airportTime}>{formatTime(flight.arrival_time)}</Text>
            </View>
          </View>

          {/* AI Prediction */}
          {renderPrediction()}

          {/* Expanded Content */}
          {expanded && (
            <Animated.View style={styles.expandedContent}>
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="timer-outline" size={16} color="#666" />
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>
                    {flight.duration || 'Calculating...'}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Ionicons name="navigate-outline" size={16} color="#666" />
                  <Text style={styles.detailLabel}>Distance</Text>
                  <Text style={styles.detailValue}>
                    {flight.distance ? `${flight.distance} nm` : 'Calculating...'}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Ionicons name="compass-outline" size={16} color="#666" />
                  <Text style={styles.detailLabel}>Heading</Text>
                  <Text style={styles.detailValue}>
                    {flight.heading ? `${flight.heading}°` : '---'}
                  </Text>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="map-outline" size={20} color="#2196F3" />
                  <Text style={styles.actionButtonText}>Track Live</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="share-outline" size={20} color="#2196F3" />
                  <Text style={styles.actionButtonText}>Share</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="notifications-outline" size={20} color="#2196F3" />
                  <Text style={styles.actionButtonText}>Alerts</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = {
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  tailNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tailNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    letterSpacing: 1,
  },
  aircraft: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  expandButton: {
    padding: 4,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  statusDivider: {
    color: '#FFF',
    marginHorizontal: 6,
    opacity: 0.7,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  airport: {
    alignItems: 'center',
    flex: 1,
  },
  airportCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  airportTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    marginHorizontal: 16,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
  },
  routeDash: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  routePlane: {
    transform: [{ rotate: '90deg' }],
  },
  predictionContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  predictionBlur: {
    padding: 8,
  },
  predictionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  predictionText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
  familyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9C27B0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  familyBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#2196F3',
    marginLeft: 6,
    fontWeight: '600',
  },
};