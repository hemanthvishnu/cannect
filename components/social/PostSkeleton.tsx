import React from "react";
import { View } from "react-native";
import { Skeleton, SkeletonAvatar } from "../ui/Skeleton";

/**
 * Diamond Standard Post Detail Skeleton
 * 
 * Mirrors the exact layout of the PostDetail screen to prevent
 * content "jumping" when data arrives. Shows:
 * - Main focused post structure
 * - Divider
 * - 3 threaded reply placeholders
 */
export function PostSkeleton() {
  return (
    <View className="flex-1 bg-background">
      {/* Main Focused Post */}
      <View className="p-4">
        {/* Author Row */}
        <View className="flex-row items-center gap-3 mb-4">
          <SkeletonAvatar size={48} />
          <View className="flex-1 gap-2">
            <Skeleton height={16} width="45%" />
            <Skeleton height={12} width="30%" />
          </View>
        </View>
        
        {/* Post Content */}
        <View className="gap-2 mb-4">
          <Skeleton height={18} width="95%" />
          <Skeleton height={18} width="85%" />
          <Skeleton height={18} width="60%" />
        </View>
        
        {/* Timestamp */}
        <Skeleton height={12} width="25%" className="mb-4" />
        
        {/* Engagement Stats */}
        <View className="flex-row items-center gap-4 py-3 border-t border-border/30">
          <Skeleton height={14} width={60} />
          <Skeleton height={14} width={60} />
          <Skeleton height={14} width={60} />
        </View>
        
        {/* Action Bar */}
        <View className="flex-row items-center justify-between py-2 border-t border-border/30">
          <Skeleton height={20} width={20} radius="full" />
          <Skeleton height={20} width={20} radius="full" />
          <Skeleton height={20} width={20} radius="full" />
          <Skeleton height={20} width={20} radius="full" />
        </View>
      </View>

      {/* Divider + Reply Count */}
      <View className="flex-row items-center px-4 py-3 border-t border-border">
        <View className="w-9 items-center">
          <Skeleton height={16} width={2} />
        </View>
        <Skeleton height={14} width={80} className="ml-3" />
      </View>

      {/* Threaded Reply Skeletons */}
      {[1, 2, 3].map((i) => (
        <ThreadCommentSkeleton key={i} isLast={i === 3} />
      ))}
    </View>
  );
}

/**
 * Single threaded comment skeleton
 */
function ThreadCommentSkeleton({ isLast = false }: { isLast?: boolean }) {
  return (
    <View className="flex-row px-4 py-3">
      {/* Left Column: Avatar + Line */}
      <View className="items-center mr-3">
        <SkeletonAvatar size={36} />
        {!isLast && (
          <View className="flex-1 w-[2px] my-2">
            <Skeleton height="100%" width={2} />
          </View>
        )}
      </View>
      
      {/* Right Column: Content */}
      <View className="flex-1 gap-2">
        {/* Header */}
        <View className="flex-row items-center gap-2 mb-1">
          <Skeleton height={12} width="30%" />
          <Skeleton height={10} width="20%" />
        </View>
        
        {/* Content */}
        <Skeleton height={14} width="100%" />
        <Skeleton height={14} width="75%" />
        
        {/* Actions */}
        <View className="flex-row items-center gap-6 mt-2">
          <Skeleton height={12} width={30} />
          <Skeleton height={12} width={30} />
          <Skeleton height={12} width={30} />
        </View>
      </View>
    </View>
  );
}

/**
 * Compact skeleton for feed loading
 */
export function FeedPostSkeleton() {
  return (
    <View className="p-4 border-b border-border/30">
      <View className="flex-row gap-3">
        <SkeletonAvatar size={44} />
        <View className="flex-1 gap-2">
          <View className="flex-row items-center gap-2">
            <Skeleton height={14} width="35%" />
            <Skeleton height={10} width="20%" />
          </View>
          <Skeleton height={14} width="100%" />
          <Skeleton height={14} width="85%" />
          <View className="flex-row items-center gap-8 mt-3">
            <Skeleton height={14} width={40} />
            <Skeleton height={14} width={40} />
            <Skeleton height={14} width={40} />
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Multiple feed skeletons for list loading
 */
export function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View className="flex-1 bg-background">
      {Array.from({ length: count }).map((_, i) => (
        <FeedPostSkeleton key={i} />
      ))}
    </View>
  );
}
