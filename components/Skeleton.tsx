import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
  /** Width of the skeleton (number or percentage string) */
  width?: number | string;
  /** Height of the skeleton */
  height?: number;
  /** Border radius */
  borderRadius?: number;
  /** Additional styles */
  style?: any;
}

/**
 * Skeleton - Base skeleton component with shimmer animation
 */
export function Skeleton({ 
  width = '100%', 
  height = 16, 
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#27272A',
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/**
 * PostSkeleton - Skeleton for a single post in the feed
 */
export function PostSkeleton() {
  return (
    <View style={styles.postContainer}>
      {/* Header: Avatar + Name/Username */}
      <View style={styles.postHeader}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={styles.postHeaderText}>
          <Skeleton width={120} height={14} style={{ marginBottom: 6 }} />
          <Skeleton width={80} height={12} />
        </View>
      </View>
      
      {/* Content: Text lines */}
      <View style={styles.postContent}>
        <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="90%" height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="70%" height={14} />
      </View>
      
      {/* Actions: Like, Comment, Repost, Share */}
      <View style={styles.postActions}>
        <Skeleton width={40} height={12} borderRadius={4} />
        <Skeleton width={40} height={12} borderRadius={4} />
        <Skeleton width={40} height={12} borderRadius={4} />
        <Skeleton width={40} height={12} borderRadius={4} />
      </View>
    </View>
  );
}

/**
 * FeedSkeleton - Multiple post skeletons for feed loading
 */
export function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.feedContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </View>
  );
}

/**
 * ProfileSkeleton - Skeleton for profile header
 */
export function ProfileSkeleton() {
  return (
    <View style={styles.profileContainer}>
      {/* Avatar */}
      <View style={styles.profileAvatarRow}>
        <Skeleton width={96} height={96} borderRadius={48} />
      </View>
      
      {/* Name & Username */}
      <Skeleton width={150} height={20} style={{ marginTop: 16, alignSelf: 'center' }} />
      <Skeleton width={100} height={14} style={{ marginTop: 8, alignSelf: 'center' }} />
      
      {/* Bio */}
      <Skeleton width="80%" height={14} style={{ marginTop: 16, alignSelf: 'center' }} />
      <Skeleton width="60%" height={14} style={{ marginTop: 8, alignSelf: 'center' }} />
      
      {/* Stats */}
      <View style={styles.profileStats}>
        <View style={styles.profileStatItem}>
          <Skeleton width={40} height={20} />
          <Skeleton width={50} height={12} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.profileStatItem}>
          <Skeleton width={40} height={20} />
          <Skeleton width={60} height={12} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.profileStatItem}>
          <Skeleton width={40} height={20} />
          <Skeleton width={60} height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      
      {/* Action Button */}
      <Skeleton width={120} height={40} borderRadius={20} style={{ marginTop: 16, alignSelf: 'center' }} />
    </View>
  );
}

/**
 * NotificationSkeleton - Skeleton for a single notification
 */
export function NotificationSkeleton() {
  return (
    <View style={styles.notificationContainer}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.notificationContent}>
        <Skeleton width="80%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="60%" height={12} />
      </View>
    </View>
  );
}

/**
 * NotificationsSkeleton - Multiple notification skeletons
 */
export function NotificationsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Feed
  feedContainer: {
    flex: 1,
  },
  
  // Post
  postContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  postHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  postHeaderText: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  postContent: {
    marginBottom: 16,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 32,
  },
  
  // Profile
  profileContainer: {
    padding: 16,
  },
  profileAvatarRow: {
    alignItems: 'center',
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  
  // Notification
  notificationContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
});

export default Skeleton;
