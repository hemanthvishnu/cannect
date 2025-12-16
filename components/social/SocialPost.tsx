import { View, Text, Pressable, type ViewProps } from "react-native";
import { Image } from "expo-image";
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal, BadgeCheck } from "lucide-react-native";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/utils/date";
import type { PostWithAuthor } from "@/lib/types/database";

// ---------------------------------------------------------------------------
// Primitive Slots (Reusable Building Blocks)
// ---------------------------------------------------------------------------

const PostRoot = ({ className, ...props }: ViewProps) => (
  <View className={cn("border-b border-border bg-background px-4 py-3", className)} {...props} />
);

const PostHeader = ({ className, ...props }: ViewProps) => (
  <View className={cn("flex-row items-start gap-3", className)} {...props} />
);

const PostContent = ({ className, ...props }: ViewProps) => (
  <View className={cn("ml-[52px] mt-1", className)} {...props} />
);

const PostFooter = ({ className, ...props }: ViewProps) => (
  <View className={cn("ml-[52px] mt-3 flex-row items-center justify-between pr-4", className)} {...props} />
);

interface ActionButtonProps {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  count?: number;
  active?: boolean;
  activeColor?: string;
  onPress?: () => void;
}

const ActionButton = ({ 
  icon: Icon, 
  count, 
  active, 
  activeColor = "#EF4444", // red-500
  onPress 
}: ActionButtonProps) => (
  <Pressable 
    onPress={onPress} 
    className="flex-row items-center gap-1.5 p-1 -ml-2 active:opacity-70"
    accessibilityRole="button"
  >
    <Icon 
      size={18} 
      color={active ? activeColor : "#6B7280"} 
      strokeWidth={2}
    />
    {count !== undefined && count > 0 && (
      <Text className="text-sm font-medium" style={{ color: active ? activeColor : "#6B7280" }}>
        {count}
      </Text>
    )}
  </Pressable>
);

// ---------------------------------------------------------------------------
// Main SocialPost Component
// ---------------------------------------------------------------------------

interface SocialPostProps {
  post: PostWithAuthor;
  onLike?: () => void;
  onReply?: () => void;
  onRepost?: () => void;
  onProfilePress?: () => void;
  onPress?: () => void;
  onMore?: () => void;
  onShare?: () => void;
}

export function SocialPost({ 
  post, 
  onLike, 
  onReply, 
  onRepost, 
  onProfilePress,
  onPress,
  onMore,
  onShare
}: SocialPostProps) {
  const avatarUrl = post.author?.avatar_url || `https://ui-avatars.com/api/?name=${post.author?.username || "U"}&background=10B981&color=fff`;
  
  return (
    <Pressable onPress={onPress}>
      <PostRoot>
        <PostHeader>
          {/* Avatar */}
          <Pressable onPress={onProfilePress} className="active:opacity-80">
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 40, height: 40, borderRadius: 20 }}
              contentFit="cover"
              transition={200}
            />
          </Pressable>

          {/* User Info & Meta */}
          <View className="flex-1 flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-1.5 overflow-hidden">
              <Text className="font-bold text-base text-text-primary" numberOfLines={1}>
                {post.author?.display_name || post.author?.username || "Unknown"}
              </Text>
              {post.author?.is_verified && (
                <BadgeCheck size={16} color="#10B981" fill="#10B981" />
              )}
              <Text className="text-text-muted text-sm flex-shrink" numberOfLines={1}>
                @{post.author?.username || "user"} · {formatDistanceToNow(new Date(post.created_at))}
              </Text>
            </View>
            <Pressable className="p-1 active:opacity-70" onPress={onMore}>
              <MoreHorizontal size={16} color="#6B7280" />
            </Pressable>
          </View>
        </PostHeader>

        <PostContent>
          {/* Text Body */}
          <Text className="text-base text-text-primary leading-6">
            {post.content}
          </Text>

          {/* Media (if present) */}
          {post.media_urls && post.media_urls.length > 0 && (
            <Pressable className="mt-3 overflow-hidden rounded-xl border border-border bg-surface aspect-video">
              <Image
                source={{ uri: post.media_urls[0] }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            </Pressable>
          )}
        </PostContent>

        <PostFooter>
          <ActionButton 
            icon={MessageCircle} 
            count={post.comments_count} 
            onPress={onReply} 
          />
          <ActionButton 
            icon={Repeat2} 
            count={post.reposts_count} 
            active={false} 
            activeColor="#10B981" // green
            onPress={onRepost} 
          />
          <ActionButton 
            icon={Heart} 
            count={post.likes_count} 
            active={post.is_liked} 
            activeColor="#EF4444" // red
            onPress={onLike} 
          />
          <ActionButton 
            icon={Share} 
            onPress={onShare}
          />
        </PostFooter>
      </PostRoot>
    </Pressable>
  );
}

// Export primitives for custom layouts
export { PostRoot, PostHeader, PostContent, PostFooter, ActionButton };
