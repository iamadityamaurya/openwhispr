import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface AudioVisualizerProps {
  isRecording: boolean;
  meteringLevel: number;
  barCount?: number;
  height?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isRecording,
  meteringLevel,
  barCount = 28,
  height = 46,
}) => {
  const animatedValues = useRef<Animated.Value[]>(
    Array.from({ length: barCount }, () => new Animated.Value(0.1))
  ).current;

  const idleWaveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (!isRecording) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(idleWaveAnim, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: false,
          }),
          Animated.timing(idleWaveAnim, {
            toValue: 0,
            duration: 1600,
            useNativeDriver: false,
          }),
        ])
      );
      loop.start();
    } else {
      idleWaveAnim.setValue(0);
    }

    return () => {
      loop?.stop();
    };
  }, [isRecording, idleWaveAnim]);

  useEffect(() => {
    if (!isRecording) {
      animatedValues.forEach((val, i) => {
        const factor = Math.sin((i / barCount) * Math.PI);
        Animated.timing(val, {
          toValue: 0.08 + factor * 0.08,
          duration: 350,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    animatedValues.forEach((animVal, i) => {
      const centerFactor = 1 - Math.abs(i - barCount / 2) / (barCount / 2);
      const waveSpread = Math.sin((i / barCount) * Math.PI) * 0.35;
      const jitter = (Math.random() - 0.5) * 0.25;
      const targetScale = Math.min(
        1.0,
        Math.max(0.14, meteringLevel * 0.9 * centerFactor + waveSpread + jitter)
      );

      Animated.timing(animVal, {
        toValue: targetScale,
        duration: 70 + Math.random() * 45,
        useNativeDriver: false,
      }).start();
    });
  }, [isRecording, meteringLevel, animatedValues, barCount]);

  return (
    <View style={[styles.container, { height }]}>
      {animatedValues.map((anim, index) => {
        const barHeight = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [5, height],
        });

        // Color transition across bars
        const normIndex = index / barCount;
        let barColor = 'rgba(255, 255, 255, 0.09)';

        if (isRecording) {
          if (normIndex < 0.25) {
            barColor = '#00F0FF';
          } else if (normIndex < 0.5) {
            barColor = '#38BDF8';
          } else if (normIndex < 0.75) {
            barColor = '#818CF8';
          } else {
            barColor = '#C084FC';
          }
        }

        return (
          <View key={index} style={styles.barSlot}>
            <Animated.View
              style={[
                styles.bar,
                {
                  height: barHeight,
                  backgroundColor: barColor,
                  shadowColor: isRecording ? '#00F0FF' : 'transparent',
                  shadowOpacity: isRecording ? 0.7 : 0,
                  shadowRadius: 8,
                  elevation: isRecording ? 4 : 0,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3.5,
    paddingHorizontal: 8,
  },
  barSlot: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    width: 3.5,
    borderRadius: 999,
  },
});
