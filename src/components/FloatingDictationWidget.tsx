import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { AudioVisualizer } from './AudioVisualizer';
import { Theme } from '../constants/designSystem';
import { CleanupMode, CLEANUP_MODES } from '../config/prompts';

interface FloatingDictationWidgetProps {
  visible: boolean;
  isRecording: boolean;
  meteringLevel: number;
  durationMs: number;
  isProcessing: boolean;
  latestCleanedText: string;
  isSpeaking: boolean;
  cleanupMode?: CleanupMode;
  onSelectMode?: (mode: CleanupMode) => void;
  onToggleRecord: () => void;
  onSpeakText: () => void;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const FloatingDictationWidget: React.FC<FloatingDictationWidgetProps> = ({
  visible,
  isRecording,
  meteringLevel,
  durationMs,
  isProcessing,
  latestCleanedText,
  isSpeaking,
  cleanupMode = 'natural',
  onSelectMode,
  onToggleRecord,
  onSpeakText,
  onClose,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentPersona =
    CLEANUP_MODES.find((m) => m.id === cleanupMode) || CLEANUP_MODES[0];

  const pan = useRef(
    new Animated.ValueXY({ x: SCREEN_WIDTH - 85, y: SCREEN_HEIGHT - 220 })
  ).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  if (!visible) return null;

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCopy = async () => {
    if (!latestCleanedText) return;
    await Clipboard.setStringAsync(latestCleanedText);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {!expanded ? (
        /* Collapsed Dual-Button Capsule Pill */
        <View style={[styles.capsule, pickerOpen && styles.capsuleExpandedPicker]}>
          {pickerOpen ? (
            <View style={styles.pickerStrip}>
              {CLEANUP_MODES.map((mode) => {
                const isSelected = mode.id === cleanupMode;
                return (
                  <TouchableOpacity
                    key={mode.id}
                    style={[styles.pickerSlot, isSelected && styles.pickerSlotActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onSelectMode?.(mode.id);
                      setPickerOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={mode.ionIcon as any}
                      size={15}
                      color={isSelected ? '#FFFFFF' : '#8E8E93'}
                    />
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.pickerCloseBtn}
                onPress={() => setPickerOpen(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={14} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.capsuleModeBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (isRecording || isProcessing) {
                  onToggleRecord();
                } else {
                  setPickerOpen(true);
                }
              }}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (onSelectMode) {
                  const currentIndex = CLEANUP_MODES.findIndex((m) => m.id === cleanupMode);
                  const nextIndex = (currentIndex + 1) % CLEANUP_MODES.length;
                  onSelectMode(CLEANUP_MODES[nextIndex].id);
                }
              }}
              activeOpacity={0.75}
            >
              {isRecording ? (
                <Text style={styles.capsuleModeEmoji}>🔴</Text>
              ) : isProcessing ? (
                <Text style={styles.capsuleModeEmoji}>⚡</Text>
              ) : (
                <Ionicons
                  name={currentPersona.ionIcon as any}
                  size={14}
                  color="#FFFFFF"
                  style={{ marginRight: 2 }}
                />
              )}
              <Text style={[styles.capsuleModeLabel, isRecording && styles.capsuleRecordingLabel]}>
                {isRecording
                  ? `REC ${formatTime(durationMs)}`
                  : isProcessing
                  ? 'Refactoring…'
                  : currentPersona.shortLabel}
              </Text>
              {!isRecording && !isProcessing && (
                <Ionicons name="chevron-down" size={11} color="#CCCCCC" />
              )}
            </TouchableOpacity>
          )}

          <View style={styles.capsuleDivider} />

          <TouchableOpacity
            style={[
              styles.capsuleMicBtn,
              isRecording && styles.capsuleMicBtnRecording,
              isProcessing && styles.capsuleMicBtnProcessing,
            ]}
            onPress={onToggleRecord}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setExpanded(true);
            }}
            activeOpacity={0.85}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#151210" />
            ) : isRecording ? (
              <Ionicons name="stop" size={18} color="#FFFFFF" />
            ) : (
              <Ionicons name="mic" size={18} color="#151210" />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* Expanded Floating Card */
        <View style={styles.card}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.statusDot,
                  isRecording && styles.dotRecording,
                  isProcessing && styles.dotProcessing,
                ]}
              />
              <Text style={styles.headerTitle}>
                {isProcessing
                  ? 'Polishing…'
                  : isRecording
                  ? `Recording · ${formatTime(durationMs)}`
                  : 'OpenWhispr'}
              </Text>
              {cleanupMode && cleanupMode !== 'natural' && (
                <View style={styles.personaBadge}>
                  <Ionicons
                    name={currentPersona.ionIcon as any}
                    size={11}
                    color={Theme.colors.cyanBright}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.personaBadgeText}>
                    {currentPersona.shortLabel}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => setExpanded(false)}
                style={styles.iconBtn}
              >
                <Ionicons name="contract" size={16} color={Theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                <Ionicons name="close" size={16} color={Theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Visualizer when recording */}
          {isRecording && (
            <View style={styles.visualizerRow}>
              <AudioVisualizer
                isRecording={isRecording}
                meteringLevel={meteringLevel}
                height={28}
                barCount={14}
              />
            </View>
          )}

          {/* Text Preview */}
          {latestCleanedText ? (
            <Text style={styles.textPreview} numberOfLines={3}>
              {latestCleanedText}
            </Text>
          ) : (
            !isRecording && (
              <Text style={styles.placeholderText}>
                Tap dictate to record speech into any app
              </Text>
            )
          )}

          {/* Action Row */}
          <View style={styles.actionRow}>
            {/* Record / Stop Button */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                isRecording ? styles.stopBtn : styles.recordBtn,
              ]}
              onPress={onToggleRecord}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={isRecording ? 'stop' : 'mic'}
                    size={15}
                    color="#FFFFFF"
                  />
                  <Text style={styles.actionBtnText}>
                    {isRecording ? 'Stop' : 'Dictate'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Copy Button */}
            {latestCleanedText.length > 0 && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={handleCopy}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={14}
                  color={copied ? Theme.colors.green : Theme.colors.cyan}
                />
                <Text
                  style={[
                    styles.secondaryBtnText,
                    copied && { color: Theme.colors.green },
                  ]}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            )}

            {/* TTS Button */}
            {latestCleanedText.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.secondaryBtn,
                  isSpeaking && styles.speakingBtn,
                ]}
                onPress={onSpeakText}
              >
                <Ionicons
                  name={isSpeaking ? 'pause' : 'volume-high-outline'}
                  size={14}
                  color={isSpeaking ? '#FFFFFF' : Theme.colors.cyan}
                />
                <Text
                  style={[
                    styles.secondaryBtnText,
                    isSpeaking && { color: '#FFFFFF' },
                  ]}
                >
                  {isSpeaking ? 'Pause' : 'TTS'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 9999,
  },
  bubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C97B45',
    shadowColor: '#0A0806',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  bubbleRecording: {
    backgroundColor: '#E5484D',
    borderColor: '#E8A19C',
    shadowColor: '#C93A3E',
  },
  bubbleProcessing: {
    backgroundColor: '#D9A441',
    borderColor: '#F2C08A',
  },
  bubbleBadge: {
    position: 'absolute',
    bottom: -2,
    backgroundColor: '#151210',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 244, 226, 0.12)',
  },
  card: {
    width: 280,
    backgroundColor: '#241F1A',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 244, 226, 0.09)',
    shadowColor: '#0A0806',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.green,
  },
  dotRecording: {
    backgroundColor: Theme.colors.red,
  },
  dotProcessing: {
    backgroundColor: Theme.colors.amber,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Theme.fonts.title,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    padding: 4,
  },
  visualizerRow: {
    marginVertical: 4,
    backgroundColor: '#151210',
    borderRadius: 8,
    paddingVertical: 4,
  },
  textPreview: {
    color: '#E9E2D4',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Theme.fonts.regular,
    backgroundColor: '#151210',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  placeholderText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    fontStyle: 'italic',
    marginBottom: 8,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 9,
  },
  recordBtn: {
    backgroundColor: Theme.colors.cyan,
  },
  stopBtn: {
    backgroundColor: '#E5484D',
  },
  secondaryBtn: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  speakingBtn: {
    backgroundColor: Theme.colors.cyanMuted,
    borderColor: Theme.colors.borderHighlight,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
  },
  secondaryBtnText: {
    color: Theme.colors.cyan,
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
  },
  personaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(233, 160, 99, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(233, 160, 99, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginLeft: 6,
  },
  personaBadgeText: {
    color: Theme.colors.cyanBright,
    fontSize: 10,
    fontFamily: Theme.fonts.semiBold,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181A',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#38383A',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    paddingHorizontal: 4,
    paddingVertical: 3,
    height: 48,
    opacity: 0.70,
  },
  capsuleExpandedPicker: {
    paddingHorizontal: 6,
    opacity: 0.95,
  },
  pickerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  pickerSlot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  pickerSlotActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  pickerSlotEmoji: {
    fontSize: 16,
  },
  pickerCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  capsuleModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  capsuleModeEmoji: {
    fontSize: 15,
  },
  capsuleModeLabel: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: Theme.fonts.semiBold,
  },
  capsuleRecordingLabel: {
    color: '#FF6B6B',
    fontFamily: Theme.fonts.mono,
    fontSize: 12,
  },
  capsuleDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#2C2C2E',
    marginHorizontal: 2,
  },
  capsuleMicBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  capsuleMicBtnRecording: {
    backgroundColor: '#E5484D',
  },
  capsuleMicBtnProcessing: {
    backgroundColor: '#2A2A2E',
  },
});
