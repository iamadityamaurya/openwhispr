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
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import {
  AppSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  DEFAULT_PAYMENT_PACKAGES,
} from '../services/storage';
import { CLEANUP_MODES, CleanupMode, getCleanupSystemPrompt } from '../config/prompts';
import { Theme } from '../constants/designSystem';
import { NativeFloatingBubble } from '../services/nativeFloatingBubble';
import { OverlayPermissionModal } from '../components/OverlayPermissionModal';

import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';

export type EngineCategory = 'all' | 'personas' | 'capsule' | 'shield' | 'prompt';

interface CategoryTab {
  id: EngineCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeCategory, setActiveCategory] = useState<EngineCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  const reloadSettings = React.useCallback(() => {
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

  useFocusEffect(reloadSettings);

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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.push('/ai');
        return;
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

  const CATEGORY_TABS: CategoryTab[] = [
    { id: 'all', label: 'All', icon: 'grid-outline' },
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
    {
      id: 'prompt',
      label: 'System Prompt',
      icon: 'code-slash-outline',
    },
  ];

  const query = searchQuery.trim().toLowerCase();
  const isSearching = query.length > 0;

  // Filter Persona options
  const filteredPersonas = CLEANUP_MODES.filter((m) => {
    if (!isSearching) return true;
    return (
      m.label.toLowerCase().includes(query) ||
      m.shortLabel.toLowerCase().includes(query) ||
      'persona'.includes(query) ||
      'tone'.includes(query)
    );
  });

  // Section visibility checks
  const showAiPromoSection =
    isSearching &&
    (query.includes('model') ||
      query.includes('engine') ||
      query.includes('groq') ||
      query.includes('deepgram') ||
      query.includes('openai') ||
      query.includes('gemini') ||
      query.includes('surplus') ||
      query.includes('stt') ||
      query.includes('speech') ||
      query.includes('llm') ||
      query.includes('key') ||
      query.includes('api'));

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
    (activeCategory === 'all' || activeCategory === 'personas' || activeCategory === 'prompt' || isSearching) &&
    (!isSearching || query.includes('prompt') || query.includes('instruction') || query.includes('system') || query.includes('terminal'));

  const hasAnyResults =
    showAiPromoSection ||
    showPersonasSection ||
    showCapsuleSection ||
    showShieldSection ||
    showPromptSection;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.bg} />



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
                <ActivityIndicator size="small" color="#3fae6e" />
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
                        trackColor={{ false: '#1A1A22', true: '#F87171' }}
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
        {/* Top Row: Title & Subtitle */}
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Assistant preferences & tone settings
            </Text>
          </View>
        </View>

        {/* Live Search Input Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={15} color={Theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search settings..."
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
                  color={isSelected ? '#08080A' : Theme.colors.textSecondary}
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

        {/* AI Models & Keys Navigation Card */}
        {showAiPromoSection && (
          <TouchableOpacity
            style={styles.aiPromoCard}
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/ai');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.aiPromoContent}>
              <View style={styles.aiPromoIconBox}>
                <Ionicons name="sparkles" size={20} color={Theme.colors.cyan} />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={styles.aiPromoTitleRow}>
                  <Text style={styles.aiPromoTitle}>AI Engines & Models</Text>
                  <View style={styles.aiPromoBadge}>
                    <Text style={styles.aiPromoBadgeText}>Moved to AI Tab</Text>
                  </View>
                </View>
                <Text style={styles.aiPromoActiveText}>
                  Active STT: <Text style={{ color: Theme.colors.cyan, fontFamily: Theme.fonts.semiBold }}>{settings.sttProvider.toUpperCase()}</Text> · LLM: <Text style={{ color: '#93B884', fontFamily: Theme.fonts.semiBold }}>{settings.llmProvider.toUpperCase()}</Text>
                </Text>
                <Text style={styles.aiPromoSubtitle}>
                  Choose models, configure API keys & test connections in AI Setup →
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
        )}

        {/* SECTION 2: Tone & Persona */}
        {showPersonasSection && (
          <>
            <View style={[styles.sectionHeader, { marginTop: showAiPromoSection ? 12 : 0 }]}>
              <Text style={styles.sectionTitle}>TONE & PERSONA</Text>
            </View>

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
                    <View style={styles.personaCardRow}>
                      <View style={[styles.personaIconBox, isActive && styles.personaIconBoxActive]}>
                        <Ionicons
                          name={mode.ionIcon as any}
                          size={18}
                          color={isActive ? Theme.colors.cyan : Theme.colors.textSecondary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.personaCardLabel,
                          isActive && styles.personaCardLabelActive,
                        ]}
                      >
                        {mode.label}
                      </Text>
                      {isActive ? (
                        <View style={styles.activeTickCircle}>
                          <Ionicons name="checkmark-sharp" size={13} color="#08080A" />
                        </View>
                      ) : (
                        <View style={styles.inactiveTickCircle} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* SECTION 3: Capsule & Keyboard Docking */}
        {showCapsuleSection && (
          <>
            <View style={[styles.sectionHeader, { marginTop: (showAiPromoSection || showPersonasSection) ? 20 : 0 }]}>
              <Text style={styles.sectionTitle}>CAPSULE & DOCKING</Text>
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
                    <Text style={styles.liveServiceText}>Active</Text>
                  </View>
                )}
              </View>
              <Text style={styles.tileSubtitle}>
                Hands-free floating dictation button over any app.
              </Text>
            </View>
            <Switch
              value={settings.overlayEnabled}
              onValueChange={(val) => {
                handleToggleOverlay(val);
                Haptics.selectionAsync();
              }}
              trackColor={{ false: '#1A1A22', true: '#3fae6e' }}
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
                        ? 'rgba(63, 174, 110, 0.4)'
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
                Docks directly above your keyboard while typing.
              </Text>
            </View>
            <Switch
              value={settings.smartKeyboardMode}
              onValueChange={(val) => {
                handleUpdate({ smartKeyboardMode: val });
                Haptics.selectionAsync();
              }}
              trackColor={{ false: '#1A1A22', true: '#3fae6e' }}
              thumbColor="#F7F1E6"
            />
          </View>

          {/* Position Above Keyboard Settings */}
          {settings.smartKeyboardMode && (
            <View style={styles.positionSubContainer}>
              <View style={styles.positionSubHeader}>
                <Ionicons name="arrow-up-circle-outline" size={16} color="#3fae6e" />
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
              <Ionicons name="eye-outline" size={16} color="#3fae6e" />
              <Text style={styles.positionSubTitle}>Capsule resting opacity</Text>
              <View
                style={[
                  styles.tagBadge,
                  {
                    marginLeft: 'auto',
                    borderColor: 'rgba(63, 174, 110, 0.4)',
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
              Adjust resting transparency when idle.
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
          </View>
        </View>
      </>
    )}

        {/* SECTION 4: Security, Shield & Apps */}
        {showShieldSection && (
          <>
            <View style={[styles.sectionHeader, { marginTop: (showAiPromoSection || showPersonasSection || showCapsuleSection) ? 20 : 0 }]}>
              <Text style={styles.sectionTitle}>SECURITY & PERMISSIONS</Text>
            </View>

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
                    {(settings.autoPersonaSwitch ?? true) ? 'Auto' : 'Manual'}
                  </Text>
                </View>
              </View>
              <Text style={styles.tileSubtitle}>
                Automatically detects active foreground app to match tone.
              </Text>
            </View>
            <Switch
              value={settings.autoPersonaSwitch ?? true}
              onValueChange={(val) => {
                handleUpdate({ autoPersonaSwitch: val });
                Haptics.selectionAsync();
              }}
              trackColor={{ false: '#1A1A22', true: '#3fae6e' }}
              thumbColor="#F7F1E6"
            />
          </View>

          <View style={styles.divider} />

          {/* Android Quick Settings Shade Tile */}
          <View style={styles.tileRow}>
            <View style={styles.tileInfo}>
              <View style={styles.tileTitleRow}>
                <Ionicons name="albums-outline" size={17} color="#3fae6e" style={{ marginRight: 6 }} />
                <Text style={styles.tileTitle}>Quick Settings Tile</Text>
              </View>
              <Text style={styles.tileSubtitle}>
                Available in Android notification shade for 1-tap floating mic control.
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
                    {(settings.pauseOnPaymentApps ?? true) ? 'Active' : 'Off'}
                  </Text>
                </View>
              </View>
              <Text style={styles.tileSubtitle}>
                Hides floating button inside banking and payment apps for security.
              </Text>
            </View>
            <Switch
              value={settings.pauseOnPaymentApps ?? true}
              onValueChange={(val) => {
                handleUpdate({ pauseOnPaymentApps: val });
                Haptics.selectionAsync();
              }}
              trackColor={{ false: '#1A1A22', true: '#4ADE80' }}
              thumbColor="#F7F1E6"
            />
          </View>

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
              <Ionicons name="chevron-forward" size={12} color="#3fae6e" />
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
              <Ionicons name="refresh-outline" size={14} color="#08080A" style={{ marginRight: 6 }} />
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
    color: '#08080A',
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
    color: '#08080A',
    fontFamily: Theme.fonts.monoBold,
  },
  searchStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(63, 174, 110, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(63, 174, 110, 0.2)',
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
    backgroundColor: 'rgba(63, 174, 110, 0.15)',
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
    backgroundColor: 'rgba(63, 174, 110, 0.1)',
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
    color: '#08080A',
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
    backgroundColor: 'rgba(63, 174, 110, 0.07)',
    borderColor: 'rgba(63, 174, 110, 0.45)',
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
  aiPromoCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(63, 174, 110, 0.3)',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  aiPromoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiPromoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(63, 174, 110, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiPromoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  aiPromoTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontFamily: Theme.fonts.title,
  },
  aiPromoBadge: {
    backgroundColor: 'rgba(63, 174, 110, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(63, 174, 110, 0.3)',
  },
  aiPromoBadgeText: {
    color: Theme.colors.cyan,
    fontSize: 10,
    fontFamily: Theme.fonts.semiBold,
  },
  aiPromoActiveText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    marginBottom: 3,
  },
  aiPromoSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    lineHeight: 15,
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
    borderColor: 'rgba(63, 174, 110, 0.15)',
  },
  positionSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  positionSubTitle: {
    color: '#3fae6e',
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
    backgroundColor: '#3fae6e',
    borderColor: '#3fae6e',
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
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.2,
    borderColor: Theme.colors.border,
  },
  personaCardActive: {
    borderColor: Theme.colors.borderActive,
    backgroundColor: 'rgba(63, 174, 110, 0.05)',
  },
  personaCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  personaCardLabel: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontFamily: Theme.fonts.semiBold,
    flex: 1,
    marginLeft: 12,
  },
  personaCardLabelActive: {
    color: Theme.colors.cyanBright,
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

  manageExcludedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(63, 174, 110, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  manageExcludedBtnText: {
    color: '#3fae6e',
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
    backgroundColor: '#3fae6e',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualEntryAddBtnText: {
    color: '#08080A',
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
