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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
            : settings.sttProvider === 'groq'
            ? settings.groqWhisperModel
            : settings.sttProvider === 'surplus'
            ? settings.surplusSttModel
            : settings.sttProvider === 'custom'
            ? settings.customSttModel
            : undefined,
          settings.sttProvider === 'custom'
            ? { baseUrl: settings.customSttBaseUrl, model: settings.customSttModel }
            : undefined,
          settings.language || 'en'
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
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.bg} translucent />

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
            paddingLeft: Math.max(insets.left, 20),
            paddingRight: Math.max(insets.right, 20),
            paddingBottom: Math.max(insets.bottom + 96, 120),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.brandContainer}>
            <View style={styles.logoMark}>
              <Image
                source={require('../../assets/images/icon.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.brandText}>
              <Text style={styles.brandTitle}>OpenWhispr</Text>
              <Text style={styles.brandSubtitle}>
                {settings.sttProvider} → {settings.llmProvider}
              </Text>
            </View>
          </View>

          <View style={styles.topBarActions}>
            {/* Floating overlay toggle */}
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
                size={18}
                color={showFloatingWidget ? Theme.colors.cyan : Theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Keys button */}
            <TouchableOpacity
              style={[styles.keyBtn, !isSttKeyConfigured && styles.keyBtnHighlight]}
              onPress={() => setShowKeyModal(true)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.keyDot,
                  { backgroundColor: isSttKeyConfigured ? Theme.colors.green : Theme.colors.amber },
                ]}
              />
              <Text
                style={[
                  styles.keyBtnText,
                  !isSttKeyConfigured && styles.keyBtnTextHighlight,
                ]}
              >
                {isSttKeyConfigured ? 'Ready' : 'Set keys'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Overlay status banner */}
        {showFloatingWidget && (
          <View style={styles.floatingBanner}>
            <View style={styles.pulseDot} />
            <Text style={styles.floatingBannerText}>
              {settings.smartKeyboardMode
                ? 'Floating mic follows your keyboard while typing'
                : 'Floating bubble is on — drag it anywhere, over any app'}
            </Text>
          </View>
        )}

        {/* Recording card */}
        <View style={styles.studioCard}>
          {/* Status */}
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusIndicator,
                isRecording && styles.statusIndicatorRecording,
                (status === 'transcribing' || status === 'cleaning') &&
                  styles.statusIndicatorProcessing,
                status === 'done' && styles.statusIndicatorDone,
              ]}
            />
            <Text style={styles.statusLabel}>
              {status === 'recording'
                ? 'Listening…'
                : status === 'transcribing'
                ? 'Transcribing…'
                : status === 'cleaning'
                ? 'Polishing with AI…'
                : status === 'done'
                ? 'Ready to use'
                : status === 'error'
                ? 'Something went wrong'
                : 'Tap the mic to dictate'}
            </Text>
          </View>

          {/* Mic button with soft halo */}
          <View style={styles.micContainer}>
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

            <TouchableOpacity
              style={[
                styles.micButton,
                isRecording && styles.micButtonRecording,
                (status === 'transcribing' || status === 'cleaning') &&
                  styles.micButtonProcessing,
              ]}
              onPress={handleToggleRecord}
              disabled={status === 'transcribing' || status === 'cleaning'}
              activeOpacity={0.85}
            >
              {status === 'transcribing' || status === 'cleaning' ? (
                <ActivityIndicator size="large" color={Theme.colors.textPrimary} />
              ) : (
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={38}
                  color={isRecording ? '#FFFFFF' : Theme.colors.textInverse}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Timer */}
          <Text style={styles.timerText}>
            {isRecording ? formatTimer(durationMs) : '00:00.0'}
          </Text>

          {/* Waveform */}
          <View style={styles.visualizerContainer}>
            <AudioVisualizer
              isRecording={isRecording}
              meteringLevel={meteringLevel}
              height={44}
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
              <Ionicons name="close" size={14} color={Theme.colors.red} />
              <Text style={styles.cancelBtnText}>Discard</Text>
            </TouchableOpacity>
          )}

          {errorMessage.length > 0 && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={Theme.colors.red} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}
        </View>

        {/* Result card */}
        {latestCleanedText.length > 0 ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.resultBadge}>
                <Ionicons name="sparkles" size={13} color={Theme.colors.cyan} />
                <Text style={styles.resultBadgeText}>Refined by AI</Text>
              </View>

              <View style={styles.resultStatsRow}>
                <Text style={styles.resultStatText}>
                  {countWords(latestCleanedText)} words
                </Text>
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
                  <Ionicons name="close" size={18} color={Theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.resultContent} selectable>
              {latestCleanedText}
            </Text>

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
                  size={16}
                  color={copiedToast ? Theme.colors.green : Theme.colors.cyan}
                />
                <Text
                  style={[
                    styles.resultActionText,
                    copiedToast && { color: Theme.colors.green },
                  ]}
                >
                  {copiedToast ? 'Copied' : 'Copy'}
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
                  color={isSpeaking ? Theme.colors.textPrimary : Theme.colors.cyan}
                />
                <Text
                  style={[
                    styles.resultActionText,
                    isSpeaking && { color: Theme.colors.textPrimary },
                  ]}
                >
                  {isSpeaking ? 'Pause' : 'Listen'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resultActionBtn}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <Ionicons name="share-social-outline" size={16} color={Theme.colors.textSecondary} />
                <Text style={styles.resultActionText}>Share</Text>
              </TouchableOpacity>
            </View>

            {/* Raw transcript drawer */}
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
                      {showRawAccordion ? 'Hide raw transcript' : 'Compare with raw transcript'}
                    </Text>
                  </View>
                  <Ionicons
                    name={showRawAccordion ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={Theme.colors.textMuted}
                  />
                </TouchableOpacity>

                {showRawAccordion && (
                  <View style={styles.rawTextContainer}>
                    <Text style={styles.rawTextLabel}>Raw speech-to-text</Text>
                    <Text style={styles.rawText}>{latestRawText}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : !isRecording ? (
          /* Empty state — what you can dictate */
          <View style={styles.inspirationCard}>
            <Text style={styles.inspirationTitle}>What you can dictate</Text>

            <View style={styles.promptList}>
              <View style={styles.promptItem}>
                <Text style={styles.promptEmoji}>✉️</Text>
                <View style={styles.promptTextContainer}>
                  <Text style={styles.promptItemTitle}>Emails & messages</Text>
                  <Text style={styles.promptItemSubtitle}>
                    “Hey team, just following up on the launch timeline…”
                  </Text>
                </View>
              </View>

              <View style={styles.promptItem}>
                <Text style={styles.promptEmoji}>💡</Text>
                <View style={styles.promptTextContainer}>
                  <Text style={styles.promptItemTitle}>Thoughts & brain dumps</Text>
                  <Text style={styles.promptItemSubtitle}>
                    Speak freely — AI organizes it into clear notes.
                  </Text>
                </View>
              </View>

              <View style={styles.promptItem}>
                <Text style={styles.promptEmoji}>📝</Text>
                <View style={styles.promptTextContainer}>
                  <Text style={styles.promptItemTitle}>Meeting notes</Text>
                  <Text style={styles.promptItemSubtitle}>
                    Key takeaways and action items, hands-free.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* History */}
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
  container: {
    flex: 1,
  },
  contentContainer: {},
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1B1714',
    borderWidth: 1,
    borderColor: 'rgba(233, 160, 99, 0.25)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandText: {
    gap: 1,
  },
  brandTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontFamily: Theme.fonts.heading,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  floatingToggleActive: {
    borderColor: Theme.colors.borderHighlight,
    backgroundColor: Theme.colors.cyanMuted,
  },
  keyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Theme.colors.card,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  keyBtnHighlight: {
    borderColor: 'rgba(217, 164, 65, 0.45)',
    backgroundColor: Theme.colors.amberMuted,
  },
  keyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  keyBtnText: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
  },
  keyBtnTextHighlight: {
    color: Theme.colors.amber,
  },
  floatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Theme.colors.cyanSubtle,
    borderWidth: 1,
    borderColor: 'rgba(233, 160, 99, 0.2)',
    marginBottom: 16,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.cyan,
  },
  floatingBannerText: {
    color: Theme.colors.textSecondary,
    fontSize: 12.5,
    fontFamily: Theme.fonts.medium,
    flex: 1,
    lineHeight: 17,
  },
  studioCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.card,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    ...Theme.shadows.card,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.surfaceGlass,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 28,
  },
  statusIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Theme.colors.textMuted,
  },
  statusIndicatorRecording: {
    backgroundColor: Theme.colors.red,
  },
  statusIndicatorProcessing: {
    backgroundColor: Theme.colors.amber,
  },
  statusIndicatorDone: {
    backgroundColor: Theme.colors.green,
  },
  statusLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
  },
  micContainer: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  outerPulseRing: {
    position: 'absolute',
    width: 138,
    height: 138,
    borderRadius: 69,
    borderWidth: 1,
    borderColor: 'rgba(233, 160, 99, 0.12)',
  },
  outerPulseRingActive: {
    borderColor: 'rgba(229, 72, 77, 0.35)',
  },
  pulseRing: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 1.5,
    borderColor: 'rgba(233, 160, 99, 0.28)',
  },
  pulseRingActive: {
    borderColor: 'rgba(229, 72, 77, 0.55)',
  },
  micButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.cyan,
    ...Theme.shadows.idleGlow,
  },
  micButtonRecording: {
    backgroundColor: Theme.colors.red,
    shadowColor: '#E5484D',
  },
  micButtonProcessing: {
    backgroundColor: Theme.colors.surfaceActive,
    shadowOpacity: 0,
    elevation: 0,
  },
  timerText: {
    color: Theme.colors.textPrimary,
    fontSize: 28,
    fontFamily: Theme.fonts.monoBold,
    letterSpacing: 1,
    marginBottom: 12,
  },
  visualizerContainer: {
    width: '100%',
    marginVertical: 4,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Theme.colors.redMuted,
  },
  cancelBtnText: {
    color: '#E0857E',
    fontSize: 12.5,
    fontFamily: Theme.fonts.semiBold,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Theme.colors.redMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 72, 77, 0.25)',
  },
  errorText: {
    color: '#E8A19C',
    fontSize: 12.5,
    fontFamily: Theme.fonts.regular,
    flex: 1,
  },
  resultCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 16,
    ...Theme.shadows.subtle,
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
    gap: 6,
    backgroundColor: Theme.colors.cyanSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  resultBadgeText: {
    color: Theme.colors.cyan,
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
  },
  resultStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultStatText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
  },
  dismissBtn: {
    padding: 2,
  },
  resultContent: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    lineHeight: 25,
    fontFamily: Theme.fonts.regular,
    marginBottom: 16,
  },
  resultActionBar: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderSubtle,
    paddingTop: 14,
  },
  resultActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Theme.colors.surfaceGlass,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  copiedActionBtn: {
    backgroundColor: Theme.colors.greenMuted,
    borderColor: 'rgba(147, 184, 132, 0.3)',
  },
  speakingActionBtn: {
    backgroundColor: Theme.colors.cyanMuted,
    borderColor: Theme.colors.borderHighlight,
  },
  resultActionText: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
  },
  comparisonBox: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderSubtle,
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
    fontSize: 12.5,
    fontFamily: Theme.fonts.medium,
  },
  rawTextContainer: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  rawTextLabel: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    marginBottom: 4,
  },
  rawText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Theme.fonts.regular,
  },
  inspirationCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 16,
  },
  inspirationTitle: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
    marginBottom: 14,
  },
  promptList: {
    gap: 10,
  },
  promptItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Theme.colors.surfaceGlass,
    borderRadius: 16,
    padding: 14,
  },
  promptEmoji: {
    fontSize: 18,
    marginTop: 1,
  },
  promptTextContainer: {
    flex: 1,
  },
  promptItemTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontFamily: Theme.fonts.semiBold,
    marginBottom: 2,
  },
  promptItemSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 12.5,
    fontFamily: Theme.fonts.regular,
    lineHeight: 18,
  },
});
