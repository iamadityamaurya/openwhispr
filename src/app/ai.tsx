import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Switch,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  SttProvider,
  LlmProvider,
} from '../services/storage';
import { testConnection } from '../services/api';
import { NativeFloatingBubble } from '../services/nativeFloatingBubble';
import { Theme } from '../constants/designSystem';
import { GROQ_STT_MODELS, GROQ_LLM_MODELS } from '../constants/groqModels';
import { SURPLUS_STT_MODELS, SURPLUS_LLM_MODELS } from '../constants/surplusModels';

interface EngineOptionItem<T> {
  id: T;
  name: string;
  tagline: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  badge?: string;
  checkConfigured: (s: AppSettings) => boolean;
}

const STT_ENGINE_OPTIONS: EngineOptionItem<SttProvider>[] = [
  {
    id: 'groq',
    name: 'Groq Whisper',
    tagline: 'Whisper large-v3 turbo · ~250ms LPU',
    icon: 'flash',
    tint: '#3fae6e',
    badge: 'Fastest · Free',
    checkConfigured: (s) => !!s.groqApiKey?.trim(),
  },
  {
    id: 'deepgram',
    name: 'Deepgram Nova',
    tagline: 'Nova-3 · Realtime high accuracy',
    icon: 'mic',
    tint: '#D6A97C',
    badge: 'Pro STT',
    checkConfigured: (s) => !!s.deepgramApiKey?.trim(),
  },
  {
    id: 'openai',
    name: 'OpenAI Whisper',
    tagline: 'Whisper-1 · Official cloud endpoint',
    icon: 'logo-electron',
    tint: '#E0E0E0',
    badge: 'Official',
    checkConfigured: (s) => !!s.openaiApiKey?.trim(),
  },
  {
    id: 'surplus',
    name: 'Surplus Intelligence',
    tagline: 'Venice Whisper · Decentralized GPU',
    icon: 'planet',
    tint: '#A78BFA',
    badge: 'Web3 GPU',
    checkConfigured: (s) => !!s.surplusApiKey?.trim(),
  },
  {
    id: 'custom',
    name: 'Custom STT',
    tagline: 'Self-hosted Whisper / Ollama server',
    icon: 'globe-outline',
    tint: '#D9A441',
    badge: 'Self-hosted',
    checkConfigured: (s) => !!s.customSttBaseUrl?.trim(),
  },
];

const LLM_ENGINE_OPTIONS: EngineOptionItem<LlmProvider>[] = [
  {
    id: 'groq',
    name: 'Groq LPU',
    tagline: 'LLaMA 3.3 70B · Sub-second formatting',
    icon: 'hardware-chip',
    tint: '#3fae6e',
    badge: 'Recommended',
    checkConfigured: (s) => !!s.groqApiKey?.trim(),
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    tagline: 'Gemini 2.5 Flash / Pro · Fluid style',
    icon: 'sparkles',
    tint: '#93B884',
    badge: 'Free Tier',
    checkConfigured: (s) => !!s.geminiApiKey?.trim(),
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    tagline: 'GPT-4o-mini · Smart & fast cleanup',
    icon: 'infinite',
    tint: '#E0E0E0',
    badge: 'Official',
    checkConfigured: (s) => !!s.openaiApiKey?.trim(),
  },
  {
    id: 'surplus',
    name: 'Surplus Intelligence',
    tagline: 'DeepSeek V4 · 450+ decentralized models',
    icon: 'planet',
    tint: '#A78BFA',
    badge: 'Web3 GPU',
    checkConfigured: (s) => !!s.surplusApiKey?.trim(),
  },
  {
    id: 'custom',
    name: 'Custom LLM',
    tagline: 'Ollama / vLLM / OpenRouter endpoints',
    icon: 'construct-outline',
    tint: '#D9A441',
    badge: 'Self-hosted',
    checkConfigured: (s) => !!s.customLlmBaseUrl?.trim(),
  },
];

const getActiveSttLabel = (s: AppSettings) => {
  switch (s.sttProvider) {
    case 'groq':
      return `Groq (${(s.groqWhisperModel || 'whisper-large-v3-turbo').replace('whisper-', '')})`;
    case 'deepgram':
      return `Deepgram (${(s.deepgramModel || 'nova-3').toUpperCase()})`;
    case 'openai':
      return `OpenAI (${s.openaiWhisperModel || 'whisper-1'})`;
    case 'surplus':
      return `Surplus (${(s.surplusSttModel || 'venice-whisper-large-v3').replace('venice-', '')})`;
    case 'custom':
      return `Custom (${s.customSttModel || 'whisper-1'})`;
    default:
      return s.sttProvider;
  }
};

const getActiveLlmLabel = (s: AppSettings) => {
  switch (s.llmProvider) {
    case 'groq':
      return `Groq (${(s.groqLlmModel || 'llama-3.3-70b-versatile').replace('-versatile', '')})`;
    case 'gemini':
      return `Gemini (${s.geminiModel || '2.5 Flash'})`;
    case 'openai':
      return `OpenAI (${s.openaiLlmModel || 'gpt-4o-mini'})`;
    case 'surplus':
      return `Surplus (${(s.surplusLlmModel || 'deepseek-v4-flash').replace('-flash', '')})`;
    case 'custom':
      return `Custom (${s.customLlmModel || 'custom'})`;
    default:
      return s.llmProvider;
  }
};

interface ProviderCardProps {
  id: string;
  name: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  tagline: string;
  docUrl?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg?: string;
}

export default function AiSetupScreen() {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Key visibility toggles
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Toast feedback state
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Testing states per provider
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});

  // Card expansion state for clean accordion layout
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    groq: false,
    gemini: false,
    deepgram: false,
    openai: false,
    surplus: false,
    custom: false,
  });

  // Custom model input visibility toggles
  const [customModelToggles, setCustomModelToggles] = useState<Record<string, boolean>>({});

  const toggleCustomModel = (key: string) => {
    Haptics.selectionAsync();
    setCustomModelToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };



  const toggleCardExpanded = (cardKey: string) => {
    Haptics.selectionAsync();
    setExpandedCards((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };

  // Active Engine tab switcher ('stt' | 'llm')
  const [activeEngineTab, setActiveEngineTab] = useState<'stt' | 'llm'>('stt');

  // Highlighted API key field state for auto-scroll/focus visual guidance
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

  const triggerKeyHighlight = (provider: string) => {
    setHighlightedKey(provider);
    setTimeout(() => {
      setHighlightedKey((cur) => (cur === provider ? null : cur));
    }, 4500);
  };

  const handleSelectStt = async (provider: SttProvider, name: string, isConfigured: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await handleUpdate({ sttProvider: provider });
    if (!isConfigured) {
      setExpandedCards((prev) => ({ ...prev, [provider]: true }));
      triggerKeyHighlight(provider);
      showToast(`${name} selected. Please enter API key below to activate.`);
    } else {
      showToast(`${name} is now your active Speech-to-Text engine`);
    }
  };

  const handleSelectLlm = async (provider: LlmProvider, name: string, isConfigured: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await handleUpdate({ llmProvider: provider });
    if (!isConfigured) {
      setExpandedCards((prev) => ({ ...prev, [provider]: true }));
      triggerKeyHighlight(provider);
      showToast(`${name} selected. Please enter API key below to activate.`);
    } else {
      showToast(`${name} is now your active Cleanup LLM engine`);
    }
  };

  const handleSelectModelPill = async (
    provider: 'surplus' | 'groq' | 'gemini' | 'deepgram' | 'openai' | 'custom',
    type: 'stt' | 'llm',
    patch: Partial<AppSettings>,
    providerName: string,
    modelName: string
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let isConfigured = false;
    if (provider === 'surplus') isConfigured = !!settings.surplusApiKey?.trim();
    else if (provider === 'groq') isConfigured = !!settings.groqApiKey?.trim();
    else if (provider === 'gemini') isConfigured = !!settings.geminiApiKey?.trim();
    else if (provider === 'deepgram') isConfigured = !!settings.deepgramApiKey?.trim();
    else if (provider === 'openai') isConfigured = !!settings.openaiApiKey?.trim();
    else if (provider === 'custom') {
      isConfigured =
        type === 'stt' ? !!settings.customSttBaseUrl?.trim() : !!settings.customLlmBaseUrl?.trim();
    }

    const fullPatch: Partial<AppSettings> = {
      ...patch,
      ...(type === 'stt' ? { sttProvider: provider as SttProvider } : { llmProvider: provider as LlmProvider }),
    };

    await handleUpdate(fullPatch);
    setExpandedCards((prev) => ({ ...prev, [provider]: true }));

    if (!isConfigured) {
      triggerKeyHighlight(provider);
      showToast(`${modelName} selected. Please enter ${providerName} API key.`);
    } else {
      showToast(`${modelName} selected as active ${type === 'stt' ? 'STT' : 'LLM'}`);
    }
  };

  // Fetch settings on focus so changes in other tabs are reflected
  const fetchSettings = useCallback(async () => {
    try {
      const s = await loadSettings();
      setSettings(s);
      setHasLoaded(true);
      // Auto-open active provider if missing API key
      const activeSttKey =
        s.sttProvider === 'surplus'
          ? s.surplusApiKey
          : s.sttProvider === 'groq'
          ? s.groqApiKey
          : s.sttProvider === 'deepgram'
          ? s.deepgramApiKey
          : s.sttProvider === 'openai'
          ? s.openaiApiKey
          : s.customSttBaseUrl;
      if (!activeSttKey?.trim()) {
        setExpandedCards((prev) => ({ ...prev, [s.sttProvider]: true }));
        triggerKeyHighlight(s.sttProvider);
      }
    } catch (err) {
      console.error('Failed to load settings in AI tab:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSettings();
    }, [fetchSettings])
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 2800);
  };

  const handleUpdate = async (patch: Partial<AppSettings>) => {
    try {
      const updated = { ...settings, ...patch };
      setSettings(updated);
      await saveSettings(patch);
      await NativeFloatingBubble.syncSettings(updated);
      Haptics.selectionAsync();
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  const toggleKeyVisibility = (keyName: string) => {
    setShowKeys((prev) => ({ ...prev, [keyName]: !prev[keyName] }));
    Haptics.selectionAsync();
  };

  const pasteFromClipboard = async (field: keyof AppSettings) => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text || text.trim().length === 0) {
        showToast('Clipboard is empty');
        return;
      }
      await handleUpdate({ [field]: text.trim() } as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Pasted from clipboard!');
    } catch (err) {
      showToast('Could not access clipboard');
    }
  };

  const clearField = async (field: keyof AppSettings) => {
    await handleUpdate({ [field]: '' } as any);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast('Key cleared');
  };

  const openDocUrl = (url: string) => {
    Haptics.selectionAsync();
    Linking.openURL(url).catch(() => {
      showToast('Could not open browser');
    });
  };

  const runTest = async (provider: 'groq' | 'gemini' | 'deepgram' | 'openai' | 'surplus' | 'custom') => {
    let keyToTest = '';
    let customOpts: { baseUrl?: string; model?: string } | undefined = undefined;

    if (provider === 'groq') keyToTest = settings.groqApiKey;
    else if (provider === 'gemini') keyToTest = settings.geminiApiKey;
    else if (provider === 'deepgram') keyToTest = settings.deepgramApiKey;
    else if (provider === 'openai') keyToTest = settings.openaiApiKey;
    else if (provider === 'surplus') keyToTest = settings.surplusApiKey;
    else if (provider === 'custom') {
      keyToTest = settings.customLlmApiKey || settings.customSttApiKey;
      customOpts = {
        baseUrl: settings.customLlmBaseUrl || settings.customSttBaseUrl,
        model: settings.customLlmModel || settings.customSttModel,
      };
    }

    if (provider !== 'custom' && (!keyToTest || keyToTest.trim().length === 0)) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: { success: false, message: 'Please enter an API key first' },
      }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setTesting((prev) => ({ ...prev, [provider]: true }));
    setTestResults((prev) => ({ ...prev, [provider]: undefined as any }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const res = await testConnection(keyToTest, provider as any, customOpts);
      setTestResults((prev) => ({ ...prev, [provider]: res }));
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e: any) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: { success: false, message: e?.message || 'Connection failed' },
      }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTesting((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const configuredProviders = [
    { name: 'Groq', configured: !!settings.groqApiKey?.trim() },
    { name: 'Gemini', configured: !!settings.geminiApiKey?.trim() },
    { name: 'Deepgram', configured: !!settings.deepgramApiKey?.trim() },
    { name: 'OpenAI', configured: !!settings.openaiApiKey?.trim() },
    { name: 'Surplus', configured: !!settings.surplusApiKey?.trim() },
    { name: 'Custom', configured: !!settings.customLlmBaseUrl?.trim() },
  ];

  const configuredCount = configuredProviders.filter((p) => p.configured).length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.bg} />

      {/* Toast Alert */}
      {toastMsg && (
        <View style={[styles.toastContainer, { top: Math.max(insets.top, 14) + 60 }]}>
          <Ionicons name="checkmark-circle" size={16} color={Theme.colors.cyan} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* Sticky Header */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>AI & API Setup</Text>
              <View style={styles.headerCountBadge}>
                <View
                  style={[
                    styles.headerDot,
                    { backgroundColor: configuredCount > 0 ? '#93B884' : Theme.colors.amber },
                  ]}
                />
                <Text style={styles.headerCountText}>
                  {configuredCount} / {configuredProviders.length} Active
                </Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Speech-to-text models, LLM cleanup, and custom endpoints.
            </Text>
          </View>
        </View>

        {/* Quick status chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusChipsScroll}
        >
          {configuredProviders.map((p) => {
            const cardKey = p.name.toLowerCase();
            return (
              <TouchableOpacity
                key={p.name}
                style={[
                  styles.statusChip,
                  p.configured && styles.statusChipActive,
                  expandedCards[cardKey] && styles.statusChipExpanded,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setExpandedCards((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }));
                  if (!p.configured) {
                    triggerKeyHighlight(cardKey);
                    showToast(`Configure ${p.name} API key below`);
                  }
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.statusChipDot,
                    { backgroundColor: p.configured ? '#93B884' : 'rgba(255, 255, 255, 0.2)' },
                  ]}
                />
                <Text
                  style={[
                    styles.statusChipText,
                    p.configured && styles.statusChipTextActive,
                  ]}
                >
                  {p.name}
                </Text>
                {p.configured ? (
                  <Ionicons name="checkmark" size={11} color="#93B884" style={{ marginLeft: 2 }} />
                ) : (
                  <Ionicons name="key-outline" size={10} color={Theme.colors.amber} style={{ marginLeft: 2 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
        keyboardShouldPersistTaps="handled"
      >

        {/* ACTIVE ENGINES SUMMARY BAR */}
        <View style={styles.activeEnginesBarMerged}>
          <TouchableOpacity
            style={styles.activeEngineCol}
            onPress={() => {
              const prov = settings.sttProvider;
              setExpandedCards((prev) => ({ ...prev, [prov]: true }));
              const isConfig = configuredProviders.find(p => p.name.toLowerCase() === prov)?.configured;
              if (!isConfig) triggerKeyHighlight(prov);
              Haptics.selectionAsync();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.activeEngineLabel}>ACTIVE SPEECH-TO-TEXT</Text>
            <View style={styles.activeEngineValRow}>
              <View style={[styles.activeStatusDot, { backgroundColor: '#93B884' }]} />
              <Text style={styles.activeEngineVal} numberOfLines={1}>
                {getActiveSttLabel(settings)}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.activeEnginesDivider} />
          <TouchableOpacity
            style={styles.activeEngineCol}
            onPress={() => {
              const prov = settings.llmProvider;
              setExpandedCards((prev) => ({ ...prev, [prov]: true }));
              const isConfig = configuredProviders.find(p => p.name.toLowerCase() === prov)?.configured;
              if (!isConfig) triggerKeyHighlight(prov);
              Haptics.selectionAsync();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.activeEngineLabel}>ACTIVE CLEANUP LLM</Text>
            <View style={styles.activeEngineValRow}>
              <View style={[styles.activeStatusDot, { backgroundColor: '#3fae6e' }]} />
              <Text style={styles.activeEngineVal} numberOfLines={1}>
                {getActiveLlmLabel(settings)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 1. SURPLUS INTELLIGENCE */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(128, 87, 200, 0.15)' }]}>
              <Ionicons name="globe-outline" size={18} color="#A78BFA" />
            </View>
            <View style={styles.cardTitleCol}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Surplus Intelligence</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.openConfigBtn,
                  expandedCards.surplus && styles.openConfigBtnActive,
                ]}
                onPress={() => toggleCardExpanded('surplus')}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={expandedCards.surplus ? 'chevron-up' : 'settings-outline'}
                  size={13}
                  color={expandedCards.surplus ? Theme.colors.cyan : Theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.openConfigBtnText,
                    expandedCards.surplus && styles.openConfigBtnTextActive,
                  ]}
                >
                  {expandedCards.surplus ? 'Hide' : 'Configure'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Select Action Bar */}
          <View style={styles.cardActionRow}>
            <View style={styles.cardActionLeft}>
              {/* STT Select */}
              <TouchableOpacity
                style={[
                  styles.selectModelBtn,
                  settings.sttProvider === 'surplus' && styles.selectModelBtnActive,
                ]}
                onPress={() => handleSelectStt('surplus', 'Surplus STT', !!settings.surplusApiKey?.trim())}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={settings.sttProvider === 'surplus' ? 'checkmark-circle' : 'mic-outline'}
                  size={13}
                  color={settings.sttProvider === 'surplus' ? '#08080A' : '#A78BFA'}
                />
                <Text
                  style={[
                    styles.selectModelBtnText,
                    { color: settings.sttProvider === 'surplus' ? '#08080A' : '#A78BFA' },
                    settings.sttProvider === 'surplus' && styles.selectModelBtnTextActive,
                  ]}
                >
                  {settings.sttProvider === 'surplus' ? 'Active STT' : 'Select STT'}
                </Text>
              </TouchableOpacity>

              {/* LLM Select */}
              <TouchableOpacity
                style={[
                  styles.selectModelBtn,
                  settings.llmProvider === 'surplus' && styles.selectModelBtnActive,
                ]}
                onPress={() => handleSelectLlm('surplus', 'Surplus LLM', !!settings.surplusApiKey?.trim())}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={settings.llmProvider === 'surplus' ? 'checkmark-circle' : 'sparkles-outline'}
                  size={13}
                  color={settings.llmProvider === 'surplus' ? '#08080A' : '#A78BFA'}
                />
                <Text
                  style={[
                    styles.selectModelBtnText,
                    { color: settings.llmProvider === 'surplus' ? '#08080A' : '#A78BFA' },
                    settings.llmProvider === 'surplus' && styles.selectModelBtnTextActive,
                  ]}
                >
                  {settings.llmProvider === 'surplus' ? 'Active LLM' : 'Select LLM'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>


          {/* Collapsible Filling Options */}
          {expandedCards.surplus && (
            <View style={styles.cardExpandedSection}>
              <TouchableOpacity
                style={styles.keyLinkBtn}
                onPress={() => openDocUrl('https://api.surplusintelligence.ai')}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={13} color="#A78BFA" />
                <Text style={[styles.keyLinkText, { color: '#A78BFA' }]}>surplusintelligence.ai</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>SURPLUS API KEY</Text>
              {highlightedKey === 'surplus' && !settings.surplusApiKey?.trim() && (
                <View style={styles.keyRequiredBadge}>
                  <Ionicons name="alert-circle-outline" size={13} color="#FBBF24" />
                  <Text style={styles.keyRequiredText}>API key required — paste or enter your Surplus key</Text>
                </View>
              )}
              <View style={[styles.inputWrap, highlightedKey === 'surplus' && styles.inputWrapHighlighted]}>
                <TextInput
                  style={styles.input}
                  value={settings.surplusApiKey}
                  onChangeText={(val) => handleUpdate({ surplusApiKey: val.trim() })}
                  placeholder="surplus_..."
                  placeholderTextColor={Theme.colors.textMuted}
                  secureTextEntry={!showKeys['surplus']}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.inputActionBtn}
                  onPress={() => toggleKeyVisibility('surplus')}
                >
                  <Ionicons
                    name={showKeys['surplus'] ? 'eye-off-outline' : 'eye-outline'}
                    size={17}
                    color={Theme.colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.inputActionBtn}
                  onPress={() => pasteFromClipboard('surplusApiKey')}
                >
                  <Ionicons name="clipboard-outline" size={17} color={Theme.colors.cyan} />
                </TouchableOpacity>
                {!!settings.surplusApiKey && (
                  <TouchableOpacity
                    style={styles.inputActionBtn}
                    onPress={() => clearField('surplusApiKey')}
                  >
                    <Ionicons name="close-circle" size={17} color={Theme.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Surplus STT Model Selector */}
              <Text style={styles.subLabel}>Surplus Speech-to-Text Model</Text>
              <View style={styles.pillSelectorRow}>
                {SURPLUS_STT_MODELS.map((m) => {
                  const isSelected = (settings.surplusSttModel || 'venice-whisper-large-v3') === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.modelPill, isSelected && styles.modelPillActive]}
                      onPress={() =>
                        handleSelectModelPill(
                          'surplus',
                          'stt',
                          { surplusSttModel: m.id },
                          'Surplus',
                          m.name.replace(' (Venice)', '')
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.modelPillText, isSelected && styles.modelPillTextActive]}>
                        {m.name.replace(' (Venice)', '')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.modelPill,
                    styles.modelPillCustom,
                    (!SURPLUS_STT_MODELS.some((m) => m.id === settings.surplusSttModel) ||
                      customModelToggles['surplusStt']) &&
                      styles.modelPillActive,
                  ]}
                  onPress={() => toggleCustomModel('surplusStt')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="create-outline"
                    size={13}
                    color={
                      !SURPLUS_STT_MODELS.some((m) => m.id === settings.surplusSttModel) ||
                      customModelToggles['surplusStt']
                        ? Theme.colors.cyan
                        : Theme.colors.textMuted
                    }
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.modelPillText,
                      (!SURPLUS_STT_MODELS.some((m) => m.id === settings.surplusSttModel) ||
                        customModelToggles['surplusStt']) &&
                        styles.modelPillTextActive,
                    ]}
                  >
                    Custom...
                  </Text>
                </TouchableOpacity>
              </View>

              {(!SURPLUS_STT_MODELS.some((m) => m.id === settings.surplusSttModel) ||
                customModelToggles['surplusStt']) && (
                <View style={styles.customModelInputWrap}>
                  <Text style={styles.customModelInputLabel}>CUSTOM SURPLUS STT MODEL ID</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. venice-whisper-large-v3, custom-whisper"
                      placeholderTextColor={Theme.colors.textMuted}
                      value={settings.surplusSttModel || ''}
                      onChangeText={(val) => handleUpdate({ surplusSttModel: val.trim() })}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {!!settings.surplusSttModel && (
                      <TouchableOpacity
                        style={styles.inputActionBtn}
                        onPress={() => handleUpdate({ surplusSttModel: 'venice-whisper-large-v3' })}
                      >
                        <Ionicons name="refresh" size={15} color={Theme.colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Surplus LLM Model Selector */}
              <Text style={styles.subLabel}>Surplus AI Cleanup LLM Model</Text>
              <View style={styles.pillSelectorRow}>
                {SURPLUS_LLM_MODELS.map((m) => {
                  const isSelected = (settings.surplusLlmModel || 'deepseek-v4-flash') === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.modelPill, isSelected && styles.modelPillActive]}
                      onPress={() =>
                        handleSelectModelPill(
                          'surplus',
                          'llm',
                          { surplusLlmModel: m.id },
                          'Surplus',
                          m.name
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.modelPillText, isSelected && styles.modelPillTextActive]}>
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.modelPill,
                    styles.modelPillCustom,
                    (!SURPLUS_LLM_MODELS.some((m) => m.id === settings.surplusLlmModel) ||
                      customModelToggles['surplusLlm']) &&
                      styles.modelPillActive,
                  ]}
                  onPress={() => toggleCustomModel('surplusLlm')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="create-outline"
                    size={13}
                    color={
                      !SURPLUS_LLM_MODELS.some((m) => m.id === settings.surplusLlmModel) ||
                      customModelToggles['surplusLlm']
                        ? Theme.colors.cyan
                        : Theme.colors.textMuted
                    }
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.modelPillText,
                      (!SURPLUS_LLM_MODELS.some((m) => m.id === settings.surplusLlmModel) ||
                        customModelToggles['surplusLlm']) &&
                        styles.modelPillTextActive,
                    ]}
                  >
                    Custom...
                  </Text>
                </TouchableOpacity>
              </View>

              {(!SURPLUS_LLM_MODELS.some((m) => m.id === settings.surplusLlmModel) ||
                customModelToggles['surplusLlm']) && (
                <View style={styles.customModelInputWrap}>
                  <Text style={styles.customModelInputLabel}>CUSTOM SURPLUS LLM MODEL ID</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. claude-3-7-sonnet, deepseek-r1"
                      placeholderTextColor={Theme.colors.textMuted}
                      value={settings.surplusLlmModel || ''}
                      onChangeText={(val) => handleUpdate({ surplusLlmModel: val.trim() })}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {!!settings.surplusLlmModel && (
                      <TouchableOpacity
                        style={styles.inputActionBtn}
                        onPress={() => handleUpdate({ surplusLlmModel: 'deepseek-v4-flash' })}
                      >
                        <Ionicons name="refresh" size={15} color={Theme.colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}


              <View style={styles.testRow}>
                <TouchableOpacity
                  style={[styles.testBtn, testing['surplus'] && styles.testBtnDisabled]}
                  onPress={() => runTest('surplus')}
                  disabled={testing['surplus']}
                  activeOpacity={0.8}
                >
                  {testing['surplus'] ? (
                    <ActivityIndicator size="small" color="#08080A" />
                  ) : (
                    <>
                      <Ionicons name="radio-outline" size={14} color="#08080A" style={{ marginRight: 6 }} />
                      <Text style={styles.testBtnText}>Test Surplus Connection</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {testResults['surplus'] && (
                <View
                  style={[
                    styles.testFeedback,
                    testResults['surplus'].success ? styles.testSuccess : styles.testError,
                  ]}
                >
                  <Ionicons
                    name={testResults['surplus'].success ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={testResults['surplus'].success ? '#93B884' : '#E5484D'}
                  />
                  <Text
                    style={[
                      styles.testFeedbackText,
                      { color: testResults['surplus'].success ? '#93B884' : '#E5484D' },
                    ]}
                  >
                    {testResults['surplus'].message}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 2. GROQ CLOUD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(63, 174, 110, 0.12)' }]}>
              <Ionicons name="flash-outline" size={18} color={Theme.colors.cyan} />
            </View>
            <View style={styles.cardTitleCol}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Groq Cloud</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.openConfigBtn,
                  expandedCards.groq && styles.openConfigBtnActive,
                ]}
                onPress={() => toggleCardExpanded('groq')}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={expandedCards.groq ? 'chevron-up' : 'settings-outline'}
                  size={13}
                  color={expandedCards.groq ? Theme.colors.cyan : Theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.openConfigBtnText,
                    expandedCards.groq && styles.openConfigBtnTextActive,
                  ]}
                >
                  {expandedCards.groq ? 'Hide' : 'Configure'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Select Action Bar */}
          <View style={styles.cardActionRow}>
            <View style={styles.cardActionLeft}>
              {/* STT Select */}
              <TouchableOpacity
                style={[
                  styles.selectModelBtn,
                  settings.sttProvider === 'groq' && styles.selectModelBtnActive,
                ]}
                onPress={() => handleSelectStt('groq', 'Groq Whisper', !!settings.groqApiKey?.trim())}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={settings.sttProvider === 'groq' ? 'checkmark-circle' : 'mic-outline'}
                  size={13}
                  color={settings.sttProvider === 'groq' ? '#08080A' : '#3fae6e'}
                />
                <Text
                  style={[
                    styles.selectModelBtnText,
                    settings.sttProvider === 'groq' && styles.selectModelBtnTextActive,
                  ]}
                >
                  {settings.sttProvider === 'groq' ? 'Active STT' : 'Select STT'}
                </Text>
              </TouchableOpacity>

              {/* LLM Select */}
              <TouchableOpacity
                style={[
                  styles.selectModelBtn,
                  settings.llmProvider === 'groq' && styles.selectModelBtnActive,
                ]}
                onPress={() => handleSelectLlm('groq', 'Groq LPU', !!settings.groqApiKey?.trim())}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={settings.llmProvider === 'groq' ? 'checkmark-circle' : 'sparkles-outline'}
                  size={13}
                  color={settings.llmProvider === 'groq' ? '#08080A' : '#3fae6e'}
                />
                <Text
                  style={[
                    styles.selectModelBtnText,
                    settings.llmProvider === 'groq' && styles.selectModelBtnTextActive,
                  ]}
                >
                  {settings.llmProvider === 'groq' ? 'Active LLM' : 'Select LLM'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>


          {/* Collapsible Filling Options */}
          {expandedCards.groq && (
            <View style={styles.cardExpandedSection}>
              {/* Doc link */}
              <TouchableOpacity
                style={styles.keyLinkBtn}
                onPress={() => openDocUrl('https://console.groq.com/keys')}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={13} color={Theme.colors.cyan} />
                <Text style={styles.keyLinkText}>Get free API key at console.groq.com</Text>
              </TouchableOpacity>

              {/* Key Input */}
              <Text style={styles.inputLabel}>GROQ API KEY</Text>
              {highlightedKey === 'groq' && !settings.groqApiKey?.trim() && (
                <View style={styles.keyRequiredBadge}>
                  <Ionicons name="alert-circle-outline" size={13} color="#FBBF24" />
                  <Text style={styles.keyRequiredText}>API key required — paste or enter your Groq key</Text>
                </View>
              )}
              <View style={[styles.inputWrap, highlightedKey === 'groq' && styles.inputWrapHighlighted]}>
                <TextInput
                  style={styles.input}
                  value={settings.groqApiKey}
                  onChangeText={(val) => handleUpdate({ groqApiKey: val.trim() })}
                  placeholder="gsk_..."
                  placeholderTextColor={Theme.colors.textMuted}
                  secureTextEntry={!showKeys['groq']}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.inputActionBtn}
                  onPress={() => toggleKeyVisibility('groq')}
                >
                  <Ionicons
                    name={showKeys['groq'] ? 'eye-off-outline' : 'eye-outline'}
                    size={17}
                    color={Theme.colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.inputActionBtn}
                  onPress={() => pasteFromClipboard('groqApiKey')}
                >
                  <Ionicons name="clipboard-outline" size={17} color={Theme.colors.cyan} />
                </TouchableOpacity>
                {!!settings.groqApiKey && (
                  <TouchableOpacity
                    style={styles.inputActionBtn}
                    onPress={() => clearField('groqApiKey')}
                  >
                    <Ionicons name="close-circle" size={17} color={Theme.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Groq Whisper Model Selector */}
              <Text style={styles.subLabel}>Speech-to-Text Model</Text>
              <View style={styles.pillSelectorRow}>
                {GROQ_STT_MODELS.map((m) => {
                  const isSelected = (settings.groqWhisperModel || 'whisper-large-v3-turbo') === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.modelPill, isSelected && styles.modelPillActive]}
                      onPress={() =>
                        handleSelectModelPill(
                          'groq',
                          'stt',
                          { groqWhisperModel: m.id },
                          'Groq',
                          m.name.replace('Whisper ', '')
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.modelPillText, isSelected && styles.modelPillTextActive]}>
                        {m.name.replace('Whisper ', '')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.modelPill,
                    styles.modelPillCustom,
                    (!GROQ_STT_MODELS.some((m) => m.id === settings.groqWhisperModel) ||
                      customModelToggles['groqStt']) &&
                      styles.modelPillActive,
                  ]}
                  onPress={() => toggleCustomModel('groqStt')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="create-outline"
                    size={13}
                    color={
                      !GROQ_STT_MODELS.some((m) => m.id === settings.groqWhisperModel) ||
                      customModelToggles['groqStt']
                        ? Theme.colors.cyan
                        : Theme.colors.textMuted
                    }
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.modelPillText,
                      (!GROQ_STT_MODELS.some((m) => m.id === settings.groqWhisperModel) ||
                        customModelToggles['groqStt']) &&
                        styles.modelPillTextActive,
                    ]}
                  >
                    Custom...
                  </Text>
                </TouchableOpacity>
              </View>

              {(!GROQ_STT_MODELS.some((m) => m.id === settings.groqWhisperModel) ||
                customModelToggles['groqStt']) && (
                <View style={styles.customModelInputWrap}>
                  <Text style={styles.customModelInputLabel}>CUSTOM GROQ STT MODEL ID</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. whisper-large-v3, distil-whisper-large-v3-en"
                      placeholderTextColor={Theme.colors.textMuted}
                      value={settings.groqWhisperModel || ''}
                      onChangeText={(val) => handleUpdate({ groqWhisperModel: val.trim() })}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {!!settings.groqWhisperModel && (
                      <TouchableOpacity
                        style={styles.inputActionBtn}
                        onPress={() => handleUpdate({ groqWhisperModel: 'whisper-large-v3-turbo' })}
                      >
                        <Ionicons name="refresh" size={15} color={Theme.colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Groq LLM Model Selector */}
              <Text style={styles.subLabel}>AI Cleanup LLM Model</Text>
              <View style={styles.pillSelectorRow}>
                {GROQ_LLM_MODELS.map((m) => {
                  const isSelected = (settings.groqLlmModel || 'llama-3.3-70b-versatile') === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.modelPill, isSelected && styles.modelPillActive]}
                      onPress={() =>
                        handleSelectModelPill(
                          'groq',
                          'llm',
                          { groqLlmModel: m.id },
                          'Groq',
                          m.name
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.modelPillText, isSelected && styles.modelPillTextActive]}>
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.modelPill,
                    styles.modelPillCustom,
                    (!GROQ_LLM_MODELS.some((m) => m.id === settings.groqLlmModel) ||
                      customModelToggles['groqLlm']) &&
                      styles.modelPillActive,
                  ]}
                  onPress={() => toggleCustomModel('groqLlm')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="create-outline"
                    size={13}
                    color={
                      !GROQ_LLM_MODELS.some((m) => m.id === settings.groqLlmModel) ||
                      customModelToggles['groqLlm']
                        ? Theme.colors.cyan
                        : Theme.colors.textMuted
                    }
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.modelPillText,
                      (!GROQ_LLM_MODELS.some((m) => m.id === settings.groqLlmModel) ||
                        customModelToggles['groqLlm']) &&
                        styles.modelPillTextActive,
                    ]}
                  >
                    Custom...
                  </Text>
                </TouchableOpacity>
              </View>

              {(!GROQ_LLM_MODELS.some((m) => m.id === settings.groqLlmModel) ||
                customModelToggles['groqLlm']) && (
                <View style={styles.customModelInputWrap}>
                  <Text style={styles.customModelInputLabel}>CUSTOM GROQ LLM MODEL ID</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. llama-3.3-70b-specdec, qwen/qwen3.8-27b"
                      placeholderTextColor={Theme.colors.textMuted}
                      value={settings.groqLlmModel || ''}
                      onChangeText={(val) => handleUpdate({ groqLlmModel: val.trim() })}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {!!settings.groqLlmModel && (
                      <TouchableOpacity
                        style={styles.inputActionBtn}
                        onPress={() => handleUpdate({ groqLlmModel: 'llama-3.3-70b-versatile' })}
                      >
                        <Ionicons name="refresh" size={15} color={Theme.colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}


              {/* Test Button & Result */}
              <View style={styles.testRow}>
                <TouchableOpacity
                  style={[styles.testBtn, testing['groq'] && styles.testBtnDisabled]}
                  onPress={() => runTest('groq')}
                  disabled={testing['groq']}
                  activeOpacity={0.8}
                >
                  {testing['groq'] ? (
                    <ActivityIndicator size="small" color="#08080A" />
                  ) : (
                    <>
                      <Ionicons name="radio-outline" size={14} color="#08080A" style={{ marginRight: 6 }} />
                      <Text style={styles.testBtnText}>Test Groq Connection</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {testResults['groq'] && (
                <View
                  style={[
                    styles.testFeedback,
                    testResults['groq'].success ? styles.testSuccess : styles.testError,
                  ]}
                >
                  <Ionicons
                    name={testResults['groq'].success ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={testResults['groq'].success ? '#93B884' : '#E5484D'}
                  />
                  <Text
                    style={[
                      styles.testFeedbackText,
                      { color: testResults['groq'].success ? '#93B884' : '#E5484D' },
                    ]}
                  >
                    {testResults['groq'].message}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 3. GOOGLE GEMINI */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(147, 184, 132, 0.12)' }]}>
              <Ionicons name="sparkles" size={18} color="#93B884" />
            </View>
            <View style={styles.cardTitleCol}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Google Gemini</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.openConfigBtn,
                  expandedCards.gemini && styles.openConfigBtnActive,
                ]}
                onPress={() => toggleCardExpanded('gemini')}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={expandedCards.gemini ? 'chevron-up' : 'settings-outline'}
                  size={13}
                  color={expandedCards.gemini ? Theme.colors.cyan : Theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.openConfigBtnText,
                    expandedCards.gemini && styles.openConfigBtnTextActive,
                  ]}
                >
                  {expandedCards.gemini ? 'Hide' : 'Configure'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Select Action Bar */}
          <View style={styles.cardActionRow}>
            <View style={styles.cardActionLeft}>
              <TouchableOpacity
                style={[
                  styles.selectModelBtn,
                  settings.llmProvider === 'gemini' && styles.selectModelBtnActive,
                ]}
                onPress={() => handleSelectLlm('gemini', 'Google Gemini', !!settings.geminiApiKey?.trim())}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={settings.llmProvider === 'gemini' ? 'checkmark-circle' : 'sparkles-outline'}
                  size={13}
                  color={settings.llmProvider === 'gemini' ? '#08080A' : '#93B884'}
                />
                <Text
                  style={[
                    styles.selectModelBtnText,
                    { color: settings.llmProvider === 'gemini' ? '#08080A' : '#93B884' },
                    settings.llmProvider === 'gemini' && styles.selectModelBtnTextActive,
                  ]}
                >
                  {settings.llmProvider === 'gemini' ? 'Active LLM' : 'Select LLM'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>


          {/* Collapsible Filling Options */}
          {expandedCards.gemini && (
            <View style={styles.cardExpandedSection}>
              <TouchableOpacity
                style={styles.keyLinkBtn}
                onPress={() => openDocUrl('https://aistudio.google.com/apikey')}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={13} color="#93B884" />
                <Text style={[styles.keyLinkText, { color: '#93B884' }]}>Get free API key at aistudio.google.com</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>GEMINI API KEY</Text>
              {highlightedKey === 'gemini' && !settings.geminiApiKey?.trim() && (
                <View style={styles.keyRequiredBadge}>
                  <Ionicons name="alert-circle-outline" size={13} color="#FBBF24" />
                  <Text style={styles.keyRequiredText}>API key required — paste or enter your Gemini key</Text>
                </View>
              )}
              <View style={[styles.inputWrap, highlightedKey === 'gemini' && styles.inputWrapHighlighted]}>
                <TextInput
                  style={styles.input}
                  value={settings.geminiApiKey}
                  onChangeText={(val) => handleUpdate({ geminiApiKey: val.trim() })}
                  placeholder="AIzaSy..."
                  placeholderTextColor={Theme.colors.textMuted}
                  secureTextEntry={!showKeys['gemini']}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.inputActionBtn}
                  onPress={() => toggleKeyVisibility('gemini')}
                >
                  <Ionicons
                    name={showKeys['gemini'] ? 'eye-off-outline' : 'eye-outline'}
                    size={17}
                    color={Theme.colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.inputActionBtn}
                  onPress={() => pasteFromClipboard('geminiApiKey')}
                >
                  <Ionicons name="clipboard-outline" size={17} color={Theme.colors.cyan} />
                </TouchableOpacity>
                {!!settings.geminiApiKey && (
                  <TouchableOpacity
                    style={styles.inputActionBtn}
                    onPress={() => clearField('geminiApiKey')}
                  >
                    <Ionicons name="close-circle" size={17} color={Theme.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.subLabel}>Gemini Model</Text>
              <View style={styles.pillSelectorRow}>
                {[
                  { id: 'gemini-2.5-flash', label: '2.5 Flash' },
                  { id: 'gemini-2.5-pro', label: '2.5 Pro' },
                  { id: 'gemini-2.0-flash', label: '2.0 Flash' },
                  { id: 'gemini-1.5-pro', label: '1.5 Pro' },
                  { id: 'gemini-1.5-flash', label: '1.5 Flash' },
                ].map((m) => {
                  const isSelected = (settings.geminiModel || 'gemini-2.5-flash') === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.modelPill, isSelected && styles.modelPillActive]}
                      onPress={() =>
                        handleSelectModelPill(
                          'gemini',
                          'llm',
                          { geminiModel: m.id },
                          'Gemini',
                          m.label
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.modelPillText, isSelected && styles.modelPillTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.modelPill,
                    styles.modelPillCustom,
                    (![
                      'gemini-2.5-flash',
                      'gemini-2.5-pro',
                      'gemini-2.0-flash',
                      'gemini-1.5-pro',
                      'gemini-1.5-flash',
                    ].includes(settings.geminiModel || 'gemini-2.5-flash') ||
                      customModelToggles['gemini']) &&
                      styles.modelPillActive,
                  ]}
                  onPress={() => toggleCustomModel('gemini')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="create-outline"
                    size={13}
                    color={
                      ![
                        'gemini-2.5-flash',
                        'gemini-2.5-pro',
                        'gemini-2.0-flash',
                        'gemini-1.5-pro',
                        'gemini-1.5-flash',
                      ].includes(settings.geminiModel || 'gemini-2.5-flash') ||
                      customModelToggles['gemini']
                        ? Theme.colors.cyan
                        : Theme.colors.textMuted
                    }
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.modelPillText,
                      (![
                        'gemini-2.5-flash',
                        'gemini-2.5-pro',
                        'gemini-2.0-flash',
                        'gemini-1.5-pro',
                        'gemini-1.5-flash',
                      ].includes(settings.geminiModel || 'gemini-2.5-flash') ||
                        customModelToggles['gemini']) &&
                        styles.modelPillTextActive,
                    ]}
                  >
                    Custom...
                  </Text>
                </TouchableOpacity>
              </View>

              {(![
                'gemini-2.5-flash',
                'gemini-2.5-pro',
                'gemini-2.0-flash',
                'gemini-1.5-pro',
                'gemini-1.5-flash',
              ].includes(settings.geminiModel || 'gemini-2.5-flash') ||
                customModelToggles['gemini']) && (
                <View style={styles.customModelInputWrap}>
                  <Text style={styles.customModelInputLabel}>CUSTOM GEMINI MODEL ID</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. gemini-2.5-flash-preview-05-20"
                      placeholderTextColor={Theme.colors.textMuted}
                      value={settings.geminiModel || ''}
                      onChangeText={(val) => handleUpdate({ geminiModel: val.trim() })}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {!!settings.geminiModel && (
                      <TouchableOpacity
                        style={styles.inputActionBtn}
                        onPress={() => handleUpdate({ geminiModel: 'gemini-2.5-flash' })}
                      >
                        <Ionicons name="refresh" size={15} color={Theme.colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}


              <View style={styles.testRow}>
                <TouchableOpacity
                  style={[styles.testBtn, testing['gemini'] && styles.testBtnDisabled]}
                  onPress={() => runTest('gemini')}
                  disabled={testing['gemini']}
                  activeOpacity={0.8}
                >
                  {testing['gemini'] ? (
                    <ActivityIndicator size="small" color="#08080A" />
                  ) : (
                    <>
                      <Ionicons name="radio-outline" size={14} color="#08080A" style={{ marginRight: 6 }} />
                      <Text style={styles.testBtnText}>Test Gemini Connection</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {testResults['gemini'] && (
                <View
                  style={[
                    styles.testFeedback,
                    testResults['gemini'].success ? styles.testSuccess : styles.testError,
                  ]}
                >
                  <Ionicons
                    name={testResults['gemini'].success ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={testResults['gemini'].success ? '#93B884' : '#E5484D'}
                  />
                  <Text
                    style={[
                      styles.testFeedbackText,
                      { color: testResults['gemini'].success ? '#93B884' : '#E5484D' },
                    ]}
                  >
                    {testResults['gemini'].message}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 4. DEEPGRAM NOVA */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(214, 169, 124, 0.12)' }]}>
              <Ionicons name="mic" size={18} color="#D6A97C" />
            </View>
            <View style={styles.cardTitleCol}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Deepgram Nova</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.openConfigBtn,
                  expandedCards.deepgram && styles.openConfigBtnActive,
                ]}
                onPress={() => toggleCardExpanded('deepgram')}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={expandedCards.deepgram ? 'chevron-up' : 'settings-outline'}
                  size={13}
                  color={expandedCards.deepgram ? Theme.colors.cyan : Theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.openConfigBtnText,
                    expandedCards.deepgram && styles.openConfigBtnTextActive,
                  ]}
                >
                  {expandedCards.deepgram ? 'Hide' : 'Configure'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Select Action Bar */}
          <View style={styles.cardActionRow}>
            <View style={styles.cardActionLeft}>
              <TouchableOpacity
                style={[
                  styles.selectModelBtn,
                  settings.sttProvider === 'deepgram' && styles.selectModelBtnActive,
                ]}
                onPress={() => handleSelectStt('deepgram', 'Deepgram Nova', !!settings.deepgramApiKey?.trim())}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={settings.sttProvider === 'deepgram' ? 'checkmark-circle' : 'mic-outline'}
                  size={13}
                  color={settings.sttProvider === 'deepgram' ? '#08080A' : '#D6A97C'}
                />
                <Text
                  style={[
                    styles.selectModelBtnText,
                    { color: settings.sttProvider === 'deepgram' ? '#08080A' : '#D6A97C' },
                    settings.sttProvider === 'deepgram' && styles.selectModelBtnTextActive,
                  ]}
                >
                  {settings.sttProvider === 'deepgram' ? 'Active STT' : 'Select STT'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>


          {/* Collapsible Filling Options */}
          {expandedCards.deepgram && (
            <View style={styles.cardExpandedSection}>
              <TouchableOpacity
                style={styles.keyLinkBtn}
                onPress={() => openDocUrl('https://console.deepgram.com')}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={13} color="#D6A97C" />
                <Text style={[styles.keyLinkText, { color: '#D6A97C' }]}>Get key at console.deepgram.com</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>DEEPGRAM API KEY</Text>
              {highlightedKey === 'deepgram' && !settings.deepgramApiKey?.trim() && (
                <View style={styles.keyRequiredBadge}>
                  <Ionicons name="alert-circle-outline" size={13} color="#FBBF24" />
                  <Text style={styles.keyRequiredText}>API key required — paste or enter your Deepgram key</Text>
                </View>
              )}
              <View style={[styles.inputWrap, highlightedKey === 'deepgram' && styles.inputWrapHighlighted]}>
                <TextInput
                  style={styles.input}
                  value={settings.deepgramApiKey}
                  onChangeText={(val) => handleUpdate({ deepgramApiKey: val.trim() })}
                  placeholder="Token ..."
                  placeholderTextColor={Theme.colors.textMuted}
                  secureTextEntry={!showKeys['deepgram']}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.inputActionBtn}
                  onPress={() => toggleKeyVisibility('deepgram')}
                >
                  <Ionicons
                    name={showKeys['deepgram'] ? 'eye-off-outline' : 'eye-outline'}
                    size={17}
                    color={Theme.colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.inputActionBtn}
                  onPress={() => pasteFromClipboard('deepgramApiKey')}
                >
                  <Ionicons name="clipboard-outline" size={17} color={Theme.colors.cyan} />
                </TouchableOpacity>
                {!!settings.deepgramApiKey && (
                  <TouchableOpacity
                    style={styles.inputActionBtn}
                    onPress={() => clearField('deepgramApiKey')}
                  >
                    <Ionicons name="close-circle" size={17} color={Theme.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.subLabel}>Deepgram Speech-to-Text Model</Text>
              <View style={styles.pillSelectorRow}>
                {[
                  { id: 'nova-3', label: 'Nova-3 (Latest)' },
                  { id: 'nova-2', label: 'Nova-2 General' },
                  { id: 'nova-2-meeting', label: 'Nova-2 Meeting' },
                  { id: 'nova-2-phonecall', label: 'Nova-2 Phonecall' },
                  { id: 'nova-2-conversationalai', label: 'Nova-2 Conversational' },
                  { id: 'general', label: 'General' },
                ].map((m) => {
                  const isSelected = (settings.deepgramModel || 'nova-3') === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.modelPill, isSelected && styles.modelPillActive]}
                      onPress={() =>
                        handleSelectModelPill(
                          'deepgram',
                          'stt',
                          { deepgramModel: m.id },
                          'Deepgram',
                          m.label
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.modelPillText, isSelected && styles.modelPillTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.modelPill,
                    styles.modelPillCustom,
                    (![
                      'nova-3',
                      'nova-2',
                      'nova-2-meeting',
                      'nova-2-phonecall',
                      'nova-2-conversationalai',
                      'general',
                    ].includes(settings.deepgramModel || 'nova-3') ||
                      customModelToggles['deepgram']) &&
                      styles.modelPillActive,
                  ]}
                  onPress={() => toggleCustomModel('deepgram')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="create-outline"
                    size={13}
                    color={
                      ![
                        'nova-3',
                        'nova-2',
                        'nova-2-meeting',
                        'nova-2-phonecall',
                        'nova-2-conversationalai',
                        'general',
                      ].includes(settings.deepgramModel || 'nova-3') ||
                      customModelToggles['deepgram']
                        ? Theme.colors.cyan
                        : Theme.colors.textMuted
                    }
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.modelPillText,
                      (![
                        'nova-3',
                        'nova-2',
                        'nova-2-meeting',
                        'nova-2-phonecall',
                        'nova-2-conversationalai',
                        'general',
                      ].includes(settings.deepgramModel || 'nova-3') ||
                        customModelToggles['deepgram']) &&
                        styles.modelPillTextActive,
                    ]}
                  >
                    Custom...
                  </Text>
                </TouchableOpacity>
              </View>

              {(![
                'nova-3',
                'nova-2',
                'nova-2-meeting',
                'nova-2-phonecall',
                'nova-2-conversationalai',
                'general',
              ].includes(settings.deepgramModel || 'nova-3') ||
                customModelToggles['deepgram']) && (
                <View style={styles.customModelInputWrap}>
                  <Text style={styles.customModelInputLabel}>CUSTOM DEEPGRAM MODEL ID</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. nova-3, enhanced-phonecall"
                      placeholderTextColor={Theme.colors.textMuted}
                      value={settings.deepgramModel || ''}
                      onChangeText={(val) => handleUpdate({ deepgramModel: val.trim() })}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {!!settings.deepgramModel && (
                      <TouchableOpacity
                        style={styles.inputActionBtn}
                        onPress={() => handleUpdate({ deepgramModel: 'nova-3' })}
                      >
                        <Ionicons name="refresh" size={15} color={Theme.colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}


              <View style={styles.testRow}>
                <TouchableOpacity
                  style={[styles.testBtn, testing['deepgram'] && styles.testBtnDisabled]}
                  onPress={() => runTest('deepgram')}
                  disabled={testing['deepgram']}
                  activeOpacity={0.8}
                >
                  {testing['deepgram'] ? (
                    <ActivityIndicator size="small" color="#08080A" />
                  ) : (
                    <>
                      <Ionicons name="radio-outline" size={14} color="#08080A" style={{ marginRight: 6 }} />
                      <Text style={styles.testBtnText}>Test Deepgram Connection</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {testResults['deepgram'] && (
                <View
                  style={[
                    styles.testFeedback,
                    testResults['deepgram'].success ? styles.testSuccess : styles.testError,
                  ]}
                >
                  <Ionicons
                    name={testResults['deepgram'].success ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={testResults['deepgram'].success ? '#93B884' : '#E5484D'}
                  />
                  <Text
                    style={[
                      styles.testFeedbackText,
                      { color: testResults['deepgram'].success ? '#93B884' : '#E5484D' },
                    ]}
                  >
                    {testResults['deepgram'].message}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 5. OPENAI */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
              <Ionicons name="logo-electron" size={18} color={Theme.colors.textPrimary} />
            </View>
            <View style={styles.cardTitleCol}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>OpenAI</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.openConfigBtn,
                  expandedCards.openai && styles.openConfigBtnActive,
                ]}
                onPress={() => toggleCardExpanded('openai')}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={expandedCards.openai ? 'chevron-up' : 'settings-outline'}
                  size={13}
                  color={expandedCards.openai ? Theme.colors.cyan : Theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.openConfigBtnText,
                    expandedCards.openai && styles.openConfigBtnTextActive,
                  ]}
                >
                  {expandedCards.openai ? 'Hide' : 'Configure'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Select Action Bar */}
          <View style={styles.cardActionRow}>
            <View style={styles.cardActionLeft}>
              {/* STT Select */}
              <TouchableOpacity
                style={[
                  styles.selectModelBtn,
                  settings.sttProvider === 'openai' && styles.selectModelBtnActive,
                ]}
                onPress={() => handleSelectStt('openai', 'OpenAI Whisper', !!settings.openaiApiKey?.trim())}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={settings.sttProvider === 'openai' ? 'checkmark-circle' : 'mic-outline'}
                  size={13}
                  color={settings.sttProvider === 'openai' ? '#08080A' : '#3fae6e'}
                />
                <Text
                  style={[
                    styles.selectModelBtnText,
                    settings.sttProvider === 'openai' && styles.selectModelBtnTextActive,
                  ]}
                >
                  {settings.sttProvider === 'openai' ? 'Active STT' : 'Select STT'}
                </Text>
              </TouchableOpacity>

              {/* LLM Select */}
              <TouchableOpacity
                style={[
                  styles.selectModelBtn,
                  settings.llmProvider === 'openai' && styles.selectModelBtnActive,
                ]}
                onPress={() => handleSelectLlm('openai', 'OpenAI GPT', !!settings.openaiApiKey?.trim())}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={settings.llmProvider === 'openai' ? 'checkmark-circle' : 'sparkles-outline'}
                  size={13}
                  color={settings.llmProvider === 'openai' ? '#08080A' : '#3fae6e'}
                />
                <Text
                  style={[
                    styles.selectModelBtnText,
                    settings.llmProvider === 'openai' && styles.selectModelBtnTextActive,
                  ]}
                >
                  {settings.llmProvider === 'openai' ? 'Active LLM' : 'Select LLM'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>


          {/* Collapsible Filling Options */}
          {expandedCards.openai && (
            <View style={styles.cardExpandedSection}>
              <TouchableOpacity
                style={styles.keyLinkBtn}
                onPress={() => openDocUrl('https://platform.openai.com/api-keys')}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={13} color={Theme.colors.textSecondary} />
                <Text style={[styles.keyLinkText, { color: Theme.colors.textSecondary }]}>Get key at platform.openai.com</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>OPENAI API KEY</Text>
              {highlightedKey === 'openai' && !settings.openaiApiKey?.trim() && (
                <View style={styles.keyRequiredBadge}>
                  <Ionicons name="alert-circle-outline" size={13} color="#FBBF24" />
                  <Text style={styles.keyRequiredText}>API key required — paste or enter your OpenAI key</Text>
                </View>
              )}
              <View style={[styles.inputWrap, highlightedKey === 'openai' && styles.inputWrapHighlighted]}>
                <TextInput
                  style={styles.input}
                  value={settings.openaiApiKey}
                  onChangeText={(val) => handleUpdate({ openaiApiKey: val.trim() })}
                  placeholder="sk-..."
                  placeholderTextColor={Theme.colors.textMuted}
                  secureTextEntry={!showKeys['openai']}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.inputActionBtn}
                  onPress={() => toggleKeyVisibility('openai')}
                >
                  <Ionicons
                    name={showKeys['openai'] ? 'eye-off-outline' : 'eye-outline'}
                    size={17}
                    color={Theme.colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.inputActionBtn}
                  onPress={() => pasteFromClipboard('openaiApiKey')}
                >
                  <Ionicons name="clipboard-outline" size={17} color={Theme.colors.cyan} />
                </TouchableOpacity>
                {!!settings.openaiApiKey && (
                  <TouchableOpacity
                    style={styles.inputActionBtn}
                    onPress={() => clearField('openaiApiKey')}
                  >
                    <Ionicons name="close-circle" size={17} color={Theme.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* OpenAI STT Model */}
              <Text style={styles.subLabel}>Speech-to-Text Model</Text>
              <View style={styles.pillSelectorRow}>
                {['whisper-1'].map((m) => {
                  const isSelected = (settings.openaiWhisperModel || 'whisper-1') === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.modelPill, isSelected && styles.modelPillActive]}
                      onPress={() =>
                        handleSelectModelPill(
                          'openai',
                          'stt',
                          { openaiWhisperModel: m },
                          'OpenAI',
                          `${m} (Official)`
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.modelPillText, isSelected && styles.modelPillTextActive]}>
                        {m} (Official)
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.modelPill,
                    styles.modelPillCustom,
                    ((settings.openaiWhisperModel && settings.openaiWhisperModel !== 'whisper-1') ||
                      customModelToggles['openaiStt']) &&
                      styles.modelPillActive,
                  ]}
                  onPress={() => toggleCustomModel('openaiStt')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="create-outline"
                    size={13}
                    color={
                      (settings.openaiWhisperModel && settings.openaiWhisperModel !== 'whisper-1') ||
                      customModelToggles['openaiStt']
                        ? Theme.colors.cyan
                        : Theme.colors.textMuted
                    }
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.modelPillText,
                      ((settings.openaiWhisperModel && settings.openaiWhisperModel !== 'whisper-1') ||
                        customModelToggles['openaiStt']) &&
                        styles.modelPillTextActive,
                    ]}
                  >
                    Custom...
                  </Text>
                </TouchableOpacity>
              </View>

              {((settings.openaiWhisperModel && settings.openaiWhisperModel !== 'whisper-1') ||
                customModelToggles['openaiStt']) && (
                <View style={styles.customModelInputWrap}>
                  <Text style={styles.customModelInputLabel}>CUSTOM OPENAI STT MODEL ID</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. whisper-1"
                      placeholderTextColor={Theme.colors.textMuted}
                      value={settings.openaiWhisperModel || ''}
                      onChangeText={(val) => handleUpdate({ openaiWhisperModel: val.trim() })}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {!!settings.openaiWhisperModel && (
                      <TouchableOpacity
                        style={styles.inputActionBtn}
                        onPress={() => handleUpdate({ openaiWhisperModel: 'whisper-1' })}
                      >
                        <Ionicons name="refresh" size={15} color={Theme.colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* OpenAI LLM Model */}
              <Text style={styles.subLabel}>AI Cleanup LLM Model</Text>
              <View style={styles.pillSelectorRow}>
                {[
                  { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
                  { id: 'gpt-4o', label: 'GPT-4o' },
                  { id: 'o3-mini', label: 'o3-mini' },
                  { id: 'o1', label: 'o1' },
                  { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                  { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
                ].map((m) => {
                  const isSelected = (settings.openaiLlmModel || 'gpt-4o-mini') === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.modelPill, isSelected && styles.modelPillActive]}
                      onPress={() =>
                        handleSelectModelPill(
                          'openai',
                          'llm',
                          { openaiLlmModel: m.id },
                          'OpenAI',
                          m.label
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.modelPillText, isSelected && styles.modelPillTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.modelPill,
                    styles.modelPillCustom,
                    (![
                      'gpt-4o-mini',
                      'gpt-4o',
                      'o3-mini',
                      'o1',
                      'gpt-4-turbo',
                      'gpt-3.5-turbo',
                    ].includes(settings.openaiLlmModel || 'gpt-4o-mini') ||
                      customModelToggles['openaiLlm']) &&
                      styles.modelPillActive,
                  ]}
                  onPress={() => toggleCustomModel('openaiLlm')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="create-outline"
                    size={13}
                    color={
                      ![
                        'gpt-4o-mini',
                        'gpt-4o',
                        'o3-mini',
                        'o1',
                        'gpt-4-turbo',
                        'gpt-3.5-turbo',
                      ].includes(settings.openaiLlmModel || 'gpt-4o-mini') ||
                      customModelToggles['openaiLlm']
                        ? Theme.colors.cyan
                        : Theme.colors.textMuted
                    }
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.modelPillText,
                      (![
                        'gpt-4o-mini',
                        'gpt-4o',
                        'o3-mini',
                        'o1',
                        'gpt-4-turbo',
                        'gpt-3.5-turbo',
                      ].includes(settings.openaiLlmModel || 'gpt-4o-mini') ||
                        customModelToggles['openaiLlm']) &&
                        styles.modelPillTextActive,
                    ]}
                  >
                    Custom...
                  </Text>
                </TouchableOpacity>
              </View>

              {(![
                'gpt-4o-mini',
                'gpt-4o',
                'o3-mini',
                'o1',
                'gpt-4-turbo',
                'gpt-3.5-turbo',
              ].includes(settings.openaiLlmModel || 'gpt-4o-mini') ||
                customModelToggles['openaiLlm']) && (
                <View style={styles.customModelInputWrap}>
                  <Text style={styles.customModelInputLabel}>CUSTOM OPENAI LLM MODEL ID</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. gpt-4o-2024-11-20, chatgpt-4o-latest"
                      placeholderTextColor={Theme.colors.textMuted}
                      value={settings.openaiLlmModel || ''}
                      onChangeText={(val) => handleUpdate({ openaiLlmModel: val.trim() })}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {!!settings.openaiLlmModel && (
                      <TouchableOpacity
                        style={styles.inputActionBtn}
                        onPress={() => handleUpdate({ openaiLlmModel: 'gpt-4o-mini' })}
                      >
                        <Ionicons name="refresh" size={15} color={Theme.colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}


              <View style={styles.testRow}>
                <TouchableOpacity
                  style={[styles.testBtn, testing['openai'] && styles.testBtnDisabled]}
                  onPress={() => runTest('openai')}
                  disabled={testing['openai']}
                  activeOpacity={0.8}
                >
                  {testing['openai'] ? (
                    <ActivityIndicator size="small" color="#08080A" />
                  ) : (
                    <>
                      <Ionicons name="radio-outline" size={14} color="#08080A" style={{ marginRight: 6 }} />
                      <Text style={styles.testBtnText}>Test OpenAI Connection</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {testResults['openai'] && (
                <View
                  style={[
                    styles.testFeedback,
                    testResults['openai'].success ? styles.testSuccess : styles.testError,
                  ]}
                >
                  <Ionicons
                    name={testResults['openai'].success ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={testResults['openai'].success ? '#93B884' : '#E5484D'}
                  />
                  <Text
                    style={[
                      styles.testFeedbackText,
                      { color: testResults['openai'].success ? '#93B884' : '#E5484D' },
                    ]}
                  >
                    {testResults['openai'].message}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 6. CUSTOM / SELF-HOSTED ENDPOINT */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
              <Ionicons name="server-outline" size={18} color="#38BDF8" />
            </View>
            <View style={styles.cardTitleCol}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Custom Endpoint</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.openConfigBtn,
                  expandedCards.custom && styles.openConfigBtnActive,
                ]}
                onPress={() => toggleCardExpanded('custom')}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={expandedCards.custom ? 'chevron-up' : 'settings-outline'}
                  size={13}
                  color={expandedCards.custom ? Theme.colors.cyan : Theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.openConfigBtnText,
                    expandedCards.custom && styles.openConfigBtnTextActive,
                  ]}
                >
                  {expandedCards.custom ? 'Hide' : 'Configure'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Select Action Bar */}
          <View style={styles.cardActionRow}>
            <View style={styles.cardActionLeft}>
              {/* STT Select */}
              <TouchableOpacity
                style={[
                  styles.selectModelBtn,
                  settings.sttProvider === 'custom' && styles.selectModelBtnActive,
                ]}
                onPress={() => handleSelectStt('custom', 'Custom STT', !!settings.customSttBaseUrl?.trim())}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={settings.sttProvider === 'custom' ? 'checkmark-circle' : 'mic-outline'}
                  size={13}
                  color={settings.sttProvider === 'custom' ? '#08080A' : '#38BDF8'}
                />
                <Text
                  style={[
                    styles.selectModelBtnText,
                    { color: settings.sttProvider === 'custom' ? '#08080A' : '#38BDF8' },
                    settings.sttProvider === 'custom' && styles.selectModelBtnTextActive,
                  ]}
                >
                  {settings.sttProvider === 'custom' ? 'Active STT' : 'Select STT'}
                </Text>
              </TouchableOpacity>

              {/* LLM Select */}
              <TouchableOpacity
                style={[
                  styles.selectModelBtn,
                  settings.llmProvider === 'custom' && styles.selectModelBtnActive,
                ]}
                onPress={() => handleSelectLlm('custom', 'Custom LLM', !!settings.customLlmBaseUrl?.trim())}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={settings.llmProvider === 'custom' ? 'checkmark-circle' : 'sparkles-outline'}
                  size={13}
                  color={settings.llmProvider === 'custom' ? '#08080A' : '#38BDF8'}
                />
                <Text
                  style={[
                    styles.selectModelBtnText,
                    { color: settings.llmProvider === 'custom' ? '#08080A' : '#38BDF8' },
                    settings.llmProvider === 'custom' && styles.selectModelBtnTextActive,
                  ]}
                >
                  {settings.llmProvider === 'custom' ? 'Active LLM' : 'Select LLM'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>


          {/* Collapsible Filling Options */}
          {expandedCards.custom && (
            <View style={styles.cardExpandedSection}>
              <Text style={styles.inputLabel}>LLM BASE URL (OPENAI COMPATIBLE)</Text>
              {highlightedKey === 'custom' && !settings.customLlmBaseUrl?.trim() && (
                <View style={styles.keyRequiredBadge}>
                  <Ionicons name="alert-circle-outline" size={13} color="#FBBF24" />
                  <Text style={styles.keyRequiredText}>Endpoint URL required — enter your server URL</Text>
                </View>
              )}
              <View style={[styles.inputWrap, highlightedKey === 'custom' && styles.inputWrapHighlighted]}>
                <TextInput
                  style={styles.input}
                  value={settings.customLlmBaseUrl}
                  onChangeText={(val) => handleUpdate({ customLlmBaseUrl: val.trim() })}
                  placeholder="http://192.168.1.100:11434/v1"
                  placeholderTextColor={Theme.colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.inputActionBtn}
                  onPress={() => pasteFromClipboard('customLlmBaseUrl')}
                >
                  <Ionicons name="clipboard-outline" size={17} color={Theme.colors.cyan} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>CUSTOM API KEY (OPTIONAL FOR OLLAMA)</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={settings.customLlmApiKey}
                  onChangeText={(val) => handleUpdate({ customLlmApiKey: val.trim() })}
                  placeholder="Bearer token or leave empty"
                  placeholderTextColor={Theme.colors.textMuted}
                  secureTextEntry={!showKeys['customLlm']}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.inputActionBtn}
                  onPress={() => toggleKeyVisibility('customLlm')}
                >
                  <Ionicons
                    name={showKeys['customLlm'] ? 'eye-off-outline' : 'eye-outline'}
                    size={17}
                    color={Theme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>CUSTOM LLM MODEL NAME</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={settings.customLlmModel}
                  onChangeText={(val) => handleUpdate({ customLlmModel: val.trim() })}
                  placeholder="deepseek-r1:8b or llama3.2"
                  placeholderTextColor={Theme.colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.testRow}>
                <TouchableOpacity
                  style={[styles.testBtn, testing['custom'] && styles.testBtnDisabled]}
                  onPress={() => runTest('custom')}
                  disabled={testing['custom']}
                  activeOpacity={0.8}
                >
                  {testing['custom'] ? (
                    <ActivityIndicator size="small" color="#08080A" />
                  ) : (
                    <>
                      <Ionicons name="radio-outline" size={14} color="#08080A" style={{ marginRight: 6 }} />
                      <Text style={styles.testBtnText}>Test Custom Connection</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {testResults['custom'] && (
                <View
                  style={[
                    styles.testFeedback,
                    testResults['custom'].success ? styles.testSuccess : styles.testError,
                  ]}
                >
                  <Ionicons
                    name={testResults['custom'].success ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={testResults['custom'].success ? '#93B884' : '#E5484D'}
                  />
                  <Text
                    style={[
                      styles.testFeedbackText,
                      { color: testResults['custom'].success ? '#93B884' : '#E5484D' },
                    ]}
                  >
                    {testResults['custom'].message}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 7. GENERAL AI PREFERENCES */}
        <View style={styles.card}>
          <Text style={styles.sectionHeaderTitle}>AUTOMATION & VOICE PREFERENCES</Text>

          <View style={styles.prefRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.prefTitle}>Auto-Copy Refined Text</Text>
              <Text style={styles.prefDesc}>
                Automatically copies formatted text to clipboard after recording stops.
              </Text>
            </View>
            <Switch
              value={settings.autoCopy}
              onValueChange={(val) => handleUpdate({ autoCopy: val })}
              trackColor={{ false: '#1A1A22', true: '#3fae6e' }}
              thumbColor="#F7F1E6"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.prefRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.prefTitle}>Read Back with Voice (TTS)</Text>
              <Text style={styles.prefDesc}>
                Speaks the refined text back through your phone's speaker.
              </Text>
            </View>
            <Switch
              value={settings.autoSpeak}
              onValueChange={(val) => handleUpdate({ autoSpeak: val })}
              trackColor={{ false: '#1A1A22', true: '#3fae6e' }}
              thumbColor="#F7F1E6"
            />
          </View>

          {settings.autoSpeak && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subLabel}>Speech Speed Rate</Text>
              <View style={styles.pillSelectorRow}>
                {[
                  { value: 0.8, label: '0.8x Slow' },
                  { value: 1.0, label: '1.0x Normal' },
                  { value: 1.25, label: '1.25x Fast' },
                  { value: 1.5, label: '1.5x Ultra' },
                ].map((item) => {
                  const isSelected = Math.abs(settings.ttsRate - item.value) < 0.1;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.modelPill, isSelected && styles.modelPillActive]}
                      onPress={() => handleUpdate({ ttsRate: item.value })}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.modelPillText, isSelected && styles.modelPillTextActive]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Ionicons name="lock-closed-outline" size={14} color={Theme.colors.textMuted} />
          <Text style={styles.footerText}>
            All API keys are encrypted and stored locally on your device via Android Keystore. Keys are never transmitted to third parties.
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
    paddingTop: 14,
  },
  headerContainer: {
    backgroundColor: Theme.colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 244, 226, 0.06)',
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.card,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerCountText: {
    color: Theme.colors.textPrimary,
    fontSize: 11,
    fontFamily: Theme.fonts.mono,
  },
  statusChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingBottom: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statusChipActive: {
    backgroundColor: 'rgba(147, 184, 132, 0.08)',
    borderColor: 'rgba(147, 184, 132, 0.3)',
  },
  statusChipExpanded: {
    borderColor: Theme.colors.cyan,
  },
  statusChipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 6,
  },
  statusChipText: {
    color: Theme.colors.textMuted,
    fontSize: 11.5,
    fontFamily: Theme.fonts.medium,
  },
  statusChipTextActive: {
    color: Theme.colors.textPrimary,
    fontFamily: Theme.fonts.semiBold,
  },
  recommendBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    position: 'relative',
    backgroundColor: '#121217',
  },
  recommendGradient: {
    position: 'absolute',
    inset: 0,
  },
  recommendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  recommendIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(63, 174, 110, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontFamily: Theme.fonts.title,
    marginBottom: 2,
  },
  recommendDesc: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    lineHeight: 16,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },


  cardTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontFamily: Theme.fonts.title,
  },
  cardDesc: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    lineHeight: 16,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.semiBold,
  },
  keyLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 14,
    marginTop: 2,
  },
  keyLinkText: {
    color: Theme.colors.cyan,
    fontSize: 11.5,
    fontFamily: Theme.fonts.medium,
  },
  inputLabel: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontFamily: Theme.fonts.mono,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  inputWrapHighlighted: {
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  keyRequiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  keyRequiredText: {
    color: '#FBBF24',
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
  },
  input: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontFamily: Theme.fonts.mono,
    paddingVertical: 0,
    height: '100%',
  },
  inputActionBtn: {
    padding: 6,
    marginLeft: 4,
  },
  subLabel: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    marginBottom: 8,
  },
  pillSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  modelPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  modelPillCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  modelPillActive: {
    backgroundColor: 'rgba(63, 174, 110, 0.12)',
    borderColor: Theme.colors.cyan,
  },
  modelPillText: {
    color: Theme.colors.textSecondary,
    fontSize: 11.5,
    fontFamily: Theme.fonts.medium,
  },
  modelPillTextActive: {
    color: Theme.colors.cyan,
    fontFamily: Theme.fonts.semiBold,
  },
  customModelInputWrap: {
    marginTop: -4,
    marginBottom: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(63, 174, 110, 0.25)',
  },
  customModelInputLabel: {
    color: Theme.colors.cyan,
    fontSize: 9.5,
    fontFamily: Theme.fonts.mono,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 10,
    height: 40,
  },
  textInput: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontFamily: Theme.fonts.mono,
    paddingVertical: 0,
    height: '100%',
  },

  testRow: {
    marginTop: 4,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.cyan,
    paddingVertical: 10,
    borderRadius: 12,
  },
  testBtnDisabled: {
    opacity: 0.6,
  },
  testBtnText: {
    color: '#08080A',
    fontSize: 12.5,
    fontFamily: Theme.fonts.semiBold,
  },
  testFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  testSuccess: {
    backgroundColor: 'rgba(147, 184, 132, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(147, 184, 132, 0.3)',
  },
  testError: {
    backgroundColor: 'rgba(229, 72, 77, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229, 72, 77, 0.3)',
  },
  testFeedbackText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    flex: 1,
  },
  sectionHeaderTitle: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.mono,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  prefTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 13.5,
    fontFamily: Theme.fonts.semiBold,
    marginBottom: 2,
  },
  prefDesc: {
    color: Theme.colors.textSecondary,
    fontSize: 11.5,
    fontFamily: Theme.fonts.regular,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  footerText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    lineHeight: 16,
    flex: 1,
  },
  toastContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 999,
    backgroundColor: '#262019',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.colors.borderHighlight,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
  },
  engineSelectCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(63, 174, 110, 0.35)',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  engineSelectTop: {
    marginBottom: 12,
  },
  engineSelectHeaderTitle: {
    color: Theme.colors.cyan,
    fontSize: 12,
    fontFamily: Theme.fonts.monoBold,
    letterSpacing: 0.6,
  },
  engineSelectHeaderSub: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    lineHeight: 16,
  },
  activeEnginesBarMerged: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  activeEnginesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 14,
  },
  activeEngineCol: {
    flex: 1,
  },
  activeEngineLabel: {
    color: Theme.colors.textMuted,
    fontSize: 9.5,
    fontFamily: Theme.fonts.mono,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  activeEngineValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeEngineVal: {
    color: Theme.colors.textPrimary,
    fontSize: 12.5,
    fontFamily: Theme.fonts.semiBold,
    flex: 1,
  },
  activeEnginesDivider: {
    width: 1,
    height: 26,
    backgroundColor: Theme.colors.border,
    marginHorizontal: 10,
  },
  engineTabRow: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  engineTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  engineTabBtnActive: {
    backgroundColor: Theme.colors.cyan,
  },
  engineTabText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
  },
  engineTabTextActive: {
    color: '#08080A',
    fontFamily: Theme.fonts.semiBold,
  },
  engineOptionsGrid: {
    gap: 8,
  },
  engineOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  engineOptionCardActive: {
    borderColor: Theme.colors.cyan,
    backgroundColor: 'rgba(63, 174, 110, 0.08)',
  },
  engineOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  engineOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  engineOptionName: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontFamily: Theme.fonts.semiBold,
  },
  engineOptionTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  engineOptionTagText: {
    fontSize: 9.5,
    fontFamily: Theme.fonts.semiBold,
  },
  engineOptionTagline: {
    color: Theme.colors.textSecondary,
    fontSize: 11.5,
    fontFamily: Theme.fonts.regular,
    marginTop: 1,
  },
  engineOptionConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  configDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  engineOptionConfigText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontFamily: Theme.fonts.mono,
  },
  activeCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Theme.colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardActiveActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    marginTop: 2,
  },
  activeEngineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  activeEngineBadgeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
  },
  setAsActiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  setAsActiveBtnText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  cardActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  selectModelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  selectModelBtnActive: {
    backgroundColor: '#2FA866',
    borderColor: '#2FA866',
  },
  selectModelBtnText: {
    color: '#D4D4D8',
    fontSize: 11.5,
    fontFamily: Theme.fonts.medium,
  },
  selectModelBtnTextActive: {
    color: '#08080A',
    fontSize: 11.5,
    fontFamily: Theme.fonts.semiBold,
  },
  openConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  openConfigBtnActive: {
    backgroundColor: 'rgba(63, 174, 110, 0.12)',
    borderColor: 'rgba(63, 174, 110, 0.35)',
  },
  openConfigBtnText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
  },
  openConfigBtnTextActive: {
    color: Theme.colors.cyan,
  },

  cardExpandedSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
});
