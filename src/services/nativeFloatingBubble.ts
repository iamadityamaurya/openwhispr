import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { AppSettings } from './storage';

const { FloatingBubbleModule } = NativeModules;

export interface FloatingTranscriptionEvent {
  rawText: string;
  cleanedText: string;
  durationMs: number;
  sttProvider: string;
  llmProvider: string;
  inserted: boolean;
  timestamp: number;
}

const eventEmitter =
  Platform.OS === 'android' && FloatingBubbleModule
    ? new NativeEventEmitter(FloatingBubbleModule)
    : null;

export const NativeFloatingBubble = {
  isSupported: Platform.OS === 'android' && Boolean(FloatingBubbleModule),

  async syncSettings(settings: AppSettings): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      return await FloatingBubbleModule.syncSettings({
        language: settings.language || 'en',
        sttProvider: settings.sttProvider,
        llmProvider: settings.llmProvider,
        deepgramApiKey: settings.deepgramApiKey,
        groqApiKey: settings.groqApiKey,
        openaiApiKey: settings.openaiApiKey,
        geminiApiKey: settings.geminiApiKey,
        surplusApiKey: settings.surplusApiKey,
        surplusLlmModel: settings.surplusLlmModel,
        surplusSttModel: settings.surplusSttModel,
        customSttApiKey: settings.customSttApiKey,
        customSttBaseUrl: settings.customSttBaseUrl,
        customSttModel: settings.customSttModel,
        customLlmApiKey: settings.customLlmApiKey,
        customLlmBaseUrl: settings.customLlmBaseUrl,
        customLlmModel: settings.customLlmModel,
        deepgramModel: settings.deepgramModel,
        groqWhisperModel: settings.groqWhisperModel,
        openaiWhisperModel: settings.openaiWhisperModel,
        groqLlmModel: settings.groqLlmModel,
        openaiLlmModel: settings.openaiLlmModel,
        geminiModel: settings.geminiModel,
        overlayEnabled: settings.overlayEnabled,
        smartKeyboardMode: settings.smartKeyboardMode,
        keyboardOffset: settings.keyboardOffset ?? 48,
        keyboardPosition: settings.keyboardPosition || 'right',
        cleanupMode: settings.cleanupMode || 'natural',
      });
    } catch (e) {
      console.warn('Failed to sync settings to native overlay:', e);
      return false;
    }
  },

  async startService(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      return await FloatingBubbleModule.startOverlayService();
    } catch (e: any) {
      console.warn('Failed to start overlay service:', e);
      throw e;
    }
  },

  async stopService(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      return await FloatingBubbleModule.stopOverlayService();
    } catch (e) {
      console.warn('Failed to stop overlay service:', e);
      return false;
    }
  },

  async isRunning(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      return await FloatingBubbleModule.isOverlayServiceRunning();
    } catch {
      return false;
    }
  },

  async hasOverlayPermission(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      return await FloatingBubbleModule.hasOverlayPermission();
    } catch {
      return false;
    }
  },

  requestOverlayPermission(): void {
    if (!this.isSupported) return;
    FloatingBubbleModule.requestOverlayPermission();
  },

  async hasAccessibilityPermission(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      return await FloatingBubbleModule.hasAccessibilityPermission();
    } catch {
      return false;
    }
  },

  requestAccessibilityPermission(): void {
    if (!this.isSupported) return;
    FloatingBubbleModule.requestAccessibilityPermission();
  },

  async isBatteryOptimizationIgnored(): Promise<boolean> {
    if (!this.isSupported) return true;
    try {
      return await FloatingBubbleModule.isBatteryOptimizationIgnored();
    } catch {
      return true;
    }
  },

  requestIgnoreBatteryOptimization(): void {
    if (!this.isSupported) return;
    FloatingBubbleModule.requestIgnoreBatteryOptimization();
  },

  onTranscription(callback: (event: FloatingTranscriptionEvent) => void) {
    if (!eventEmitter) return { remove: () => {} };
    const subscription = eventEmitter.addListener('onFloatingTranscription', callback);
    return subscription;
  },
};
