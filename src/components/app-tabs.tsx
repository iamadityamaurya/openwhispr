import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../constants/designSystem';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

interface TabItemConfig {
  name: string;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const TAB_CONFIGS: Record<string, TabItemConfig> = {
  index: {
    name: 'index',
    label: 'Dictate',
    iconActive: 'mic',
    iconInactive: 'mic-outline',
  },
  explore: {
    name: 'explore',
    label: 'Settings',
    iconActive: 'options',
    iconInactive: 'options-outline',
  },
  ai: {
    name: 'ai',
    label: 'AI Models',
    iconActive: 'sparkles',
    iconInactive: 'sparkles-outline',
  },
};

const CAPSULE_WIDTH = 326;
const INNER_PADDING = 5;

function CustomNavBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [capsuleWidth, setCapsuleWidth] = useState(CAPSULE_WIDTH);
  const slideAnim = useRef(new Animated.Value(state.index)).current;

  // Touch micro-press scale animations
  const scale0 = useRef(new Animated.Value(1)).current;
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const scales = [scale0, scale1, scale2];

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index,
      damping: 22,
      stiffness: 280,
      mass: 0.6,
      overshootClamping: false,
      useNativeDriver: true,
    }).start();
  }, [state.index]);

  const onCapsuleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && Math.abs(w - capsuleWidth) > 1) {
      setCapsuleWidth(w);
    }
  };

  const availableWidth = capsuleWidth - INNER_PADDING * 2;
  const numTabs = state.routes.length || 3;
  const tabWidth = availableWidth / numTabs;

  const handlePressIn = (idx: number) => {
    const scale = scales[idx] || scale0;
    Animated.timing(scale, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (idx: number) => {
    const scale = scales[idx] || scale0;
    Animated.spring(scale, {
      toValue: 1.0,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  };

  const bottomOffset = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 12) + 6;

  return (
    <View pointerEvents="box-none" style={[styles.dockContainer, { bottom: bottomOffset }]}>
      {/* Warm Ambient Radial Aura */}
      <View style={styles.ambientAura} />

      {/* Frosted Floating Island Capsule */}
      <View style={styles.capsule} onLayout={onCapsuleLayout}>
        {/* Animated Sliding Ember Indicator */}
        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.slidingPill,
              {
                width: tabWidth,
                transform: [
                  {
                    translateX: slideAnim.interpolate({
                      inputRange: state.routes.map((_: any, i: number) => i),
                      outputRange: state.routes.map((_: any, i: number) => i * tabWidth),
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(63, 174, 110, 0.22)', 'rgba(0, 153, 87, 0.12)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pillGradient}
            />
            <View style={styles.pillHighlightBorder} />
          </Animated.View>
        )}

        {/* Tab Items */}
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIGS[route.name] || {
            name: route.name,
            label: route.name,
            iconActive: 'ellipse',
            iconInactive: 'ellipse-outline',
          };
          const scale = scales[index] || scale0;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate(route.name);
            }
          };

          return (
            <Animated.View
              key={route.key}
              style={[
                styles.tabWrapper,
                { transform: [{ scale }] },
              ]}
            >
              <TouchableOpacity
                onPress={onPress}
                onPressIn={() => handlePressIn(index)}
                onPressOut={() => handlePressOut(index)}
                activeOpacity={1}
                style={styles.tabButton}
              >
                <Ionicons
                  name={isFocused ? config.iconActive : config.iconInactive}
                  size={19}
                  color={isFocused ? '#2FA866' : '#71717A'}
                  style={styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                  numberOfLines={1}
                >
                  {config.label}
                </Text>
                {isFocused && <View style={styles.activeDot} />}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <CustomNavBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dictate',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Settings',
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI Models',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dockContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  ambientAura: {
    position: 'absolute',
    width: 280,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(63, 174, 110, 0.15)',
    opacity: 0.7,
    top: 10,
  },
  capsule: {
    width: 326,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(18, 18, 23, 0.95)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    padding: 5,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 18,
  },
  slidingPill: {
    position: 'absolute',
    left: 5,
    top: 5,
    bottom: 5,
    borderRadius: 23,
    overflow: 'hidden',
  },
  pillGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  pillHighlightBorder: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(63, 174, 110, 0.4)',
  },
  tabWrapper: {
    flex: 1,
    height: '100%',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 23,
    zIndex: 2,
  },
  tabIcon: {
    marginTop: 0.5,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: '#F4F4F6',
  },
  tabLabelInactive: {
    color: '#71717A',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2FA866',
    marginLeft: -2,
    shadowColor: '#2FA866',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 2,
  },
});
