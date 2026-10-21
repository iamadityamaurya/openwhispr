export interface GroqModelItem {
  id: string;
  name: string;
  tag?: string;
  provider: string;
  description: string;
}

/**
 * Official Groq Speech-to-Text Models
 * Verified from console.groq.com/docs/models
 */
export const GROQ_STT_MODELS: GroqModelItem[] = [
  {
    id: 'whisper-large-v3-turbo',
    name: 'Whisper Large V3 Turbo',
    tag: 'Recommended · Fastest',
    provider: 'Groq Cloud',
    description: 'Fine-tuned multilingual speech model running at 216x real-time speed with extreme cost efficiency.',
  },
  {
    id: 'whisper-large-v3',
    name: 'Whisper Large V3',
    tag: 'High Accuracy',
    provider: 'Groq Cloud',
    description: 'Flagship multilingual transcription and translation with maximum speech accuracy and punctuation.',
  },
  {
    id: 'distil-whisper-large-v3-en',
    name: 'Distil-Whisper V3 English',
    tag: 'English Only',
    provider: 'Groq Cloud',
    description: 'Distilled lightweight speech model specialized exclusively for fast English audio dictation.',
  },
];

/**
 * Official Groq Production Chat & LLM Models
 * Verified from console.groq.com/docs/models
 */
export const GROQ_LLM_MODELS: GroqModelItem[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    tag: 'Recommended · Smartest',
    provider: 'Meta Llama',
    description: 'Flagship 128K context model with superior instruction following, grammar repair, and prose polishing.',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    tag: 'Ultra Fast',
    provider: 'Meta Llama',
    description: 'Sub-100ms response time, optimized for instant text cleanup, punctuation, and low latency.',
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'OpenAI GPT-OSS 120B',
    tag: 'Open Weights 120B',
    provider: 'OpenAI on Groq',
    description: 'High-capability open-weight reasoning model with built-in code, analysis, and synthesis capabilities.',
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'OpenAI GPT-OSS 20B',
    tag: 'Fast Reasoning',
    provider: 'OpenAI on Groq',
    description: 'Lightweight high-speed reasoning model with tool calling, logic cleanup, and fast inference.',
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B',
    tag: 'Multimodal 131K',
    provider: 'Alibaba on Groq',
    description: 'High-capability reasoning and instruct model supporting thinking modes and 131K context.',
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    tag: 'MoE · 32K',
    provider: 'Mistral AI',
    description: '8-expert Mixture-of-Experts architecture delivering rapid transcription cleanup and high throughput.',
  },
];
