import { useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search as SearchIcon, X } from "lucide-react-native";
import { useSearchUsers } from "@/lib/hooks";
import { ProfileRow } from "@/components/Profile/ProfileRow";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const { data: users, isLoading } = useSearchUsers(query);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 py-4">
        <Text className="text-3xl font-bold text-text-primary">Search</Text>
      </View>
      <View className="flex-row items-center bg-surface-elevated mx-5 px-4 rounded-xl mb-4">
        <SearchIcon size={20} color="#6B6B6B" />
        <TextInput
          placeholder="Search users..."
          placeholderTextColor="#6B6B6B"
          value={query}
          onChangeText={setQuery}
          className="flex-1 py-3.5 px-3 text-text-primary text-base"
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")}>
            <X size={20} color="#6B6B6B" />
          </Pressable>
        )}
      </View>
      {isLoading ? (
        <View className="flex-1 items-center justify-center pt-24">
          <ActivityIndicator color="#10B981" size="large" />
        </View>
      ) : (
        <FlatList
          data={users || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="px-4">
              <ProfileRow profile={item} showFollowButton={true} />
            </View>
          )}
          ListEmptyComponent={
            query.length > 0 ? (
              <View className="flex-1 items-center justify-center pt-24">
                <Text className="text-text-secondary text-base">No users found</Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}
