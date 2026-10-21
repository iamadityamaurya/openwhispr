import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Theme } from '../constants/designSystem';
import { NativeFloatingBubble } from '../services/nativeFloatingBubble';

interface OverlayPermissionModalProps {
  visible: boolean;
  type: 'overlay' | 'accessibility';
  onClose: () => void;
  onContinue?: () => void;
}

export const OverlayPermissionModal: React.FC<OverlayPermissionModalProps> = ({
  visible,
  type,
  onClose,
  onContinue,
}) => {
  const isOverlay = type === 'overlay';

  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isOverlay) {
      NativeFloatingBubble.requestOverlayPermission();
    } else {
      NativeFloatingBubble.requestAccessibilityPermission();
    }
    onClose();
    onContinue?.();
  };

  const steps = isOverlay
    ? [
        { num: '1', title: 'Open system settings', desc: 'Tap the button below to jump directly to app settings' },
        { num: '2', title: 'Locate OpenWhispr', desc: 'Find OpenWhispr in the "Display over other apps" list' },
        { num: '3', title: 'Toggle ON', desc: 'Enable permission to allow the floating mic dock' },
      ]
    : [
        { num: '1', title: 'Open Accessibility', desc: 'Tap below to enter Android Accessibility settings' },
        { num: '2', title: 'Select OpenWhispr Auto-Type', desc: 'Find it under Installed / Downloaded apps' },
        { num: '3', title: 'Toggle Service ON', desc: 'Allows instant auto-typing speech directly into any input field' },
      ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Luminous Glow Halo */}
          <LinearGradient
            colors={
              isOverlay
                ? ['rgba(0, 240, 255, 0.18)', 'rgba(0, 102, 255, 0.02)']
                : ['rgba(139, 92, 246, 0.18)', 'rgba(99, 102, 241, 0.02)']
            }
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.cardGlowBg}
          />

          {/* Header Icon */}
          <View style={styles.iconWrapper}>
            <View
              style={[
                styles.iconAura,
                {
                  backgroundColor: isOverlay
                    ? 'rgba(0, 240, 255, 0.15)'
                    : 'rgba(139, 92, 246, 0.15)',
                  shadowColor: isOverlay ? '#00F0FF' : '#8B5CF6',
                },
              ]}
            />
            <LinearGradient
              colors={
                isOverlay
                  ? ['#00F0FF', '#0066FF']
                  : ['#A78BFA', '#7C3AED']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <Ionicons
                name={isOverlay ? 'layers-outline' : 'flash-outline'}
                size={26}
                color="#FFFFFF"
              />
            </LinearGradient>
          </View>

          <Text style={styles.title}>
            {isOverlay ? 'Floating Overlay Setup' : 'Auto-Type Accessibility'}
          </Text>

          <Text style={styles.subtitle}>
            {isOverlay
              ? 'Enables the smart floating mic dock above your keyboard in any application.'
              : 'Inserts transcribed text straight into your focused chat or document fields.'}
          </Text>

          {/* Steps List */}
          <View style={styles.stepsContainer}>
            {steps.map((st) => (
              <View key={st.num} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepBadge,
                    {
                      borderColor: isOverlay
                        ? 'rgba(0, 240, 255, 0.4)'
                        : 'rgba(139, 92, 246, 0.4)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNum,
                      { color: isOverlay ? Theme.colors.cyan : Theme.colors.purple },
                    ]}
                  >
                    {st.num}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitleText}>{st.title}</Text>
                  <Text style={styles.stepDescText}>{st.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                Haptics.selectionAsync();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>
                {isOverlay ? 'Dismiss' : 'Skip'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleAction}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={
                  isOverlay
                    ? ['#00F0FF', '#0066FF']
                    : ['#8B5CF6', '#6366F1']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.8 }}
                style={styles.confirmGradient}
              >
                <Text style={styles.confirmBtnText}>Grant in Settings</Text>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 5, 8, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0B0F17',
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.16)',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 24,
  },
  cardGlowBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  iconAura: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 20,
    color: '#FFFFFF',
    fontFamily: Theme.fonts.heading,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
    marginBottom: 22,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#06080D',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNum: {
    fontSize: 11,
    fontFamily: Theme.fonts.monoBold,
  },
  stepTitleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
  },
  stepDescText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    marginTop: 2,
    lineHeight: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmGradient: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Theme.fonts.heading,
    letterSpacing: -0.2,
  },
});
