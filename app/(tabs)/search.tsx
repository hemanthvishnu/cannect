/**
 * Search Screen - Pure AT Protocol
 */

import { useState, useMemo, useCallback } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Image, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Search as SearchIcon, X, Users, Sparkles, UserPlus, Check, TrendingUp, Hash, FileText } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSearchUsers, useSuggestedUsers, useFollow, useTrending, useSearchPosts } from "@/lib/hooks";
import { useDebounce } from "@/lib/hooks";
import { useAuthStore } from "@/lib/stores";
import { useQueryClient } from "@tanstack/react-query";
import type { AppBskyActorDefs, AppBskyFeedDefs, AppBskyFeedPost } from '@atproto/api';

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

type ProfileView = AppBskyActorDefs.ProfileView;
type ProfileViewDetailed = AppBskyActorDefs.ProfileViewDetailed;
type AnyProfileView = ProfileView | ProfileViewDetailed;

type SearchTab = "users" | "trending" | "posts";

function UserRow({ 
  user, 
  onPress, 
  onFollow,
  isFollowPending,
  showFollowButton = true,
  currentUserDid,
}: { 
  user: AnyProfileView; 
  onPress: () => void;
  onFollow?: () => void;
  isFollowPending?: boolean;
  showFollowButton?: boolean;
  currentUserDid?: string;
}) {
  const isFollowing = !!user.viewer?.following;
  const isSelf = user.did === currentUserDid;
  const canShowFollow = showFollowButton && !isFollowing && !isSelf && onFollow;

  return (
    <Pressable 
      onPress={onPress}
      className="flex-row items-center px-4 py-3 border-b border-border active:bg-surface-elevated"
    >
      {user.avatar ? (
        <Image source={{ uri: user.avatar }} className="w-12 h-12 rounded-full" />
      ) : (
        <View className="w-12 h-12 rounded-full bg-surface-elevated items-center justify-center">
          <Text className="text-text-muted text-lg">{user.handle[0].toUpperCase()}</Text>
        </View>
      )}
      <View className="flex-1 ml-3">
        <Text className="font-semibold text-text-primary">{user.displayName || user.handle}</Text>
        <Text className="text-text-muted">@{user.handle}</Text>
        {user.description && (
          <Text className="text-text-secondary text-sm mt-1" numberOfLines={2}>
            {user.description}
          </Text>
        )}
      </View>
      
      {/* Follow Button */}
      {canShowFollow && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onFollow();
          }}
          disabled={isFollowPending}
          className={`ml-2 px-4 py-2 rounded-full ${isFollowPending ? 'bg-primary/50' : 'bg-primary'}`}
        >
          {isFollowPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <View className="flex-row items-center gap-1">
              <UserPlus size={14} color="white" />
              <Text className="text-white font-semibold text-sm">Follow</Text>
            </View>
          )}
        </Pressable>
      )}
      
      {/* Already Following Badge */}
      {isFollowing && !isSelf && (
        <View className="ml-2 flex-row items-center gap-1 px-3 py-2 rounded-full bg-surface-elevated">
          <Check size={14} color="#10B981" />
          <Text className="text-primary text-sm font-medium">Following</Text>
        </View>
      )}
    </Pressable>
  );
}

function PostRow({ 
  post, 
  onPress,
  onAuthorPress,
}: { 
  post: AppBskyFeedDefs.PostView;
  onPress: () => void;
  onAuthorPress: () => void;
}) {
  const record = post.record as AppBskyFeedPost.Record;
  const author = post.author;

  // Get embed images if present
  const embedImages = post.embed?.$type === 'app.bsky.embed.images#view' 
    ? (post.embed as any).images 
    : [];

  return (
    <Pressable 
      onPress={onPress}
      className="px-4 py-3 border-b border-border active:bg-surface-elevated"
    >
      <View className="flex-row">
        {/* Avatar */}
        <Pressable onPress={onAuthorPress}>
          {author.avatar ? (
            <Image 
              source={{ uri: author.avatar }} 
              className="w-10 h-10 rounded-full bg-surface-elevated"
            />
          ) : (
            <View className="w-10 h-10 rounded-full bg-surface-elevated items-center justify-center">
              <Text className="text-text-muted text-lg">{author.handle[0].toUpperCase()}</Text>
            </View>
          )}
        </Pressable>

        {/* Content */}
        <View className="flex-1 ml-3">
          {/* Header */}
          <View className="flex-row items-center">
            <Text className="font-semibold text-text-primary flex-shrink" numberOfLines={1}>
              {author.displayName || author.handle}
            </Text>
            <Text className="text-text-muted mx-1">·</Text>
            <Text className="text-text-muted flex-shrink-0">
              {formatTime(record.createdAt)}
            </Text>
          </View>
          <Text className="text-text-muted text-sm" numberOfLines={1}>
            @{author.handle}
          </Text>

          {/* Post text */}
          <Text className="text-text-primary mt-1 leading-5">
            {record.text}
          </Text>

          {/* Images */}
          {embedImages.length > 0 && (
            <View className="mt-2 rounded-xl overflow-hidden">
              {embedImages.length === 1 ? (
                <Image 
                  source={{ uri: embedImages[0].thumb }} 
                  className="w-full h-48 rounded-xl"
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-row flex-wrap gap-1">
                  {embedImages.slice(0, 4).map((img: any, idx: number) => (
                    <Image 
                      key={idx}
                      source={{ uri: img.thumb }} 
                      className="w-[48%] h-32 rounded-lg"
                      resizeMode="cover"
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function TrendingList({ 
  hashtags, 
  isLoading, 
  analyzedPosts,
  onHashtagPress 
}: { 
  hashtags: { tag: string; count: number; posts: number }[];
  isLoading: boolean;
  analyzedPosts?: number;
  onHashtagPress: (tag: string) => void;
}) {
  if (isLoading) {
    return (
      <View className="py-8 items-center">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!hashtags || hashtags.length === 0) {
    return (
      <View className="py-12 items-center px-6">
        <TrendingUp size={48} color="#6B7280" />
        <Text className="text-text-primary text-lg font-semibold mt-4">
          No trends yet
        </Text>
        <Text className="text-text-muted text-center mt-2">
          Trending hashtags will appear as more posts come in.
        </Text>
      </View>
    );
  }

  return (
    <View className="px-4 pt-4">
      <View className="flex-row items-center gap-2 mb-4">
        <TrendingUp size={18} color="#10B981" />
        <Text className="text-text-primary font-semibold text-lg">Trending Now</Text>
        {analyzedPosts && (
          <Text className="text-text-muted text-sm">({analyzedPosts} posts)</Text>
        )}
      </View>
      {hashtags.map((item, index) => (
        <Pressable
          key={item.tag}
          onPress={() => onHashtagPress(item.tag)}
          className="flex-row items-center py-3 border-b border-border active:bg-surface-elevated"
        >
          <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center mr-3">
            <Text className="text-primary font-bold text-sm">{index + 1}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-text-primary font-semibold text-base">{item.tag}</Text>
            <Text className="text-text-muted text-sm">{item.count} mentions · {item.posts} posts</Text>
          </View>
          <Hash size={16} color="#6B7280" />
        </Pressable>
      ))}
    </View>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("users");
  
  const debouncedQuery = useDebounce(query, 300);
  const hasQuery = debouncedQuery.trim().length >= 2;

  const usersQuery = useSearchUsers(hasQuery && activeTab === "users" ? debouncedQuery : "");
  const postsQuery = useSearchPosts(hasQuery && activeTab === "posts" ? `#${debouncedQuery.replace(/^#/, '')}` : "");
  const suggestedUsersQuery = useSuggestedUsers();
  const trendingQuery = useTrending(24, 15);
  
  const { did: currentUserDid } = useAuthStore();
  const followMutation = useFollow();
  const queryClient = useQueryClient();
  const [pendingFollows, setPendingFollows] = useState<Set<string>>(new Set());

  const handleHashtagPress = (tag: string) => {
    // Remove # prefix if present and search for it
    const cleanTag = tag.startsWith('#') ? tag.slice(1) : tag;
    setQuery(cleanTag);
    setActiveTab("posts"); // Switch to posts to show hashtag results
  };

  // Filter out users already being followed and self
  const users = useMemo(() => {
    const allUsers = usersQuery.data?.pages?.flatMap(page => page.actors) || [];
    return allUsers.filter(user => 
      !user.viewer?.following && user.did !== currentUserDid
    );
  }, [usersQuery.data, currentUserDid]);

  // Filter suggested users - exclude self AND already followed (show discoverable users)
  const suggestedUsers = useMemo(() => {
    const allUsers = suggestedUsersQuery.data || [];
    // Show only users not already followed
    return allUsers.filter(user => 
      user.did !== currentUserDid && !user.viewer?.following
    );
  }, [suggestedUsersQuery.data, currentUserDid]);

  // Get posts from search
  const posts = useMemo(() => {
    return postsQuery.data?.pages?.flatMap(page => page.posts) || [];
  }, [postsQuery.data]);

  const isLoading = usersQuery.isLoading;
  const data = users;

  const handleUserPress = (user: AnyProfileView) => {
    router.push(`/user/${user.handle}`);
  };

  const handleFollow = useCallback(async (user: AnyProfileView) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setPendingFollows(prev => new Set(prev).add(user.did));
    
    try {
      await followMutation.mutateAsync(user.did);
      // Invalidate queries to refresh the user lists
      queryClient.invalidateQueries({ queryKey: ['searchUsers'] });
      queryClient.invalidateQueries({ queryKey: ['suggestedUsers'] });
    } catch (error) {
      console.error('Failed to follow:', error);
    } finally {
      setPendingFollows(prev => {
        const next = new Set(prev);
        next.delete(user.did);
        return next;
      });
    }
  }, [followMutation, queryClient]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Search Header */}
      <View className="px-4 py-3 border-b border-border">
        <View className="flex-row items-center bg-surface-elevated rounded-xl px-4 py-2">
          <SearchIcon size={20} color="#6B7280" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search Cannect..."
            placeholderTextColor="#6B7280"
            className="flex-1 ml-2 text-text-primary text-base py-1"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <X size={20} color="#6B7280" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-border">
        <Pressable
          onPress={() => setActiveTab("users")}
          className={`flex-1 py-3 items-center ${activeTab === "users" ? "border-b-2 border-primary" : ""}`}
        >
          <Text className={activeTab === "users" ? "text-primary font-semibold" : "text-text-muted"}>
            Users
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("trending")}
          className={`flex-1 py-3 items-center ${activeTab === "trending" ? "border-b-2 border-primary" : ""}`}
        >
          <Text className={activeTab === "trending" ? "text-primary font-semibold" : "text-text-muted"}>
            Trending
          </Text>
        </Pressable>
        {hasQuery && (
          <Pressable
            onPress={() => setActiveTab("posts")}
            className={`flex-1 py-3 items-center ${activeTab === "posts" ? "border-b-2 border-primary" : ""}`}
          >
            <Text className={activeTab === "posts" ? "text-primary font-semibold" : "text-text-muted"}>
              Posts
            </Text>
          </Pressable>
        )}
      </View>

      {/* Results */}
      {!hasQuery ? (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {activeTab === "users" ? (
            <>
              {/* Suggested Users Section */}
              <View className="px-4 pt-4 pb-2">
                <View className="flex-row items-center gap-2 mb-3">
                  <Sparkles size={18} color="#10B981" />
                  <Text className="text-text-primary font-semibold text-lg">
                    Cannect Users
                  </Text>
                </View>
              </View>
              
              {suggestedUsersQuery.isLoading ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="large" color="#10B981" />
                </View>
              ) : suggestedUsers && suggestedUsers.length > 0 ? (
                suggestedUsers.map((user) => (
                  <UserRow 
                    key={user.did} 
                    user={user} 
                    onPress={() => handleUserPress(user)}
                    onFollow={() => handleFollow(user)}
                    isFollowPending={pendingFollows.has(user.did)}
                    currentUserDid={currentUserDid || undefined}
                  />
                ))
              ) : (
                <View className="py-12 items-center px-6">
                  <Users size={48} color="#6B7280" />
                  <Text className="text-text-primary text-lg font-semibold mt-4">
                    Be the first!
                  </Text>
                  <Text className="text-text-muted text-center mt-2">
                    No Cannect users yet. Invite your friends to join!
                  </Text>
                </View>
              )}
            </>
          ) : (
            <TrendingList 
              hashtags={trendingQuery.data?.hashtags || []}
              isLoading={trendingQuery.isLoading}
              analyzedPosts={trendingQuery.data?.analyzedPosts}
              onHashtagPress={handleHashtagPress}
            />
          )}
        </ScrollView>
      ) : activeTab === "trending" ? (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <TrendingList 
            hashtags={trendingQuery.data?.hashtags || []}
            isLoading={trendingQuery.isLoading}
            analyzedPosts={trendingQuery.data?.analyzedPosts}
            onHashtagPress={handleHashtagPress}
          />
        </ScrollView>
      ) : activeTab === "posts" ? (
        postsQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        ) : (
          <FlashList
            data={posts}
            keyExtractor={(item: AppBskyFeedDefs.PostView, index) => `${item.uri}-${index}`}
            estimatedItemSize={200}
            renderItem={({ item }: { item: AppBskyFeedDefs.PostView }) => (
              <PostRow 
                post={item}
                onPress={() => {
                  // Extract rkey from URI: at://did/app.bsky.feed.post/rkey
                  const parts = item.uri.split('/');
                  const rkey = parts[parts.length - 1];
                  router.push(`/post/${rkey}?did=${encodeURIComponent(item.author.did)}`);
                }}
                onAuthorPress={() => router.push(`/user/${item.author.handle}`)}
              />
            )}
            onEndReached={() => {
              if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
                postsQuery.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <FileText size={48} color="#6B7280" />
                <Text className="text-text-primary text-lg font-semibold mt-4">
                  No posts found
                </Text>
                <Text className="text-text-muted text-center mt-2">
                  No posts matching #{query} were found
                </Text>
              </View>
            }
            ListFooterComponent={
              postsQuery.isFetchingNextPage ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color="#10B981" />
                </View>
              ) : null
            }
          />
        )
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <FlashList
          data={data}
          keyExtractor={(item: ProfileView, index) => `${item.did}-${index}`}
          estimatedItemSize={80}
          renderItem={({ item }: { item: ProfileView }) => (
            <UserRow 
              user={item} 
              onPress={() => handleUserPress(item)}
              onFollow={() => handleFollow(item)}
              isFollowPending={pendingFollows.has(item.did)}
              currentUserDid={currentUserDid || undefined}
            />
          )}
          onEndReached={() => {
            if (usersQuery.hasNextPage && !usersQuery.isFetchingNextPage) {
              usersQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-text-muted">No users found</Text>
            </View>
          }
          ListFooterComponent={
            usersQuery.isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#10B981" />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
