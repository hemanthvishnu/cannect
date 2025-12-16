import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useProfile, useUserPosts, useLikePost, useUnlikePost, useRepost, useDeletePost } from "@/lib/hooks";
import { ProfileHeader } from "@/components/social/ProfileHeader";
import { SocialPost } from "@/components/social/SocialPost";
import { useAuthStore } from "@/lib/stores";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  
  const { data: profile, isLoading: isProfileLoading } = useProfile(id!);
  const { data: postsData, fetchNextPage, hasNextPage } = useUserPosts(id!);
  
  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();
  const repostMutation = useRepost();
  const deleteMutation = useDeletePost();

  const posts = postsData?.pages.flat() || [];

  if (isProfileLoading || !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Stack.Screen options={{ title: `@${profile.username}`, headerBackTitle: "Back" }} />
      <FlashList
        data={posts}
        keyExtractor={(item) => item.id}
        estimatedItemSize={150}
        ListHeaderComponent={
          <ProfileHeader 
            profile={profile} 
            isCurrentUser={currentUser?.id === id} 
          />
        }
        renderItem={({ item }) => (
          <SocialPost 
            post={item}
            onLike={() => item.is_liked ? unlikeMutation.mutate(item.id) : likeMutation.mutate(item.id)}
            onRepost={() => repostMutation.mutate(item)}
            onMore={() => {/* Handle report/block for others */}}
          />
        )}
        onEndReached={() => hasNextPage && fetchNextPage()}
      />
    </SafeAreaView>
  );
}
