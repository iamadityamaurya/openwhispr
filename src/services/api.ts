import * as FileSystem from 'expo-file-system/legacy';
import { getCleanupSystemPrompt, wrapCleanupTranscript, CleanupMode } from '../config/prompts';
import { SttProvider, LlmProvider } from './storage';
import { SURPLUS_BASE_URL } from '../constants/surplusModels';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEEPGRAM_BASE_URL = 'https://api.deepgram.com/v1';
const GEMINI_OPENAI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';

function sanitizeOutput(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();
  }
  return cleaned;
}

/**
 * Transcribes audio using Deepgram Nova-3, Groq Whisper, OpenAI Whisper, or a Custom OpenAI-compatible endpoint.
 * Uses native FileSystem.uploadAsync to reliably upload without FormDataPart issues on React Native.
 */
export async function transcribeAudio(
  fileUri: string,
  apiKey: string,
  provider: SttProvider,
  modelOverride?: string,
  customOptions?: { baseUrl?: string; model?: string },
  language: string = 'en'
): Promise<string> {
  if (provider !== 'custom' && (!apiKey || apiKey.trim().length === 0)) {
    throw new Error(`Please enter your ${provider.toUpperCase()} API key in Settings.`);
  }

  const filename = fileUri.split('/').pop() || 'recording.m4a';
  const mimeType = filename.endsWith('.wav') ? 'audio/wav' : 'audio/m4a';
  const lang = (language && language.trim().length > 0) ? language.trim() : 'en';

  if (provider === 'deepgram') {
    const model = modelOverride || 'nova-3';
    const endpoint = `${DEEPGRAM_BASE_URL}/listen?model=${encodeURIComponent(model)}&language=${encodeURIComponent(lang)}&smart_format=true&punctuate=true`;

    const response = await FileSystem.uploadAsync(endpoint, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Token ${apiKey.trim()}`,
        'Content-Type': mimeType,
      },
    });

    if (response.status < 200 || response.status >= 300) {
      let message = `Deepgram transcription failed (${response.status})`;
      try {
        const parsed = JSON.parse(response.body);
        if (parsed.err_msg || parsed.error) message = parsed.err_msg || parsed.error;
      } catch {}
      throw new Error(message);
    }

    const data = JSON.parse(response.body);
    const transcript =
      data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();

    if (!transcript) {
      throw new Error('No speech detected in the recording.');
    }

    return transcript;
  }

  // Custom OpenAI-compatible STT endpoint
  if (provider === 'custom') {
    if (!customOptions?.baseUrl || customOptions.baseUrl.trim().length === 0) {
      throw new Error('Please configure your Custom STT Base URL in Engines & Keys.');
    }

    let base = customOptions.baseUrl.trim().replace(/\/+$/, '');
    const endpoint = base.endsWith('/audio/transcriptions') ? base : `${base}/audio/transcriptions`;
    const model = modelOverride || customOptions.model || 'whisper-1';

    const headers: Record<string, string> = {};
    if (apiKey && apiKey.trim().length > 0) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const response = await FileSystem.uploadAsync(endpoint, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType,
      parameters: {
        model,
        language: lang,
        response_format: 'json',
      },
      headers,
    });

    if (response.status < 200 || response.status >= 300) {
      let message = `Custom STT transcription failed (${response.status})`;
      try {
        const parsed = JSON.parse(response.body);
        if (parsed.error?.message) message = parsed.error.message;
      } catch {}
      throw new Error(message);
    }

    const data = JSON.parse(response.body);
    if (!data.text) {
      throw new Error('No transcription returned from custom audio engine.');
    }

    return data.text.trim();
  }

  // Surplus Intelligence Decentralized STT
  if (provider === 'surplus') {
    const model = modelOverride || 'venice-whisper-large-v3';
    const endpoint = `${SURPLUS_BASE_URL}/audio/transcriptions`;

    const response = await FileSystem.uploadAsync(endpoint, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType,
      parameters: {
        model,
        language: lang,
        response_format: 'json',
      },
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
    });

    if (response.status < 200 || response.status >= 300) {
      let message = `Surplus Intelligence STT failed (${response.status})`;
      try {
        const parsed = JSON.parse(response.body);
        if (parsed.error?.message) message = parsed.error.message;
      } catch {}
      throw new Error(message);
    }

    const data = JSON.parse(response.body);
    if (!data.text) {
      throw new Error('No transcription returned from Surplus Intelligence audio engine.');
    }

    return data.text.trim();
  }

  // Groq or OpenAI Whisper
  const baseUrl = provider === 'groq' ? GROQ_BASE_URL : OPENAI_BASE_URL;
  const endpoint = `${baseUrl}/audio/transcriptions`;
  const defaultModel = provider === 'groq' ? 'whisper-large-v3-turbo' : 'whisper-1';
  const model = modelOverride || defaultModel;

  const response = await FileSystem.uploadAsync(endpoint, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType,
    parameters: {
      model,
      language: lang,
      response_format: 'json',
    },
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
    },
  });

  if (response.status < 200 || response.status >= 300) {
    let message = `${provider.toUpperCase()} transcription failed (${response.status})`;
    try {
      const parsed = JSON.parse(response.body);
      if (parsed.error?.message) message = parsed.error.message;
    } catch {}
    throw new Error(message);
  }

  const data = JSON.parse(response.body);
  if (!data.text) {
    throw new Error('No transcription returned from audio engine.');
  }

  return data.text.trim();
}

/**
 * Refactors and cleans raw transcript using OpenWhispr's cleanup system prompt.
 * Supports Groq, OpenAI, Google Gemini, and Custom OpenAI-compatible endpoints.
 */
export async function cleanupTranscript(
  rawTranscript: string,
  apiKey: string,
  provider: LlmProvider,
  modelOverride?: string,
  customOptions?: { baseUrl?: string; model?: string },
  mode: CleanupMode = 'natural'
): Promise<string> {
  if (!rawTranscript || rawTranscript.trim().length === 0) {
    return '';
  }

  // If no LLM key provided (and not custom with local server), return raw transcript gracefully
  if (provider !== 'custom' && (!apiKey || apiKey.trim().length === 0)) {
    return rawTranscript;
  }

  const systemPrompt = getCleanupSystemPrompt(mode);
  const wrappedInput = wrapCleanupTranscript(rawTranscript, mode);

  // Google Gemini implementation
  if (provider === 'gemini') {
    const model = modelOverride || 'gemini-2.5-flash';

    // 1. Try OpenAI-compatible endpoint
    try {
      const endpoint = `${GEMINI_OPENAI_BASE_URL}/chat/completions`;
      const payload = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: wrappedInput },
        ],
        temperature: 0.1,
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const cleaned = data.choices?.[0]?.message?.content?.trim();
        if (cleaned) return sanitizeOutput(cleaned);
      }
    } catch (e) {
      console.warn('Gemini OpenAI-compatible endpoint error, falling back to native API:', e);
    }

    // 2. Fallback to Gemini native REST API
    try {
      const nativeEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
      const nativePayload = {
        contents: [{ role: 'user', parts: [{ text: wrappedInput }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.1 },
      };

      const nativeRes = await fetch(nativeEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nativePayload),
      });

      if (nativeRes.ok) {
        const nativeData = await nativeRes.json();
        const text = nativeData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return sanitizeOutput(text);
      }
    } catch (e) {
      console.warn('Gemini native API failed:', e);
    }

    return rawTranscript;
  }

  // Custom / Extra OpenAI-compatible endpoint
  if (provider === 'custom') {
    if (!customOptions?.baseUrl || customOptions.baseUrl.trim().length === 0) {
      console.warn('No custom LLM base URL set, returning raw transcript.');
      return rawTranscript;
    }

    let base = customOptions.baseUrl.trim().replace(/\/+$/, '');
    const endpoint = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
    const model = modelOverride || customOptions.model || 'deepseek-chat';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey && apiKey.trim().length > 0) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: wrappedInput },
      ],
      temperature: 0.1,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Custom LLM cleanup error, returning raw transcript:', errorText);
        return rawTranscript;
      }

      const data = await response.json();
      const cleaned = data.choices?.[0]?.message?.content?.trim();
      return sanitizeOutput(cleaned || rawTranscript);
    } catch (err) {
      console.warn('Custom LLM fetch failed:', err);
      return rawTranscript;
    }
  }

  // Surplus Intelligence (Decentralized inference router)
  if (provider === 'surplus') {
    const model = modelOverride || 'deepseek-v4-flash';
    const endpoint = `${SURPLUS_BASE_URL}/chat/completions`;

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: wrappedInput },
      ],
      temperature: 0.1,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Surplus Intelligence cleanup error, returning raw transcript:', errorText);
        return rawTranscript;
      }

      const data = await response.json();
      const cleaned = data.choices?.[0]?.message?.content?.trim();
      return sanitizeOutput(cleaned || rawTranscript);
    } catch (err) {
      console.warn('Surplus Intelligence fetch failed:', err);
      return rawTranscript;
    }
  }

  // Groq or OpenAI
  const baseUrl = provider === 'groq' ? GROQ_BASE_URL : OPENAI_BASE_URL;
  const endpoint = `${baseUrl}/chat/completions`;
  const defaultModel = provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
  const model = modelOverride || defaultModel;

  const payload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: wrappedInput },
    ],
    temperature: 0.1,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = `AI Cleanup failed (${response.status})`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) message = parsed.error.message;
    } catch {}
    console.warn('AI Cleanup error, returning raw transcript:', message);
    return rawTranscript;
  }

  const data = await response.json();
  const cleaned = data.choices?.[0]?.message?.content?.trim();

  return sanitizeOutput(cleaned || rawTranscript);
}

/**
 * Validates connection for Deepgram, Groq, OpenAI, Google Gemini, Surplus Intelligence, or Custom endpoints.
 */
export async function testConnection(
  apiKey: string,
  provider: SttProvider | LlmProvider,
  customOptions?: { baseUrl?: string }
): Promise<{ success: boolean; message: string }> {
  try {
    if (provider !== 'custom' && (!apiKey || apiKey.trim().length === 0)) {
      return { success: false, message: 'API key cannot be empty' };
    }

    if (provider === 'deepgram') {
      const response = await fetch(`${DEEPGRAM_BASE_URL}/projects`, {
        method: 'GET',
        headers: {
          Authorization: `Token ${apiKey.trim()}`,
        },
      });

      if (response.ok) {
        return { success: true, message: 'Connected to Deepgram successfully!' };
      } else {
        const errorText = await response.text();
        let msg = `Deepgram verification failed (${response.status})`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.err_msg || parsed.error) msg = parsed.err_msg || parsed.error;
        } catch {}
        return { success: false, message: msg };
      }
    }

    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`,
        { method: 'GET' }
      );

      if (response.ok) {
        return { success: true, message: 'Connected to Google Gemini successfully!' };
      } else {
        const errorText = await response.text();
        let msg = `Gemini authentication failed (${response.status})`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.error?.message) msg = parsed.error.message;
        } catch {}
        return { success: false, message: msg };
      }
    }

    if (provider === 'surplus') {
      const response = await fetch(`${SURPLUS_BASE_URL}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
        },
      });

      if (response.ok) {
        return { success: true, message: 'Connected to Surplus Intelligence successfully!' };
      } else {
        const errorText = await response.text();
        let msg = `Surplus Intelligence verification failed (${response.status})`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.error?.message) msg = parsed.error.message;
        } catch {}
        return { success: false, message: msg };
      }
    }

    if (provider === 'custom') {
      if (!customOptions?.baseUrl || customOptions.baseUrl.trim().length === 0) {
        return { success: false, message: 'Custom Base URL is required' };
      }
      let base = customOptions.baseUrl.trim().replace(/\/+$/, '');
      const modelsUrl = base.endsWith('/models') ? base : `${base}/models`;
      const headers: Record<string, string> = {};
      if (apiKey && apiKey.trim().length > 0) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      try {
        const response = await fetch(modelsUrl, { method: 'GET', headers });
        if (response.ok) {
          return { success: true, message: 'Connected to Custom endpoint successfully!' };
        }
      } catch {}

      return { success: true, message: 'Custom endpoint URL verified!' };
    }

    const baseUrl = provider === 'groq' ? GROQ_BASE_URL : OPENAI_BASE_URL;
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
    });

    if (response.ok) {
      return { success: true, message: `Connected to ${provider.toUpperCase()} successfully!` };
    } else {
      const errorText = await response.text();
      let msg = `Authentication failed (${response.status})`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error?.message) msg = parsed.error.message;
      } catch {}
      return { success: false, message: msg };
    }
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network connection failed' };
  }
}
