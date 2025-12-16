import { View, Text, TextInput, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator, Share, Alert } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Send, ArrowLeft } from "lucide-react-native";
import { useState } from "react";

import { usePost, usePostReplies, useCreatePost, useLikePost, useUnlikePost, useDeletePost, useRepost } from "@/lib/hooks";
import { SocialPost, ThreadComment } from "@/components/social";
import { useAuthStore } from "@/lib/stores";
import type { PostWithAuthor } from "@/lib/types/database";

export default function PostDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [replyText, setReplyText] = useState("");
  
  const { data: post, isLoading: isPostLoading } = usePost(id ?? "");
  const { data: replies, isLoading: isRepliesLoading, refetch: refetchReplies } = usePostReplies(id ?? "");
  const createReply = useCreatePost();
  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();
  const deleteMutation = useDeletePost();
  const repostMutation = useRepost();

  const handleReply = async () => {
    if (!replyText.trim() || !id) return;
    
    try {
      await createReply.mutateAsync({ 
        content: replyText, 
        replyToId: id
      });
      setReplyText("");
      refetchReplies();
    } catch (error) {
      console.error("Failed to reply", error);
    }
  };

  const handleLike = (targetPost: PostWithAuthor) => {
    if (targetPost.is_liked) {
      unlikeMutation.mutate(targetPost.id);
    } else {
      likeMutation.mutate(targetPost.id);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      await Share.share({
        message: `Check out this post by @${post.author?.username}: ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`,
      });
    } catch (error) {
      // User cancelled
    }
  };

  const handleRepost = () => {
    if (!post) return;
    Alert.alert("Repost", "Share this with your followers?", [
      { text: "Cancel", style: "cancel" },
      { text: "Repost", onPress: () => repostMutation.mutate(post) }
    ]);
  };

  const handleMore = () => {
    if (!post || post.user_id !== user?.id) return;
    Alert.alert("Manage Post", "Delete this post?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        deleteMutation.mutate(post.id);
        router.back();
      }}
    ]);
  };

  if (isPostLoading || !post) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen 
          options={{ 
            headerShown: true,
            headerTitle: "Thread",
            headerStyle: { backgroundColor: "#0A0A0A" },
            headerTintColor: "#FAFAFA",
          }} 
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerTitle: "Thread",
          headerStyle: { backgroundColor: "#0A0A0A" },
          headerTintColor: "#FAFAFA",
        }} 
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        className="flex-1"
      >
        <FlashList
          data={replies || []}
          keyExtractor={(item) => item.id}
          estimatedItemSize={100}
          
          // The Main Post is the Header
          ListHeaderComponent={
            <View>
              {/* Main Post - Displayed Prominently */}
              <SocialPost 
                post={post}
                onLike={() => handleLike(post)}
                onProfilePress={() => router.push(`/profile/${post.user_id}` as any)}
                onShare={handleShare}
                onRepost={handleRepost}
                onMore={handleMore}
              />
              
              {/* Divider with reply count */}
              <View className="border-t border-border px-4 py-3">
                <Text className="text-text-primary font-semibold">
                  {replies?.length || 0} {replies?.length === 1 ? "Reply" : "Replies"}
                </Text>
              </View>
            </View>
          }

          // The Replies with thread lines
          renderItem={({ item, index }) => (
            <ThreadComment 
              comment={{
                id: item.id,
                content: item.content,
                created_at: item.created_at,
                author: item.author,
                likes_count: item.likes_count,
                replies_count: item.comments_count,
                is_liked: item.is_liked,
              }}
              isLast={index === (replies?.length ?? 0) - 1}
              onReplyPress={() => setReplyText(`@${item.author?.username} `)}
              onLikePress={() => handleLike(item)}
              onProfilePress={() => router.push(`/profile/${item.user_id}` as any)}
            />
          )}
          
          // Empty state for no replies
          ListEmptyComponent={
            !isRepliesLoading ? (
              <View className="py-12 items-center">
                <Text className="text-text-muted text-base">No replies yet</Text>
                <Text className="text-text-secondary text-sm mt-1">Be the first to reply!</Text>
              </View>
            ) : null
          }
          
          contentContainerStyle={{ paddingBottom: 100 }}
        />

        {/* Sticky Reply Input */}
        <View className="border-t border-border px-4 py-3 bg-background flex-row items-center gap-3">
          {/* User avatar */}
          <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
            <Text className="text-white text-sm font-semibold">
              {user?.email?.[0]?.toUpperCase() || "?"}
            </Text>
          </View>
          
          {/* Input field */}
          <TextInput
            className="flex-1 bg-surface rounded-2xl px-4 py-2.5 text-text-primary text-base"
            placeholder="Post your reply..."
            placeholderTextColor="#6B7280"
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={280}
          />
          
          {/* Send button */}
          <Pressable 
            onPress={handleReply}
            disabled={!replyText.trim() || createReply.isPending}
            className={`p-2.5 rounded-full ${replyText.trim() ? 'bg-primary' : 'bg-surface'}`}
          >
            {createReply.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Send size={18} color={replyText.trim() ? "white" : "#6B7280"} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
