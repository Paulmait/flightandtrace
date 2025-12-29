import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

const STALE_THRESHOLD_MS = 60000; // 1 minute
const WARNING_THRESHOLD_MS = 30000; // 30 seconds
const CRITICAL_THRESHOLD_MS = 300000; // 5 minutes

export default function DataFreshnessIndicator({
  lastUpdated,
  onRefresh,
  style,
  showLabel = true,
  size = 'normal',
}) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isOnline, setIsOnline] = useState(true);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Update current time every second
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    // Check network status
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Pulse animation for stale data
    if (getStatus() === 'stale' || getStatus() === 'critical') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [getStatus()]);

  const getTimeSinceUpdate = () => {
    if (!lastUpdated) return null;
    return currentTime - lastUpdated;
  };

  const getStatus = () => {
    const timeSince = getTimeSinceUpdate();
    if (timeSince === null) return 'unknown';
    if (!isOnline) return 'offline';
    if (timeSince > CRITICAL_THRESHOLD_MS) return 'critical';
    if (timeSince > STALE_THRESHOLD_MS) return 'stale';
    if (timeSince > WARNING_THRESHOLD_MS) return 'warning';
    return 'fresh';
  };

  const getStatusConfig = () => {
    const status = getStatus();
    switch (status) {
      case 'fresh':
        return {
          color: '#4CAF50',
          icon: 'check-circle',
          label: 'Live',
          description: 'Data is up to date',
        };
      case 'warning':
        return {
          color: '#FF9800',
          icon: 'access-time',
          label: 'Updating...',
          description: 'Data may be slightly delayed',
        };
      case 'stale':
        return {
          color: '#FF5722',
          icon: 'history',
          label: 'Stale',
          description: 'Data may be outdated',
        };
      case 'critical':
        return {
          color: '#E53935',
          icon: 'warning',
          label: 'Outdated',
          description: 'Data is significantly outdated',
        };
      case 'offline':
        return {
          color: '#9E9E9E',
          icon: 'cloud-off',
          label: 'Offline',
          description: 'No internet connection',
        };
      default:
        return {
          color: '#9E9E9E',
          icon: 'help-outline',
          label: 'Unknown',
          description: 'Unable to determine data freshness',
        };
    }
  };

  const formatTimeSince = () => {
    const timeSince = getTimeSinceUpdate();
    if (timeSince === null) return 'Never';

    const seconds = Math.floor(timeSince / 1000);
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const config = getStatusConfig();
  const isSmall = size === 'small';
  const isMini = size === 'mini';

  if (isMini) {
    return (
      <View style={[styles.miniContainer, style]}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <MaterialIcons name={config.icon} size={14} color={config.color} />
        </Animated.View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSmall && styles.containerSmall,
        style,
      ]}
      onPress={onRefresh}
      disabled={!onRefresh || !isOnline}
      accessibilityRole="button"
      accessibilityLabel={`${config.label}. ${config.description}. Last updated ${formatTimeSince()}`}
    >
      <Animated.View style={{ opacity: pulseAnim }}>
        <MaterialIcons
          name={config.icon}
          size={isSmall ? 14 : 18}
          color={config.color}
        />
      </Animated.View>

      {showLabel && (
        <View style={styles.textContainer}>
          <Text style={[styles.label, isSmall && styles.labelSmall, { color: config.color }]}>
            {config.label}
          </Text>
          {!isSmall && (
            <Text style={styles.timestamp}>{formatTimeSince()}</Text>
          )}
        </View>
      )}

      {onRefresh && isOnline && (
        <MaterialIcons
          name="refresh"
          size={isSmall ? 14 : 16}
          color="#666"
          style={styles.refreshIcon}
        />
      )}
    </TouchableOpacity>
  );
}

// Offline banner component
export function OfflineBanner({ visible, style }) {
  const slideAnim = useState(new Animated.Value(-60))[0];

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.offlineBanner,
        { transform: [{ translateY: slideAnim }] },
        style,
      ]}
    >
      <MaterialIcons name="cloud-off" size={18} color="#fff" />
      <Text style={styles.offlineText}>
        You're offline. Showing cached data.
      </Text>
    </Animated.View>
  );
}

// Stale data warning banner
export function StaleDataBanner({ lastUpdated, onRefresh, style }) {
  const timeSince = lastUpdated ? Date.now() - lastUpdated : 0;

  if (timeSince < STALE_THRESHOLD_MS) return null;

  const isCritical = timeSince > CRITICAL_THRESHOLD_MS;

  return (
    <View style={[styles.staleBanner, isCritical && styles.criticalBanner, style]}>
      <View style={styles.staleBannerContent}>
        <MaterialIcons
          name={isCritical ? 'warning' : 'history'}
          size={20}
          color={isCritical ? '#E53935' : '#FF5722'}
        />
        <View style={styles.staleBannerText}>
          <Text style={[styles.staleTitle, isCritical && styles.criticalTitle]}>
            {isCritical ? 'Data significantly outdated' : 'Data may be outdated'}
          </Text>
          <Text style={styles.staleSubtitle}>
            Last updated {formatTimeAgo(timeSince)}
          </Text>
        </View>
      </View>
      {onRefresh && (
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <MaterialIcons name="refresh" size={20} color="#0066CC" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function formatTimeAgo(ms) {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return 'over a day ago';
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    gap: 6,
  },
  containerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  miniContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 11,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  refreshIcon: {
    marginLeft: 4,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#616161',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  offlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  criticalBanner: {
    backgroundColor: '#FFEBEE',
  },
  staleBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  staleBannerText: {
    marginLeft: 12,
    flex: 1,
  },
  staleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  criticalTitle: {
    color: '#C62828',
  },
  staleSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    gap: 4,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0066CC',
  },
});
