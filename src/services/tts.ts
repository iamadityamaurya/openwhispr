import * as Speech from 'expo-speech';

export interface TtsOptions {
  rate?: number;
  pitch?: number;
  language?: string;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
}

let isCurrentlySpeaking = false;

export async function speakText(text: string, options: TtsOptions = {}): Promise<void> {
  if (!text || text.trim().length === 0) return;

  // Stop any currently playing speech
  await stopSpeaking();

  const speechOptions: Speech.SpeechOptions = {
    rate: options.rate ?? 1.0,
    pitch: options.pitch ?? 1.0,
    language: options.language ?? 'en-US',
    onStart: () => {
      isCurrentlySpeaking = true;
      options.onStart?.();
    },
    onDone: () => {
      isCurrentlySpeaking = false;
      options.onDone?.();
    },
    onStopped: () => {
      isCurrentlySpeaking = false;
      options.onStopped?.();
    },
    onError: (err) => {
      isCurrentlySpeaking = false;
      options.onError?.(err as any);
    },
  };

  Speech.speak(text, speechOptions);
}

export async function stopSpeaking(): Promise<void> {
  try {
    const speaking = await Speech.isSpeakingAsync();
    if (speaking || isCurrentlySpeaking) {
      await Speech.stop();
    }
  } catch (e) {
    console.warn('Error stopping speech:', e);
  } finally {
    isCurrentlySpeaking = false;
  }
}

export async function getIsSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return isCurrentlySpeaking;
  }
}
