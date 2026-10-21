export const SURPLUS_BASE_URL = 'https://api.surplusintelligence.ai/v1';

export interface SurplusModelItem {
  id: string;
  name: string;
  provider: string;
  description: string;
  tag?: string;
  isPopular?: boolean;
}

export const SURPLUS_LLM_MODELS: SurplusModelItem[] = [
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    provider: 'DeepSeek',
    description: 'Blazing fast inference, perfect for realtime dictation cleanup',
    tag: 'RECOMMENDED',
    isPopular: true,
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'OpenAI',
    description: 'Next-gen compact model with sharp reasoning & accuracy',
    tag: 'NEW',
    isPopular: true,
  },
  {
    id: 'llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    description: 'Premier open-weights flagship with exceptional quality',
    tag: 'FLAGSHIP',
    isPopular: true,
  },
  {
    id: 'claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    description: 'Fast, nuanced formatting with natural conversational tone',
    tag: 'POPULAR',
    isPopular: true,
  },
  {
    id: 'qwen3.5-plus',
    name: 'Qwen 3.5 Plus',
    provider: 'Alibaba',
    description: 'World-class multilingual understanding and punctuation',
    tag: 'MULTILINGUAL',
    isPopular: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'Google',
    description: 'Ultra-lightweight speed with low latency execution',
    tag: 'FAST',
    isPopular: true,
  },
  {
    id: 'mistral-small-4',
    name: 'Mistral Small 4',
    provider: 'Mistral AI',
    description: 'Balanced efficiency with European data standards',
    isPopular: false,
  },
  {
    id: 'openai-gpt-oss-120b',
    name: 'OpenAI GPT OSS 120B',
    provider: 'OpenAI',
    description: 'Massive 120B open architecture for deep formatting',
    isPopular: false,
  },
  {
    id: 'gpt-5.4-mini',
    name: 'GPT-5.4 Mini',
    provider: 'OpenAI',
    description: 'High throughput OpenAI-compatible model on Surplus',
    isPopular: false,
  },
  {
    id: 'kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    provider: 'Moonshot',
    description: 'Reasoning-enabled cleanup for complex spoken ideas',
    isPopular: false,
  },
  {
    id: 'minimax-m2.1',
    name: 'MiniMax M2.1',
    provider: 'MiniMax',
    description: 'High context window with rapid generation speed',
    isPopular: false,
  },
  {
    id: 'hermes-3-llama-3.1-405b',
    name: 'Hermes 3 405B',
    provider: 'Nous Research',
    description: 'Maximum intelligence frontier model hosted on Surplus',
    isPopular: false,
  },
];

export const SURPLUS_STT_MODELS: SurplusModelItem[] = [
  {
    id: 'venice-whisper-large-v3',
    name: 'Whisper Large V3 (Venice)',
    provider: 'Venice AI',
    description: 'State of the art Whisper transcription with deep accuracy',
    tag: 'RECOMMENDED',
    isPopular: true,
  },
  {
    id: 'fal-wizper',
    name: 'fal.ai Wizper (STT)',
    provider: 'fal.ai',
    description: 'Ultra-low latency speech recognition built for mobile',
    tag: 'FASTEST',
    isPopular: true,
  },
  {
    id: 'elevenlabs-scribe-v2',
    name: 'ElevenLabs Scribe v2',
    provider: 'ElevenLabs',
    description: 'High fidelity audio transcription with speaker awareness',
    tag: 'PREMIUM',
    isPopular: true,
  },
  {
    id: 'venice-whisper-1',
    name: 'Whisper 1 (Venice)',
    provider: 'Venice AI',
    description: 'Reliable general-purpose audio transcription',
    isPopular: true,
  },
  {
    id: 'venice-xai-stt-v1',
    name: 'xAI Speech to Text v1',
    provider: 'xAI',
    description: 'xAI audio speech model on decentralized marketplace',
    isPopular: false,
  },
  {
    id: 'venice-parakeet-asr',
    name: 'Parakeet ASR (Venice)',
    provider: 'Venice AI',
    description: 'NVIDIA Parakeet high-speed acoustic transcription',
    isPopular: false,
  },
];

/**
 * Fetches dynamic live model list from Surplus Intelligence marketplace
 */
export async function fetchSurplusLiveModels(apiKey?: string): Promise<{ id: string; name: string }[]> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey && apiKey.trim().length > 0) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }
    const res = await fetch(`${SURPLUS_BASE_URL}/models`, { method: 'GET', headers });
    if (!res.ok) return [];
    const json = await res.json();
    if (Array.isArray(json.data)) {
      return json.data.map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
      }));
    }
  } catch (err) {
    console.warn('Failed to fetch Surplus live models:', err);
  }
  return [];
}
