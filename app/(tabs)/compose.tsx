import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, Image as ImageIcon } from "lucide-react-native";
import { useCreatePost } from "@/lib/hooks";
import { useAuthStore } from "@/lib/stores";
import { router } from "expo-router";

export default function ComposeScreen() {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createPost = useCreatePost();
  const { user, isAuthenticated } = useAuthStore();

  const handlePost = async () => {
    if (!content.trim()) return;
    
    if (!isAuthenticated || !user) {
      setError("You must be logged in to post");
      return;
    }
    
    setError(null);
    try {
      await createPost.mutateAsync({ content: content.trim() });
      setContent("");
      router.back();
    } catch (err: any) {
      console.error("Failed to create post:", err);
      setError(err.message || "Failed to create post");
    }
  };

  const charCount = content.length;
  const maxChars = 280;
  const isOverLimit = charCount > maxChars;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-border">
          <Pressable onPress={() => router.back()} className="p-2">
            <X size={24} color="#FAFAFA" />
          </Pressable>
          <Pressable
            onPress={handlePost}
            disabled={!content.trim() || isOverLimit || createPost.isPending}
            className={`bg-primary px-5 py-2.5 rounded-full ${(!content.trim() || isOverLimit) ? 'opacity-50' : ''}`}
          >
            {createPost.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-semibold text-base">Post</Text>
            )}
          </Pressable>
        </View>
        {error && (
          <View className="bg-accent-error/20 border border-accent-error/50 mx-4 mt-4 p-3 rounded-xl">
            <Text className="text-accent-error text-center">{error}</Text>
          </View>
        )}
        <View className="flex-1 flex-row px-4 pt-4">
          <View className="w-11 h-11 rounded-full bg-primary items-center justify-center">
            <Text className="text-white text-lg font-semibold">{user?.email?.[0]?.toUpperCase() || "U"}</Text>
          </View>
          <TextInput
            placeholder="What's happening?"
            placeholderTextColor="#6B6B6B"
            value={content}
            onChangeText={setContent}
            multiline
            className="flex-1 ml-3 text-lg text-text-primary"
            style={{ textAlignVertical: "top" }}
            autoFocus
          />
        </View>
        <View className="flex-row justify-between items-center px-4 py-3 border-t border-border">
          <Pressable className="p-2">
            <ImageIcon size={24} color="#10B981" />
          </Pressable>
          <Text className={`text-sm ${isOverLimit ? 'text-accent-error' : 'text-text-muted'}`}>
            {charCount}/{maxChars}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
