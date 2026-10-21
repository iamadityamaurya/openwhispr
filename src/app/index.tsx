import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  ActivityIndicator,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { useAudioRecorder } from '../hooks/useAudioRecorder';
import {
  AppSettings,
  DictationItem,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  loadHistory,
  saveHistoryItem,
  deleteHistoryItem,
  clearHistory,
} from '../services/storage';
import { transcribeAudio, cleanupTranscript } from '../services/api';
import { speakText, stopSpeaking } from '../services/tts';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { FloatingDictationWidget } from '../components/FloatingDictationWidget';
import { HistoryList } from '../components/HistoryList';
import { Theme } from '../constants/designSystem';
import { NativeFloatingBubble } from '../services/nativeFloatingBubble';
import { OverlayPermissionModal } from '../components/OverlayPermissionModal';

type ProcessStatus = 'idle' | 'recording' | 'transcribing' | 'cleaning' | 'done' | 'error';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DictationScreen() {
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<DictationItem[]>([]);
  const [status, setStatus] = useState<ProcessStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [latestRawText, setLatestRawText] = useState<string>('');
  const [latestCleanedText, setLatestCleanedText] = useState<string>('');
  const [showRawAccordion, setShowRawAccordion] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [showFloatingWidget, setShowFloatingWidget] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [permissionModal, setPermissionModal] = useState<{
    visible: boolean;
    type: 'overlay' | 'accessibility';
  }>({ visible: false, type: 'overlay' });

  // Breathing & pulse animations
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const outerPulseAnim = React.useRef(new Animated.Value(1)).current;
  const idleBreathAnim = React.useRef(new Animated.Value(0.96)).current;

  const {
    isRecording,
    durationMs,
    meteringLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    hasPermission,
    requestPermission,
  } = useAudioRecorder();

  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    (async () => {
      const s = await loadSettings();
      setSettings(s);
      await NativeFloatingBubble.syncSettings(s);
      const isRunning = await NativeFloatingBubble.isRunning();
      setShowFloatingWidget(isRunning || s.overlayEnabled);
      const h = await loadHistory();
      setHistory(h);

      sub = NativeFloatingBubble.onTranscription(async (event) => {
        const newItem: DictationItem = {
          id: 'dict_' + Date.now(),
          timestamp: event.timestamp || Date.now(),
          rawText: event.rawText,
          cleanedText: event.cleanedText,
          durationMs: Math.round(event.durationMs),
          sttProvider: event.sttProvider as any,
          llmProvider: event.llmProvider as any,
        };
        const updated = await saveHistoryItem(newItem);
        setHistory(updated);
        setLatestRawText(event.rawText);
        setLatestCleanedText(event.cleanedText);
      });
    })();

    return () => {
      sub?.remove();
    };
  }, []);

  // Idle gentle breathing loop
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (!isRecording) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(idleBreathAnim, {
            toValue: 1.04,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(idleBreathAnim, {
            toValue: 0.96,
            duration: 2200,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      idleBreathAnim.setValue(1);
    }
    return () => loop?.stop();
  }, [isRecording, idleBreathAnim]);

  // Recording sonar pulse animation loop
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.22,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1.0,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(outerPulseAnim, {
              toValue: 1.45,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(outerPulseAnim, {
              toValue: 1.06,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      outerPulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim, outerPulseAnim]);

  const getSttKey = () => {
    if (settings.sttProvider === 'deepgram') return settings.deepgramApiKey;
    if (settings.sttProvider === 'groq') return settings.groqApiKey;
    if (settings.sttProvider === 'openai') return settings.openaiApiKey;
    if (settings.sttProvider === 'surplus') return settings.surplusApiKey;
    return settings.customSttApiKey;
  };

  const getLlmKey = () => {
    if (settings.llmProvider === 'groq') return settings.groqApiKey;
    if (settings.llmProvider === 'openai') return settings.openaiApiKey;
    if (settings.llmProvider === 'gemini') return settings.geminiApiKey;
    if (settings.llmProvider === 'surplus') return settings.surplusApiKey;
    return settings.customLlmApiKey;
  };

  const sttKey = getSttKey();
  const llmKey = getLlmKey();
  const isSttKeyConfigured =
    settings.sttProvider === 'custom'
      ? Boolean(settings.customSttBaseUrl && settings.customSttBaseUrl.trim().length > 0)
      : Boolean(sttKey && sttKey.trim().length > 0);

  const formatTimer = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}.${tenths}`;
  };

  const countWords = (text: string) => {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  };

  const handleToggleRecord = async () => {
    if (isRecording) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStatus('transcribing');
        const audioResult = await stopRecording();
        if (!audioResult) {
          setStatus('idle');
          return;
        }

        if (!isSttKeyConfigured) {
          setStatus('error');
          setErrorMessage(
            `Please configure your ${settings.sttProvider.toUpperCase()} settings in Engines & Keys.`
          );
          setShowKeyModal(true);
          return;
        }

        // Stage 1: Speech-to-Text
        const raw = await transcribeAudio(
          audioResult.uri,
          sttKey,
          settings.sttProvider,
          settings.sttProvider === 'deepgram'
            ? settings.deepgramModel
            : settings.sttProvider === 'surplus'
            ? settings.surplusSttModel
            : settings.sttProvider === 'custom'
            ? settings.customSttModel
            : undefined,
          settings.sttProvider === 'custom'
            ? { baseUrl: settings.customSttBaseUrl, model: settings.customSttModel }
            : undefined
        );
        setLatestRawText(raw);

        // Stage 2: OpenWhisper AI Refactoring
        setStatus('cleaning');
        const llmModelOverride =
          settings.llmProvider === 'groq'
            ? settings.groqLlmModel
            : settings.llmProvider === 'openai'
            ? settings.openaiLlmModel
            : settings.llmProvider === 'gemini'
            ? settings.geminiModel
            : settings.llmProvider === 'surplus'
            ? settings.surplusLlmModel
            : settings.customLlmModel;

        const cleaned = await cleanupTranscript(
          raw,
          llmKey,
          settings.llmProvider,
          llmModelOverride,
          settings.llmProvider === 'custom'
            ? { baseUrl: settings.customLlmBaseUrl, model: settings.customLlmModel }
            : undefined
        );
        setLatestCleanedText(cleaned);
        setStatus('done');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (settings.autoCopy && cleaned) {
          await Clipboard.setStringAsync(cleaned);
          setCopiedToast(true);
          setTimeout(() => setCopiedToast(false), 2500);
        }

        if (settings.autoSpeak && cleaned) {
          handleSpeak(cleaned);
        }

        const newItem: DictationItem = {
          id: String(Date.now()),
          timestamp: Date.now(),
          rawText: raw,
          cleanedText: cleaned,
          durationMs: audioResult.durationMs,
          sttProvider: settings.sttProvider,
          llmProvider: settings.llmProvider,
        };
        const updated = await saveHistoryItem(newItem);
        setHistory(updated);
      } catch (err: any) {
        console.error('Processing error:', err);
        setStatus('error');
        setErrorMessage(err?.message || 'Failed to process audio dictation.');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } else {
      if (hasPermission === false) {
        const granted = await requestPermission();
        if (!granted) {
          setErrorMessage('Microphone permission is required.');
          setStatus('error');
          return;
        }
      }

      setErrorMessage('');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setStatus('recording');
      await startRecording();
    }
  };

  const handleSpeak = async (textToSpeak?: string) => {
    const text = textToSpeak || latestCleanedText;
    if (!text) return;

    if (isSpeaking) {
      await stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    await speakText(text, {
      rate: settings.ttsRate,
      pitch: settings.ttsPitch,
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleCopy = async () => {
    if (!latestCleanedText) return;
    await Clipboard.setStringAsync(latestCleanedText);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2200);
  };

  const handleShare = async () => {
    if (!latestCleanedText) return;
    try {
      await Share.share({ message: latestCleanedText });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const handleToggleFloatingBubble = async (enable: boolean) => {
    if (enable) {
      if (hasPermission === false) {
        const granted = await requestPermission();
        if (!granted) {
          setErrorMessage('Microphone permission is required.');
          return;
        }
      }

      if (!isSttKeyConfigured) {
        setShowKeyModal(true);
      }

      const hasOverlay = await NativeFloatingBubble.hasOverlayPermission();
      if (!hasOverlay) {
        setPermissionModal({ visible: true, type: 'overlay' });
        return;
      }

      const hasA11y = await NativeFloatingBubble.hasAccessibilityPermission();
      if (!hasA11y) {
        setPermissionModal({ visible: true, type: 'accessibility' });
      }

      await NativeFloatingBubble.syncSettings(settings);
      try {
        await NativeFloatingBubble.startService();
        setShowFloatingWidget(true);
        await saveSettings({ overlayEnabled: true });
        setSettings((prev) => ({ ...prev, overlayEnabled: true }));
      } catch (e) {
        console.warn('Failed to start native floating bubble service:', e);
      }
    } else {
      await NativeFloatingBubble.stopService();
      setShowFloatingWidget(false);
      await saveSettings({ overlayEnabled: false });
      setSettings((prev) => ({ ...prev, overlayEnabled: false }));
    }
  };

  const handleSaveSettings = async (updated: Partial<AppSettings>) => {
    const saved = await saveSettings(updated);
    setSettings(saved);
    await NativeFloatingBubble.syncSettings(saved);
    if (updated.overlayEnabled !== undefined) {
      await handleToggleFloatingBubble(updated.overlayEnabled);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#06080D" translucent />

      {/* Ambient Radial Glow Orbs */}
      <View style={styles.ambientGlowTop} pointerEvents="none" />
      <View style={styles.ambientGlowCenter} pointerEvents="none" />

      {/* Permission Modal */}
      <OverlayPermissionModal
        visible={permissionModal.visible}
        type={permissionModal.type}
        onClose={() => setPermissionModal((prev) => ({ ...prev, visible: false }))}
        onContinue={async () => {
          if (permissionModal.type === 'overlay') {
            const hasA11y = await NativeFloatingBubble.hasAccessibilityPermission();
            if (!hasA11y) {
              setPermissionModal({ visible: true, type: 'accessibility' });
            } else {
              await NativeFloatingBubble.syncSettings(settings);
              await NativeFloatingBubble.startService();
              setShowFloatingWidget(true);
              setSettings((prev) => ({ ...prev, overlayEnabled: true }));
            }
          }
        }}
      />

      {/* Floating In-App Widget Overlay */}
      <FloatingDictationWidget
        visible={showFloatingWidget}
        isRecording={isRecording}
        meteringLevel={meteringLevel}
        durationMs={durationMs}
        isProcessing={status === 'transcribing' || status === 'cleaning'}
        latestCleanedText={latestCleanedText}
        isSpeaking={isSpeaking}
        onToggleRecord={handleToggleRecord}
        onSpeakText={() => handleSpeak()}
        onClose={() => handleToggleFloatingBubble(false)}
      />

      {/* API Key Modal */}
      <ApiKeyModal
        visible={showKeyModal}
        settings={settings}
        onSave={handleSaveSettings}
        onClose={() => setShowKeyModal(false)}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: Math.max(insets.top + 10, 36),
            paddingLeft: Math.max(insets.left, 18),
            paddingRight: Math.max(insets.right, 18),
            paddingBottom: Math.max(insets.bottom + 90, 110),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <View style={styles.brandContainer}>
            <LinearGradient
              colors={['#00F0FF', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <View style={styles.brandTitleRow}>
                <Text style={styles.brandTitle}>OpenWhispr</Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>AI STUDIO</Text>
                </View>
              </View>
              <View style={styles.engineBadge}>
                <Text style={styles.enginePipelineText}>
                  {settings.sttProvider.toUpperCase()} ➔ {settings.llmProvider.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.topBarActions}>
            {/* Floating Window Overlay Toggle */}
            <TouchableOpacity
              style={[
                styles.floatingToggleBtn,
                showFloatingWidget && styles.floatingToggleActive,
              ]}
              onPress={() => {
                const next = !showFloatingWidget;
                handleToggleFloatingBubble(next);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showFloatingWidget ? 'layers' : 'layers-outline'}
                size={17}
                color={showFloatingWidget ? Theme.colors.cyan : Theme.colors.textSecondary}
              />
              {showFloatingWidget && <View style={styles.activeDot} />}
            </TouchableOpacity>

            {/* Keys Button */}
            <TouchableOpacity
              style={[styles.keyBtn, !isSttKeyConfigured && styles.keyBtnHighlight]}
              onPress={() => setShowKeyModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="key"
                size={13}
                color={isSttKeyConfigured ? Theme.colors.cyan : Theme.colors.amber}
              />
              <Text
                style={[
                  styles.keyBtnText,
                  !isSttKeyConfigured && styles.keyBtnTextHighlight,
                ]}
              >
                {isSttKeyConfigured ? 'Ready' : 'Set Keys'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Floating Keyboard Trigger Status Banner */}
        {showFloatingWidget && (
          <View style={styles.floatingBanner}>
            <LinearGradient
              colors={['rgba(0, 240, 255, 0.12)', 'rgba(37, 99, 235, 0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.floatingBannerGradient}
            >
              <View style={styles.pulseDot} />
              <Text style={styles.floatingBannerText}>
                {settings.smartKeyboardMode
                  ? 'Smart Keyboard Active • Floating mic appears above keyboard when typing'
                  : 'Floating Bubble Active • Draggable on top of all apps'}
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Hero Studio Recording Card */}
        <View style={styles.studioCard}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.01)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.studioCardGradient}
          >
            {/* Status Pill Badge */}
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusIndicator,
                  isRecording && styles.statusIndicatorRecording,
                  (status === 'transcribing' || status === 'cleaning') &&
                    styles.statusIndicatorProcessing,
                ]}
              />
              <Text style={styles.statusLabel}>
                {status === 'recording'
                  ? 'CAPTURING VOICE (44.1 kHz AAC)'
                  : status === 'transcribing'
                  ? `${settings.sttProvider.toUpperCase()} TRANSCRIBING...`
                  : status === 'cleaning'
                  ? `OPENWHISPR AI REFACTORING...`
                  : status === 'done'
                  ? 'DICTATION READY'
                  : 'TAP TO DICTATE'}
              </Text>
            </View>

            {/* Central Holographic Mic Button with Multi-Tier Radial Halo */}
            <View style={styles.micContainer}>
              {/* Outer Glowing Sonar Ring */}
              <Animated.View
                style={[
                  styles.outerPulseRing,
                  isRecording && styles.outerPulseRingActive,
                  {
                    transform: [
                      { scale: isRecording ? outerPulseAnim : idleBreathAnim },
                    ],
                  },
                ]}
              />

              {/* Inner Glowing Ring */}
              <Animated.View
                style={[
                  styles.pulseRing,
                  isRecording && styles.pulseRingActive,
                  {
                    transform: [
                      { scale: isRecording ? pulseAnim : idleBreathAnim },
                    ],
                  },
                ]}
              />

              {/* Main Disc Trigger */}
              <TouchableOpacity
                style={[
                  styles.micButton,
                  isRecording && styles.micButtonRecording,
                  (status === 'transcribing' || status === 'cleaning') &&
                    styles.micButtonProcessing,
                ]}
                onPress={handleToggleRecord}
                disabled={status === 'transcribing' || status === 'cleaning'}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={
                    isRecording
                      ? ['#EF4444', '#B91C1C']
                      : status === 'transcribing' || status === 'cleaning'
                      ? ['#8B5CF6', '#4C1D95']
                      : ['#1A233A', '#0D1322']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.micButtonInner}
                >
                  {status === 'transcribing' || status === 'cleaning' ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name={isRecording ? 'stop' : 'mic'}
                      size={40}
                      color={isRecording ? '#FFFFFF' : Theme.colors.cyan}
                    />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Monospaced Precision Live Timer */}
            <Text style={styles.timerText}>
              {isRecording ? formatTimer(durationMs) : '00:00.0'}
            </Text>

            {/* Real-time Dynamic 28-Band Waveform Equalizer */}
            <View style={styles.visualizerContainer}>
              <AudioVisualizer
                isRecording={isRecording}
                meteringLevel={meteringLevel}
                height={46}
                barCount={28}
              />
            </View>

            {isRecording && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={async () => {
                  await cancelRecording();
                  setStatus('idle');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={14} color="#F87171" />
                <Text style={styles.cancelBtnText}>Discard Recording</Text>
              </TouchableOpacity>
            )}

            {errorMessage.length > 0 && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={Theme.colors.red} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Cleaned Result Glass Sheet (The Peak Moment) */}
        {latestCleanedText.length > 0 ? (
          <View style={styles.resultCard}>
            <LinearGradient
              colors={['#00F0FF', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.resultTopStripe}
            />

            <View style={styles.resultHeader}>
              <View style={styles.resultBadge}>
                <Ionicons name="sparkles" size={13} color={Theme.colors.cyan} />
                <Text style={styles.resultBadgeText}>OpenWhispr AI Refined</Text>
              </View>

              <View style={styles.resultStatsRow}>
                <View style={styles.wordCountPill}>
                  <Text style={styles.resultStatText}>
                    {countWords(latestCleanedText)} words
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLatestCleanedText('');
                    setLatestRawText('');
                    setStatus('idle');
                  }}
                  style={styles.dismissBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle-outline" size={18} color={Theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Cleaned Text Body */}
            <Text style={styles.resultContent} selectable>
              {latestCleanedText}
            </Text>

            {/* Action Bar Pills */}
            <View style={styles.resultActionBar}>
              <TouchableOpacity
                style={[
                  styles.resultActionBtn,
                  copiedToast && styles.copiedActionBtn,
                ]}
                onPress={handleCopy}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={copiedToast ? 'checkmark-circle' : 'copy-outline'}
                  size={15}
                  color={copiedToast ? '#10B981' : Theme.colors.cyan}
                />
                <Text
                  style={[
                    styles.resultActionText,
                    copiedToast && { color: '#10B981' },
                  ]}
                >
                  {copiedToast ? 'Copied!' : 'Copy Text'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.resultActionBtn,
                  isSpeaking && styles.speakingActionBtn,
                ]}
                onPress={() => handleSpeak()}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isSpeaking ? 'pause-circle' : 'volume-high-outline'}
                  size={16}
                  color={isSpeaking ? '#FFFFFF' : Theme.colors.purpleBright}
                />
                <Text
                  style={[
                    styles.resultActionText,
                    isSpeaking && { color: '#FFFFFF' },
                  ]}
                >
                  {isSpeaking ? 'Pause' : 'TTS Speak'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resultActionBtn}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <Ionicons name="share-social-outline" size={15} color={Theme.colors.textSecondary} />
                <Text style={styles.resultActionText}>Share</Text>
              </TouchableOpacity>
            </View>

            {/* Raw Transcript Comparison Drawer */}
            {latestRawText.length > 0 && (
              <View style={styles.comparisonBox}>
                <TouchableOpacity
                  style={styles.comparisonToggle}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowRawAccordion(!showRawAccordion);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.comparisonToggleLeft}>
                    <Ionicons name="git-compare-outline" size={14} color={Theme.colors.cyan} />
                    <Text style={styles.comparisonToggleText}>
                      {showRawAccordion
                        ? `Hide Raw ${settings.sttProvider.toUpperCase()}`
                        : `Compare Raw STT vs AI Refinement`}
                    </Text>
                  </View>
                  <Ionicons
                    name={showRawAccordion ? 'chevron-up' : 'chevron-down'}
                    size={15}
                    color={Theme.colors.textMuted}
                  />
                </TouchableOpacity>

                {showRawAccordion && (
                  <View style={styles.rawTextContainer}>
                    <Text style={styles.rawTextLabel}>RAW SPEECH-TO-TEXT BEFORE REFACTORING:</Text>
                    <Text style={styles.rawText}>{latestRawText}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : !isRecording ? (
          /* Inspiration Prompts (Smart Pattern: Guidance in Empty State) */
          <View style={styles.inspirationCard}>
            <View style={styles.inspirationHeader}>
              <View style={styles.inspirationIconWrapper}>
                <Ionicons name="sparkles" size={12} color={Theme.colors.cyan} />
              </View>
              <Text style={styles.inspirationTitle}>WHAT YOU CAN DICTATE</Text>
            </View>

            <View style={styles.promptList}>
              <View style={styles.promptItem}>
                <Text style={styles.promptEmoji}>✉️</Text>
                <View style={styles.promptTextContainer}>
                  <Text style={styles.promptItemTitle}>Emails & Slack Messages</Text>
                  <Text style={styles.promptItemSubtitle}>
                    "Hey team, just wanted to follow up on the launch timeline..."
                  </Text>
                </View>
              </View>

              <View style={styles.promptItem}>
                <Text style={styles.promptEmoji}>💡</Text>
                <View style={styles.promptTextContainer}>
                  <Text style={styles.promptItemTitle}>Thoughts & Brain Dumps</Text>
                  <Text style={styles.promptItemSubtitle}>
                    Speak stream-of-consciousness — AI organizes it with bullet points.
                  </Text>
                </View>
              </View>

              <View style={styles.promptItem}>
                <Text style={styles.promptEmoji}>📝</Text>
                <View style={styles.promptTextContainer}>
                  <Text style={styles.promptItemTitle}>Meeting Notes & Action Items</Text>
                  <Text style={styles.promptItemSubtitle}>
                    "Key takeaways from discussion with design team..."
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* History List */}
        <HistoryList
          items={history}
          onSpeakItem={(txt) => handleSpeak(txt)}
          onDeleteItem={async (id) => {
            const updated = await deleteHistoryItem(id);
            setHistory(updated);
          }}
          onClearAll={async () => {
            await clearHistory();
            setHistory([]);
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.colors.bg,
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -60,
    left: SCREEN_WIDTH * 0.1,
    width: SCREEN_WIDTH * 0.8,
    height: 180,
    borderRadius: SCREEN_WIDTH,
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
  },
  ambientGlowCenter: {
    position: 'absolute',
    top: 260,
    left: SCREEN_WIDTH * 0.15,
    width: SCREEN_WIDTH * 0.7,
    height: 220,
    borderRadius: SCREEN_WIDTH,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  container: {
    flex: 1,
  },
  contentContainer: {},
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoGradient: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00F0FF',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: Theme.fonts.heading,
    letterSpacing: -0.4,
  },
  proBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  proBadgeText: {
    color: Theme.colors.cyan,
    fontSize: 9,
    fontFamily: Theme.fonts.monoBold,
    letterSpacing: 0.6,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  enginePipelineText: {
    color: Theme.colors.cyan,
    fontSize: 10.5,
    fontFamily: Theme.fonts.monoBold,
    letterSpacing: 0.4,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingToggleBtn: {
    padding: 9,
    borderRadius: 12,
    backgroundColor: Theme.colors.cardGlass,
    borderWidth: 1.2,
    borderColor: Theme.colors.border,
    position: 'relative',
  },
  floatingToggleActive: {
    borderColor: Theme.colors.cyan,
    backgroundColor: 'rgba(0, 240, 255, 0.14)',
  },
  activeDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.cyan,
  },
  keyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Theme.colors.cardGlass,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: Theme.colors.border,
  },
  keyBtnHighlight: {
    borderColor: Theme.colors.amber,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  keyBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontFamily: Theme.fonts.semiBold,
  },
  keyBtnTextHighlight: {
    color: Theme.colors.amber,
  },
  floatingBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  floatingBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Theme.colors.cyan,
  },
  floatingBannerText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    flex: 1,
    lineHeight: 17,
  },
  studioCard: {
    borderRadius: 28,
    borderWidth: 1.4,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    backgroundColor: Theme.colors.cardGlass,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 20,
    marginBottom: 16,
  },
  studioCardGradient: {
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
  },
  statusIndicator: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
    backgroundColor: '#64748B',
  },
  statusIndicatorRecording: {
    backgroundColor: '#EF4444',
  },
  statusIndicatorProcessing: {
    backgroundColor: '#A855F7',
  },
  statusLabel: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontFamily: Theme.fonts.monoBold,
    letterSpacing: 0.6,
  },
  micContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  outerPulseRing: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.12)',
    backgroundColor: 'rgba(0, 240, 255, 0.02)',
  },
  outerPulseRingActive: {
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  pulseRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.8,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    backgroundColor: 'rgba(0, 240, 255, 0.04)',
  },
  pulseRingActive: {
    borderColor: 'rgba(239, 68, 68, 0.75)',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  micButton: {
    width: 86,
    height: 86,
    borderRadius: 43,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0, 240, 255, 0.5)',
    shadowColor: '#00F0FF',
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 12,
  },
  micButtonRecording: {
    borderColor: '#FCA5A5',
    shadowColor: '#EF4444',
  },
  micButtonProcessing: {
    borderColor: '#C084FC',
    shadowColor: '#8B5CF6',
  },
  micButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: Theme.fonts.monoBold,
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  visualizerContainer: {
    width: '100%',
    marginVertical: 4,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  cancelBtnText: {
    color: '#F87171',
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    flex: 1,
  },
  resultCard: {
    backgroundColor: Theme.colors.cardGlass,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.4,
    borderColor: Theme.colors.border,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  resultTopStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Theme.colors.cyan,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  resultBadgeText: {
    color: Theme.colors.cyan,
    fontSize: 11,
    fontFamily: Theme.fonts.monoBold,
    letterSpacing: 0.3,
  },
  resultStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultStatText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.mono,
  },
  copiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  copiedPillText: {
    color: Theme.colors.green,
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
  },
  resultContent: {
    color: '#F8FAFC',
    fontSize: 16,
    lineHeight: 25,
    fontFamily: Theme.fonts.regular,
    marginBottom: 16,
  },
  resultActionBar: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 14,
  },
  resultActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  speakingActionBtn: {
    backgroundColor: 'rgba(0, 240, 255, 0.18)',
    borderColor: Theme.colors.cyan,
  },
  resultActionText: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontFamily: Theme.fonts.semiBold,
  },
  comparisonBox: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
  },
  comparisonToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  comparisonToggleText: {
    color: Theme.colors.cyan,
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
  },
  rawTextContainer: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  rawTextLabel: {
    color: Theme.colors.textMuted,
    fontSize: 9.5,
    fontFamily: Theme.fonts.monoBold,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  rawText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Theme.fonts.regular,
  },
  wordCountPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dismissBtn: {
    padding: 2,
  },
  copiedActionBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  inspirationCard: {
    backgroundColor: Theme.colors.cardGlass,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.2,
    borderColor: Theme.colors.border,
    marginBottom: 16,
  },
  inspirationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  inspirationIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspirationTitle: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: Theme.fonts.monoBold,
    letterSpacing: 0.8,
  },
  promptList: {
    gap: 10,
  },
  promptItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  promptEmoji: {
    fontSize: 18,
    marginTop: 1,
  },
  promptTextContainer: {
    flex: 1,
  },
  promptItemTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
    marginBottom: 2,
  },
  promptItemSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    lineHeight: 17,
  },
});
