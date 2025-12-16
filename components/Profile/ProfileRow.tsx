import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { BadgeCheck } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { useFollowUser, useUnfollowUser, useIsFollowing } from "@/lib/hooks";
import type { Profile } from "@/lib/types/database";

interface ProfileRowProps {
  profile: Profile;
  showFollowButton?: boolean;
}

export function ProfileRow({ profile, showFollowButton = true }: ProfileRowProps) {
  const { data: isFollowing } = useIsFollowing(profile.id);
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const handleFollow = () => {
    if (isFollowing) {
      unfollowUser.mutate(profile.id);
    } else {
      followUser.mutate(profile.id);
    }
  };

  const handlePress = () => {
    router.push(`/user/${profile.username}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center gap-3 py-2"
    >
      <Avatar
        url={profile.avatar_url}
        name={profile.display_name || profile.username}
        size={48}
      />

      <View className="flex-1">
        <View className="flex-row items-center gap-1">
          <Text className="text-text-primary font-semibold">
            {profile.display_name}
          </Text>
          {profile.is_verified && (
            <BadgeCheck size={16} color="#10B981" fill="#10B981" />
          )}
        </View>
        <Text className="text-text-muted">@{profile.username}</Text>
        {profile.bio && (
          <Text className="text-text-secondary text-sm mt-0.5" numberOfLines={1}>
            {profile.bio}
          </Text>
        )}
      </View>

      {showFollowButton && (
        <Pressable
          onPress={handleFollow}
          disabled={followUser.isPending || unfollowUser.isPending}
          className={`px-4 py-2 rounded-full ${
            isFollowing
              ? "border border-border"
              : "bg-primary"
          }`}
        >
          <Text
            className={`font-medium ${
              isFollowing ? "text-text-primary" : "text-white"
            }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}
