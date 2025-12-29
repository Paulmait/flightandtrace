/**
 * FlightTrace Skeleton Loader Components
 *
 * Provides loading placeholders for better UX while content loads.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Base Skeleton component with shimmer animation
 */
const SkeletonBase = ({ style, children }) => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerValue]);

  const opacity = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        style,
        { opacity },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading content"
    >
      {children}
    </Animated.View>
  );
};

/**
 * Skeleton Text Line
 */
export const SkeletonText = ({ width = '100%', height = 16, style }) => (
  <SkeletonBase
    style={[
      styles.text,
      { width, height },
      style,
    ]}
  />
);

/**
 * Skeleton Circle (for avatars, icons)
 */
export const SkeletonCircle = ({ size = 40, style }) => (
  <SkeletonBase
    style={[
      styles.circle,
      { width: size, height: size, borderRadius: size / 2 },
      style,
    ]}
  />
);

/**
 * Skeleton Rectangle (for images, cards)
 */
export const SkeletonRect = ({ width = '100%', height = 100, borderRadius = 8, style }) => (
  <SkeletonBase
    style={[
      { width, height, borderRadius },
      style,
    ]}
  />
);

/**
 * Flight Card Skeleton
 */
export const FlightCardSkeleton = ({ style }) => (
  <View style={[styles.flightCard, style]} accessibilityLabel="Loading flight information">
    <View style={styles.flightCardHeader}>
      <SkeletonCircle size={48} />
      <View style={styles.flightCardHeaderText}>
        <SkeletonText width={120} height={20} />
        <SkeletonText width={80} height={14} style={styles.mt4} />
      </View>
      <SkeletonRect width={60} height={28} borderRadius={14} />
    </View>

    <View style={styles.flightCardRoute}>
      <View style={styles.flightCardAirport}>
        <SkeletonText width={50} height={24} />
        <SkeletonText width={80} height={12} style={styles.mt4} />
      </View>

      <View style={styles.flightCardPath}>
        <SkeletonRect width={100} height={2} />
        <SkeletonCircle size={24} style={styles.planeIcon} />
      </View>

      <View style={styles.flightCardAirport}>
        <SkeletonText width={50} height={24} />
        <SkeletonText width={80} height={12} style={styles.mt4} />
      </View>
    </View>

    <View style={styles.flightCardFooter}>
      <SkeletonText width={100} height={12} />
      <SkeletonText width={80} height={12} />
    </View>
  </View>
);

/**
 * Map Skeleton (placeholder for map loading)
 */
export const MapSkeleton = ({ style }) => (
  <View style={[styles.mapContainer, style]} accessibilityLabel="Loading map">
    <SkeletonBase style={styles.map}>
      <View style={styles.mapOverlay}>
        <SkeletonCircle size={32} />
        <SkeletonText width={120} height={16} style={styles.mt8} />
        <SkeletonText width={80} height={12} style={styles.mt4} />
      </View>
    </SkeletonBase>
  </View>
);

/**
 * List Item Skeleton
 */
export const ListItemSkeleton = ({ style }) => (
  <View style={[styles.listItem, style]}>
    <SkeletonCircle size={44} />
    <View style={styles.listItemContent}>
      <SkeletonText width="70%" height={16} />
      <SkeletonText width="50%" height={12} style={styles.mt4} />
    </View>
    <SkeletonRect width={24} height={24} borderRadius={4} />
  </View>
);

/**
 * Stats Card Skeleton
 */
export const StatsCardSkeleton = ({ style }) => (
  <View style={[styles.statsCard, style]}>
    <SkeletonCircle size={36} />
    <SkeletonText width={60} height={24} style={styles.mt8} />
    <SkeletonText width={80} height={12} style={styles.mt4} />
  </View>
);

/**
 * Flight Details Skeleton
 */
export const FlightDetailsSkeleton = ({ style }) => (
  <View style={[styles.flightDetails, style]} accessibilityLabel="Loading flight details">
    {/* Header */}
    <View style={styles.detailsHeader}>
      <SkeletonText width={150} height={28} />
      <SkeletonRect width={80} height={32} borderRadius={16} />
    </View>

    {/* Route */}
    <View style={styles.detailsRoute}>
      <View style={styles.detailsAirport}>
        <SkeletonText width={60} height={36} />
        <SkeletonText width={100} height={14} style={styles.mt4} />
        <SkeletonText width={80} height={12} style={styles.mt4} />
      </View>
      <View style={styles.detailsPath}>
        <SkeletonRect width={80} height={3} />
      </View>
      <View style={styles.detailsAirport}>
        <SkeletonText width={60} height={36} />
        <SkeletonText width={100} height={14} style={styles.mt4} />
        <SkeletonText width={80} height={12} style={styles.mt4} />
      </View>
    </View>

    {/* Stats Row */}
    <View style={styles.detailsStats}>
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </View>

    {/* Info Section */}
    <View style={styles.detailsInfo}>
      <SkeletonText width="100%" height={14} />
      <SkeletonText width="90%" height={14} style={styles.mt8} />
      <SkeletonText width="75%" height={14} style={styles.mt8} />
    </View>
  </View>
);

/**
 * Notification Skeleton
 */
export const NotificationSkeleton = ({ style }) => (
  <View style={[styles.notification, style]}>
    <View style={styles.notificationIcon}>
      <SkeletonCircle size={40} />
    </View>
    <View style={styles.notificationContent}>
      <SkeletonText width="80%" height={16} />
      <SkeletonText width="60%" height={12} style={styles.mt4} />
      <SkeletonText width="30%" height={10} style={styles.mt8} />
    </View>
  </View>
);

/**
 * Search Result Skeleton
 */
export const SearchResultSkeleton = ({ style }) => (
  <View style={[styles.searchResult, style]}>
    <SkeletonRect width={50} height={50} borderRadius={8} />
    <View style={styles.searchResultContent}>
      <SkeletonText width={120} height={18} />
      <SkeletonText width={180} height={12} style={styles.mt4} />
      <View style={styles.searchResultTags}>
        <SkeletonRect width={60} height={20} borderRadius={10} />
        <SkeletonRect width={80} height={20} borderRadius={10} style={styles.ml8} />
      </View>
    </View>
  </View>
);

/**
 * Full Screen Loading Skeleton
 */
export const FullScreenSkeleton = ({ type = 'list', count = 5 }) => {
  const items = Array.from({ length: count }, (_, i) => i);

  const renderContent = () => {
    switch (type) {
      case 'flights':
        return items.map((i) => <FlightCardSkeleton key={i} style={styles.mb12} />);
      case 'list':
        return items.map((i) => <ListItemSkeleton key={i} style={styles.mb8} />);
      case 'notifications':
        return items.map((i) => <NotificationSkeleton key={i} style={styles.mb8} />);
      case 'search':
        return items.map((i) => <SearchResultSkeleton key={i} style={styles.mb12} />);
      default:
        return items.map((i) => <ListItemSkeleton key={i} style={styles.mb8} />);
    }
  };

  return (
    <View style={styles.fullScreen} accessibilityLabel="Loading content">
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E1E9EE',
  },
  text: {
    borderRadius: 4,
  },
  circle: {
    backgroundColor: '#E1E9EE',
  },
  mt4: {
    marginTop: 4,
  },
  mt8: {
    marginTop: 8,
  },
  ml8: {
    marginLeft: 8,
  },
  mb8: {
    marginBottom: 8,
  },
  mb12: {
    marginBottom: 12,
  },

  // Flight Card
  flightCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  flightCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  flightCardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  flightCardRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  flightCardAirport: {
    alignItems: 'center',
  },
  flightCardPath: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  planeIcon: {
    position: 'absolute',
  },
  flightCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Map
  mapContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    backgroundColor: '#E8EEF2',
  },
  mapOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // List Item
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },

  // Stats Card
  statsCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },

  // Flight Details
  flightDetails: {
    padding: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  detailsRoute: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  detailsAirport: {
    alignItems: 'center',
  },
  detailsPath: {
    flex: 1,
    alignItems: 'center',
  },
  detailsStats: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  detailsInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },

  // Notification
  notification: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },

  // Search Result
  searchResult: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
  },
  searchResultContent: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultTags: {
    flexDirection: 'row',
    marginTop: 8,
  },

  // Full Screen
  fullScreen: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
});

export default {
  SkeletonText,
  SkeletonCircle,
  SkeletonRect,
  FlightCardSkeleton,
  MapSkeleton,
  ListItemSkeleton,
  StatsCardSkeleton,
  FlightDetailsSkeleton,
  NotificationSkeleton,
  SearchResultSkeleton,
  FullScreenSkeleton,
};
