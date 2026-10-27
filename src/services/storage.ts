import AsyncStorage from '@react-native-async-storage/async-storage';
import { CleanupMode } from '../config/prompts';

export type SttProvider = 'deepgram' | 'groq' | 'openai' | 'surplus' | 'custom';
export type LlmProvider = 'groq' | 'openai' | 'gemini' | 'surplus' | 'custom';

export interface AppSettings {
  language: string; // Default: 'en'
  sttProvider: SttProvider;
  llmProvider: LlmProvider;
  cleanupMode: CleanupMode; // Tone & Persona mode ('natural' | 'casual' | 'email' | 'notes' | 'translate_en')

  // STT Keys & Models
  deepgramApiKey: string;
  groqApiKey: string;
  openaiApiKey: string;
  deepgramModel: string;
  groqWhisperModel: string;
  openaiWhisperModel: string;

  // Surplus Intelligence (Decentralized Marketplace)
  surplusApiKey: string;
  surplusLlmModel: string;
  surplusSttModel: string;

  // Custom / Extra STT (OpenAI-compatible /audio/transcriptions)
  customSttApiKey: string;
  customSttBaseUrl: string;
  customSttModel: string;

  // LLM Keys & Models
  geminiApiKey: string;
  geminiModel: string;
  groqLlmModel: string;
  openaiLlmModel: string;

  // Custom / Extra LLM (OpenAI-compatible /chat/completions)
  customLlmApiKey: string;
  customLlmBaseUrl: string;
  customLlmModel: string;

  // App Automation & Settings
  autoCopy: boolean;
  autoSpeak: boolean;
  ttsRate: number; // 0.5 to 2.0
  ttsPitch: number; // 0.5 to 1.5
  overlayEnabled: boolean;
  smartKeyboardMode: boolean; // Show floating widget only when soft keyboard / input is active
  keyboardOffset: number; // Vertical offset in dp above keyboard top (e.g. 24, 48, 80, 120). Default: 48
  keyboardPosition: 'right' | 'left'; // Horizontal dock side above keyboard. Default: 'right'
  floatingBubbleOpacity: number; // Resting opacity (0.30 to 1.0, default 0.70)
  autoPersonaSwitch: boolean; // Auto-detect foreground app and switch persona mode (default true)
}

export interface DictationItem {
  id: string;
  timestamp: number;
  rawText: string;
  cleanedText: string;
  durationMs: number;
  sttProvider: SttProvider;
  llmProvider: LlmProvider;
  cleanupMode?: CleanupMode;
}

const SETTINGS_KEY = '@openwhispr_settings_v2';
const HISTORY_KEY = '@openwhispr_history_v2';

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  sttProvider: 'deepgram',
  llmProvider: 'groq',
  cleanupMode: 'natural',
  deepgramApiKey: '',
  groqApiKey: '',
  openaiApiKey: '',
  geminiApiKey: '',
  surplusApiKey: '',
  surplusLlmModel: 'deepseek-v4-flash',
  surplusSttModel: 'venice-whisper-large-v3',
  customSttApiKey: '',
  customSttBaseUrl: '',
  customSttModel: 'whisper-1',
  customLlmApiKey: '',
  customLlmBaseUrl: '',
  customLlmModel: 'deepseek-chat',
  deepgramModel: 'nova-3',
  groqWhisperModel: 'whisper-large-v3-turbo',
  openaiWhisperModel: 'whisper-1',
  groqLlmModel: 'llama-3.3-70b-versatile',
  openaiLlmModel: 'gpt-4o-mini',
  geminiModel: 'gemini-2.5-flash',
  autoCopy: true,
  autoSpeak: false,
  ttsRate: 1.0,
  ttsPitch: 1.0,
  overlayEnabled: false,
  smartKeyboardMode: true,
  keyboardOffset: 48,
  keyboardPosition: 'right',
  floatingBubbleOpacity: 0.70,
  autoPersonaSwitch: true,
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!json) {
      // Check for v1 settings migration
      const oldJson = await AsyncStorage.getItem('@openwhispr_settings');
      if (oldJson) {
        const old = JSON.parse(oldJson);
        return {
          ...DEFAULT_SETTINGS,
          ...old,
          sttProvider: old.provider || 'deepgram',
          llmProvider: old.provider === 'openai' ? 'openai' : 'groq',
          cleanupMode: old.cleanupMode || 'natural',
        };
      }
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(json);
    if (parsed.groqLlmModel === 'llama-3.1-8b-instant') {
      parsed.groqLlmModel = 'llama-3.3-70b-versatile';
    }
    if (!parsed.cleanupMode) {
      parsed.cleanupMode = 'natural';
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  try {
    const current = await loadSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

export async function loadHistory(): Promise<DictationItem[]> {
  try {
    const json = await AsyncStorage.getItem(HISTORY_KEY);
    if (!json) return [];
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
}

export async function saveHistoryItem(item: DictationItem): Promise<DictationItem[]> {
  try {
    const history = await loadHistory();
    const updated = [item, ...history].slice(0, 50); // Keep last 50
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to save history item:', error);
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
}

export async function deleteHistoryItem(id: string): Promise<DictationItem[]> {
  try {
    const history = await loadHistory();
    const updated = history.filter((item) => item.id !== id);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to delete history item:', error);
    return [];
  }
}
