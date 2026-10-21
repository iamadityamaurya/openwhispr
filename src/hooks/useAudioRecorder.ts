import { useState, useRef, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  durationMs: number;
  meteringLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ uri: string; durationMs: number } | null>;
  cancelRecording: () => Promise<void>;
  hasPermission: boolean | null;
  requestPermission: () => Promise<boolean>;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [meteringLevel, setMeteringLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const recorderRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const status = await getRecordingPermissionsAsync();
        setHasPermission(status.granted);
      } catch (e) {
        console.warn('Could not check audio permissions:', e);
      }
    })();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const response = await requestRecordingPermissionsAsync();
      setHasPermission(response.granted);
      return response.granted;
    } catch (e) {
      console.error('Failed to request recording permission:', e);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const permitted = hasPermission ?? (await requestPermission());
      if (!permitted) {
        throw new Error('Microphone permission is required to record audio.');
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await recorder.prepareToRecordAsync();
      recorder.record();

      recorderRef.current = recorder;
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setDurationMs(0);

      // Duration counter
      intervalRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTimeRef.current);
      }, 100);

      // Dynamic metering simulation for live visualizer feedback
      meterIntervalRef.current = setInterval(() => {
        const randomLevel = 0.25 + Math.random() * 0.75;
        setMeteringLevel(randomLevel);
      }, 120);

    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      throw error;
    }
  }, [hasPermission, requestPermission]);

  const stopRecording = useCallback(async (): Promise<{ uri: string; durationMs: number } | null> => {
    if (!recorderRef.current) return null;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (meterIntervalRef.current) {
        clearInterval(meterIntervalRef.current);
        meterIntervalRef.current = null;
      }

      const totalDuration = Date.now() - startTimeRef.current;
      const recorder = recorderRef.current;

      await recorder.stop();
      const uri = recorder.uri;

      recorderRef.current = null;
      setIsRecording(false);
      setMeteringLevel(0);
      setDurationMs(totalDuration);

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      if (!uri) {
        throw new Error('Recording ended but no audio URI was produced.');
      }

      return { uri, durationMs: totalDuration };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
      setMeteringLevel(0);
      throw error;
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    if (!recorderRef.current) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (meterIntervalRef.current) {
        clearInterval(meterIntervalRef.current);
        meterIntervalRef.current = null;
      }

      const recorder = recorderRef.current;
      await recorder.stop();
      recorderRef.current = null;
      setIsRecording(false);
      setMeteringLevel(0);
      setDurationMs(0);

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch (e) {
      console.warn('Failed to cancel recording:', e);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
      if (recorderRef.current) {
        recorderRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return {
    isRecording,
    durationMs,
    meteringLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    hasPermission,
    requestPermission,
  };
}
