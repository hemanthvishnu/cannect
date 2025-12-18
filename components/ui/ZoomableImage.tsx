import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Zoom limits
const MIN_SCALE = 1;
const MAX_SCALE = 5;

interface ZoomableImageProps {
  uri: string;
  onSwipeDown?: () => void;
}

export function ZoomableImage({ uri, onSwipeDown }: ZoomableImageProps) {
  // Scale values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  
  // Translation values for panning when zoomed
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Pinch gesture for zooming
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(newScale, MIN_SCALE * 0.5), MAX_SCALE);
    })
    .onEnd(() => {
      // Spring back if below minimum
      if (scale.value < MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
      // Clamp to maximum
      if (scale.value > MAX_SCALE) {
        scale.value = withTiming(MAX_SCALE);
      }
      savedScale.value = scale.value;
    });

  // Pan gesture for moving zoomed image
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        // Only allow panning when zoomed in
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      } else if (e.translationY > 50 && Math.abs(e.translationX) < 50 && onSwipeDown) {
        // Swipe down to dismiss when not zoomed
        runOnJS(onSwipeDown)();
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Double tap to zoom in/out
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart((e) => {
      if (scale.value > 1) {
        // Zoom out
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        // Zoom in to 2.5x at tap point
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  // Compose gestures - pinch and pan work simultaneously
  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Race(doubleTapGesture, panGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <Image
          source={uri}
          style={styles.image}
          contentFit="contain"
          priority="high"
          transition={300}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
