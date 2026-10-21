import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Theme } from '../constants/designSystem';

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 20,
          right: 20,
          backgroundColor: 'rgba(27, 23, 20, 0.95)',
          borderRadius: 24,
          borderWidth: 1.2,
          borderColor: 'rgba(255, 246, 230, 0.08)',
          height: 66,
          paddingBottom: Platform.OS === 'ios' ? 12 : 8,
          paddingTop: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.45,
          shadowRadius: 20,
          elevation: 16,
        },
        tabBarActiveTintColor: Theme.colors.cyan,
        tabBarInactiveTintColor: '#857B6C',
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: Theme.fonts.semiBold,
          letterSpacing: 0.2,
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dictate',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <Ionicons
                name={focused ? 'mic' : 'mic-outline'}
                size={21}
                color={focused ? Theme.colors.cyan : '#857B6C'}
              />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Engines',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <Ionicons
                name={focused ? 'hardware-chip' : 'hardware-chip-outline'}
                size={21}
                color={focused ? Theme.colors.cyan : '#857B6C'}
              />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(233, 160, 99, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(233, 160, 99, 0.22)',
  },
});

