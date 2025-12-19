import React from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface ErrorStateProps {
  /** The error that occurred */
  error?: Error | null;
  /** Callback when user taps retry */
  onRetry?: () => void;
  /** Show loading state on retry button */
  isRetrying?: boolean;
  /** Set to true if error is due to network */
  isOffline?: boolean;
  /** Custom title */
  title?: string;
  /** Custom message */
  message?: string;
}

/**
 * ErrorState - Reusable error display with retry action
 * 
 * Shows a friendly error message with:
 * - Appropriate icon (offline vs general error)
 * - Clear explanation
 * - Retry button with loading state
 */
export function ErrorState({
  error,
  onRetry,
  isRetrying = false,
  isOffline = false,
  title,
  message,
}: ErrorStateProps) {
  const handleRetry = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onRetry?.();
  };

  const Icon = isOffline ? WifiOff : AlertCircle;
  const iconColor = isOffline ? '#EAB308' : '#EF4444';
  const iconBgColor = isOffline ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)';

  const displayTitle = title || (isOffline ? "You're offline" : "Something went wrong");
  const displayMessage = message || (isOffline 
    ? "Check your connection and try again"
    : error?.message || "We couldn't load this content. Please try again."
  );

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Icon size={32} color={iconColor} />
      </View>
      
      {/* Title */}
      <Text style={styles.title}>{displayTitle}</Text>
      
      {/* Message */}
      <Text style={styles.message}>{displayMessage}</Text>

      {/* Retry Button */}
      {onRetry && (
        <Pressable
          onPress={handleRetry}
          disabled={isRetrying}
          style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
        >
          {isRetrying ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <RefreshCw size={18} color="white" />
          )}
          <Text style={styles.retryButtonText}>
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: '#A1A1AA',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 280,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 50,
    gap: 8,
  },
  retryButtonDisabled: {
    opacity: 0.7,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default ErrorState;
