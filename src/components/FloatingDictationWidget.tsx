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
  onToggleRecord,
  onSpeakText,
  onClose,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

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
        /* Collapsed Floating Bubble */
        <TouchableOpacity
          style={[
            styles.bubble,
            isRecording && styles.bubbleRecording,
            isProcessing && styles.bubbleProcessing,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setExpanded(true);
          }}
          activeOpacity={0.85}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#151210" />
          ) : isRecording ? (
            <Ionicons name="mic" size={26} color="#FFFFFF" />
          ) : (
            <Ionicons name="mic" size={26} color="#151210" />
          )}

          <View style={styles.bubbleBadge}>
            <Ionicons name="move" size={10} color={Theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>
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
                  <Text style={styles.personaBadgeText}>
                    {CLEANUP_MODES.find((m) => m.id === cleanupMode)?.icon}{' '}
                    {CLEANUP_MODES.find((m) => m.id === cleanupMode)?.shortLabel}
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
});
