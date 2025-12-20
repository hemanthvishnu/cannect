import React, { memo } from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Heart, Repeat2, MessageCircle, Quote, UserPlus, Globe2 } from "lucide-react-native";
import { formatDistanceToNow } from "@/lib/utils/date";

interface NotificationItemProps {
  notification: {
    id: string;
    reason: string;
    is_external?: boolean;
    is_read?: boolean;
    created_at: string;
    post_id?: string;
    // Internal actor
    actor?: {
      id: string;
      username: string;
      display_name?: string;
      avatar_url?: string;
    };
    // External actor (Bluesky)
    actor_did?: string;
    actor_handle?: string;
    actor_display_name?: string;
    actor_avatar?: string;
  };
}

export const NotificationItem = memo(function NotificationItem({ 
  notification 
}: NotificationItemProps) {
  const router = useRouter();
  const isExternal = notification.is_external;
  const isUnread = !notification.is_read;

  // Get actor info from appropriate source
  const actorName = isExternal
    ? notification.actor_display_name || notification.actor_handle || "Bluesky User"
    : notification.actor?.display_name || notification.actor?.username || "User";

  const actorHandle = isExternal
    ? notification.actor_handle
    : notification.actor?.username;

  const actorAvatar = isExternal
    ? notification.actor_avatar
    : notification.actor?.avatar_url;

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(actorName)}&background=3B82F6&color=fff`;

  // Get icon and text based on reason
  const getNotificationDetails = () => {
    switch (notification.reason) {
      case "like":
        return {
          icon: <Heart size={16} color="#EF4444" fill="#EF4444" />,
          text: "liked your post",
          color: "#EF4444",
        };
      case "repost":
        return {
          icon: <Repeat2 size={16} color="#10B981" />,
          text: "reposted your post",
          color: "#10B981",
        };
      case "reply":
        return {
          icon: <MessageCircle size={16} color="#3B82F6" />,
          text: "replied to your post",
          color: "#3B82F6",
        };
      case "quote":
        return {
          icon: <Quote size={16} color="#8B5CF6" />,
          text: "quoted your post",
          color: "#8B5CF6",
        };
      case "follow":
        return {
          icon: <UserPlus size={16} color="#10B981" />,
          text: "followed you",
          color: "#10B981",
        };
      case "mention":
        return {
          icon: <MessageCircle size={16} color="#F59E0B" />,
          text: "mentioned you",
          color: "#F59E0B",
        };
      default:
        return {
          icon: <Heart size={16} color="#6B7280" />,
          text: "interacted with you",
          color: "#6B7280",
        };
    }
  };

  const { icon, text } = getNotificationDetails();

  const handlePress = () => {
    if (notification.post_id) {
      router.push(`/post/${notification.post_id}` as any);
    } else if (isExternal && notification.actor_handle) {
      router.push(`/federated/${notification.actor_handle}` as any);
    } else if (notification.actor?.username) {
      router.push(`/user/${notification.actor.username}` as any);
    }
  };

  const handleAvatarPress = () => {
    if (isExternal && notification.actor_handle) {
      router.push(`/federated/${notification.actor_handle}` as any);
    } else if (notification.actor?.username) {
      router.push(`/user/${notification.actor.username}` as any);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      className={`flex-row items-start p-4 border-b border-border active:bg-surface-elevated ${
        isUnread ? 'bg-primary/5' : ''
      }`}
    >
      {/* Icon */}
      <View className="w-8 items-end mr-3 mt-1">
        {icon}
      </View>

      {/* Avatar */}
      <Pressable onPress={handleAvatarPress} className="mr-3">
        <Image
          source={{ uri: actorAvatar || fallbackAvatar }}
          style={{ width: 40, height: 40, borderRadius: 20 }}
          contentFit="cover"
        />
      </Pressable>

      {/* Content */}
      <View className="flex-1">
        {/* Actor name with external badge */}
        <View className="flex-row items-center flex-wrap gap-1">
          <Text className="font-bold text-text-primary" numberOfLines={1}>
            {actorName}
          </Text>
          
          {isExternal && (
            <View className="flex-row items-center gap-1 bg-blue-500/20 px-1.5 py-0.5 rounded-full">
              <Globe2 size={10} color="#3B82F6" />
              <Text className="text-[10px] text-blue-500 font-medium">Bluesky</Text>
            </View>
          )}
          
          <Text className="text-text-muted text-sm">
            {text}
          </Text>
        </View>

        {/* Handle */}
        {actorHandle && (
          <Text className="text-text-muted text-sm mt-0.5">
            @{actorHandle}
          </Text>
        )}

        {/* Timestamp */}
        <Text className="text-text-muted text-xs mt-1">
          {formatDistanceToNow(new Date(notification.created_at))}
        </Text>
      </View>

      {/* Unread indicator */}
      {isUnread && (
        <View className="w-2 h-2 rounded-full bg-primary mt-2" />
      )}
    </Pressable>
  );
});

export default NotificationItem;
