import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { useEffect, useRef, useState } from "react";

interface RangeSliderProps {
  sliderWidth?: number;
  min: number;
  max: number;
  step: number;
  minValue?: number;
  maxValue?: number;
  onValueChange?: (values: { min: number; max: number }) => void;
}

const TRACK_HEIGHT = 4;
const PILL_HEIGHT = 44;
const EDGE_HIT_SLOP = 20;
const MIN_VISIBLE_WIDTH = 64;

export const RangeSlider = ({
  sliderWidth,
  min,
  max,
  step,
  minValue,
  maxValue,
  onValueChange,
}: RangeSliderProps) => {
  const width = sliderWidth ?? 400;
  const isDraggingRef = useRef(false);
  const [displayMin, setDisplayMin] = useState(minValue ?? min);
  const [displayMax, setDisplayMax] = useState(maxValue ?? min + step);

  const range = Math.max(max - min, step);
  const minStep = Math.max(step, 1);

  const stripX = useSharedValue(0);
  const stripWidth = useSharedValue(0);
  const dragMode = useSharedValue(0);
  const minContextValue = useSharedValue(min);
  const maxContextValue = useSharedValue(min + step);

  const lastMin = useSharedValue(min);
  const lastMax = useSharedValue(min + step);

  const setDragging = (value: boolean) => {
    isDraggingRef.current = value;
  };

  useEffect(() => {
    if (isDraggingRef.current) {
      return;
    }
    if (minValue === undefined || maxValue === undefined) {
      return;
    }

    const safeMin = Math.max(minValue, min);
    const safeMax = Math.min(maxValue, max);
    const normalizedWidth = ((safeMax - safeMin) / range) * width;
    stripWidth.value = Math.max(normalizedWidth, 0);
    stripX.value = ((safeMin - min) / range) * width;
    lastMin.value = safeMin;
    lastMax.value = safeMax;
    setDisplayMin(safeMin);
    setDisplayMax(safeMax);
  }, [max, maxValue, min, minValue, range, stripWidth, stripX, width, lastMin, lastMax]);

  const minValueDerived = useDerivedValue(() => {
    const raw = min + (stripX.value / Math.max(width, 1)) * range;
    const stepped = Math.round(raw / minStep) * minStep;
    return Math.min(Math.max(stepped, min), max);
  });

  const maxValueDerived = useDerivedValue(() => {
    const raw =
      min +
      ((stripX.value + stripWidth.value) / Math.max(width, 1)) * range;
    const stepped = Math.round(raw / minStep) * minStep;
    return Math.min(Math.max(stepped, min), max);
  });

  const visualWidthDerived = useDerivedValue(() => {
    return Math.max(stripWidth.value, MIN_VISIBLE_WIDTH);
  });

  const visualLeftDerived = useDerivedValue(() => {
    const rawLeft = stripX.value;
    const rawRight = stripX.value + stripWidth.value;
    const center = (rawLeft + rawRight) / 2;
    const left = center - visualWidthDerived.value / 2;
    return Math.max(0, Math.min(left, width - visualWidthDerived.value));
  });

  const emitChange = () => {
    "worklet";
    const nextMin = minValueDerived.value;
    const nextMax = Math.max(maxValueDerived.value, nextMin);
    if (nextMin !== lastMin.value || nextMax !== lastMax.value) {
      lastMin.value = nextMin;
      lastMax.value = nextMax;

      if (onValueChange) {
        runOnJS(onValueChange)({
          min: nextMin,
          max: nextMax,
        });
      }
      runOnJS(setDisplayMin)(nextMin);
      runOnJS(setDisplayMax)(nextMax);
    }
  };

  const stripGesture = Gesture.Pan()
    .onBegin((event) => {
      runOnJS(setDragging)(true);
      minContextValue.value = minValueDerived.value;
      maxContextValue.value = maxValueDerived.value;

      const touchX = event.x ?? 0;
      if (touchX <= EDGE_HIT_SLOP) {
        dragMode.value = 1;
      } else if (touchX >= visualWidthDerived.value - EDGE_HIT_SLOP) {
        dragMode.value = 2;
      } else {
        dragMode.value = 0;
      }
    })
    .onUpdate((event) => {
      const deltaValue = (event.translationX / Math.max(width, 1)) * range;
      const snappedDelta = Math.round(deltaValue / minStep) * minStep;

      if (dragMode.value === 0) {
        const span = maxContextValue.value - minContextValue.value;
        let nextMin = minContextValue.value + snappedDelta;
        let nextMax = nextMin + span;

        if (nextMin < min) {
          nextMin = min;
          nextMax = min + span;
        }
        if (nextMax > max) {
          nextMax = max;
          nextMin = max - span;
        }

        stripX.value = ((nextMin - min) / range) * width;
        stripWidth.value = ((nextMax - nextMin) / range) * width;
      } else if (dragMode.value === 1) {
        let nextMin = minContextValue.value + snappedDelta;
        nextMin = Math.min(Math.max(nextMin, min), maxContextValue.value - minStep);
        stripX.value = ((nextMin - min) / range) * width;
        stripWidth.value = ((maxContextValue.value - nextMin) / range) * width;
      } else {
        let nextMax = maxContextValue.value + snappedDelta;
        nextMax = Math.max(Math.min(nextMax, max), minContextValue.value + minStep);
        stripX.value = ((minContextValue.value - min) / range) * width;
        stripWidth.value = ((nextMax - minContextValue.value) / range) * width;
      }

      emitChange();
    })
    .onEnd(() => {
      emitChange();
      runOnJS(setDragging)(false);
    });

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: visualLeftDerived.value }],
    width: visualWidthDerived.value,
  }));

  return (
    <View style={{ width }}>
      <View style={styles.trackContainer}>
        <View style={styles.track} />

        <GestureDetector gesture={stripGesture}>
          <Animated.View style={[styles.pill, stripStyle]}>
            <Text style={styles.text}>{displayMin}</Text>
            <View className="w-2 h-1 bg-black-400"/>
            <Text style={styles.text}>{displayMax}</Text>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  trackContainer: {
    height: PILL_HEIGHT,
    justifyContent: "center",
  },

  track: {
    position: "absolute",
    height: TRACK_HEIGHT,
    width: "100%",
    backgroundColor: "#dbeafe",
    borderRadius: TRACK_HEIGHT / 2,
  },

  pill: {
    position: "absolute",
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: "#ffffff",

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  text: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
});
