import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
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
  DEFAULT_PAYMENT_PACKAGES,
} from '../services/storage';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { CLEANUP_MODES, CleanupMode, getCleanupSystemPrompt } from '../config/prompts';
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

export type EngineCategory = 'all' | 'models' | 'personas' | 'capsule' | 'shield';

interface CategoryTab {
  id: EngineCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeCategory, setActiveCategory] = useState<EngineCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [showPromptDetails, setShowPromptDetails] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [permissionModal, setPermissionModal] = useState<{
    visible: boolean;
    type: 'overlay' | 'accessibility';
  }>({ visible: false, type: 'overlay' });
  const [hasA11yPermission, setHasA11yPermission] = useState<boolean>(false);
  const [isBatteryIgnored, setIsBatteryIgnored] = useState<boolean>(true);
  const [showAppPickerModal, setShowAppPickerModal] = useState<boolean>(false);
  const [installedApps, setInstalledApps] = useState<Array<{ packageName: string; label: string }>>([]);
  const [appSearchQuery, setAppSearchQuery] = useState<string>('');
  const [loadingApps, setLoadingApps] = useState<boolean>(false);
  const [customPackageInput, setCustomPackageInput] = useState<string>('');

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

  const handleOpenAppPicker = async () => {
    setShowAppPickerModal(true);
    setLoadingApps(true);
    try {
      const apps = await NativeFloatingBubble.getInstalledApps();
      apps.sort((a, b) => a.label.localeCompare(b.label));
      setInstalledApps(apps);
    } catch (e) {
      console.warn('Failed to fetch installed apps:', e);
    } finally {
      setLoadingApps(false);
    }
  };

  const handleToggleExcludePackage = async (pkg: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentList = settings.excludedPackages || [];
    const updated = currentList.includes(pkg)
      ? currentList.filter((p) => p !== pkg)
      : [...currentList, pkg];
    await handleUpdate({ excludedPackages: updated });
  };

  const handleAddCustomPackage = async () => {
    const trimmed = customPackageInput.trim().toLowerCase();
    if (!trimmed) return;
    const currentList = settings.excludedPackages || [];
    if (!currentList.includes(trimmed)) {
      await handleUpdate({ excludedPackages: [...currentList, trimmed] });
    }
    setCustomPackageInput('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const handleSelectCleanupMode = async (mode: CleanupMode) => {
    Haptics.selectionAsync();
    await handleUpdate({ cleanupMode: mode });
  };

  const handleCopyPrompt = async () => {
    const prompt = getCleanupSystemPrompt(settings.cleanupMode || 'natural');
    await Clipboard.setStringAsync(prompt);
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
      name: 'Groq Whisper',
      detail: isGroqConfigured
        ? `${settings.groqWhisperModel || 'whisper-large-v3-turbo'} · Connected`
        : 'Key required',
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
      name: 'Groq LPU',
      detail: isGroqConfigured
        ? `${settings.groqLlmModel || 'llama-3.3-70b-versatile'} · Connected`
        : 'Key required',
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
        <View style={styles.activeTickCircle}>
          <Ionicons name="checkmark-sharp" size={14} color="#151210" />
        </View>
      ) : (
        <View style={styles.inactiveTickCircle} />
      )}
    </TouchableOpacity>
  );

  const CATEGORY_TABS: CategoryTab[] = [
    { id: 'all', label: 'All', icon: 'grid-outline' },
    {
      id: 'models',
      label: 'AI Engines',
      icon: 'hardware-chip-outline',
      badge: `${settings.sttProvider.toUpperCase()}`,
    },
    {
      id: 'personas',
      label: 'Personas',
      icon: 'color-wand-outline',
      badge: (settings.cleanupMode || 'natural').toUpperCase(),
    },
    {
      id: 'capsule',
      label: 'Capsule & Dock',
      icon: 'tablet-portrait-outline',
      badge: `${Math.round((settings.floatingBubbleOpacity ?? 0.7) * 100)}%`,
    },
    {
      id: 'shield',
      label: 'Shield & Apps',
      icon: 'shield-checkmark-outline',
      badge: (settings.pauseOnPaymentApps ?? true) ? 'Shield On' : 'Off',
    },
  ];

  const query = searchQuery.trim().toLowerCase();
  const isSearching = query.length > 0;

  // Filter STT options
  const filteredStt = sttOptions.filter((o) => {
    if (!isSearching) return true;
    return (
      o.name.toLowerCase().includes(query) ||
      o.detail.toLowerCase().includes(query) ||
      o.id.toLowerCase().includes(query) ||
      'speech to text'.includes(query) ||
      'stt'.includes(query) ||
      'transcription'.includes(query)
    );
  });

  // Filter LLM options
  const filteredLlm = llmOptions.filter((o) => {
    if (!isSearching) return true;
    return (
      o.name.toLowerCase().includes(query) ||
      o.detail.toLowerCase().includes(query) ||
      o.id.toLowerCase().includes(query) ||
      'ai cleanup'.includes(query) ||
      'llm'.includes(query) ||
      'tone'.includes(query)
    );
  });

  // Filter Persona options
  const filteredPersonas = CLEANUP_MODES.filter((m) => {
    if (!isSearching) return true;
    return (
      m.label.toLowerCase().includes(query) ||
      m.tagline.toLowerCase().includes(query) ||
      m.badge.toLowerCase().includes(query) ||
      m.targetApp.toLowerCase().includes(query) ||
      'persona'.includes(query) ||
      'tone'.includes(query)
    );
  });

  // Section visibility checks
  const showModelsSection =
    (activeCategory === 'all' || activeCategory === 'models' || isSearching) &&
    (!isSearching || filteredStt.length > 0 || filteredLlm.length > 0 || query.includes('model') || query.includes('engine') || query.includes('key'));

  const showPersonasSection =
    (activeCategory === 'all' || activeCategory === 'personas' || isSearching) &&
    (!isSearching || filteredPersonas.length > 0 || query.includes('persona') || query.includes('tone') || query.includes('clean'));

  const showCapsuleSection =
    (activeCategory === 'all' || activeCategory === 'capsule' || isSearching) &&
    (!isSearching ||
      query.includes('capsule') ||
      query.includes('float') ||
      query.includes('dock') ||
      query.includes('keyboard') ||
      query.includes('opacity') ||
      query.includes('transparency') ||
      query.includes('clearance') ||
      query.includes('offset') ||
      query.includes('mic'));

  const showShieldSection =
    (activeCategory === 'all' || activeCategory === 'shield' || isSearching) &&
    (!isSearching ||
      query.includes('shield') ||
      query.includes('payment') ||
      query.includes('bank') ||
      query.includes('upi') ||
      query.includes('gpay') ||
      query.includes('phonepe') ||
      query.includes('paytm') ||
      query.includes('bhim') ||
      query.includes('cred') ||
      query.includes('paypal') ||
      query.includes('exclude') ||
      query.includes('blacklist') ||
      query.includes('app') ||
      query.includes('auto-persona') ||
      query.includes('routing') ||
      query.includes('tile') ||
      query.includes('shade') ||
      query.includes('battery') ||
      query.includes('accessibility') ||
      query.includes('permission'));

  const showPromptSection =
    (activeCategory === 'all' || activeCategory === 'personas' || activeCategory === 'models' || isSearching) &&
    (!isSearching || query.includes('prompt') || query.includes('instruction') || query.includes('system') || query.includes('terminal'));

  const hasAnyResults =
    showModelsSection ||
    showPersonasSection ||
    showCapsuleSection ||
    showShieldSection ||
    showPromptSection;

  return (
    <View style={styles.root}>
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

      {/* Excluded Apps Manager Modal */}
      <Modal
        visible={showAppPickerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAppPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="ban-outline" size={18} color="#F87171" />
                  <Text style={styles.modalTitle}>Exclude Apps from Overlay</Text>
                </View>
                <Text style={styles.modalSubtitle}>
                  Floating bubble will stay completely hidden inside selected apps.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAppPickerModal(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Manual package entry row */}
            <View style={styles.manualEntryRow}>
              <TextInput
                style={styles.manualEntryInput}
                placeholder="Or enter package (e.g. com.example.app)"
                placeholderTextColor={Theme.colors.textMuted}
                value={customPackageInput}
                onChangeText={setCustomPackageInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[
                  styles.manualEntryAddBtn,
                  !customPackageInput.trim() && { opacity: 0.5 },
                ]}
                onPress={handleAddCustomPackage}
                disabled={!customPackageInput.trim()}
              >
                <Text style={styles.manualEntryAddBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Search filter for installed apps */}
            <View style={styles.searchBarRow}>
              <Ionicons name="search" size={15} color={Theme.colors.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Search installed apps..."
                placeholderTextColor={Theme.colors.textMuted}
                value={appSearchQuery}
                onChangeText={setAppSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {appSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setAppSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={Theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Installed Apps List */}
            {loadingApps ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#E9A063" />
                <Text style={styles.loadingText}>Scanning installed apps...</Text>
              </View>
            ) : (
              <FlatList
                data={installedApps.filter(
                  (a) =>
                    a.label.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
                    a.packageName.toLowerCase().includes(appSearchQuery.toLowerCase())
                )}
                keyExtractor={(item) => item.packageName}
                style={styles.appList}
                contentContainerStyle={{ paddingBottom: 16 }}
                renderItem={({ item }) => {
                  const isExcluded = (settings.excludedPackages || []).includes(item.packageName);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.appItemRow,
                        isExcluded && styles.appItemRowExcluded,
                      ]}
                      onPress={() => handleToggleExcludePackage(item.packageName)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.appItemIconContainer}>
                        <Ionicons
                          name={isExcluded ? 'ban' : 'phone-portrait-outline'}
                          size={18}
                          color={isExcluded ? '#F87171' : Theme.colors.textMuted}
                        />
                      </View>
                      <View style={styles.appItemTextCol}>
                        <Text style={[styles.appItemLabel, isExcluded && { color: '#F87171' }]} numberOfLines={1}>
                          {item.label}
                        </Text>
                        <Text style={styles.appItemPackage} numberOfLines={1}>
                          {item.packageName}
                        </Text>
                      </View>
                      <Switch
                        value={isExcluded}
                        onValueChange={() => handleToggleExcludePackage(item.packageName)}
                        trackColor={{ false: '#2A241C', true: '#F87171' }}
                        thumbColor="#F7F1E6"
                      />
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {installedApps.length === 0
                        ? 'No apps detected. You can type package names above.'
                        : 'No apps found matching search'}
                    </Text>
                  </View>
                }
              />
            )}

            {/* Modal Bottom Done Button */}
            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setShowAppPickerModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fixed Sticky Header with Search & Navigation Bar */}
      <View style={[styles.stickyHeader, { paddingTop: Math.max(insets.top, 12) }]}>
        {/* Top Row: Title, Subtitle & Edit Keys Button */}
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.headerTitle}>Engines & Settings</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Models, personas, floating mic & shield
            </Text>
          </View>
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

        {/* Live Search Input Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={15} color={Theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search engines, keys, opacity, apps..."
            placeholderTextColor={Theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.searchClearBtn}
            >
              <Ionicons name="close-circle" size={16} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Horizontal Category Navigation Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabsScroll}
        >
          {CATEGORY_TABS.map((tab) => {
            const isSelected = activeCategory === tab.id && !isSearching;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.categoryTabPill,
                  isSelected && styles.categoryTabPillActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveCategory(tab.id);
                  if (searchQuery.length > 0) setSearchQuery('');
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={13}
                  color={isSelected ? '#151210' : Theme.colors.textSecondary}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.categoryTabLabel,
                    isSelected && styles.categoryTabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.badge && (
                  <View
                    style={[
                      styles.categoryTabBadge,
                      isSelected && styles.categoryTabBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryTabBadgeText,
                        isSelected && styles.categoryTabBadgeTextActive,
                      ]}
                    >
                      {tab.badge}
                    </Text>
                  </View>
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
        {/* Search Status Pill (when searching) */}
        {isSearching && (
          <View style={styles.searchStatusBanner}>
            <View style={styles.searchStatusLeft}>
              <Ionicons name="filter-outline" size={13} color={Theme.colors.cyan} />
              <Text style={styles.searchStatusText}>
                Results for <Text style={styles.searchHighlight}>"{searchQuery}"</Text>
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.searchResetPill}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.searchResetText}>Reset</Text>
              <Ionicons name="close" size={12} color={Theme.colors.cyan} />
            </TouchableOpacity>
          </View>
        )}

        {/* SECTION 1: AI Engines */}
        {showModelsSection && (
          <>
            {/* Quick Status Overview Card */}
            <View style={styles.quickStatusCard}>
              <View style={styles.quickStatusItem}>
                <Text style={styles.quickStatusLabel}>ACTIVE SPEECH-TO-TEXT</Text>
                <View style={styles.quickStatusValueRow}>
                  <View style={[styles.statusDot, { backgroundColor: '#93B884' }]} />
                  <Text style={styles.quickStatusValue} numberOfLines={1}>
                    {sttOptions.find((o) => o.id === settings.sttProvider)?.name || settings.sttProvider}
                  </Text>
                </View>
              </View>
              <View style={styles.quickStatusDivider} />
              <View style={styles.quickStatusItem}>
                <Text style={styles.quickStatusLabel}>ACTIVE CLEANUP LLM</Text>
                <View style={styles.quickStatusValueRow}>
                  <View style={[styles.statusDot, { backgroundColor: '#E9A063' }]} />
                  <Text style={styles.quickStatusValue} numberOfLines={1}>
                    {llmOptions.find((o) => o.id === settings.llmProvider)?.name || settings.llmProvider}
                  </Text>
                </View>
              </View>
            </View>

            {filteredStt.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Speech to text</Text>
                  <Text style={styles.sectionCountText}>{filteredStt.length} engines</Text>
                </View>
                {filteredStt.map((option) =>
                  renderEngineCard(
                    option,
                    settings.sttProvider === option.id,
                    () => handleSelectSttProvider(option.id as SttProvider)
                  )
                )}
              </>
            )}

            {filteredLlm.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: 22 }]}>
                  <Text style={styles.sectionTitle}>AI cleanup</Text>
                  <Text style={styles.sectionCountText}>{filteredLlm.length} engines</Text>
                </View>
                {filteredLlm.map((option) =>
                  renderEngineCard(
                    option,
                    settings.llmProvider === option.id,
                    () => handleSelectLlmProvider(option.id as LlmProvider)
                  )
                )}
              </>
            )}
          </>
        )}

        {/* SECTION 2: Tone & Persona */}
        {showPersonasSection && (
          <>
            <View style={[styles.sectionHeader, { marginTop: showModelsSection ? 24 : 0 }]}>
              <Text style={styles.sectionTitle}>Tone & Persona</Text>
              <Text style={styles.sectionCountText}>{filteredPersonas.length} modes</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Choose how OpenWhispr cleans and shapes your words before they land in your apps.
            </Text>

            <View style={styles.personaGrid}>
              {filteredPersonas.map((mode) => {
                const isActive = (settings.cleanupMode || 'natural') === mode.id;
                return (
                  <TouchableOpacity
                    key={mode.id}
                    style={[
                      styles.personaCard,
                      isActive && styles.personaCardActive,
                    ]}
                    onPress={() => handleSelectCleanupMode(mode.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.personaCardHeader}>
                      <View style={styles.personaCardTitleGroup}>
                        <View style={[styles.personaIconBox, isActive && styles.personaIconBoxActive]}>
                          <Ionicons
                            name={mode.ionIcon as any}
                            size={19}
                            color={isActive ? Theme.colors.cyan : Theme.colors.textSecondary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.personaCardLabelRow}>
                            <Text
                              style={[
                                styles.personaCardLabel,
                                isActive && styles.personaCardLabelActive,
                              ]}
                            >
                              {mode.label}
                            </Text>
                            <View style={styles.personaContextBadge}>
                              <Text style={styles.personaContextText}>{mode.badge}</Text>
                            </View>
                          </View>
                          <Text style={styles.personaCardTarget}>{mode.targetApp}</Text>
                        </View>
                      </View>

                      {isActive ? (
                        <View style={styles.activeTickCircle}>
                          <Ionicons name="checkmark-sharp" size={14} color="#151210" />
                        </View>
                      ) : (
                        <View style={styles.inactiveTickCircle} />
                      )}
                    </View>

                    <Text style={styles.personaCardTagline}>{mode.tagline}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* SECTION 3: Capsule & Keyboard Docking */}
        {showCapsuleSection && (
          <>
            <View style={[styles.sectionHeader, { marginTop: (showModelsSection || showPersonasSection) ? 24 : 0 }]}>
              <Text style={styles.sectionTitle}>Capsule & Keyboard Docking</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Control the floating microphone bubble, resting opacity, and smart keyboard clearance.
            </Text>

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

          {/* Position Above Keyboard Settings */}
          {settings.smartKeyboardMode && (
            <View style={styles.positionSubContainer}>
              <View style={styles.positionSubHeader}>
                <Ionicons name="arrow-up-circle-outline" size={16} color="#E9A063" />
                <Text style={styles.positionSubTitle}>Position above keyboard</Text>
              </View>

              {/* Height Offset */}
              <Text style={styles.positionFieldLabel}>Height clearance</Text>
              <View style={styles.pillsRow}>
                {[
                  { value: 24, label: 'Just Above', tag: '+24dp' },
                  { value: 48, label: 'Lifted (Default)', tag: '+48dp' },
                  { value: 80, label: 'High', tag: '+80dp' },
                  { value: 120, label: 'Mid-Screen', tag: '+120dp' },
                ].map((item) => {
                  const isSelected = (settings.keyboardOffset ?? 48) === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.pillButton,
                        isSelected && styles.pillButtonActive,
                      ]}
                      onPress={() => {
                        handleUpdate({ keyboardOffset: item.value });
                        Haptics.selectionAsync();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pillButtonText,
                          isSelected && styles.pillButtonTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Dock Side */}
              <Text style={[styles.positionFieldLabel, { marginTop: 12 }]}>Dock side</Text>
              <View style={styles.pillsRow}>
                {[
                  { value: 'right', label: 'Right Side (Default)', icon: 'chevron-forward' },
                  { value: 'left', label: 'Left Side', icon: 'chevron-back' },
                ].map((item) => {
                  const isSelected = (settings.keyboardPosition ?? 'right') === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.pillButton,
                        styles.pillButtonHalf,
                        isSelected && styles.pillButtonActive,
                      ]}
                      onPress={() => {
                        handleUpdate({ keyboardPosition: item.value as 'right' | 'left' });
                        Haptics.selectionAsync();
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={13}
                        color={isSelected ? '#141210' : Theme.colors.textMuted}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.pillButtonText,
                          isSelected && styles.pillButtonTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Opacity Slider (30% to 100%) */}
          <View style={styles.positionSubContainer}>
            <View style={styles.positionSubHeader}>
              <Ionicons name="eye-outline" size={16} color="#E9A063" />
              <Text style={styles.positionSubTitle}>Capsule resting opacity</Text>
              <View
                style={[
                  styles.tagBadge,
                  {
                    marginLeft: 'auto',
                    borderColor: 'rgba(233, 160, 99, 0.4)',
                    backgroundColor: Theme.colors.cyanSubtle,
                  },
                ]}
              >
                <Text style={[styles.tagBadgeText, { color: Theme.colors.cyan }]}>
                  {Math.round((settings.floatingBubbleOpacity ?? 0.70) * 100)}%
                </Text>
              </View>
            </View>

            <Text style={styles.tileSubtitle}>
              Fine-tune idle transparency so the pill never obstructs background text. Snaps to 100% solid while recording.
            </Text>

            {/* Stepped Opacity Pills */}
            <View style={[styles.pillsRow, { marginTop: 10 }]}>
              {[
                { value: 0.30, label: '30%', sub: 'Ghost' },
                { value: 0.50, label: '50%', sub: 'Soft' },
                { value: 0.70, label: '70%', sub: 'Default' },
                { value: 0.85, label: '85%', sub: 'Clear' },
                { value: 1.00, label: '100%', sub: 'Solid' },
              ].map((item) => {
                const currentVal = settings.floatingBubbleOpacity ?? 0.70;
                const isSelected = Math.abs(currentVal - item.value) < 0.05;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.pillButton,
                      styles.pillButtonFive,
                      isSelected && styles.pillButtonActive,
                    ]}
                    onPress={() => {
                      handleUpdate({ floatingBubbleOpacity: item.value });
                      Haptics.selectionAsync();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.pillButtonText,
                        isSelected && styles.pillButtonTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.pillButtonSubText,
                        isSelected && styles.pillButtonSubTextActive,
                      ]}
                    >
                      {item.sub}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Live Visual Preview Card */}
            <View style={styles.opacityPreviewCard}>
              <Text style={styles.opacityPreviewLabel}>LIVE PREVIEW OVER BACKGROUND TEXT</Text>
              <View style={styles.opacityPreviewMockScreen}>
                <View style={styles.opacityMockContent}>
                  <Text style={styles.opacityMockText}>The quick brown fox jumps over the lazy dog. Voice dictation that feels magical and seamless.</Text>
                </View>
                {/* Miniature Capsule Pill at exact selected opacity */}
                <View
                  style={[
                    styles.previewCapsulePill,
                    { opacity: settings.floatingBubbleOpacity ?? 0.70 },
                  ]}
                >
                  <View style={styles.previewCapsuleLeft}>
                    <Text style={styles.previewCapsuleEmoji}>✨</Text>
                    <Text style={styles.previewCapsuleLabel}>Natural</Text>
                    <Ionicons name="chevron-down" size={9} color="#CCCCCC" />
                  </View>
                  <View style={styles.previewCapsuleDivider} />
                  <View style={styles.previewCapsuleMic}>
                    <Ionicons name="mic" size={11} color="#000000" />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </>
    )}

        {/* SECTION 4: Security, Shield & Apps */}
        {showShieldSection && (
          <>
            <View style={[styles.sectionHeader, { marginTop: (showModelsSection || showPersonasSection || showCapsuleSection) ? 24 : 0 }]}>
              <Text style={styles.sectionTitle}>Security, Shield & Apps</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Payment app tapjacking defense, custom app exclusions, and Android permissions.
            </Text>

            <View style={styles.cardContainer}>
              {/* Auto-Persona Switching (Zero-Tap) */}
          <View style={styles.tileRow}>
            <View style={styles.tileInfo}>
              <View style={styles.tileTitleRow}>
                <Text style={styles.tileTitle}>Zero-Tap Auto-Persona</Text>
                <View
                  style={[
                    styles.tagBadge,
                    {
                      borderColor: (settings.autoPersonaSwitch ?? true)
                        ? 'rgba(147, 184, 132, 0.4)'
                        : 'rgba(217, 164, 65, 0.4)',
                      backgroundColor: (settings.autoPersonaSwitch ?? true)
                        ? Theme.colors.greenMuted
                        : Theme.colors.amberMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagBadgeText,
                      { color: (settings.autoPersonaSwitch ?? true) ? Theme.colors.green : Theme.colors.amber },
                    ]}
                  >
                    {(settings.autoPersonaSwitch ?? true) ? '⚡ Auto-Adaptive' : 'Manual only'}
                  </Text>
                </View>
              </View>
              <Text style={styles.tileSubtitle}>
                Automatically detects which app is in the foreground and adapts tone & vocabulary with zero taps.
              </Text>
            </View>
            <Switch
              value={settings.autoPersonaSwitch ?? true}
              onValueChange={(val) => {
                handleUpdate({ autoPersonaSwitch: val });
                Haptics.selectionAsync();
              }}
              trackColor={{ false: '#2A241C', true: '#E9A063' }}
              thumbColor="#F7F1E6"
            />
          </View>

          {/* App Mapping Grid */}
          {(settings.autoPersonaSwitch ?? true) && (
            <View style={styles.appMappingContainer}>
              <Text style={styles.appMappingHeader}>INTELLIGENT APP ROUTING</Text>
              <View style={styles.appMappingGrid}>
                {[
                  {
                    icon: 'chatbubbles',
                    persona: 'Casual Chat',
                    apps: 'WhatsApp, Telegram, Signal, Discord, Messages',
                    tag: 'Emoji & Slang',
                  },
                  {
                    icon: 'mail',
                    persona: 'Work Email',
                    apps: 'Gmail, Outlook, LinkedIn, Yahoo, Spark',
                    tag: 'Formal Polish',
                  },
                  {
                    icon: 'checkbox',
                    persona: 'Action Notes',
                    apps: 'Notion, Google Keep, Obsidian, Todoist, Notes',
                    tag: 'Bullet & Checkbox',
                  },
                ].map((item, idx) => (
                  <View key={idx} style={styles.appMappingCard}>
                    <View style={styles.appMappingCardTop}>
                      <Ionicons name={item.icon as any} size={14} color="#E9A063" />
                      <Text style={styles.appMappingPersona}>{item.persona}</Text>
                      <View style={styles.appMappingTagBadge}>
                        <Text style={styles.appMappingTagText}>{item.tag}</Text>
                      </View>
                    </View>
                    <Text style={styles.appMappingAppsList}>{item.apps}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Android Quick Settings Shade Tile */}
          <View style={styles.tileRow}>
            <View style={styles.tileInfo}>
              <View style={styles.tileTitleRow}>
                <Ionicons name="albums-outline" size={17} color="#E9A063" style={{ marginRight: 6 }} />
                <Text style={styles.tileTitle}>Android Quick Settings Tile</Text>
                <View
                  style={[
                    styles.tagBadge,
                    {
                      borderColor: 'rgba(147, 184, 132, 0.4)',
                      backgroundColor: Theme.colors.greenMuted,
                    },
                  ]}
                >
                  <Text style={[styles.tagBadgeText, { color: Theme.colors.green }]}>
                    Ready in Shade
                  </Text>
                </View>
              </View>
              <Text style={styles.tileSubtitle}>
                Swipe down your Android notification shade, tap Edit (pencil icon), and add the "OpenWhispr" tile for instant 1-tap floating mic control from any screen or game.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Payment & Banking App Shield (Auto-Pause Overlay) */}
          <View style={styles.tileRow}>
            <View style={styles.tileInfo}>
              <View style={styles.tileTitleRow}>
                <Ionicons name="shield-checkmark" size={17} color="#4ADE80" style={{ marginRight: 6 }} />
                <Text style={styles.tileTitle}>Auto-pause on payment apps</Text>
                <View
                  style={[
                    styles.tagBadge,
                    {
                      borderColor: (settings.pauseOnPaymentApps ?? true)
                        ? 'rgba(74, 222, 128, 0.4)'
                        : 'rgba(217, 164, 65, 0.4)',
                      backgroundColor: (settings.pauseOnPaymentApps ?? true)
                        ? 'rgba(74, 222, 128, 0.12)'
                        : Theme.colors.amberMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagBadgeText,
                      { color: (settings.pauseOnPaymentApps ?? true) ? '#4ADE80' : Theme.colors.amber },
                    ]}
                  >
                    {(settings.pauseOnPaymentApps ?? true) ? 'Shield Active' : 'Off'}
                  </Text>
                </View>
              </View>
              <Text style={styles.tileSubtitle}>
                Automatically hides the floating bubble inside payment, banking, and UPI apps (Google Pay, PhonePe, Paytm, BHIM, Cash App, Chase, etc.) so they never block transactions or show screen overlay warnings.
              </Text>
            </View>
            <Switch
              value={settings.pauseOnPaymentApps ?? true}
              onValueChange={(val) => {
                handleUpdate({ pauseOnPaymentApps: val });
                Haptics.selectionAsync();
              }}
              trackColor={{ false: '#2A241C', true: '#4ADE80' }}
              thumbColor="#F7F1E6"
            />
          </View>

          {/* Protected Payment Apps Showcase */}
          {(settings.pauseOnPaymentApps ?? true) && (
            <View style={styles.paymentAppsContainer}>
              <View style={styles.paymentAppsHeaderRow}>
                <Text style={styles.paymentAppsHeader}>PROTECTED PAYMENT & BANKING APPS</Text>
                <Text style={styles.paymentAppsCount}>20+ Pre-Configured</Text>
              </View>
              <View style={styles.paymentChipsRow}>
                {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI', 'CRED', 'PayPal', 'Cash App', 'Banking Apps'].map((app, i) => (
                  <View key={i} style={styles.paymentChip}>
                    <Ionicons name="lock-closed" size={10} color="#4ADE80" style={{ marginRight: 4 }} />
                    <Text style={styles.paymentChipText}>{app}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Custom Excluded Apps (Blacklist) */}
          <View style={styles.tileRow}>
            <View style={styles.tileInfo}>
              <View style={styles.tileTitleRow}>
                <Ionicons name="ban-outline" size={17} color="#F87171" style={{ marginRight: 6 }} />
                <Text style={styles.tileTitle}>Excluded apps blacklist</Text>
                {(settings.excludedPackages?.length || 0) > 0 && (
                  <View style={[styles.tagBadge, { borderColor: 'rgba(248, 113, 113, 0.4)', backgroundColor: 'rgba(248, 113, 113, 0.12)' }]}>
                    <Text style={[styles.tagBadgeText, { color: '#F87171' }]}>
                      {settings.excludedPackages.length} Excluded
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.tileSubtitle}>
                Add specific games or sensitive apps where you never want the floating microphone to appear.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.manageExcludedBtn}
              onPress={handleOpenAppPicker}
              activeOpacity={0.7}
            >
              <Text style={styles.manageExcludedBtnText}>Manage</Text>
              <Ionicons name="chevron-forward" size={12} color="#E9A063" />
            </TouchableOpacity>
          </View>

          {/* List of currently excluded packages chips */}
          {(settings.excludedPackages?.length || 0) > 0 && (
            <View style={styles.excludedListContainer}>
              <View style={styles.excludedChipsWrap}>
                {settings.excludedPackages.map((pkg) => (
                  <View key={pkg} style={styles.excludedChip}>
                    <Text style={styles.excludedChipText} numberOfLines={1}>
                      {pkg}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleToggleExcludePackage(pkg)}
                      style={styles.excludedChipClose}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={12} color="#F87171" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

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
          </>
        )}

        {/* SECTION 5: System prompt */}
        {showPromptSection && (
          <>
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
                    <Text style={styles.promptCode}>
                      {getCleanupSystemPrompt(settings.cleanupMode || 'natural')}
                    </Text>
                  </ScrollView>
                </View>
              )}
            </View>
          </>
        )}

        {/* Empty Search Results State */}
        {!hasAnyResults && (
          <View style={styles.emptySearchContainer}>
            <View style={styles.emptySearchIconBox}>
              <Ionicons name="search-outline" size={26} color={Theme.colors.cyan} />
            </View>
            <Text style={styles.emptySearchTitle}>No results found</Text>
            <Text style={styles.emptySearchSubtitle}>
              No settings, engines, or personas match "{searchQuery}".
            </Text>
            <TouchableOpacity
              style={styles.emptySearchClearBtn}
              onPress={() => setSearchQuery('')}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={14} color="#151210" style={{ marginRight: 6 }} />
              <Text style={styles.emptySearchClearBtnText}>Clear search</Text>
            </TouchableOpacity>
          </View>
        )}

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
  stickyHeader: {
    backgroundColor: Theme.colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 244, 226, 0.06)',
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginTop: 12,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    paddingVertical: 0,
    height: '100%',
  },
  searchClearBtn: {
    padding: 4,
    marginLeft: 4,
  },
  categoryTabsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
    paddingRight: 10,
  },
  categoryTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  categoryTabPillActive: {
    backgroundColor: Theme.colors.cyan,
    borderColor: Theme.colors.cyan,
  },
  categoryTabLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
  },
  categoryTabLabelActive: {
    color: '#151210',
    fontFamily: Theme.fonts.semiBold,
  },
  categoryTabBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryTabBadgeActive: {
    backgroundColor: 'rgba(21, 18, 16, 0.2)',
  },
  categoryTabBadgeText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontFamily: Theme.fonts.mono,
  },
  categoryTabBadgeTextActive: {
    color: '#151210',
    fontFamily: Theme.fonts.monoBold,
  },
  searchStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(233, 160, 99, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(233, 160, 99, 0.2)',
    marginBottom: 16,
  },
  searchStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  searchStatusText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
  },
  searchHighlight: {
    color: Theme.colors.cyan,
    fontFamily: Theme.fonts.semiBold,
  },
  searchResetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(233, 160, 99, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  searchResetText: {
    color: Theme.colors.cyan,
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
  },
  quickStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 18,
  },
  quickStatusItem: {
    flex: 1,
  },
  quickStatusLabel: {
    color: Theme.colors.textMuted,
    fontSize: 9.5,
    fontFamily: Theme.fonts.mono,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  quickStatusValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickStatusValue: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
    flex: 1,
  },
  quickStatusDivider: {
    width: 1,
    height: 28,
    backgroundColor: Theme.colors.border,
    marginHorizontal: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionCountText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.mono,
  },
  emptySearchContainer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginTop: 8,
  },
  emptySearchIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(233, 160, 99, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptySearchTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontFamily: Theme.fonts.title,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySearchSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptySearchClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cyan,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  emptySearchClearBtnText: {
    color: '#151210',
    fontSize: 12.5,
    fontFamily: Theme.fonts.semiBold,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 10,
    gap: 12,
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
  activeTickCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTickCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 244, 226, 0.16)',
    backgroundColor: 'transparent',
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
  positionSubContainer: {
    backgroundColor: '#1E1A16',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(233, 160, 99, 0.15)',
  },
  positionSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  positionSubTitle: {
    color: '#E9A063',
    fontSize: 12.5,
    fontFamily: Theme.fonts.semiBold,
    letterSpacing: 0.2,
  },
  positionFieldLabel: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pillButtonHalf: {
    flex: 1,
    minWidth: 110,
  },
  pillButtonActive: {
    backgroundColor: '#E9A063',
    borderColor: '#E9A063',
  },
  pillButtonText: {
    color: '#B0A89C',
    fontSize: 11.5,
    fontFamily: Theme.fonts.semiBold,
  },
  pillButtonTextActive: {
    color: '#141210',
    fontFamily: Theme.fonts.semiBold,
  },
  sectionSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 12.5,
    fontFamily: Theme.fonts.regular,
    lineHeight: 18,
    marginBottom: 12,
  },
  personaGrid: {
    gap: 10,
  },
  personaCard: {
    backgroundColor: Theme.colors.cardGlass,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.2,
    borderColor: Theme.colors.border,
  },
  personaCardActive: {
    borderColor: Theme.colors.borderActive,
    backgroundColor: 'rgba(233, 160, 99, 0.05)',
  },
  personaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  personaCardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  personaIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  personaIconBoxActive: {
    backgroundColor: Theme.colors.cyanSubtle,
    borderColor: Theme.colors.borderActive,
  },
  personaCardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personaCardLabel: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontFamily: Theme.fonts.semiBold,
  },
  personaCardLabelActive: {
    color: Theme.colors.cyanBright,
  },
  personaContextBadge: {
    backgroundColor: 'rgba(255, 246, 230, 0.05)',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  personaContextText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontFamily: Theme.fonts.mono,
  },
  personaCardTarget: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    marginTop: 1,
  },
  personaCardTagline: {
    color: Theme.colors.textSecondary,
    fontSize: 12.5,
    fontFamily: Theme.fonts.regular,
    lineHeight: 17,
    marginTop: 2,
    paddingLeft: 32,
  },
  pillButtonFive: {
    flex: 1,
    minWidth: 54,
    paddingHorizontal: 4,
    paddingVertical: 7,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButtonSubText: {
    color: '#8A8275',
    fontSize: 9.5,
    fontFamily: Theme.fonts.regular,
    marginTop: 1,
  },
  pillButtonSubTextActive: {
    color: '#141210',
    fontFamily: Theme.fonts.semiBold,
  },
  opacityPreviewCard: {
    marginTop: 14,
    backgroundColor: '#161412',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  opacityPreviewLabel: {
    color: Theme.colors.textMuted,
    fontSize: 9.5,
    fontFamily: Theme.fonts.mono,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  opacityPreviewMockScreen: {
    position: 'relative',
    height: 64,
    backgroundColor: '#0D0C0A',
    borderRadius: 10,
    padding: 8,
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  opacityMockContent: {
    opacity: 0.55,
  },
  opacityMockText: {
    color: '#D4CDC3',
    fontSize: 10,
    lineHeight: 14,
    fontFamily: Theme.fonts.mono,
  },
  previewCapsulePill: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E20',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#38383A',
    paddingHorizontal: 3,
    paddingVertical: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  previewCapsuleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 4,
  },
  previewCapsuleEmoji: {
    fontSize: 11,
  },
  previewCapsuleLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
  },
  previewCapsuleDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#38383A',
    marginHorizontal: 1,
  },
  previewCapsuleMic: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  appMappingContainer: {
    marginTop: 10,
    backgroundColor: '#181512',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(233, 160, 99, 0.15)',
  },
  appMappingHeader: {
    color: '#E9A063',
    fontSize: 10,
    fontFamily: Theme.fonts.mono,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  appMappingGrid: {
    gap: 8,
  },
  appMappingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  appMappingCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  appMappingPersona: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
  },
  appMappingTagBadge: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(233, 160, 99, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  appMappingTagText: {
    color: '#E9A063',
    fontSize: 9.5,
    fontFamily: Theme.fonts.mono,
  },
  appMappingAppsList: {
    color: Theme.colors.textMuted,
    fontSize: 10.5,
    fontFamily: Theme.fonts.regular,
    lineHeight: 14,
  },
  paymentAppsContainer: {
    marginTop: 10,
    backgroundColor: '#131A14',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
  },
  paymentAppsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentAppsHeader: {
    color: '#4ADE80',
    fontSize: 10,
    fontFamily: Theme.fonts.mono,
    letterSpacing: 0.5,
  },
  paymentAppsCount: {
    color: '#86EFAC',
    fontSize: 9.5,
    fontFamily: Theme.fonts.mono,
  },
  paymentChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  paymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.25)',
  },
  paymentChipText: {
    color: '#D1FAE5',
    fontSize: 10.5,
    fontFamily: Theme.fonts.medium,
  },
  manageExcludedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(233, 160, 99, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  manageExcludedBtnText: {
    color: '#E9A063',
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
  },
  excludedListContainer: {
    marginTop: 10,
    backgroundColor: '#191313',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  excludedChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  excludedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderRadius: 6,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    maxWidth: '100%',
  },
  excludedChipText: {
    color: '#FECACA',
    fontSize: 10.5,
    fontFamily: Theme.fonts.mono,
    marginRight: 4,
  },
  excludedChipClose: {
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1A1714',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 17,
    fontFamily: Theme.fonts.title,
  },
  modalSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    marginTop: 3,
    lineHeight: 16,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  manualEntryInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#12100E',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontFamily: Theme.fonts.mono,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  manualEntryAddBtn: {
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: '#E9A063',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualEntryAddBtnText: {
    color: '#151210',
    fontSize: 12.5,
    fontFamily: Theme.fonts.title,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    backgroundColor: '#12100E',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchBarInput: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontFamily: Theme.fonts.mono,
  },
  appList: {
    maxHeight: 320,
  },
  appItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  appItemRowExcluded: {
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    borderColor: 'rgba(248, 113, 113, 0.25)',
  },
  appItemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  appItemTextCol: {
    flex: 1,
    marginRight: 10,
  },
  appItemLabel: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
    marginBottom: 2,
  },
  appItemPackage: {
    color: Theme.colors.textMuted,
    fontSize: 10.5,
    fontFamily: Theme.fonts.mono,
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    textAlign: 'center',
  },
  modalDoneBtn: {
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modalDoneBtnText: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontFamily: Theme.fonts.semiBold,
  },
});
