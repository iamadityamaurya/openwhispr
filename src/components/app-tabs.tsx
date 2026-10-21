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
    label: 'Engines',
    iconActive: 'hardware-chip',
    iconInactive: 'hardware-chip-outline',
  },
};

function CustomNavBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [capsuleWidth, setCapsuleWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(state.index)).current;

  // Touch micro-press scale animations
  const scale0 = useRef(new Animated.Value(1)).current;
  const scale1 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index,
      damping: 18,
      stiffness: 220,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [state.index]);

  const onCapsuleLayout = (e: LayoutChangeEvent) => {
    setCapsuleWidth(e.nativeEvent.layout.width);
  };

  // 2 items inside capsule with 5px padding on each side
  const innerPadding = 5;
  const availableWidth = capsuleWidth > 0 ? capsuleWidth - innerPadding * 2 : 0;
  const tabWidth = availableWidth > 0 ? availableWidth / 2 : 0;

  const handlePressIn = (idx: number) => {
    const scale = idx === 0 ? scale0 : scale1;
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 30,
    }).start();
  };

  const handlePressOut = (idx: number) => {
    const scale = idx === 0 ? scale0 : scale1;
    Animated.spring(scale, {
      toValue: 1.0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 260,
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
                      inputRange: [0, 1],
                      outputRange: [0, tabWidth],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(233, 160, 99, 0.22)', 'rgba(208, 132, 72, 0.12)']}
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
          const scale = index === 0 ? scale0 : scale1;

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
                  color={isFocused ? '#E9A063' : '#8A8072'}
                  style={styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
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
          title: 'Engines',
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
    width: 200,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(233, 160, 99, 0.12)',
    opacity: 0.7,
    top: 10,
  },
  capsule: {
    width: 272,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(23, 19, 16, 0.94)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 244, 226, 0.09)',
    borderTopColor: 'rgba(255, 255, 255, 0.16)',
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
    borderColor: 'rgba(233, 160, 99, 0.38)',
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
    color: '#F7F1E6',
  },
  tabLabelInactive: {
    color: '#8A8072',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E9A063',
    marginLeft: -2,
    shadowColor: '#E9A063',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
});
