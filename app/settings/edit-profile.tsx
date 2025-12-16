import { useState, useEffect } from "react";
import { View, TextInput, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "lucide-react-native";

import { useAuthStore } from "@/lib/stores";
import { useProfile, useUpdateProfile } from "@/lib/hooks";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: profile, isLoading: isProfileLoading } = useProfile(user?.id ?? "");
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [avatar, setAvatar] = useState("");

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setWebsite(profile.website || "");
      setAvatar(profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username}&background=10B981&color=fff`);
    }
  }, [profile]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      // Preview the selected image locally
      // In production, you'd upload to Supabase Storage here
      setAvatar(result.assets[0].uri); 
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      await updateProfile.mutateAsync({
        id: user.id,
        updates: {
          display_name: displayName || null,
          bio: bio || null,
          website: website || null,
          // avatar_url would be set after Storage upload in production
        }
      });
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
    }
  };

  if (isProfileLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#10B981" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerTitle: "Edit Profile",
          headerRight: () => (
            <Pressable onPress={handleSave} disabled={updateProfile.isPending} className="mr-2">
              {updateProfile.isPending ? (
                <ActivityIndicator color="#10B981" />
              ) : (
                <Text className="text-primary font-bold text-base">Save</Text>
              )}
            </Pressable>
          ),
          headerTintColor: "#FAFAFA",
          headerStyle: { backgroundColor: "#0A0A0A" }
        }} 
      />

      {/* Avatar Section */}
      <View className="items-center py-6 border-b border-border">
        <Pressable onPress={pickImage} className="relative">
          <Image
            source={{ uri: avatar }}
            style={{ width: 100, height: 100, borderRadius: 50 }}
            contentFit="cover"
            transition={200}
          />
          <View className="absolute inset-0 items-center justify-center bg-black/40 rounded-full">
            <Camera size={24} color="#fff" />
          </View>
        </Pressable>
        <Text className="text-primary mt-3 font-medium">Change Photo</Text>
      </View>

      {/* Form Fields */}
      <View className="px-4 mt-6 gap-6">
        <View className="gap-2">
          <Text className="text-text-muted text-sm font-medium ml-1">Display Name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your display name"
            className="bg-surface px-4 py-3 rounded-xl text-text-primary text-base border border-border"
            placeholderTextColor="#6B7280"
          />
        </View>

        <View className="gap-2">
          <Text className="text-text-muted text-sm font-medium ml-1">Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            multiline
            numberOfLines={3}
            className="bg-surface px-4 py-3 rounded-xl text-text-primary text-base border border-border min-h-[100px]"
            placeholderTextColor="#6B7280"
            style={{ textAlignVertical: 'top' }}
          />
        </View>

        <View className="gap-2">
          <Text className="text-text-muted text-sm font-medium ml-1">Website</Text>
          <TextInput
            value={website}
            onChangeText={setWebsite}
            placeholder="https://yourwebsite.com"
            autoCapitalize="none"
            keyboardType="url"
            className="bg-surface px-4 py-3 rounded-xl text-text-primary text-base border border-border"
            placeholderTextColor="#6B7280"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
