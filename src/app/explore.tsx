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

interface EngineOption {
  id: SttProvider | LlmProvider;
  name: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  recommended?: boolean;
}

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

  const sttOptions: EngineOption[] = [
    {
      id: 'surplus',
      name: 'Surplus Intelligence',
      detail: isSurplusConfigured
        ? `${settings.surplusSttModel || 'venice-whisper-large-v3'} · connected`
        : 'Key required',
      icon: 'sparkles',
      tint: '#E08D76',
      recommended: true,
    },
    {
      id: 'deepgram',
      name: 'Deepgram Nova-3',
      detail: isDeepgramConfigured ? 'Connected' : 'Key required',
      icon: 'radio',
      tint: '#93B884',
    },
    {
      id: 'groq',
      name: 'Groq Whisper Turbo',
      detail: isGroqConfigured ? 'Connected' : 'Key required',
      icon: 'flash',
      tint: '#E9A063',
    },
    {
      id: 'openai',
      name: 'OpenAI Whisper',
      detail: isOpenaiConfigured ? 'Connected' : 'Key required',
      icon: 'sparkles-outline',
      tint: '#DFAF82',
    },
    {
      id: 'custom',
      name: 'Custom STT',
      detail: isCustomSttConfigured
        ? `${settings.customSttModel || 'whisper-1'} · ${settings.customSttBaseUrl}`
        : 'Set your own URL & model',
      icon: 'globe-outline',
      tint: '#D9A441',
    },
  ];

  const llmOptions: EngineOption[] = [
    {
      id: 'surplus',
      name: 'Surplus Intelligence',
      detail: isSurplusConfigured
        ? `${settings.surplusLlmModel || 'deepseek-v4-flash'} · 450+ models`
        : 'Key required',
      icon: 'planet',
      tint: '#E08D76',
      recommended: true,
    },
    {
      id: 'groq',
      name: 'Groq Llama 3.3 70B',
      detail: isGroqConfigured ? 'Connected' : 'Key required',
      icon: 'hardware-chip',
      tint: '#E9A063',
    },
    {
      id: 'openai',
      name: 'OpenAI GPT-4o mini',
      detail: isOpenaiConfigured ? 'Connected' : 'Key required',
      icon: 'infinite',
      tint: '#DFAF82',
    },
    {
      id: 'gemini',
      name: `Google Gemini ${settings.geminiModel || '2.5 Flash'}`,
      detail: isGeminiConfigured ? 'Connected · 1M context' : 'Key required',
      icon: 'logo-google',
      tint: '#F2C08A',
    },
    {
      id: 'custom',
      name: 'Custom LLM',
      detail: isCustomLlmConfigured
        ? `${settings.customLlmModel || 'custom'} · ${settings.customLlmBaseUrl}`
        : 'DeepSeek, OpenRouter, Ollama…',
      icon: 'construct-outline',
      tint: '#D9A441',
    },
  ];

  const renderEngineCard = (
    option: EngineOption,
    isActive: boolean,
    onSelect: () => void
  ) => (
    <TouchableOpacity
      key={option.id}
      style={[styles.engineCard, isActive && styles.engineCardActive]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <View style={styles.engineIdentity}>
        <View style={[styles.engineIcon, { backgroundColor: `${option.tint}1F` }]}>
          <Ionicons name={option.icon} size={19} color={option.tint} />
        </View>
        <View style={{ flex: 1 }}>
          {option.recommended && !isActive ? (
            <View style={[styles.featuredBadge, { backgroundColor: `${option.tint}1F` }]}>
              <Text style={[styles.featuredBadgeText, { color: option.tint }]}>Recommended</Text>
            </View>
          ) : null}
          <Text style={styles.engineName}>{option.name}</Text>
          <Text style={styles.engineDetail} numberOfLines={1}>
            {option.detail}
          </Text>
        </View>
      </View>

      {isActive ? (
        <View style={styles.activeIndicatorPill}>
          <Ionicons name="checkmark" size={12} color={Theme.colors.cyan} />
          <Text style={styles.activeIndicatorText}>Active</Text>
        </View>
      ) : (
        <View style={styles.inactiveDot} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.bg} />

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
            paddingLeft: Math.max(insets.left, 20),
            paddingRight: Math.max(insets.right, 20),
            paddingBottom: Math.max(insets.bottom + 96, 120),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Engines & Keys</Text>
            <TouchableOpacity
              style={styles.keyManageBtn}
              onPress={() => {
                Haptics.selectionAsync();
                setShowKeyModal(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="key-outline" size={13} color={Theme.colors.cyan} />
              <Text style={styles.keyManageText}>Edit keys</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>
            Pick the speech-to-text and AI cleanup models you prefer.
          </Text>
        </View>

        {/* SECTION 1: Speech-to-text */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Speech to text</Text>
        </View>

        {sttOptions.map((option) =>
          renderEngineCard(
            option,
            settings.sttProvider === option.id,
            () => handleSelectSttProvider(option.id as SttProvider)
          )
        )}

        {/* SECTION 2: AI cleanup */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>AI cleanup</Text>
        </View>

        {llmOptions.map((option) =>
          renderEngineCard(
            option,
            settings.llmProvider === option.id,
            () => handleSelectLlmProvider(option.id as LlmProvider)
          )
        )}

        {/* SECTION 3: Overlay & automation */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Overlay & automation</Text>
        </View>

        <View style={styles.cardContainer}>
          {/* Floating bubble master switch */}
          <View style={styles.tileRow}>
            <View style={styles.tileInfo}>
              <View style={styles.tileTitleRow}>
                <Text style={styles.tileTitle}>Floating voice assistant</Text>
                {settings.overlayEnabled && (
                  <View style={styles.liveServicePill}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.liveServiceText}>Running</Text>
                  </View>
                )}
              </View>
              <Text style={styles.tileSubtitle}>
                A background service that gives you hands-free dictation over any app.
              </Text>
            </View>
            <Switch
              value={settings.overlayEnabled}
              onValueChange={(val) => {
                handleToggleOverlay(val);
                Haptics.selectionAsync();
              }}
              trackColor={{ false: '#2A241C', true: '#E9A063' }}
              thumbColor="#F7F1E6"
            />
          </View>

          <View style={styles.divider} />

          {/* Smart keyboard docking */}
          <View style={styles.tileRow}>
            <View style={styles.tileInfo}>
              <View style={styles.tileTitleRow}>
                <Text style={styles.tileTitle}>Smart keyboard docking</Text>
                <View
                  style={[
                    styles.tagBadge,
                    {
                      borderColor: settings.smartKeyboardMode
                        ? 'rgba(233, 160, 99, 0.4)'
                        : 'rgba(217, 164, 65, 0.4)',
                      backgroundColor: settings.smartKeyboardMode
                        ? Theme.colors.cyanSubtle
                        : Theme.colors.amberMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagBadgeText,
                      {
                        color: settings.smartKeyboardMode
                          ? Theme.colors.cyan
                          : Theme.colors.amber,
                      },
                    ]}
                  >
                    {settings.smartKeyboardMode ? 'Follows keyboard' : 'Always visible'}
                  </Text>
                </View>
              </View>
              <Text style={styles.tileSubtitle}>
                Shows the floating mic above your keyboard while typing, hides when it closes.
              </Text>
            </View>
            <Switch
              value={settings.smartKeyboardMode}
              onValueChange={(val) => {
                handleUpdate({ smartKeyboardMode: val });
                Haptics.selectionAsync();
              }}
              trackColor={{ false: '#2A241C', true: '#E9A063' }}
              thumbColor="#F7F1E6"
            />
          </View>

          <View style={styles.divider} />

          {/* Battery optimization */}
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
                <Text style={styles.tileTitle}>Keep running in background</Text>
                <View
                  style={[
                    styles.tagBadge,
                    {
                      borderColor: isBatteryIgnored
                        ? 'rgba(147, 184, 132, 0.4)'
                        : 'rgba(217, 164, 65, 0.4)',
                      backgroundColor: isBatteryIgnored
                        ? Theme.colors.greenMuted
                        : Theme.colors.amberMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagBadgeText,
                      { color: isBatteryIgnored ? Theme.colors.green : Theme.colors.amber },
                    ]}
                  >
                    {isBatteryIgnored ? 'Unrestricted' : 'Tap to whitelist'}
                  </Text>
                </View>
              </View>
              <Text style={styles.tileSubtitle}>
                Stops Android from killing the dictation service when you swipe the app away.
              </Text>
            </View>
            <Ionicons
              name={isBatteryIgnored ? 'shield-checkmark' : 'alert-circle'}
              size={19}
              color={isBatteryIgnored ? Theme.colors.green : Theme.colors.amber}
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Accessibility auto-type */}
          <TouchableOpacity
            style={styles.tileRow}
            onPress={() => setPermissionModal({ visible: true, type: 'accessibility' })}
            activeOpacity={0.7}
          >
            <View style={styles.tileInfo}>
              <View style={styles.tileTitleRow}>
                <Text style={styles.tileTitle}>Auto-type into any field</Text>
                <View
                  style={[
                    styles.tagBadge,
                    {
                      borderColor: hasA11yPermission
                        ? 'rgba(147, 184, 132, 0.4)'
                        : 'rgba(217, 164, 65, 0.4)',
                      backgroundColor: hasA11yPermission
                        ? Theme.colors.greenMuted
                        : Theme.colors.amberMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagBadgeText,
                      { color: hasA11yPermission ? Theme.colors.green : Theme.colors.amber },
                    ]}
                  >
                    {hasA11yPermission ? 'Enabled' : 'Setup needed'}
                  </Text>
                </View>
              </View>
              <Text style={styles.tileSubtitle}>
                Types your refined dictation straight into WhatsApp, Chrome, or any input.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* SECTION 4: System prompt */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>System prompt</Text>
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
              <View style={styles.promptIconBadge}>
                <Ionicons name="terminal-outline" size={15} color={Theme.colors.cyan} />
              </View>
              <View>
                <Text style={styles.tileTitle}>AI cleanup instructions</Text>
                <Text style={styles.tileSubtitle}>The prompt sent with every dictation</Text>
              </View>
            </View>
            <Ionicons
              name={showPromptDetails ? 'chevron-up' : 'chevron-down'}
              size={17}
              color={Theme.colors.textMuted}
            />
          </TouchableOpacity>

          {showPromptDetails && (
            <View style={styles.promptBody}>
              <View style={styles.promptToolbar}>
                <Text style={styles.promptToolbarLabel}>system prompt</Text>
                <TouchableOpacity
                  style={styles.copyPromptBtn}
                  onPress={handleCopyPrompt}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={copiedPrompt ? 'checkmark-circle' : 'copy-outline'}
                    size={12}
                    color={copiedPrompt ? Theme.colors.green : Theme.colors.cyan}
                  />
                  <Text
                    style={[
                      styles.copyPromptText,
                      copiedPrompt && { color: Theme.colors.green },
                    ]}
                  >
                    {copiedPrompt ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.promptScroll}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                <Text style={styles.promptCode}>{OPENWHISPR_CLEANUP_SYSTEM_PROMPT}</Text>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDot} />
          <Text style={styles.footerBrand}>OpenWhispr</Text>
          <Text style={styles.footerSpecs}>
            Your voice, refined — anywhere on your phone.
          </Text>
        </View>
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
  contentContainer: {
    paddingTop: 12,
  },
  header: {
    marginBottom: 20,
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
    gap: 6,
    backgroundColor: Theme.colors.surfaceGlass,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  keyManageText: {
    color: '#D7CDBE',
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
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
    marginBottom: 10,
  },
  sectionTitle: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
    letterSpacing: 0.4,
  },
  engineCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 10,
  },
  engineCardActive: {
    backgroundColor: 'rgba(233, 160, 99, 0.07)',
    borderColor: 'rgba(233, 160, 99, 0.45)',
  },
  featuredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.semiBold,
    letterSpacing: 0.2,
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
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontFamily: Theme.fonts.semiBold,
  },
  engineDetail: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    marginTop: 2,
  },
  activeIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(233, 160, 99, 0.4)',
    backgroundColor: Theme.colors.cyanMuted,
  },
  activeIndicatorText: {
    color: Theme.colors.cyan,
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
  },
  inactiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#4A4438',
  },
  cardContainer: {
    backgroundColor: Theme.colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
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
    color: Theme.colors.textPrimary,
    fontSize: 14.5,
    fontFamily: Theme.fonts.semiBold,
  },
  tileSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    marginTop: 3,
    lineHeight: 17,
  },
  liveServicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.cyanMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveServiceText: {
    color: Theme.colors.cyan,
    fontSize: 10,
    fontFamily: Theme.fonts.semiBold,
  },
  tagBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.semiBold,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.borderSubtle,
    marginVertical: 11,
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
  promptIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Theme.colors.cyanSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptBody: {
    marginTop: 12,
    backgroundColor: Theme.colors.bgSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    overflow: 'hidden',
  },
  promptToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderSubtle,
  },
  promptToolbarLabel: {
    color: Theme.colors.textMuted,
    fontSize: 10.5,
    fontFamily: Theme.fonts.mono,
  },
  copyPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Theme.colors.surfaceGlass,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  copyPromptText: {
    color: Theme.colors.cyan,
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
  },
  promptScroll: {
    maxHeight: 220,
    padding: 12,
  },
  promptCode: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: Theme.fonts.mono,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 8,
    gap: 4,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.cyan,
    marginBottom: 6,
  },
  footerBrand: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
  },
  footerSpecs: {
    color: Theme.colors.textMuted,
    fontSize: 11.5,
    fontFamily: Theme.fonts.regular,
  },
});
