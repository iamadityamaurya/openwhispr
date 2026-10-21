import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import {
  AppSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  SttProvider,
  LlmProvider,
} from '../services/storage';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { OPENWHISPR_CLEANUP_SYSTEM_PROMPT } from '../config/prompts';
import { Theme } from '../constants/designSystem';
import { NativeFloatingBubble } from '../services/nativeFloatingBubble';
import { OverlayPermissionModal } from '../components/OverlayPermissionModal';

import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [showPromptDetails, setShowPromptDetails] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [permissionModal, setPermissionModal] = useState<{
    visible: boolean;
    type: 'overlay' | 'accessibility';
  }>({ visible: false, type: 'overlay' });
  const [hasA11yPermission, setHasA11yPermission] = useState<boolean>(false);
  const [isBatteryIgnored, setIsBatteryIgnored] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
      await NativeFloatingBubble.syncSettings(s);
      const a11y = await NativeFloatingBubble.hasAccessibilityPermission();
      setHasA11yPermission(a11y);
      const battery = await NativeFloatingBubble.isBatteryOptimizationIgnored();
      setIsBatteryIgnored(battery);
    })();
  }, []);

  const handleUpdate = async (updated: Partial<AppSettings>) => {
    const saved = await saveSettings(updated);
    setSettings(saved);
    await NativeFloatingBubble.syncSettings(saved);
  };

  const handleSelectSttProvider = async (provider: SttProvider) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const key =
      provider === 'deepgram'
        ? settings.deepgramApiKey
        : provider === 'groq'
        ? settings.groqApiKey
        : provider === 'openai'
        ? settings.openaiApiKey
        : provider === 'surplus'
        ? settings.surplusApiKey
        : settings.customSttBaseUrl;

    await handleUpdate({ sttProvider: provider });

    // If key/URL not configured, prompt user to enter key
    if (!key || key.trim().length === 0) {
      setShowKeyModal(true);
    }
  };

  const handleSelectLlmProvider = async (provider: LlmProvider) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const key =
      provider === 'groq'
        ? settings.groqApiKey
        : provider === 'openai'
        ? settings.openaiApiKey
        : provider === 'gemini'
        ? settings.geminiApiKey
        : provider === 'surplus'
        ? settings.surplusApiKey
        : settings.customLlmBaseUrl;

    await handleUpdate({ llmProvider: provider });

    if (!key || key.trim().length === 0) {
      setShowKeyModal(true);
    }
  };

  const handleToggleOverlay = async (val: boolean) => {
    if (val) {
      try {
        const audioPerm = await getRecordingPermissionsAsync();
        if (!audioPerm.granted) {
          const req = await requestRecordingPermissionsAsync();
          if (!req.granted) return;
        }
      } catch (e) {
        console.warn('Audio permission check error:', e);
      }

      const hasOverlay = await NativeFloatingBubble.hasOverlayPermission();
      if (!hasOverlay) {
        setPermissionModal({ visible: true, type: 'overlay' });
        return;
      }

      const hasA11y = await NativeFloatingBubble.hasAccessibilityPermission();
      setHasA11yPermission(hasA11y);
      if (!hasA11y) {
        setPermissionModal({ visible: true, type: 'accessibility' });
      }

      const activeKey =
        settings.sttProvider === 'deepgram'
          ? settings.deepgramApiKey
          : settings.sttProvider === 'groq'
          ? settings.groqApiKey
          : settings.sttProvider === 'openai'
          ? settings.openaiApiKey
          : settings.sttProvider === 'surplus'
          ? settings.surplusApiKey
          : settings.customSttBaseUrl;

      if (!activeKey || activeKey.trim().length === 0) {
        setShowKeyModal(true);
      }

      await NativeFloatingBubble.syncSettings(settings);
      try {
        await NativeFloatingBubble.startService();
        await handleUpdate({ overlayEnabled: true });
      } catch (e) {
        console.warn('Failed to start overlay:', e);
      }
    } else {
      await NativeFloatingBubble.stopService();
      await handleUpdate({ overlayEnabled: false });
    }
  };

  const handleCopyPrompt = async () => {
    await Clipboard.setStringAsync(OPENWHISPR_CLEANUP_SYSTEM_PROMPT);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const isDeepgramConfigured = Boolean(settings.deepgramApiKey && settings.deepgramApiKey.length > 0);
  const isGroqConfigured = Boolean(settings.groqApiKey && settings.groqApiKey.length > 0);
  const isOpenaiConfigured = Boolean(settings.openaiApiKey && settings.openaiApiKey.length > 0);
  const isGeminiConfigured = Boolean(settings.geminiApiKey && settings.geminiApiKey.length > 0);
  const isSurplusConfigured = Boolean(settings.surplusApiKey && settings.surplusApiKey.length > 0);
  const isCustomSttConfigured = Boolean(settings.customSttBaseUrl && settings.customSttBaseUrl.length > 0);
  const isCustomLlmConfigured = Boolean(settings.customLlmBaseUrl && settings.customLlmBaseUrl.length > 0);

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#06080D" />

      {/* Modals */}
      <ApiKeyModal
        visible={showKeyModal}
        settings={settings}
        onSave={handleUpdate}
        onClose={() => setShowKeyModal(false)}
      />

      <OverlayPermissionModal
        visible={permissionModal.visible}
        type={permissionModal.type}
        onClose={() => setPermissionModal((prev) => ({ ...prev, visible: false }))}
        onContinue={async () => {
          if (permissionModal.type === 'overlay') {
            const hasA11y = await NativeFloatingBubble.hasAccessibilityPermission();
            setHasA11yPermission(hasA11y);
            if (!hasA11y) {
              setPermissionModal({ visible: true, type: 'accessibility' });
            } else {
              await NativeFloatingBubble.syncSettings(settings);
              await NativeFloatingBubble.startService();
              await handleUpdate({ overlayEnabled: true });
            }
          }
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
            paddingBottom: Math.max(insets.bottom + 80, 96),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>API Keys & Engines</Text>
            <TouchableOpacity
              style={styles.keyManageBtn}
              onPress={() => {
                Haptics.selectionAsync();
                setShowKeyModal(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="key-outline" size={13} color={Theme.colors.cyan} />
              <Text style={styles.keyManageText}>Edit Keys</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>
            Select your preferred speech-to-text and AI cleanup models.
          </Text>
        </View>

        {/* SECTION 1: SPEECH-TO-TEXT ENGINES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SPEECH-TO-TEXT</Text>
        </View>

        {/* Surplus Intelligence Speech-to-Text Card (Featured / Special Focus) */}
        <TouchableOpacity
          style={[
            styles.engineCard,
            styles.engineCardSurplusFeatured,
            settings.sttProvider === 'surplus' && styles.engineCardActiveSurplus,
          ]}
          onPress={() => handleSelectSttProvider('surplus')}
          activeOpacity={0.8}
        >
          <View style={styles.engineCardHeader}>
            <View style={styles.engineIdentity}>
              <View style={[styles.engineIcon, { backgroundColor: 'rgba(255, 77, 141, 0.15)' }]}>
                <Ionicons name="sparkles" size={18} color="#FF4D8D" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.featuredBadge}>
                  <Ionicons name="flame" size={9} color="#FF4D8D" />
                  <Text style={styles.featuredBadgeText}>SPECIAL FOCUS</Text>
                </View>
                <Text style={styles.engineName}>Surplus Intelligence STT</Text>
                <Text style={styles.engineDetail} numberOfLines={1}>
                  {isSurplusConfigured
                    ? `${settings.surplusSttModel || 'venice-whisper-large-v3'} • Connected`
                    : 'inf_... Key required (Decentralized AI)'}
                </Text>
              </View>
            </View>

            {settings.sttProvider === 'surplus' ? (
              <View style={[styles.activeIndicatorPill, { borderColor: '#FF4D8D', backgroundColor: 'rgba(255, 77, 141, 0.15)' }]}>
                <Ionicons name="checkmark-sharp" size={11} color="#FF4D8D" />
                <Text style={[styles.activeIndicatorText, { color: '#FF4D8D' }]}>ACTIVE</Text>
              </View>
            ) : (
              <View style={styles.inactiveDot} />
            )}
          </View>
        </TouchableOpacity>

        {/* Deepgram Card */}
        <TouchableOpacity
          style={[
            styles.engineCard,
            settings.sttProvider === 'deepgram' && styles.engineCardActiveDeepgram,
          ]}
          onPress={() => handleSelectSttProvider('deepgram')}
          activeOpacity={0.8}
        >
          <View style={styles.engineCardHeader}>
            <View style={styles.engineIdentity}>
              <View style={[styles.engineIcon, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Ionicons name="radio" size={18} color="#10B981" />
              </View>
              <View>
                <Text style={styles.engineName}>Deepgram Nova-3</Text>
                <Text style={styles.engineDetail}>
                  {isDeepgramConfigured ? 'Connected' : 'Key required'}
                </Text>
              </View>
            </View>

            {settings.sttProvider === 'deepgram' ? (
              <View style={[styles.activeIndicatorPill, { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="checkmark-sharp" size={11} color="#10B981" />
                <Text style={[styles.activeIndicatorText, { color: '#10B981' }]}>ACTIVE</Text>
              </View>
            ) : (
              <View style={styles.inactiveDot} />
            )}
          </View>
        </TouchableOpacity>

        {/* Groq Whisper Card */}
        <TouchableOpacity
          style={[
            styles.engineCard,
            settings.sttProvider === 'groq' && styles.engineCardActiveGroq,
          ]}
          onPress={() => handleSelectSttProvider('groq')}
          activeOpacity={0.8}
        >
          <View style={styles.engineCardHeader}>
            <View style={styles.engineIdentity}>
              <View style={[styles.engineIcon, { backgroundColor: 'rgba(0, 240, 255, 0.12)' }]}>
                <Ionicons name="flash" size={18} color={Theme.colors.cyan} />
              </View>
              <View>
                <Text style={styles.engineName}>Groq Whisper Turbo</Text>
                <Text style={styles.engineDetail}>
                  {isGroqConfigured ? 'Connected' : 'Key required'}
                </Text>
              </View>
            </View>

            {settings.sttProvider === 'groq' ? (
              <View style={styles.activeIndicatorPill}>
                <Ionicons name="checkmark-sharp" size={11} color={Theme.colors.cyan} />
                <Text style={styles.activeIndicatorText}>ACTIVE</Text>
              </View>
            ) : (
              <View style={styles.inactiveDot} />
            )}
          </View>
        </TouchableOpacity>

        {/* OpenAI Whisper Card */}
        <TouchableOpacity
          style={[
            styles.engineCard,
            settings.sttProvider === 'openai' && styles.engineCardActiveOpenAI,
          ]}
          onPress={() => handleSelectSttProvider('openai')}
          activeOpacity={0.8}
        >
          <View style={styles.engineCardHeader}>
            <View style={styles.engineIdentity}>
              <View style={[styles.engineIcon, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                <Ionicons name="sparkles" size={18} color="#A78BFA" />
              </View>
              <View>
                <Text style={styles.engineName}>OpenAI Whisper</Text>
                <Text style={styles.engineDetail}>
                  {isOpenaiConfigured ? 'Connected' : 'Key required'}
                </Text>
              </View>
            </View>

            {settings.sttProvider === 'openai' ? (
              <View style={[styles.activeIndicatorPill, { borderColor: '#A78BFA', backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Ionicons name="checkmark-sharp" size={11} color="#A78BFA" />
                <Text style={[styles.activeIndicatorText, { color: '#A78BFA' }]}>ACTIVE</Text>
              </View>
            ) : (
              <View style={styles.inactiveDot} />
            )}
          </View>
        </TouchableOpacity>

        {/* Custom / Extra STT Card */}
        <TouchableOpacity
          style={[
            styles.engineCard,
            settings.sttProvider === 'custom' && styles.engineCardActiveCustom,
          ]}
          onPress={() => handleSelectSttProvider('custom')}
          activeOpacity={0.8}
        >
          <View style={styles.engineCardHeader}>
            <View style={styles.engineIdentity}>
              <View style={[styles.engineIcon, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Ionicons name="globe-outline" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.engineName}>Custom / Extra STT</Text>
                <Text style={styles.engineDetail} numberOfLines={1}>
                  {isCustomSttConfigured
                    ? `${settings.customSttModel || 'whisper-1'} • ${settings.customSttBaseUrl}`
                    : 'Configure custom Whisper URL & model'}
                </Text>
              </View>
            </View>

            {settings.sttProvider === 'custom' ? (
              <View style={[styles.activeIndicatorPill, { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="checkmark-sharp" size={11} color="#F59E0B" />
                <Text style={[styles.activeIndicatorText, { color: '#F59E0B' }]}>ACTIVE</Text>
              </View>
            ) : (
              <View style={styles.inactiveDot} />
            )}
          </View>
        </TouchableOpacity>

        {/* SECTION 2: AI REFACTORING ENGINE */}
        <View style={[styles.sectionHeader, { marginTop: 22 }]}>
          <Text style={styles.sectionTitle}>AI REFACTORING & CLEANUP</Text>
        </View>

        {/* Surplus Intelligence LLM Card (Featured / Special Focus) */}
        <TouchableOpacity
          style={[
            styles.engineCard,
            styles.engineCardSurplusFeatured,
            settings.llmProvider === 'surplus' && styles.engineCardActiveSurplus,
          ]}
          onPress={() => handleSelectLlmProvider('surplus')}
          activeOpacity={0.8}
        >
          <View style={styles.engineCardHeader}>
            <View style={styles.engineIdentity}>
              <View style={[styles.engineIcon, { backgroundColor: 'rgba(255, 77, 141, 0.15)' }]}>
                <Ionicons name="planet" size={18} color="#FF4D8D" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.featuredBadge}>
                  <Ionicons name="flame" size={9} color="#FF4D8D" />
                  <Text style={styles.featuredBadgeText}>SPECIAL FOCUS</Text>
                </View>
                <Text style={styles.engineName}>Surplus Intelligence LLM</Text>
                <Text style={styles.engineDetail} numberOfLines={1}>
                  {isSurplusConfigured
                    ? `${settings.surplusLlmModel || 'deepseek-v4-flash'} • 450+ Models`
                    : 'inf_... Key required (Decentralized Marketplace)'}
                </Text>
              </View>
            </View>

            {settings.llmProvider === 'surplus' ? (
              <View style={[styles.activeIndicatorPill, { borderColor: '#FF4D8D', backgroundColor: 'rgba(255, 77, 141, 0.15)' }]}>
                <Ionicons name="checkmark-sharp" size={11} color="#FF4D8D" />
                <Text style={[styles.activeIndicatorText, { color: '#FF4D8D' }]}>ACTIVE</Text>
              </View>
            ) : (
              <View style={styles.inactiveDot} />
            )}
          </View>
        </TouchableOpacity>

        {/* Groq Llama 3 Card */}
        <TouchableOpacity
          style={[
            styles.engineCard,
            settings.llmProvider === 'groq' && styles.engineCardActiveGroq,
          ]}
          onPress={() => handleSelectLlmProvider('groq')}
          activeOpacity={0.8}
        >
          <View style={styles.engineCardHeader}>
            <View style={styles.engineIdentity}>
              <View style={[styles.engineIcon, { backgroundColor: 'rgba(0, 240, 255, 0.12)' }]}>
                <Ionicons name="hardware-chip" size={18} color={Theme.colors.cyan} />
              </View>
              <View>
                <Text style={styles.engineName}>Groq Llama 3.3 70B</Text>
                <Text style={styles.engineDetail}>
                  {isGroqConfigured ? 'Connected' : 'Key required'}
                </Text>
              </View>
            </View>

            {settings.llmProvider === 'groq' ? (
              <View style={styles.activeIndicatorPill}>
                <Ionicons name="checkmark-sharp" size={11} color={Theme.colors.cyan} />
                <Text style={styles.activeIndicatorText}>ACTIVE</Text>
              </View>
            ) : (
              <View style={styles.inactiveDot} />
            )}
          </View>
        </TouchableOpacity>

        {/* OpenAI GPT-4o-mini Card */}
        <TouchableOpacity
          style={[
            styles.engineCard,
            settings.llmProvider === 'openai' && styles.engineCardActiveOpenAI,
          ]}
          onPress={() => handleSelectLlmProvider('openai')}
          activeOpacity={0.8}
        >
          <View style={styles.engineCardHeader}>
            <View style={styles.engineIdentity}>
              <View style={[styles.engineIcon, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                <Ionicons name="infinite" size={18} color="#A78BFA" />
              </View>
              <View>
                <Text style={styles.engineName}>OpenAI GPT-4o-mini</Text>
                <Text style={styles.engineDetail}>
                  {isOpenaiConfigured ? 'Connected' : 'Key required'}
                </Text>
              </View>
            </View>

            {settings.llmProvider === 'openai' ? (
              <View style={[styles.activeIndicatorPill, { borderColor: '#A78BFA', backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Ionicons name="checkmark-sharp" size={11} color="#A78BFA" />
                <Text style={[styles.activeIndicatorText, { color: '#A78BFA' }]}>ACTIVE</Text>
              </View>
            ) : (
              <View style={styles.inactiveDot} />
            )}
          </View>
        </TouchableOpacity>

        {/* Google Gemini Card */}
        <TouchableOpacity
          style={[
            styles.engineCard,
            settings.llmProvider === 'gemini' && styles.engineCardActiveGemini,
          ]}
          onPress={() => handleSelectLlmProvider('gemini')}
          activeOpacity={0.8}
        >
          <View style={styles.engineCardHeader}>
            <View style={styles.engineIdentity}>
              <View style={[styles.engineIcon, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                <Ionicons name="logo-google" size={18} color="#38BDF8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.engineName}>Google Gemini ({settings.geminiModel || '2.5 Flash'})</Text>
                <Text style={styles.engineDetail}>
                  {isGeminiConfigured ? 'Connected • Fast 1M Context' : 'Google AI Studio Key required'}
                </Text>
              </View>
            </View>

            {settings.llmProvider === 'gemini' ? (
              <View style={[styles.activeIndicatorPill, { borderColor: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Ionicons name="checkmark-sharp" size={11} color="#38BDF8" />
                <Text style={[styles.activeIndicatorText, { color: '#38BDF8' }]}>ACTIVE</Text>
              </View>
            ) : (
              <View style={styles.inactiveDot} />
            )}
          </View>
        </TouchableOpacity>

        {/* Custom / Extra LLM Card */}
        <TouchableOpacity
          style={[
            styles.engineCard,
            settings.llmProvider === 'custom' && styles.engineCardActiveCustom,
          ]}
          onPress={() => handleSelectLlmProvider('custom')}
          activeOpacity={0.8}
        >
          <View style={styles.engineCardHeader}>
            <View style={styles.engineIdentity}>
              <View style={[styles.engineIcon, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Ionicons name="construct-outline" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.engineName}>Custom / Extra LLM</Text>
                <Text style={styles.engineDetail} numberOfLines={1}>
                  {isCustomLlmConfigured
                    ? `${settings.customLlmModel || 'custom'} • ${settings.customLlmBaseUrl}`
                    : 'Set custom URL (DeepSeek, OpenRouter, Ollama...)'}
                </Text>
              </View>
            </View>

            {settings.llmProvider === 'custom' ? (
              <View style={[styles.activeIndicatorPill, { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="checkmark-sharp" size={11} color="#F59E0B" />
                <Text style={[styles.activeIndicatorText, { color: '#F59E0B' }]}>ACTIVE</Text>
              </View>
            ) : (
              <View style={styles.inactiveDot} />
            )}
          </View>
        </TouchableOpacity>

        {/* SECTION 3: SYSTEM AUTOMATION & FLOATING OVERLAY */}
        <View style={[styles.sectionHeader, { marginTop: 22 }]}>
          <Text style={styles.sectionTitle}>FLOATING DOCK & AUTOMATION</Text>
        </View>

        <View style={styles.cardContainer}>
          {/* Floating Bubble Master Switch */}
          <View style={styles.tileRow}>
            <View style={styles.tileInfo}>
              <View style={styles.tileTitleRow}>
                <Text style={styles.tileTitle}>Floating Voice Assistant</Text>
                {settings.overlayEnabled && (
                  <View style={styles.liveServicePill}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.liveServiceText}>ACTIVE SERVICE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.tileSubtitle}>
                Persistent background service providing hands-free dictation over all apps
              </Text>
            </View>
            <Switch
              value={settings.overlayEnabled}
              onValueChange={(val) => {
                handleToggleOverlay(val);
                Haptics.selectionAsync();
              }}
              trackColor={{ false: '#1E293B', true: '#00F0FF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          {/* Smart Keyboard Docking */}
          <View style={styles.tileRow}>
            <View style={styles.tileInfo}>
              <View style={styles.tileTitleRow}>
                <Text style={styles.tileTitle}>Smart Keyboard Docking</Text>
                <View
                  style={[
                    styles.tagBadge,
                    {
                      borderColor: settings.smartKeyboardMode
                        ? 'rgba(0, 240, 255, 0.4)'
                        : 'rgba(245, 158, 11, 0.4)',
                      backgroundColor: settings.smartKeyboardMode
                        ? 'rgba(0, 240, 255, 0.1)'
                        : 'rgba(245, 158, 11, 0.1)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagBadgeText,
                      {
                        color: settings.smartKeyboardMode
                          ? Theme.colors.cyan
                          : '#F59E0B',
                      },
                    ]}
                  >
                    {settings.smartKeyboardMode ? 'KEYBOARD ATTACHED' : 'ALWAYS VISIBLE'}
                  </Text>
                </View>
              </View>
              <Text style={styles.tileSubtitle}>
                Automatically shows the floating mic above your soft keyboard when typing, and hides when closed.
              </Text>
            </View>
            <Switch
              value={settings.smartKeyboardMode}
              onValueChange={(val) => {
                handleUpdate({ smartKeyboardMode: val });
                Haptics.selectionAsync();
              }}
              trackColor={{ false: '#1E293B', true: '#00F0FF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          {/* Battery Optimization */}
          <TouchableOpacity
            style={styles.tileRow}
            onPress={() => {
              NativeFloatingBubble.requestIgnoreBatteryOptimization();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.tileInfo}>
              <View style={styles.tileTitleRow}>
                <Text style={styles.tileTitle}>Uninterrupted Background Service</Text>
                <View
                  style={[
                    styles.tagBadge,
                    {
                      borderColor: isBatteryIgnored
                        ? 'rgba(16, 185, 129, 0.4)'
                        : 'rgba(245, 158, 11, 0.4)',
                      backgroundColor: isBatteryIgnored
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'rgba(245, 158, 11, 0.1)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagBadgeText,
                      { color: isBatteryIgnored ? '#10B981' : '#F59E0B' },
                    ]}
                  >
                    {isBatteryIgnored ? 'UNRESTRICTED' : 'TAP TO WHITELIST'}
                  </Text>
                </View>
              </View>
              <Text style={styles.tileSubtitle}>
                Ensures Android never stops or kills the dictation service when closing or swiping away the app.
              </Text>
            </View>
            <Ionicons
              name={isBatteryIgnored ? 'shield-checkmark' : 'alert-circle'}
              size={18}
              color={isBatteryIgnored ? '#10B981' : '#F59E0B'}
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Accessibility Auto-Type */}
          <TouchableOpacity
            style={styles.tileRow}
            onPress={() => setPermissionModal({ visible: true, type: 'accessibility' })}
            activeOpacity={0.7}
          >
            <View style={styles.tileInfo}>
              <View style={styles.tileTitleRow}>
                <Text style={styles.tileTitle}>Auto-Type into Active Input</Text>
                <View
                  style={[
                    styles.tagBadge,
                    {
                      borderColor: hasA11yPermission
                        ? 'rgba(16, 185, 129, 0.4)'
                        : 'rgba(245, 158, 11, 0.4)',
                      backgroundColor: hasA11yPermission
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'rgba(245, 158, 11, 0.1)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagBadgeText,
                      { color: hasA11yPermission ? '#10B981' : '#F59E0B' },
                    ]}
                  >
                    {hasA11yPermission ? 'ACCESSIBILITY ACTIVE' : 'SETUP REQUIRED'}
                  </Text>
                </View>
              </View>
              <Text style={styles.tileSubtitle}>
                Injects transcribed and cleaned speech directly into WhatsApp, Chrome, or any active field.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* SECTION 4: SYSTEM PROMPT */}
        <View style={[styles.sectionHeader, { marginTop: 22 }]}>
          <Text style={styles.sectionTitle}>SYSTEM PROMPT</Text>
        </View>

        <View style={styles.cardContainer}>
          <TouchableOpacity
            style={styles.promptHeader}
            onPress={() => {
              setShowPromptDetails(!showPromptDetails);
              Haptics.selectionAsync();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.promptHeaderLeft}>
              <View style={styles.terminalIconBadge}>
                <Ionicons name="terminal-outline" size={15} color={Theme.colors.cyan} />
              </View>
              <View>
                <Text style={styles.tileTitle}>AI Cleanup System Prompt</Text>
                <Text style={styles.tileSubtitle}>Deterministic speech cleanup instructions</Text>
              </View>
            </View>
            <Ionicons
              name={showPromptDetails ? 'chevron-up' : 'chevron-down'}
              size={17}
              color={Theme.colors.textMuted}
            />
          </TouchableOpacity>

          {showPromptDetails && (
            <View style={styles.terminalBody}>
              <View style={styles.terminalBar}>
                <View style={styles.terminalDots}>
                  <View style={[styles.tDot, { backgroundColor: '#EF4444' }]} />
                  <View style={[styles.tDot, { backgroundColor: '#F59E0B' }]} />
                  <View style={[styles.tDot, { backgroundColor: '#10B981' }]} />
                </View>
                <TouchableOpacity
                  style={styles.copyPromptBtn}
                  onPress={handleCopyPrompt}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={copiedPrompt ? 'checkmark-circle' : 'copy-outline'}
                    size={12}
                    color={copiedPrompt ? '#10B981' : Theme.colors.cyan}
                  />
                  <Text
                    style={[
                      styles.copyPromptText,
                      copiedPrompt && { color: '#10B981' },
                    ]}
                  >
                    {copiedPrompt ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.terminalScroll}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                <Text style={styles.terminalCode}>{OPENWHISPR_CLEANUP_SYSTEM_PROMPT}</Text>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <LinearGradient
            colors={['transparent', 'rgba(0, 240, 255, 0.05)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.footerGlowLine}
          />
          <Text style={styles.footerBrand}>OPENWHISPR MOBILE ARCHITECTURE</Text>
          <Text style={styles.footerSpecs}>
            Deepgram Nova-3 • Groq Whisper Turbo • Llama 3.3 • GPT-4o-mini
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#06080D',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 10,
  },
  header: {
    marginBottom: 18,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.cyan,
  },
  keyManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  keyManageText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: Theme.fonts.heading,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    marginTop: 4,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontFamily: Theme.fonts.heading,
    letterSpacing: 0.8,
  },
  sectionHint: {
    color: '#475569',
    fontSize: 10,
    fontFamily: Theme.fonts.regular,
  },
  engineCard: {
    backgroundColor: Theme.colors.cardGlass,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: Theme.colors.border,
    marginBottom: 10,
  },
  engineCardActiveDeepgram: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.45)',
  },
  engineCardActiveGroq: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderColor: 'rgba(0, 240, 255, 0.5)',
  },
  engineCardActiveOpenAI: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  engineCardActiveGemini: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.5)',
  },
  engineCardActiveCustom: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  engineCardActiveSurplus: {
    backgroundColor: 'rgba(255, 77, 141, 0.08)',
    borderColor: 'rgba(255, 77, 141, 0.55)',
  },
  engineCardSurplusFeatured: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 77, 141, 0.35)',
    backgroundColor: 'rgba(255, 77, 141, 0.03)',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 77, 141, 0.18)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 141, 0.4)',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  featuredBadgeText: {
    color: '#FF4D8D',
    fontSize: 9,
    fontFamily: Theme.fonts.monoBold,
    letterSpacing: 0.5,
  },
  engineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  engineIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  engineIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Theme.fonts.heading,
  },
  engineDetail: {
    color: Theme.colors.textMuted,
    fontSize: 11.5,
    fontFamily: Theme.fonts.regular,
    marginTop: 2,
  },
  activeIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.cyan,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
  },
  activeIndicatorText: {
    color: Theme.colors.cyan,
    fontSize: 10,
    fontFamily: Theme.fonts.monoBold,
    letterSpacing: 0.4,
  },
  inactiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  cardContainer: {
    backgroundColor: Theme.colors.cardGlass,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.2,
    borderColor: Theme.colors.border,
  },
  tileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  tileInfo: {
    flex: 1,
    marginRight: 12,
  },
  tileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  tileTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Theme.fonts.semiBold,
  },
  tileSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    marginTop: 2,
    lineHeight: 16,
  },
  liveServicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.35)',
  },
  liveServiceText: {
    color: Theme.colors.cyan,
    fontSize: 9,
    fontFamily: Theme.fonts.monoBold,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagBadgeText: {
    fontSize: 9,
    fontFamily: Theme.fonts.monoBold,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 10,
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promptHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  terminalIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminalBody: {
    marginTop: 12,
    backgroundColor: '#04060A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  terminalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#080C14',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  terminalDots: {
    flexDirection: 'row',
    gap: 6,
  },
  tDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  copyPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  copyPromptText: {
    color: Theme.colors.cyan,
    fontSize: 10,
    fontFamily: Theme.fonts.monoBold,
  },
  terminalScroll: {
    maxHeight: 220,
    padding: 12,
  },
  terminalCode: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 17,
    fontFamily: Theme.fonts.mono,
  },
  footer: {
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 8,
  },
  footerGlowLine: {
    width: '80%',
    height: 1,
    marginBottom: 14,
  },
  footerBrand: {
    color: '#64748B',
    fontSize: 11,
    fontFamily: Theme.fonts.heading,
    letterSpacing: 1,
  },
  footerSpecs: {
    color: '#334155',
    fontSize: 10,
    fontFamily: Theme.fonts.mono,
    marginTop: 4,
  },
});
