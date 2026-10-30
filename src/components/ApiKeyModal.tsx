import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { AppSettings, SttProvider, LlmProvider } from '../services/storage';
import { testConnection } from '../services/api';
import { Theme } from '../constants/designSystem';
import {
  SURPLUS_LLM_MODELS,
  SURPLUS_STT_MODELS,
  SURPLUS_BASE_URL,
} from '../constants/surplusModels';
import {
  GROQ_STT_MODELS,
  GROQ_LLM_MODELS,
} from '../constants/groqModels';

interface ApiKeyModalProps {
  visible: boolean;
  settings: AppSettings;
  onSave: (updated: Partial<AppSettings>) => void;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  visible,
  settings,
  onSave,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  const [sttProvider, setSttProvider] = useState<SttProvider>(settings.sttProvider);
  const [llmProvider, setLlmProvider] = useState<LlmProvider>(settings.llmProvider);

  // Standard keys
  const [deepgramKey, setDeepgramKey] = useState(settings.deepgramApiKey);
  const [groqKey, setGroqKey] = useState(settings.groqApiKey);
  const [openaiKey, setOpenaiKey] = useState(settings.openaiApiKey);
  const [groqWhisperModel, setGroqWhisperModel] = useState(settings.groqWhisperModel || 'whisper-large-v3-turbo');
  const [groqLlmModel, setGroqLlmModel] = useState(settings.groqLlmModel || 'llama-3.3-70b-versatile');
  const [isCustomGroqStt, setIsCustomGroqStt] = useState(false);
  const [isCustomGroqLlm, setIsCustomGroqLlm] = useState(false);

  // Gemini keys
  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey || '');
  const [geminiModel, setGeminiModel] = useState(settings.geminiModel || 'gemini-2.5-flash');

  // Surplus Intelligence (Decentralized AI Marketplace)
  const [surplusKey, setSurplusKey] = useState(settings.surplusApiKey || '');
  const [surplusLlmModel, setSurplusLlmModel] = useState(settings.surplusLlmModel || 'deepseek-v4-flash');
  const [surplusSttModel, setSurplusSttModel] = useState(settings.surplusSttModel || 'venice-whisper-large-v3');

  // Custom Extra STT
  const [customSttKey, setCustomSttKey] = useState(settings.customSttApiKey || '');
  const [customSttBaseUrl, setCustomSttBaseUrl] = useState(settings.customSttBaseUrl || '');
  const [customSttModel, setCustomSttModel] = useState(settings.customSttModel || 'whisper-1');

  // Custom Extra LLM
  const [customLlmKey, setCustomLlmKey] = useState(settings.customLlmApiKey || '');
  const [customLlmBaseUrl, setCustomLlmBaseUrl] = useState(settings.customLlmBaseUrl || '');
  const [customLlmModel, setCustomLlmModel] = useState(settings.customLlmModel || 'deepseek-chat');

  // Visibility toggles
  const [showSttKey, setShowSttKey] = useState(false);
  const [showLlmKey, setShowLlmKey] = useState(false);

  // Preferences
  const [autoCopy, setAutoCopy] = useState(settings.autoCopy);
  const [autoSpeak, setAutoSpeak] = useState(settings.autoSpeak);
  const [ttsRate, setTtsRate] = useState(settings.ttsRate);

  // Testing states
  const [testingStt, setTestingStt] = useState(false);
  const [sttTestResult, setSttTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingLlm, setTestingLlm] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setSttProvider(settings.sttProvider);
    setLlmProvider(settings.llmProvider);
    setDeepgramKey(settings.deepgramApiKey || '');
    setGroqKey(settings.groqApiKey || '');
    const initialGroqStt = settings.groqWhisperModel || 'whisper-large-v3-turbo';
    setGroqWhisperModel(initialGroqStt);
    setIsCustomGroqStt(!GROQ_STT_MODELS.some((m) => m.id === initialGroqStt));
    const initialGroqLlm = settings.groqLlmModel || 'llama-3.3-70b-versatile';
    setGroqLlmModel(initialGroqLlm);
    setIsCustomGroqLlm(!GROQ_LLM_MODELS.some((m) => m.id === initialGroqLlm));
    setOpenaiKey(settings.openaiApiKey || '');
    setGeminiKey(settings.geminiApiKey || '');
    setGeminiModel(settings.geminiModel || 'gemini-2.5-flash');
    setSurplusKey(settings.surplusApiKey || '');
    setSurplusLlmModel(settings.surplusLlmModel || 'deepseek-v4-flash');
    setSurplusSttModel(settings.surplusSttModel || 'venice-whisper-large-v3');
    setCustomSttKey(settings.customSttApiKey || '');
    setCustomSttBaseUrl(settings.customSttBaseUrl || '');
    setCustomSttModel(settings.customSttModel || 'whisper-1');
    setCustomLlmKey(settings.customLlmApiKey || '');
    setCustomLlmBaseUrl(settings.customLlmBaseUrl || '');
    setCustomLlmModel(settings.customLlmModel || 'deepseek-chat');
    setAutoCopy(settings.autoCopy);
    setAutoSpeak(settings.autoSpeak);
    setTtsRate(settings.ttsRate);
    setSttTestResult(null);
    setLlmTestResult(null);
  }, [settings, visible]);

  const handlePasteKey = async (setter: (val: string) => void) => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setter(text.trim());
      }
    } catch (e) {
      console.warn('Paste failed:', e);
    }
  };

  const handleTestSttKey = async () => {
    setTestingStt(true);
    setSttTestResult(null);
    const key =
      sttProvider === 'deepgram'
        ? deepgramKey
        : sttProvider === 'groq'
        ? groqKey
        : sttProvider === 'openai'
        ? openaiKey
        : sttProvider === 'surplus'
        ? surplusKey
        : customSttKey;

    const res = await testConnection(
      key,
      sttProvider,
      sttProvider === 'custom' ? { baseUrl: customSttBaseUrl } : undefined
    );
    setTestingStt(false);
    setSttTestResult(res);
    if (res.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleTestLlmKey = async () => {
    setTestingLlm(true);
    setLlmTestResult(null);
    const key =
      llmProvider === 'groq'
        ? groqKey
        : llmProvider === 'openai'
        ? openaiKey
        : llmProvider === 'gemini'
        ? geminiKey
        : llmProvider === 'surplus'
        ? surplusKey
        : customLlmKey;

    const res = await testConnection(
      key,
      llmProvider,
      llmProvider === 'custom' ? { baseUrl: customLlmBaseUrl } : undefined
    );
    setTestingLlm(false);
    setLlmTestResult(res);
    if (res.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onSave({
      sttProvider,
      llmProvider,
      deepgramApiKey: deepgramKey.trim(),
      groqApiKey: groqKey.trim(),
      groqWhisperModel: groqWhisperModel.trim(),
      groqLlmModel: groqLlmModel.trim(),
      openaiApiKey: openaiKey.trim(),
      geminiApiKey: geminiKey.trim(),
      geminiModel: geminiModel.trim(),
      surplusApiKey: surplusKey.trim(),
      surplusLlmModel: surplusLlmModel.trim(),
      surplusSttModel: surplusSttModel.trim(),
      customSttApiKey: customSttKey.trim(),
      customSttBaseUrl: customSttBaseUrl.trim(),
      customSttModel: customSttModel.trim(),
      customLlmApiKey: customLlmKey.trim(),
      customLlmBaseUrl: customLlmBaseUrl.trim(),
      customLlmModel: customLlmModel.trim(),
      autoCopy,
      autoSpeak,
      ttsRate,
    });
    onClose();
  };

  const activeSttKey =
    sttProvider === 'deepgram'
      ? deepgramKey
      : sttProvider === 'groq'
      ? groqKey
      : sttProvider === 'openai'
      ? openaiKey
      : sttProvider === 'surplus'
      ? surplusKey
      : customSttKey;

  const activeLlmKey =
    llmProvider === 'groq'
      ? groqKey
      : llmProvider === 'openai'
      ? openaiKey
      : llmProvider === 'gemini'
      ? geminiKey
      : llmProvider === 'surplus'
      ? surplusKey
      : customLlmKey;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.sheetContainer}>
          {/* Top Sheet Glow & Ambient Gradient */}
          <LinearGradient
            colors={['rgba(63, 174, 110, 0.12)', 'rgba(0, 153, 87, 0.02)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.sheetTopGlow}
          />

          {/* Drag Pill */}
          <View style={styles.dragPillWrap}>
            <View style={styles.dragPill} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.keyIconCircle}>
                <Ionicons name="key" size={16} color={Theme.colors.cyan} />
              </View>
              <View>
                <Text style={styles.title}>API keys <Text style={styles.title}>API Keys & Engines</Text> engines</Text>
                <Text style={styles.subtitle}>Set up providers, models, and custom endpoints</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                onClose();
              }}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* STAGE 1: SPEECH TO TEXT */}
            <View style={styles.stageHeader}>
              <View style={styles.stageNumberPill}>
                <Text style={styles.stageNumberText}>01</Text>
              </View>
              <Text style={styles.stageTitle}>Speech-to-text engine</Text>
            </View>

            {/* STT Provider Selection Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  sttProvider === 'surplus' && styles.tabActiveSurplus,
                ]}
                onPress={() => {
                  setSttProvider('surplus');
                  setSttTestResult(null);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.tabDot,
                    { backgroundColor: sttProvider === 'surplus' ? '#DFAF82' : '#4A4438' },
                  ]}
                />
                <Text
                  style={[
                    styles.tabText,
                    sttProvider === 'surplus' && styles.tabTextActiveSurplus,
                  ]}
                >
                  Surplus ⚡
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  sttProvider === 'deepgram' && styles.tabActiveDeepgram,
                ]}
                onPress={() => {
                  setSttProvider('deepgram');
                  setSttTestResult(null);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.tabDot,
                    { backgroundColor: sttProvider === 'deepgram' ? '#93B884' : '#4A4438' },
                  ]}
                />
                <Text
                  style={[
                    styles.tabText,
                    sttProvider === 'deepgram' && styles.tabTextActiveDeepgram,
                  ]}
                >
                  Deepgram
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  sttProvider === 'groq' && styles.tabActiveGroq,
                ]}
                onPress={() => {
                  setSttProvider('groq');
                  setSttTestResult(null);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.tabDot,
                    { backgroundColor: sttProvider === 'groq' ? Theme.colors.cyan : '#4A4438' },
                  ]}
                />
                <Text
                  style={[
                    styles.tabText,
                    sttProvider === 'groq' && styles.tabTextActiveGroq,
                  ]}
                >
                  Groq
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  sttProvider === 'openai' && styles.tabActiveOpenAI,
                ]}
                onPress={() => {
                  setSttProvider('openai');
                  setSttTestResult(null);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.tabDot,
                    { backgroundColor: sttProvider === 'openai' ? '#DFAF82' : '#4A4438' },
                  ]}
                />
                <Text
                  style={[
                    styles.tabText,
                    sttProvider === 'openai' && styles.tabTextActiveOpenAI,
                  ]}
                >
                  OpenAI
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  sttProvider === 'custom' && styles.tabActiveCustom,
                ]}
                onPress={() => {
                  setSttProvider('custom');
                  setSttTestResult(null);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.tabDot,
                    { backgroundColor: sttProvider === 'custom' ? '#D9A441' : '#4A4438' },
                  ]}
                />
                <Text
                  style={[
                    styles.tabText,
                    sttProvider === 'custom' && styles.tabTextActiveCustom,
                  ]}
                >
                  Extra / URL
                </Text>
              </TouchableOpacity>
            </View>

            {/* STT Input Card */}
            <View style={styles.inputCard}>
              {sttProvider === 'surplus' ? (
                <>
                  {/* Surplus Special Banner */}
                  <View style={styles.surplusBanner}>
                    <LinearGradient
                      colors={['rgba(214, 169, 124, 0.25)', 'rgba(181, 135, 96, 0.12)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.surplusBannerGrad}
                    >
                      <View style={styles.surplusBannerIconWrap}>
                        <Ionicons name="flash" size={15} color="#DFAF82" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.surplusBannerTitle}>Surplus Intelligence</Text>
                          <View style={styles.surplusSpecialBadge}>
                            <Text style={styles.surplusSpecialText}>Recommended</Text>
                          </View>
                        </View>
                        <Text style={styles.surplusBannerSub}>
                          Base URL is locked to api.surplusintelligence.ai/v1
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>

                  {/* API Key */}
                  <View style={styles.inputFieldBlock}>
                    <View style={styles.inputHeader}>
                      <Text style={styles.inputLabel}>Surplus API Key (inf_...)</Text>
                      <TouchableOpacity
                        onPress={() => handlePasteKey(setSurplusKey)}
                        style={styles.pasteBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="clipboard-outline" size={12} color={Theme.colors.cyan} />
                        <Text style={styles.pasteText}>Paste</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        secureTextEntry={!showSttKey}
                        placeholder="inf_... from surplusintelligence.ai"
                        placeholderTextColor="#6B6254"
                        value={surplusKey}
                        onChangeText={(text) => {
                          setSurplusKey(text);
                          setSttTestResult(null);
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.inputActionIcon}
                        onPress={() => setShowSttKey(!showSttKey)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={showSttKey ? 'eye-off-outline' : 'eye-outline'}
                          size={16}
                          color="#857B6C"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Model Selector */}
                  <View style={styles.modelSectionHeader}>
                    <Text style={styles.inputLabel}>Select Speech Recognition Model</Text>
                    <Text style={styles.modelCountBadge}>{SURPLUS_STT_MODELS.length} Available</Text>
                  </View>
                  <View style={styles.modelGrid}>
                    {SURPLUS_STT_MODELS.map((item) => {
                      const isSelected = surplusSttModel === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.modelCard, isSelected && styles.modelCardActiveSurplus]}
                          onPress={() => {
                            setSurplusSttModel(item.id);
                            Haptics.selectionAsync();
                          }}
                          activeOpacity={0.75}
                        >
                          <View style={styles.modelCardTop}>
                            <Text style={[styles.modelCardName, isSelected && styles.modelCardNameActiveSurplus]}>
                              {item.name}
                            </Text>
                            {item.tag && (
                              <View style={[styles.modelTagPill, isSelected && styles.modelTagPillActiveSurplus]}>
                                <Text style={styles.modelTagText}>{item.tag}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.modelCardDesc} numberOfLines={2}>
                            {item.description}
                          </Text>
                          <View style={styles.modelCardFooter}>
                            <Text style={styles.modelCardProvider}>{item.provider}</Text>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={15} color="#DFAF82" />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : sttProvider === 'custom' ? (
                <>
                  <Text style={styles.sectionSublabel}>Custom Whisper endpoint</Text>

                  {/* Base URL */}
                  <View style={styles.inputFieldBlock}>
                    <Text style={styles.inputLabel}>Endpoint Base URL</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. http://10.0.2.2:8000/v1 or https://api.runpod.ai/v1"
                        placeholderTextColor="#6B6254"
                        value={customSttBaseUrl}
                        onChangeText={(text) => {
                          setCustomSttBaseUrl(text);
                          setSttTestResult(null);
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  {/* Model Name */}
                  <View style={styles.inputFieldBlock}>
                    <Text style={styles.inputLabel}>Model Name</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="whisper-1 or whisper-large-v3"
                        placeholderTextColor="#6B6254"
                        value={customSttModel}
                        onChangeText={(text) => setCustomSttModel(text)}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  {/* API Key (Optional) */}
                  <View style={styles.inputFieldBlock}>
                    <View style={styles.inputHeader}>
                      <Text style={styles.inputLabel}>API Key (Optional for local server)</Text>
                      <TouchableOpacity
                        onPress={() => handlePasteKey(setCustomSttKey)}
                        style={styles.pasteBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="clipboard-outline" size={12} color={Theme.colors.cyan} />
                        <Text style={styles.pasteText}>Paste</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        secureTextEntry={!showSttKey}
                        placeholder="Bearer token if required"
                        placeholderTextColor="#6B6254"
                        value={customSttKey}
                        onChangeText={(text) => {
                          setCustomSttKey(text);
                          setSttTestResult(null);
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.inputActionIcon}
                        onPress={() => setShowSttKey(!showSttKey)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={showSttKey ? 'eye-off-outline' : 'eye-outline'}
                          size={16}
                          color="#857B6C"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.inputHeader}>
                    <Text style={styles.inputLabel}>
                      {sttProvider === 'deepgram'
                        ? 'Deepgram API Key'
                        : sttProvider === 'groq'
                        ? 'Groq API Key (gsk_...)'
                        : 'OpenAI API Key (sk-...)'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (sttProvider === 'deepgram') handlePasteKey(setDeepgramKey);
                        else if (sttProvider === 'groq') handlePasteKey(setGroqKey);
                        else handlePasteKey(setOpenaiKey);
                      }}
                      style={styles.pasteBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="clipboard-outline" size={12} color={Theme.colors.cyan} />
                      <Text style={styles.pasteText}>Paste</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      secureTextEntry={!showSttKey}
                      placeholder={
                        sttProvider === 'deepgram'
                          ? 'Token from console.deepgram.com'
                          : sttProvider === 'groq'
                          ? 'gsk_... from console.groq.com'
                          : 'sk-... from platform.openai.com'
                      }
                      placeholderTextColor="#6B6254"
                      value={activeSttKey}
                      onChangeText={(text) => {
                        if (sttProvider === 'deepgram') setDeepgramKey(text);
                        else if (sttProvider === 'groq') setGroqKey(text);
                        else setOpenaiKey(text);
                        setSttTestResult(null);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.inputActionIcon}
                      onPress={() => setShowSttKey(!showSttKey)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showSttKey ? 'eye-off-outline' : 'eye-outline'}
                        size={16}
                        color="#857B6C"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Groq STT Model Selection */}
                  {sttProvider === 'groq' && (
                    <View style={styles.modelSection}>
                      <View style={styles.modelSectionHeader}>
                        <Text style={styles.sectionSublabel}>Groq Whisper Model</Text>
                        <Text style={styles.modelCountBadge}>{GROQ_STT_MODELS.length + 1} Options</Text>
                      </View>
                      <View style={styles.modelGrid}>
                        {GROQ_STT_MODELS.map((item) => {
                          const isSelected = !isCustomGroqStt && groqWhisperModel === item.id;
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[styles.modelCard, isSelected && styles.modelCardActiveGroq]}
                              onPress={() => {
                                setIsCustomGroqStt(false);
                                setGroqWhisperModel(item.id);
                                Haptics.selectionAsync();
                              }}
                              activeOpacity={0.75}
                            >
                              <View style={styles.modelCardTop}>
                                <Text style={[styles.modelCardName, isSelected && styles.modelCardNameActiveGroq]}>
                                  {item.name}
                                </Text>
                                {item.tag && (
                                  <View style={[styles.modelTagPill, isSelected && styles.modelTagPillActiveGroq]}>
                                    <Text style={styles.modelTagText}>{item.tag}</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.modelCardDesc} numberOfLines={2}>
                                {item.description}
                              </Text>
                              <View style={styles.modelCardFooter}>
                                <Text style={styles.modelCardProvider}>{item.provider}</Text>
                                {isSelected && (
                                  <Ionicons name="checkmark-circle" size={15} color={Theme.colors.cyan} />
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}

                        {/* Any Other / Custom Model Option */}
                        <TouchableOpacity
                          style={[styles.modelCard, isCustomGroqStt && styles.modelCardActiveGroq]}
                          onPress={() => {
                            setIsCustomGroqStt(true);
                            Haptics.selectionAsync();
                          }}
                          activeOpacity={0.75}
                        >
                          <View style={styles.modelCardTop}>
                            <Text style={[styles.modelCardName, isCustomGroqStt && styles.modelCardNameActiveGroq]}>
                              Any other model
                            </Text>
                            <View style={[styles.modelTagPill, isCustomGroqStt && styles.modelTagPillActiveGroq]}>
                              <Text style={styles.modelTagText}>Custom</Text>
                            </View>
                          </View>
                          <Text style={styles.modelCardDesc} numberOfLines={2}>
                            Type any custom or newly released Groq speech model ID from docs.
                          </Text>
                          <View style={styles.modelCardFooter}>
                            <Text style={styles.modelCardProvider}>Custom ID</Text>
                            {isCustomGroqStt && (
                              <Ionicons name="checkmark-circle" size={15} color={Theme.colors.cyan} />
                            )}
                          </View>
                        </TouchableOpacity>
                      </View>

                      {isCustomGroqStt && (
                        <View style={[styles.inputFieldBlock, { marginTop: 8 }]}>
                          <Text style={styles.inputLabel}>Custom Groq Model ID</Text>
                          <View style={styles.inputWrapper}>
                            <TextInput
                              style={styles.input}
                              placeholder="e.g. whisper-large-v3-turbo"
                              placeholderTextColor="#6B6254"
                              value={groqWhisperModel}
                              onChangeText={setGroqWhisperModel}
                              autoCapitalize="none"
                              autoCorrect={false}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}

              {/* Verify STT Key / Endpoint */}
              <TouchableOpacity
                style={styles.testBtn}
                onPress={handleTestSttKey}
                disabled={testingStt}
                activeOpacity={0.7}
              >
                {testingStt ? (
                  <ActivityIndicator size="small" color={Theme.colors.cyan} />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark-outline" size={14} color={Theme.colors.cyan} />
                    <Text style={styles.testBtnText}>Test STT Connection</Text>
                  </>
                )}
              </TouchableOpacity>

              {sttTestResult && (
                <View
                  style={[
                    styles.testResultBanner,
                    sttTestResult.success ? styles.testSuccess : styles.testError,
                  ]}
                >
                  <Ionicons
                    name={sttTestResult.success ? 'checkmark-circle' : 'alert-circle'}
                    size={15}
                    color={sttTestResult.success ? Theme.colors.green : Theme.colors.red}
                  />
                  <Text
                    style={[
                      styles.testResultText,
                      { color: sttTestResult.success ? Theme.colors.green : Theme.colors.red },
                    ]}
                  >
                    {sttTestResult.message}
                  </Text>
                </View>
              )}
            </View>

            {/* STAGE 2: AI REFACTORING */}
            <View style={[styles.stageHeader, { marginTop: 22 }]}>
              <View style={[styles.stageNumberPill, { backgroundColor: '#B58760' }]}>
                <Text style={styles.stageNumberText}>02</Text>
              </View>
              <Text style={styles.stageTitle}>AI cleanup engine</Text>
            </View>

            {/* LLM Provider Selection Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, llmProvider === 'surplus' && styles.tabActiveSurplus]}
                onPress={() => {
                  setLlmProvider('surplus');
                  setLlmTestResult(null);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="flash"
                  size={12}
                  color={llmProvider === 'surplus' ? '#DFAF82' : '#6B6254'}
                />
                <Text style={[styles.tabText, llmProvider === 'surplus' && styles.tabTextActiveSurplus]}>
                  Surplus ⚡
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, llmProvider === 'groq' && styles.tabActiveGroq]}
                onPress={() => {
                  setLlmProvider('groq');
                  setLlmTestResult(null);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="flash"
                  size={12}
                  color={llmProvider === 'groq' ? Theme.colors.cyan : '#6B6254'}
                />
                <Text style={[styles.tabText, llmProvider === 'groq' && styles.tabTextActiveGroq]}>
                  Groq
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, llmProvider === 'openai' && styles.tabActiveOpenAI]}
                onPress={() => {
                  setLlmProvider('openai');
                  setLlmTestResult(null);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="sparkles"
                  size={12}
                  color={llmProvider === 'openai' ? '#DFAF82' : '#6B6254'}
                />
                <Text style={[styles.tabText, llmProvider === 'openai' && styles.tabTextActiveOpenAI]}>
                  OpenAI
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, llmProvider === 'gemini' && styles.tabActiveGemini]}
                onPress={() => {
                  setLlmProvider('gemini');
                  setLlmTestResult(null);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="logo-google"
                  size={12}
                  color={llmProvider === 'gemini' ? '#52c784' : '#6B6254'}
                />
                <Text style={[styles.tabText, llmProvider === 'gemini' && styles.tabTextActiveGemini]}>
                  Gemini
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, llmProvider === 'custom' && styles.tabActiveCustom]}
                onPress={() => {
                  setLlmProvider('custom');
                  setLlmTestResult(null);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="construct-outline"
                  size={12}
                  color={llmProvider === 'custom' ? '#D9A441' : '#6B6254'}
                />
                <Text style={[styles.tabText, llmProvider === 'custom' && styles.tabTextActiveCustom]}>
                  Extra / URL
                </Text>
              </TouchableOpacity>
            </View>

            {/* LLM Key & Config Input Card */}
            <View style={styles.inputCard}>
              {llmProvider === 'surplus' ? (
                <>
                  {/* Surplus Special Banner */}
                  <View style={styles.surplusBanner}>
                    <LinearGradient
                      colors={['rgba(214, 169, 124, 0.25)', 'rgba(181, 135, 96, 0.12)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.surplusBannerGrad}
                    >
                      <View style={styles.surplusBannerIconWrap}>
                        <Ionicons name="sparkles" size={15} color="#DFAF82" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.surplusBannerTitle}>Surplus Intelligence</Text>
                          <View style={styles.surplusSpecialBadge}>
                            <Text style={styles.surplusSpecialText}>Recommended</Text>
                          </View>
                        </View>
                        <Text style={styles.surplusBannerSub}>
                          Base URL is locked to api.surplusintelligence.ai/v1
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>

                  {/* API Key */}
                  <View style={styles.inputFieldBlock}>
                    <View style={styles.inputHeader}>
                      <Text style={styles.inputLabel}>Surplus API Key (inf_...)</Text>
                      <TouchableOpacity
                        onPress={() => handlePasteKey(setSurplusKey)}
                        style={styles.pasteBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="clipboard-outline" size={12} color={Theme.colors.cyan} />
                        <Text style={styles.pasteText}>Paste</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        secureTextEntry={!showLlmKey}
                        placeholder="inf_... from surplusintelligence.ai"
                        placeholderTextColor="#6B6254"
                        value={surplusKey}
                        onChangeText={(text) => {
                          setSurplusKey(text);
                          setLlmTestResult(null);
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.inputActionIcon}
                        onPress={() => setShowLlmKey(!showLlmKey)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={showLlmKey ? 'eye-off-outline' : 'eye-outline'}
                          size={16}
                          color="#857B6C"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Model Selector */}
                  <View style={styles.modelSectionHeader}>
                    <Text style={styles.inputLabel}>Select AI Refactoring Model</Text>
                    <Text style={styles.modelCountBadge}>{SURPLUS_LLM_MODELS.length} Available</Text>
                  </View>
                  <View style={styles.modelGrid}>
                    {SURPLUS_LLM_MODELS.map((item) => {
                      const isSelected = surplusLlmModel === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.modelCard, isSelected && styles.modelCardActiveSurplus]}
                          onPress={() => {
                            setSurplusLlmModel(item.id);
                            Haptics.selectionAsync();
                          }}
                          activeOpacity={0.75}
                        >
                          <View style={styles.modelCardTop}>
                            <Text style={[styles.modelCardName, isSelected && styles.modelCardNameActiveSurplus]}>
                              {item.name}
                            </Text>
                            {item.tag && (
                              <View style={[styles.modelTagPill, isSelected && styles.modelTagPillActiveSurplus]}>
                                <Text style={styles.modelTagText}>{item.tag}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.modelCardDesc} numberOfLines={2}>
                            {item.description}
                          </Text>
                          <View style={styles.modelCardFooter}>
                            <Text style={styles.modelCardProvider}>{item.provider}</Text>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={15} color="#DFAF82" />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Custom Model ID input */}
                  <View style={[styles.inputFieldBlock, { marginTop: 10 }]}>
                    <Text style={[styles.inputLabel, { fontSize: 11, color: '#B3A897' }]}>
                      Or enter custom Surplus model identifier:
                    </Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. deepseek-v4-flash, gpt-5-mini"
                        placeholderTextColor="#6B6254"
                        value={surplusLlmModel}
                        onChangeText={(text) => setSurplusLlmModel(text)}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>
                </>
              ) : llmProvider === 'gemini' ? (
                <>
                  <View style={styles.inputHeader}>
                    <Text style={styles.inputLabel}>Google Gemini API Key</Text>
                    <TouchableOpacity
                      onPress={() => handlePasteKey(setGeminiKey)}
                      style={styles.pasteBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="clipboard-outline" size={12} color={Theme.colors.cyan} />
                      <Text style={styles.pasteText}>Paste</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      secureTextEntry={!showLlmKey}
                      placeholder="AIzaSy... from aistudio.google.com"
                      placeholderTextColor="#6B6254"
                      value={geminiKey}
                      onChangeText={(text) => {
                        setGeminiKey(text);
                        setLlmTestResult(null);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.inputActionIcon}
                      onPress={() => setShowLlmKey(!showLlmKey)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showLlmKey ? 'eye-off-outline' : 'eye-outline'}
                        size={16}
                        color="#857B6C"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Gemini Model Selector */}
                  <Text style={[styles.inputLabel, { marginTop: 4, marginBottom: 6 }]}>Gemini Model</Text>
                  <View style={styles.presetChipsContainer}>
                    {['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'].map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.presetChip, geminiModel === m && styles.presetChipActive]}
                        onPress={() => {
                          setGeminiModel(m);
                          Haptics.selectionAsync();
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.presetChipText, geminiModel === m && styles.presetChipTextActive]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : llmProvider === 'custom' ? (
                <>
                  <Text style={styles.sectionSublabel}>OPENAI-COMPATIBLE CUSTOM LLM</Text>

                  {/* Quick Presets */}
                  <Text style={[styles.inputLabel, { marginBottom: 6 }]}>Quick Provider Presets</Text>
                  <View style={styles.presetChipsContainer}>
                    <TouchableOpacity
                      style={styles.presetChip}
                      onPress={() => {
                        setCustomLlmBaseUrl('https://api.deepseek.com/v1');
                        setCustomLlmModel('deepseek-chat');
                        Haptics.selectionAsync();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.presetChipText}>DeepSeek V3</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.presetChip}
                      onPress={() => {
                        setCustomLlmBaseUrl('https://openrouter.ai/api/v1');
                        setCustomLlmModel('meta-llama/llama-3.3-70b-instruct');
                        Haptics.selectionAsync();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.presetChipText}>OpenRouter</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.presetChip}
                      onPress={() => {
                        setCustomLlmBaseUrl('http://10.0.2.2:11434/v1');
                        setCustomLlmModel('llama3.2');
                        Haptics.selectionAsync();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.presetChipText}>Ollama (Local)</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Base URL */}
                  <View style={styles.inputFieldBlock}>
                    <Text style={styles.inputLabel}>Endpoint Base URL</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="https://openrouter.ai/api/v1 or http://10.0.2.2:11434/v1"
                        placeholderTextColor="#6B6254"
                        value={customLlmBaseUrl}
                        onChangeText={(text) => {
                          setCustomLlmBaseUrl(text);
                          setLlmTestResult(null);
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  {/* Model Name */}
                  <View style={styles.inputFieldBlock}>
                    <Text style={styles.inputLabel}>Model Identifier</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="deepseek-chat, mistral, llama3.2"
                        placeholderTextColor="#6B6254"
                        value={customLlmModel}
                        onChangeText={(text) => setCustomLlmModel(text)}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  {/* API Key */}
                  <View style={styles.inputFieldBlock}>
                    <View style={styles.inputHeader}>
                      <Text style={styles.inputLabel}>API Key (Leave blank if not needed)</Text>
                      <TouchableOpacity
                        onPress={() => handlePasteKey(setCustomLlmKey)}
                        style={styles.pasteBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="clipboard-outline" size={12} color={Theme.colors.cyan} />
                        <Text style={styles.pasteText}>Paste</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        secureTextEntry={!showLlmKey}
                        placeholder="Bearer token or API Key"
                        placeholderTextColor="#6B6254"
                        value={customLlmKey}
                        onChangeText={(text) => {
                          setCustomLlmKey(text);
                          setLlmTestResult(null);
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.inputActionIcon}
                        onPress={() => setShowLlmKey(!showLlmKey)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={showLlmKey ? 'eye-off-outline' : 'eye-outline'}
                          size={16}
                          color="#857B6C"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.inputHeader}>
                    <Text style={styles.inputLabel}>
                      {llmProvider === 'groq' ? 'Groq API Key (Llama 3.3)' : 'OpenAI API Key (GPT-4o-mini)'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (llmProvider === 'groq') handlePasteKey(setGroqKey);
                        else handlePasteKey(setOpenaiKey);
                      }}
                      style={styles.pasteBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="clipboard-outline" size={12} color={Theme.colors.cyan} />
                      <Text style={styles.pasteText}>Paste</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      secureTextEntry={!showLlmKey}
                      placeholder={
                        llmProvider === 'groq'
                          ? 'gsk_... from console.groq.com'
                          : 'sk-... from platform.openai.com'
                      }
                      placeholderTextColor="#6B6254"
                      value={activeLlmKey}
                      onChangeText={(text) => {
                        if (llmProvider === 'groq') setGroqKey(text);
                        else setOpenaiKey(text);
                        setLlmTestResult(null);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.inputActionIcon}
                      onPress={() => setShowLlmKey(!showLlmKey)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showLlmKey ? 'eye-off-outline' : 'eye-outline'}
                        size={16}
                        color="#857B6C"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Groq LLM Model Selection */}
                  {llmProvider === 'groq' && (
                    <View style={styles.modelSection}>
                      <View style={styles.modelSectionHeader}>
                        <Text style={styles.sectionSublabel}>Groq LPU Model</Text>
                        <Text style={styles.modelCountBadge}>{GROQ_LLM_MODELS.length + 1} Options</Text>
                      </View>
                      <View style={styles.modelGrid}>
                        {GROQ_LLM_MODELS.map((item) => {
                          const isSelected = !isCustomGroqLlm && groqLlmModel === item.id;
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[styles.modelCard, isSelected && styles.modelCardActiveGroq]}
                              onPress={() => {
                                setIsCustomGroqLlm(false);
                                setGroqLlmModel(item.id);
                                Haptics.selectionAsync();
                              }}
                              activeOpacity={0.75}
                            >
                              <View style={styles.modelCardTop}>
                                <Text style={[styles.modelCardName, isSelected && styles.modelCardNameActiveGroq]}>
                                  {item.name}
                                </Text>
                                {item.tag && (
                                  <View style={[styles.modelTagPill, isSelected && styles.modelTagPillActiveGroq]}>
                                    <Text style={styles.modelTagText}>{item.tag}</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.modelCardDesc} numberOfLines={2}>
                                {item.description}
                              </Text>
                              <View style={styles.modelCardFooter}>
                                <Text style={styles.modelCardProvider}>{item.provider}</Text>
                                {isSelected && (
                                  <Ionicons name="checkmark-circle" size={15} color={Theme.colors.cyan} />
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}

                        {/* Any Other / Custom Model Option */}
                        <TouchableOpacity
                          style={[styles.modelCard, isCustomGroqLlm && styles.modelCardActiveGroq]}
                          onPress={() => {
                            setIsCustomGroqLlm(true);
                            Haptics.selectionAsync();
                          }}
                          activeOpacity={0.75}
                        >
                          <View style={styles.modelCardTop}>
                            <Text style={[styles.modelCardName, isCustomGroqLlm && styles.modelCardNameActiveGroq]}>
                              Any other model
                            </Text>
                            <View style={[styles.modelTagPill, isCustomGroqLlm && styles.modelTagPillActiveGroq]}>
                              <Text style={styles.modelTagText}>Custom</Text>
                            </View>
                          </View>
                          <Text style={styles.modelCardDesc} numberOfLines={2}>
                            Type any custom Groq model ID (e.g. deepseek-r1-distill-llama-70b).
                          </Text>
                          <View style={styles.modelCardFooter}>
                            <Text style={styles.modelCardProvider}>Custom ID</Text>
                            {isCustomGroqLlm && (
                              <Ionicons name="checkmark-circle" size={15} color={Theme.colors.cyan} />
                            )}
                          </View>
                        </TouchableOpacity>
                      </View>

                      {isCustomGroqLlm && (
                        <View style={[styles.inputFieldBlock, { marginTop: 8 }]}>
                          <Text style={styles.inputLabel}>Custom Groq Model ID</Text>
                          <View style={styles.inputWrapper}>
                            <TextInput
                              style={styles.input}
                              placeholder="e.g. llama-3.3-70b-versatile"
                              placeholderTextColor="#6B6254"
                              value={groqLlmModel}
                              onChangeText={setGroqLlmModel}
                              autoCapitalize="none"
                              autoCorrect={false}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}

              <TouchableOpacity
                style={styles.testBtn}
                onPress={handleTestLlmKey}
                disabled={testingLlm}
                activeOpacity={0.7}
              >
                {testingLlm ? (
                  <ActivityIndicator size="small" color={Theme.colors.cyan} />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark-outline" size={14} color={Theme.colors.cyan} />
                    <Text style={styles.testBtnText}>Test LLM Connection</Text>
                  </>
                )}
              </TouchableOpacity>

              {llmTestResult && (
                <View
                  style={[
                    styles.testResultBanner,
                    llmTestResult.success ? styles.testSuccess : styles.testError,
                  ]}
                >
                  <Ionicons
                    name={llmTestResult.success ? 'checkmark-circle' : 'alert-circle'}
                    size={15}
                    color={llmTestResult.success ? Theme.colors.green : Theme.colors.red}
                  />
                  <Text
                    style={[
                      styles.testResultText,
                      { color: llmTestResult.success ? Theme.colors.green : Theme.colors.red },
                    ]}
                  >
                    {llmTestResult.message}
                  </Text>
                </View>
              )}
            </View>

            {/* Quick Preferences */}
            <View style={[styles.stageHeader, { marginTop: 22 }]}>
              <View style={[styles.stageNumberPill, { backgroundColor: '#009957' }]}>
                <Text style={styles.stageNumberText}>03</Text>
              </View>
              <Text style={styles.stageTitle}>Automation <Text style={styles.stageTitle}>AUTOMATION & VOICE PREFERENCES</Text> voice</Text>
            </View>

            <View style={styles.preferencesCard}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Auto-Copy to Clipboard</Text>
                  <Text style={styles.toggleSubtitle}>
                    Instantly copy the cleaned transcript to your system clipboard
                  </Text>
                </View>
                <Switch
                  value={autoCopy}
                  onValueChange={(val) => {
                    setAutoCopy(val);
                    Haptics.selectionAsync();
                  }}
                  trackColor={{ false: '#1A1A22', true: '#3fae6e' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Auto-Speak Transcript (TTS)</Text>
                  <Text style={styles.toggleSubtitle}>
                    Speak the finalized transcript aloud via system voice engine
                  </Text>
                </View>
                <Switch
                  value={autoSpeak}
                  onValueChange={(val) => {
                    setAutoSpeak(val);
                    Haptics.selectionAsync();
                  }}
                  trackColor={{ false: '#1A1A22', true: '#3fae6e' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.divider} />

              {/* TTS Speed */}
              <View style={styles.ttsRateRow}>
                <Text style={styles.toggleTitle}>Speech Synthesis Rate ({ttsRate}x)</Text>
                <View style={styles.rateButtons}>
                  {[0.8, 1.0, 1.2, 1.5].map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      style={[styles.rateBtn, ttsRate === rate && styles.rateBtnActive]}
                      onPress={() => {
                        setTtsRate(rate);
                        Haptics.selectionAsync();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.rateBtnText,
                          ttsRate === rate && styles.rateBtnTextActive,
                        ]}
                      >
                        {rate}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#3fae6e', '#009957']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtnGradient}
              >
                <Ionicons name="checkmark-done" size={17} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save & Apply Settings</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(21, 18, 16, 0.85)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#1B1714',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '94%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(63, 174, 110, 0.2)',
    overflow: 'hidden',
  },
  sheetTopGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  dragPillWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  dragPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 246, 230, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 246, 230, 0.06)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  keyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(63, 174, 110, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(63, 174, 110, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: Theme.fonts.heading,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 246, 230, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  stageNumberPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#009957',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageNumberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Theme.fonts.monoBold,
  },
  stageTitle: {
    color: '#B3A897',
    fontSize: 11,
    fontFamily: Theme.fonts.heading,
    letterSpacing: 0.8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#08080A',
    borderRadius: 14,
    padding: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 246, 230, 0.06)',
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    gap: 4,
    borderRadius: 11,
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabActiveSurplus: {
    backgroundColor: 'rgba(214, 169, 124, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(214, 169, 124, 0.45)',
  },
  tabActiveDeepgram: {
    backgroundColor: 'rgba(147, 184, 132, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(147, 184, 132, 0.35)',
  },
  tabActiveGroq: {
    backgroundColor: 'rgba(63, 174, 110, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(63, 174, 110, 0.35)',
  },
  tabActiveOpenAI: {
    backgroundColor: 'rgba(201, 151, 112, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201, 151, 112, 0.35)',
  },
  tabActiveGemini: {
    backgroundColor: 'rgba(242, 192, 138, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(242, 192, 138, 0.4)',
  },
  tabActiveCustom: {
    backgroundColor: 'rgba(217, 164, 65, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(217, 164, 65, 0.4)',
  },
  tabText: {
    color: '#857B6C',
    fontSize: 10.5,
    fontFamily: Theme.fonts.semiBold,
  },
  tabTextActiveSurplus: {
    color: '#DFAF82',
  },
  tabTextActiveDeepgram: {
    color: '#93B884',
  },
  tabTextActiveGroq: {
    color: Theme.colors.cyan,
  },
  tabTextActiveOpenAI: {
    color: '#DFAF82',
  },
  tabTextActiveGemini: {
    color: '#52c784',
  },
  tabTextActiveCustom: {
    color: '#D9A441',
  },
  surplusBanner: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(214, 169, 124, 0.3)',
  },
  surplusBannerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  surplusBannerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(214, 169, 124, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(214, 169, 124, 0.4)',
  },
  surplusBannerTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Theme.fonts.monoBold,
    letterSpacing: 0.5,
  },
  surplusSpecialBadge: {
    backgroundColor: '#B58760',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  surplusSpecialText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontFamily: Theme.fonts.monoBold,
    letterSpacing: 0.5,
  },
  surplusBannerSub: {
    color: '#D7CDBE',
    fontSize: 10,
    fontFamily: Theme.fonts.regular,
    marginTop: 2,
  },
  modelSection: {
    marginTop: 14,
  },
  modelSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modelCountBadge: {
    color: '#C99770',
    fontSize: 10.5,
    fontFamily: Theme.fonts.monoBold,
  },
  modelGrid: {
    gap: 8,
    marginBottom: 8,
  },
  modelCard: {
    backgroundColor: 'rgba(255, 246, 230, 0.03)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 246, 230, 0.08)',
  },
  modelCardActiveSurplus: {
    backgroundColor: 'rgba(214, 169, 124, 0.12)',
    borderColor: '#DFAF82',
  },
  modelCardActiveGroq: {
    backgroundColor: 'rgba(63, 174, 110, 0.12)',
    borderColor: '#3fae6e',
  },
  modelCardNameActiveGroq: {
    color: '#52c784',
  },
  modelTagPillActiveGroq: {
    backgroundColor: 'rgba(63, 174, 110, 0.28)',
  },
  modelCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  modelCardName: {
    color: '#E9E2D4',
    fontSize: 12.5,
    fontFamily: Theme.fonts.heading,
  },
  modelCardNameActiveSurplus: {
    color: '#F2E7D6',
  },
  modelTagPill: {
    backgroundColor: 'rgba(255, 246, 230, 0.08)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modelTagPillActiveSurplus: {
    backgroundColor: 'rgba(214, 169, 124, 0.3)',
  },
  modelTagText: {
    color: '#EFE3CF',
    fontSize: 9,
    fontFamily: Theme.fonts.monoBold,
  },
  modelCardDesc: {
    color: '#B3A897',
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    lineHeight: 15,
    marginBottom: 6,
  },
  modelCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelCardProvider: {
    color: '#857B6C',
    fontSize: 10,
    fontFamily: Theme.fonts.medium,
  },
  inputCard: {
    backgroundColor: '#121217',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 246, 230, 0.07)',
  },
  sectionSublabel: {
    color: Theme.colors.cyan,
    fontSize: 10,
    fontFamily: Theme.fonts.monoBold,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  inputFieldBlock: {
    marginBottom: 8,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    color: '#D7CDBE',
    fontSize: 11.5,
    fontFamily: Theme.fonts.semiBold,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(63, 174, 110, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(63, 174, 110, 0.2)',
  },
  pasteText: {
    color: Theme.colors.cyan,
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#08080A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 246, 230, 0.09)',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: Theme.fonts.mono,
  },
  inputActionIcon: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  presetChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 246, 230, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 246, 230, 0.1)',
  },
  presetChipActive: {
    backgroundColor: 'rgba(63, 174, 110, 0.15)',
    borderColor: Theme.colors.cyan,
  },
  presetChipText: {
    color: '#B3A897',
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
  },
  presetChipTextActive: {
    color: Theme.colors.cyan,
    fontFamily: Theme.fonts.semiBold,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(63, 174, 110, 0.06)',
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(63, 174, 110, 0.22)',
    marginTop: 4,
  },
  testBtnText: {
    color: Theme.colors.cyan,
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
  },
  testResultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 10,
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
  testResultText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    flex: 1,
  },
  preferencesCard: {
    backgroundColor: '#121217',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 246, 230, 0.07)',
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 246, 230, 0.05)',
    marginVertical: 10,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
  },
  toggleSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    marginTop: 2,
    lineHeight: 15,
  },
  ttsRateRow: {
    paddingVertical: 4,
  },
  rateButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  rateBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#08080A',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 246, 230, 0.08)',
  },
  rateBtnActive: {
    backgroundColor: 'rgba(63, 174, 110, 0.15)',
    borderColor: Theme.colors.cyan,
  },
  rateBtnText: {
    color: '#857B6C',
    fontSize: 12,
    fontFamily: Theme.fonts.monoBold,
  },
  rateBtnTextActive: {
    color: Theme.colors.cyan,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 246, 230, 0.06)',
  },
  saveBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#3fae6e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Theme.fonts.heading,
    letterSpacing: -0.2,
  },
});
