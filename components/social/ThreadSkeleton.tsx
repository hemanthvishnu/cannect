/**
 * ThreadSkeleton - Loading skeleton for thread view
 * 
 * Shows:
 * - Ancestor placeholders
 * - Focused post placeholder
 * - Reply placeholders
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const SkeletonBox = memo(function SkeletonBox({ 
  width, 
  height, 
  borderRadius = 4,
  delay = 0,
}: { 
  width: number | string; 
  height: number; 
  borderRadius?: number;
  delay?: number;
}) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0.7, { duration: 800 }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        animatedStyle,
        { 
          width: width as any, 
          height, 
          borderRadius,
        },
      ]}
    />
  );
});

const AncestorSkeleton = memo(function AncestorSkeleton({ delay }: { delay: number }) {
  return (
    <View style={styles.ancestorContainer}>
      <View style={styles.leftColumn}>
        <SkeletonBox width={32} height={32} borderRadius={16} delay={delay} />
        <View style={styles.skeletonLine} />
      </View>
      <View style={styles.ancestorContent}>
        <View style={styles.headerRow}>
          <SkeletonBox width={100} height={14} delay={delay + 50} />
          <SkeletonBox width={60} height={12} delay={delay + 100} />
        </View>
        <SkeletonBox width="90%" height={14} delay={delay + 150} />
      </View>
    </View>
  );
});

const FocusedSkeleton = memo(function FocusedSkeleton() {
  return (
    <View style={styles.focusedContainer}>
      {/* Author */}
      <View style={styles.focusedAuthor}>
        <SkeletonBox width={48} height={48} borderRadius={24} delay={200} />
        <View style={styles.focusedAuthorInfo}>
          <SkeletonBox width={120} height={17} delay={250} />
          <SkeletonBox width={80} height={14} delay={300} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.focusedContent}>
        <SkeletonBox width="100%" height={18} delay={350} />
        <SkeletonBox width="85%" height={18} delay={400} />
        <SkeletonBox width="60%" height={18} delay={450} />
      </View>

      {/* Timestamp */}
      <View style={styles.focusedTimestamp}>
        <SkeletonBox width={150} height={14} delay={500} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <SkeletonBox width={60} height={14} delay={550} />
        <SkeletonBox width={50} height={14} delay={600} />
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        <SkeletonBox width={24} height={24} borderRadius={12} delay={650} />
        <SkeletonBox width={24} height={24} borderRadius={12} delay={700} />
        <SkeletonBox width={24} height={24} borderRadius={12} delay={750} />
        <SkeletonBox width={24} height={24} borderRadius={12} delay={800} />
      </View>
    </View>
  );
});

const ReplySkeleton = memo(function ReplySkeleton({ delay }: { delay: number }) {
  return (
    <View style={styles.replyContainer}>
      <SkeletonBox width={36} height={36} borderRadius={18} delay={delay} />
      <View style={styles.replyContent}>
        <View style={styles.headerRow}>
          <SkeletonBox width={80} height={14} delay={delay + 50} />
          <SkeletonBox width={50} height={12} delay={delay + 100} />
        </View>
        <SkeletonBox width="95%" height={15} delay={delay + 150} />
        <SkeletonBox width="70%" height={15} delay={delay + 200} />
        <View style={styles.replyActions}>
          <SkeletonBox width={40} height={12} delay={delay + 250} />
          <SkeletonBox width={40} height={12} delay={delay + 300} />
          <SkeletonBox width={40} height={12} delay={delay + 350} />
        </View>
      </View>
    </View>
  );
});

export const ThreadSkeleton = memo(function ThreadSkeleton() {
  return (
    <View style={styles.container}>
      {/* Ancestors */}
      <AncestorSkeleton delay={0} />
      <AncestorSkeleton delay={100} />

      {/* Focused Post */}
      <FocusedSkeleton />

      {/* Reply Divider */}
      <View style={styles.divider}>
        <SkeletonBox width={80} height={15} delay={850} />
      </View>

      {/* Replies */}
      <ReplySkeleton delay={900} />
      <ReplySkeleton delay={1000} />
      <ReplySkeleton delay={1100} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  skeleton: {
    backgroundColor: '#1A1A1A',
  },
  // Ancestor
  ancestorContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  leftColumn: {
    alignItems: 'center',
    marginRight: 12,
  },
  skeletonLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#1A1A1A',
    marginTop: 8,
    minHeight: 20,
  },
  ancestorContent: {
    flex: 1,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Focused
  focusedContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1A1A1A',
    paddingBottom: 12,
  },
  focusedAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  focusedAuthorInfo: {
    marginLeft: 12,
    gap: 4,
  },
  focusedContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  focusedTimestamp: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#1A1A1A',
    gap: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#1A1A1A',
  },
  // Divider
  divider: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#1A1A1A',
  },
  // Reply
  replyContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  replyContent: {
    flex: 1,
    marginLeft: 12,
    gap: 6,
  },
  replyActions: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 8,
  },
});

export default ThreadSkeleton;
