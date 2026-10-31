import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import './App.css'

const DOWNLOAD_URL =
  'https://github.com/iamadityamaurya/openwhispr/releases/download/v1.0.0/OpenWisper-Production.apk'
const GITHUB_URL = 'https://github.com/iamadityamaurya/openwhispr'

// Rotating words in hero tagline (like MausBot hero-swap)
const SWAP_WORDS = [
  'conversations',
  'work emails',
  'action items',
  'daily thoughts',
  'foreign speech',
]

// 5 core personas extracted directly from my-app/src/config/prompts.ts & FloatingBubbleView.kt
const PERSONAS = [
  {
    id: 'natural',
    label: 'Natural Clean',
    shortLabel: 'Natural',
    icon: '✨',
    targetApp: 'General Android Dictation',
    badge: 'Core Engine',
    color: '#009957',
    colorLight: 'var(--color-green-light)',
    raw: 'um so can you uh send me the project report by thursday wait no friday period',
    rawParts: [
      { text: 'um', isRemoved: true },
      { text: ' so can you ' },
      { text: 'uh', isRemoved: true },
      { text: ' send me the project report by ' },
      { text: 'thursday wait no', isRemoved: true },
      { text: ' friday' },
      { text: ' period', isRemoved: true },
    ],
    cleaned: 'Can you send me the project report by Friday.',
    removed: ['um', 'uh', 'thursday wait no', 'period'],
    added: ['Punctuation conversion', 'Self-correction handling', 'Preserved speaker cadence'],
    systemRule: 'Removes fillers and self-corrections while preserving your exact voice, formality, and technical terms.',
  },
  {
    id: 'casual',
    label: 'Casual Chat',
    shortLabel: 'Casual',
    icon: '💬',
    targetApp: 'WhatsApp / Telegram / Signal / Discord',
    badge: 'Messaging Auto-Sense',
    color: '#009957',
    colorLight: 'var(--color-green-light)',
    raw: 'hey basically yeah are we still like meeting up at 3pm or are you gonna be late haha thumbs up',
    rawParts: [
      { text: 'hey ' },
      { text: 'basically yeah', isRemoved: true },
      { text: ' are we still ' },
      { text: 'like', isRemoved: true },
      { text: ' meeting up at 3pm or are you gonna be late ' },
      { text: 'haha', isRemoved: true },
      { text: ' ' },
      { text: 'thumbs up', isRemoved: true },
    ],
    cleaned: 'Hey! Are we still meeting up at 3:00 PM or are you gonna be late? 😂 👍',
    removed: ['basically yeah', 'like', 'haha', 'thumbs up'],
    added: ['Conversational warmth', '3:00 PM time format', 'Natural emoji conversion 😂 👍'],
    systemRule: 'Keeps informal slang, personal warmth, and relaxed cadence with automatic emoji conversion for emotional cues.',
  },
  {
    id: 'email',
    label: 'Work Email',
    shortLabel: 'Email',
    icon: '✉️',
    targetApp: 'Gmail / Outlook / LinkedIn / Superhuman',
    badge: 'Executive Auto-Sense',
    color: '#377FE6',
    colorLight: 'var(--color-blue-light)',
    raw: 'hi team uh quick update on the q3 deployment we need to kinda hold off until engineering merges the security fixes best regards',
    rawParts: [
      { text: 'hi team ' },
      { text: 'uh', isRemoved: true },
      { text: ' quick update on the q3 deployment we need to ' },
      { text: 'kinda', isRemoved: true },
      { text: ' hold off until engineering merges the security fixes best regards' },
    ],
    cleaned: 'Hi Team,\n\nQuick update on the Q3 deployment: we need to hold off until Engineering merges the security fixes.\n\nBest regards,',
    removed: ['uh', 'kinda'],
    added: ['Executive paragraph structure', 'Capitalized Q3 & Engineering', 'Professional salutation & sign-off'],
    systemRule: 'Elevates rambling dictation into clear, authoritative executive correspondence with capitalized proper nouns and clean formatting.',
  },
  {
    id: 'notes',
    label: 'Action Items',
    shortLabel: 'Notes',
    icon: '☑️',
    targetApp: 'Notion / Google Keep / Obsidian / Todoist',
    badge: 'Productivity Auto-Sense',
    color: '#E78531',
    colorLight: 'var(--color-orange-light)',
    raw: 'okay so action items first implement biometric auth second adjust keyboard clearance to 48dp and submit release apk by friday 5pm',
    rawParts: [
      { text: 'okay so action items first', isRemoved: true },
      { text: ' implement biometric auth ' },
      { text: 'second', isRemoved: true },
      { text: ' adjust keyboard clearance to 48dp ' },
      { text: 'and', isRemoved: true },
      { text: ' submit release apk by friday 5pm' },
    ],
    cleaned: '• Implement biometric auth\n• Adjust keyboard clearance to 48dp\n• Submit release APK by Friday 5:00 PM',
    removed: ['okay so action items first', 'second', 'and'],
    added: ['Markdown bullet points', 'Strong imperative action verbs', 'Bold deadline emphasis'],
    systemRule: 'Transforms stream-of-consciousness rambles into clean Markdown bullets and actionable tasks with bolded deliverables.',
  },
  {
    id: 'translate_en',
    label: 'Instant English',
    shortLabel: 'To English',
    icon: '文A',
    targetApp: 'Multilingual Voice Input',
    badge: 'Zero-Latency Translation',
    color: '#8057C8',
    colorLight: 'var(--color-purple-light)',
    raw: 'por favor envía el informe financiero antes de las cinco de la tarde muchas gracias',
    rawParts: [
      { text: 'por favor envía el informe financiero antes de las cinco de la tarde muchas gracias', isForeign: true },
    ],
    cleaned: 'Please send the financial report before 5:00 PM today. Thank you very much!',
    removed: ['Spanish source speech', 'Conversational pauses'],
    added: ['Direct English translation', 'Standard 5:00 PM format', 'Clean punctuation'],
    systemRule: 'Detects foreign languages (Spanish, Hindi, French, German, Japanese, Portuguese, Arabic, Hinglish) and translates into fluent English.',
  },
]

// Real features matching my-app architecture
const FEATURES = [
  {
    num: '01',
    title: 'Dual-Button Capsule Pill',
    subtitle: 'Option 1 Layout (FloatingBubbleView.kt)',
    desc: 'Ergonomic native floating capsule docked directly above your active keyboard. Left button cycles or opens the persona selector; right button triggers voice recording.',
    badge: 'Subtle & Non-Intrusive',
    badgeColor: 'green',
  },
  {
    num: '02',
    title: 'Resting Opacity (30% to 100%)',
    subtitle: 'Configurable Transparency (restingAlpha)',
    desc: 'Rests at 70% opacity over chat feeds without blocking underlying content. Smoothly animates to 100% solid contrast the moment you touch it to dictate.',
    badge: 'Fine-Tuned Comfort',
    badgeColor: 'blue',
  },
  {
    num: '03',
    title: 'Zero-Tap Auto-Persona',
    subtitle: 'Foreground Sensed (WhisperAccessibilityService.kt)',
    desc: 'Accessibility service monitors foreground package events: switches to Casual in WhatsApp/Telegram, Work Email in Gmail/Outlook, and Action Notes in Notion/Keep.',
    badge: 'Context Aware',
    badgeColor: 'orange',
  },
  {
    num: '04',
    title: 'Smart Keyboard Auto-Docking',
    subtitle: 'Input Focus Clearance (48dp Clearance)',
    desc: 'Senses soft keyboard bounds via AccessibilityWindowInfo. Automatically floats above your keyboard (24dp, 48dp, 80dp, 120dp offsets) and hides when keyboard is closed.',
    badge: 'Intelligent Dock',
    badgeColor: 'purple',
  },
  {
    num: '05',
    title: 'Android Quick Settings Tile',
    subtitle: 'System Shade Service (OpenWhisprTileService.kt)',
    desc: 'Pull down your Android notification shade from anywhere to instantly summon or dismiss the floating capsule without opening the app launcher.',
    badge: 'System Native',
    badgeColor: 'teal',
  },
  {
    num: '06',
    title: 'Hardware Keystore AES-256',
    subtitle: 'Zero-Trust BYOK Storage',
    desc: 'Your Deepgram, Gemini, Groq, or OpenAI API keys are encrypted with hardware-backed Android Keystore AES-256-GCM. Stored strictly on device, never synced.',
    badge: 'On-Device Security',
    badgeColor: 'coral',
  },
  {
    num: '07',
    title: 'Payment App Auto-Pause Shield',
    subtitle: 'Tapjacking Protection (FloatingBubbleService.kt)',
    desc: 'Payment, UPI, and banking apps (Google Pay, PhonePe, Paytm, BHIM, Chase, etc.) block overlays for security. OpenWhispr auto-detects payment apps and instantly hides the overlay so transactions are never blocked.',
    badge: 'Tapjacking Safe',
    badgeColor: 'green',
  },
]

// Real STT & LLM Engines supported in api.ts
const ENGINES = [
  {
    type: 'Speech-to-Text (STT)',
    items: [
      { name: 'Deepgram Nova-3', desc: 'Ultra-fast streaming transcription with smart formatting & punctuation', tag: 'Recommended' },
      { name: 'Groq Whisper V3 Turbo', desc: 'LPU high-throughput inference for sub-second speech processing', tag: 'Ultra-Fast' },
      { name: 'OpenAI Whisper-1', desc: 'Industry benchmark for nuanced accents and multilingual audio', tag: 'Standard' },
      { name: 'Surplus Intelligence', desc: 'Decentralized GPU marketplace running Venice Whisper Large V3', tag: 'Web3 AI' },
      { name: 'Custom STT Endpoint', desc: 'Connect your local Ollama, vLLM, or self-hosted Whisper instance', tag: 'Self-Hosted' },
    ],
  },
  {
    type: 'Tone & Cleanup LLM',
    items: [
      { name: 'Groq Llama 3.3 70B', desc: 'Instantaneous transcript refinement and tone transformation', tag: 'Recommended' },
      { name: 'Google Gemini 2.5 Flash', desc: 'Generous free tier with superior contextual understanding', tag: 'High Quota' },
      { name: 'OpenAI GPT-4o-mini', desc: 'Lightweight, dependable corporate email and note extraction', tag: 'Balanced' },
      { name: 'Surplus DeepSeek V4', desc: 'Decentralized reasoning and markdown structure extraction', tag: 'Decentralized' },
      { name: 'Local Ollama / LM Studio', desc: '100% offline cleanup using DeepSeek-Chat, Llama 3, or Mistral', tag: 'Zero-Cloud' },
    ],
  },
]


const FAQS = [
  {
    q: 'How does OpenWhispr differ from standard keyboard voice typing?',
    a: 'Stock voice keyboards transcribe raw fillers ("um", "like", "you know") without formatting or context. OpenWhispr passes your speech through 5 specialized persona engines (Natural Clean, Casual Chat, Work Email, Action Notes, Instant English) to deliver executive-grade, perfectly punctuated text injected directly into your focused input field via Android Accessibility.',
  },
  {
    q: 'What is the Dual-Button Capsule Pill design?',
    a: 'Instead of an obstructive round orb, the compact capsule rests seamlessly right above your active keyboard (FloatingBubbleView.kt). The left button allows 1-tap persona switching (or auto-switches based on the foreground app), while the right button acts as a high-contrast recording trigger.',
  },
  {
    q: 'How does Zero-Tap Auto-Persona switching work?',
    a: 'The WhisperAccessibilityService monitors Android window events. When you open WhatsApp, Telegram, or Discord, it automatically switches to Casual Chat. When you switch to Gmail, Outlook, or LinkedIn, it transitions to Work Email. When you open Notion or Google Keep, it extracts structured Markdown bullet points.',
  },
  {
    q: 'Does the floating capsule distract from reading background content?',
    a: 'Not at all. You can set the resting opacity anywhere between 30% and 100% (default 70%). At 70%, background text and UI are clearly visible beneath the capsule. The moment you touch it to dictate, it smoothly snaps to 100% solid contrast.',
  },
  {
    q: 'What is Smart Keyboard Mode (48dp Clearance)?',
    a: 'OpenWhispr inspects active accessibility windows for TYPE_INPUT_METHOD. It automatically docks the capsule at your configured clearance (24dp, 48dp, 80dp, or 120dp) right above the keyboard top, and can be configured to only show when typing.',
  },
  {
    q: 'What is the Android Quick Settings Tile?',
    a: 'OpenWhispr includes an Android Quick Tile service (OpenWhisprTileService.kt). Pull down your notification shade from any screen and tap the OpenWhispr tile to immediately hide or summon the floating capsule across all apps, without needing to open the app launcher.',
  },
  {
    q: 'Does OpenWhispr interfere with banking or payment apps like Google Pay or PhonePe?',
    a: 'No. Payment, banking, and UPI apps enforce tapjacking security (filterTouchesWhenObscured) which blocks user interaction whenever any third-party screen overlay is active. OpenWhispr includes a smart Payment App Shield that automatically detects payment and banking apps (Google Pay, PhonePe, Paytm, BHIM, Cash App, PayPal, Chase, Wells Fargo, etc.) and completely hides/suppresses the floating bubble while you are inside the app. You can also exclude any custom app using the Excluded Apps Blacklist in Settings.',
  },
  {
    q: 'Where do my API keys and voice recordings go?',
    a: 'OpenWhispr connects directly from your phone to your configured AI provider (Deepgram, Gemini, Groq, OpenAI, Surplus, or local Ollama) over encrypted TLS. No middleman servers exist. Your API keys are encrypted using hardware-backed Android Keystore AES-256-GCM.',
  },
]

export default function App() {
  // Theme state (Light by default like MausBot, toggleable to Dark)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('openwhispr-theme') || 'light'
  })

  // Hero Tagline Word Swap animation
  const [swapIndex, setSwapIndex] = useState(0)
  const [swapIn, setSwapIn] = useState(true)

  // Interactive Simulator States
  const [selectedPersona, setSelectedPersona] = useState('casual')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTimer, setRecordingTimer] = useState(0)
  const [restingOpacity, setRestingOpacity] = useState(70)

  // FAQ open item
  const [openFaq, setOpenFaq] = useState(0)

  const [copiedKey, setCopiedKey] = useState(false)
  const [activeTransformId, setActiveTransformId] = useState('natural')

  // Animated letter wobble triggers
  const [letterHover, setLetterHover] = useState(null)

  // Sync theme with HTML document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('openwhispr-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  // Rotate tagline words like MausBot hero-swap
  useEffect(() => {
    const interval = setInterval(() => {
      setSwapIn(false)
      setTimeout(() => {
        setSwapIndex((prev) => (prev + 1) % SWAP_WORDS.length)
        setSwapIn(true)
      }, 420)
    }, 3200)
    return () => clearInterval(interval)
  }, [])

  // Simulated recording timer
  useEffect(() => {
    let timer
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingTimer((prev) => prev + 1)
      }, 1000)
    } else {
      setRecordingTimer(0)
    }
    return () => clearInterval(timer)
  }, [isRecording])

  const currentPersona =
    PERSONAS.find((p) => p.id === selectedPersona) || PERSONAS[0]
  const currentTransform =
    PERSONAS.find((p) => p.id === activeTransformId) || PERSONAS[0]

  const activeOpacityDecimal = isRecording ? 1.0 : restingOpacity / 100

  const handleCopyInstall = () => {
    navigator.clipboard.writeText('git clone https://github.com/iamadityamaurya/openwhispr.git')
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const toggleRecording = () => {
    setIsRecording((prev) => !prev)
  }

  return (
    <div className="maus-root">
      {/* ── STICKY BACKDROP HEADER ── */}
      <header className="maus-header">
        <div className="maus-header-inner">
          <a href="#" className="maus-brand">
            <span className="maus-brand-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="6" />
                <circle cx="17" cy="12" r="3" fill="currentColor" />
                <path d="M7 10v4" />
              </svg>
            </span>
            <span className="maus-brand-text">OpenWhispr</span>
            <span className="maus-brand-badge font-mono">Android 14+</span>
          </a>

          <nav className="maus-nav">
            <a href="#preview">App Preview</a>
            <a href="#personas">5 Personas</a>
            <a href="#engines">AI Engines</a>
            <a href="#architecture">Security</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="maus-header-actions">
            {/* Theme Toggle Button (Light/Dark like MausBot) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="maus-theme-btn"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              )}
            </button>

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="maus-btn-ghost"
              title="GitHub Star"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              <span className="font-mono">★ Star</span>
            </a>

            <a
              href="#install-qr"
              className="maus-btn-pill"
            >
              <span>Download APK</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* ── MAUSBOT SIGNATURE HERO SECTION (Full Viewport) ── */}
        <section className="maus-hero-section">
          <div className="hero-inner">
            {/* Top Product Hunt / Release Coral Banner */}
          <div className="maus-badge-row">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="maus-coral-banner"
            >
              <span className="maus-coral-tag">Open Source Android</span>
              <span className="maus-coral-text">Floating AI Voice Dictation • BYOK & Hardware Keystore</span>
              <span className="maus-coral-arrow">↗</span>
            </a>
          </div>

          {/* Hero Stage with Green Outline Echoes and Letter-Drop Center Word */}
          <div className="hero-stage" aria-hidden="true">
            {/* Background Marquee Echoes (Vibrant Emerald Outline) */}
            <div className="hero-echoes">
              <div className="hero-echo" data-row="-2" style={{ '--row': -2 }}>
                <div className="hero-echo-track">
                  <span className="hero-echo-copy">
                    <span>OPENWHISPR</span>
                    <span>OPENWHISPR</span>
                    <span>OPENWHISPR</span>
                    <span>OPENWHISPR</span>
                  </span>
                  <span className="hero-echo-copy">
                    <span>OPENWHISPR</span>
                    <span>OPENWHISPR</span>
                    <span>OPENWHISPR</span>
                    <span>OPENWHISPR</span>
                  </span>
                </div>
              </div>

              <div className="hero-echo" data-row="-1" style={{ '--row': -1 }}>
                <div className="hero-echo-track">
                  <span className="hero-echo-copy">
                    <span>AUTONOMOUS DICTATION</span>
                    <span>AUTONOMOUS DICTATION</span>
                    <span>AUTONOMOUS DICTATION</span>
                    <span>AUTONOMOUS DICTATION</span>
                  </span>
                  <span className="hero-echo-copy">
                    <span>AUTONOMOUS DICTATION</span>
                    <span>AUTONOMOUS DICTATION</span>
                    <span>AUTONOMOUS DICTATION</span>
                    <span>AUTONOMOUS DICTATION</span>
                  </span>
                </div>
              </div>

              <div className="hero-echo" data-row="1" style={{ '--row': 1 }}>
                <div className="hero-echo-track">
                  <span className="hero-echo-copy">
                    <span>5 CONTEXT PERSONAS</span>
                    <span>5 CONTEXT PERSONAS</span>
                    <span>5 CONTEXT PERSONAS</span>
                    <span>5 CONTEXT PERSONAS</span>
                  </span>
                  <span className="hero-echo-copy">
                    <span>5 CONTEXT PERSONAS</span>
                    <span>5 CONTEXT PERSONAS</span>
                    <span>5 CONTEXT PERSONAS</span>
                    <span>5 CONTEXT PERSONAS</span>
                  </span>
                </div>
              </div>

              <div className="hero-echo" data-row="2" style={{ '--row': 2 }}>
                <div className="hero-echo-track">
                  <span className="hero-echo-copy">
                    <span>KEYSTORE ENCRYPTED</span>
                    <span>KEYSTORE ENCRYPTED</span>
                    <span>KEYSTORE ENCRYPTED</span>
                    <span>KEYSTORE ENCRYPTED</span>
                  </span>
                  <span className="hero-echo-copy">
                    <span>KEYSTORE ENCRYPTED</span>
                    <span>KEYSTORE ENCRYPTED</span>
                    <span>KEYSTORE ENCRYPTED</span>
                    <span>KEYSTORE ENCRYPTED</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Center Interactive Word Drop (Vibrant Emerald Green) */}
            <div className="hero-word-wrap">
              <button
                type="button"
                className="hero-word"
                title="OpenWhispr Interactive Mascot"
              >
                {'OpenWhispr'.split('').map((char, i) => (
                  <span
                    key={i}
                    className="hero-letter-drop"
                    style={{ '--i': i }}
                    onMouseEnter={() => setLetterHover(i)}
                    onMouseLeave={() => setLetterHover(null)}
                  >
                    <span
                      className={`hero-letter ${letterHover === i ? 'is-hovered' : ''}`}
                    >
                      {char}
                    </span>
                  </span>
                ))}
              </button>
            </div>

            {/* Colorful Orbital Popping Flyers */}
            <div
              className="hero-flyer flyer-capsule"
              style={{ left: '14%', top: '22%', transform: 'translate(-50%, -50%) scale(0.94)' }}
            >
              <div className="hero-flyer-in" style={{ '--i': 0 }}>
                <div className="flyer-pill-mockup">
                  <span className="flyer-pill-icon">💬</span>
                  <span className="flyer-pill-divider"></span>
                  <span className="flyer-mic-circle">
                    <span className="flyer-mic-dot"></span>
                  </span>
                  <span className="flyer-label font-mono">Dual Capsule Pill</span>
                </div>
              </div>
            </div>

            <div
              className="hero-flyer flyer-opacity"
              style={{ left: '86%', top: '26%', transform: 'translate(-50%, -50%) scale(0.96)' }}
            >
              <div className="hero-flyer-in" style={{ '--i': 1 }}>
                <div className="flyer-badge-colored">
                  <span className="flyer-dot-blue"></span>
                  <span className="font-mono font-bold">70%</span>
                  <span className="flyer-sub">Resting Opacity</span>
                </div>
              </div>
            </div>

            <div
              className="hero-flyer flyer-mode"
              style={{ left: '12%', top: '76%', transform: 'translate(-50%, -50%) scale(0.95)' }}
            >
              <div className="hero-flyer-in" style={{ '--i': 2 }}>
                <div className="flyer-badge-colored">
                  <span className="flyer-dot-orange"></span>
                  <span>✉️</span>
                  <span className="font-mono">Gmail Auto-Sense</span>
                </div>
              </div>
            </div>

            <div
              className="hero-flyer flyer-security"
              style={{ left: '84%', top: '76%', transform: 'translate(-50%, -50%) scale(0.94)' }}
            >
              <div className="hero-flyer-in" style={{ '--i': 3 }}>
                <div className="flyer-badge-colored">
                  <span className="flyer-dot-purple"></span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span className="font-mono">Keystore AES-256</span>
                </div>
              </div>
            </div>
          </div>

          {/* Headline with Cascade Letter Word Swapper in Emerald Accent */}
          <div className="hero-content-wrap">
            <h1 className="hero-tagline">
              <span>Your&nbsp;</span>
              <span className="hero-swap-container">
                <span
                  className={`hero-swap-word ${swapIn ? 'is-in' : 'is-out'}`}
                >
                  {SWAP_WORDS[swapIndex].split('').map((char, i) => (
                    <span key={i} style={{ '--i': i }}>
                      {char === ' ' ? '\u00A0' : char}
                    </span>
                  ))}
                </span>
              </span>
              <br />
              <span>on autopilot.</span>
            </h1>

            <p className="hero-subtext">
              An open source Android floating voice companion that listens to your rambling speech and
              instantly injects executive-grade, perfectly formatted text into WhatsApp, Gmail, Notion, and any other app.
              No filler words. Zero tap persona switching.
            </p>

            {/* Direct On-Screen QR Code + Download Card */}
            <div id="install-qr" className="hero-onscreen-qr-card">
              <div className="hero-qr-media">
                <div className="hero-qr-box">
                  <QRCode
                    value={DOWNLOAD_URL}
                    size={112}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    level="M"
                  />
                </div>
                <div className="hero-qr-caption">
                  <span className="hero-qr-pulse" />
                  <span>Scan to Sideload</span>
                </div>
              </div>

              <div className="hero-qr-details">
                <div className="hero-qr-badge-row">
                  <span className="hero-qr-pill">OFFICIAL RELEASE</span>
                  <span className="hero-qr-version font-mono">v1.0.0 APK</span>
                  <span className="hero-qr-size font-mono">106 MB</span>
                </div>

                <h3 className="hero-qr-heading">Scan with your phone camera</h3>
                <p className="hero-qr-desc">
                  Point any Android camera or Google Lens at this code to install OpenWhispr directly on your device.
                </p>

                <div className="hero-qr-btn-group">
                  <a
                    href={DOWNLOAD_URL}
                    className="hero-btn-primary"
                    download
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Direct Download APK</span>
                  </a>

                  <a
                    href="#preview"
                    className="hero-btn-secondary"
                  >
                    <span>Interactive Preview</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-accent-subtle text-accent font-semibold">
                      Live
                    </span>
                  </a>
                </div>
              </div>
            </div>

            <p className="hero-foot-note">
              Android 14+ • Deepgram Nova-3 & Groq Llama 3.3 70B • Hardware Keystore AES-256
            </p>
          </div>
        </div>

          {/* Scroll Down Indicator */}
          <div className="hero-scroll-hint">
            <a href="#preview" className="hero-scroll-link" aria-label="Scroll to preview">
              <span>Explore Interactive Live Capsule</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </section>

        {/* ── MAUSBOT APP PREVIEW WINDOW (.app-preview) ── */}
        <section id="preview" className="maus-preview-section">
          <div className="app-preview-figure">
            <div className="app-preview">
              {/* Left Column: 5 Persona Modes (MausBot ap-sidebar style) */}
              <aside className="ap-sidebar">
                <div className="ap-window">
                  <span className="ap-lights">
                    <i></i><i></i><i></i>
                  </span>
                  <span className="ap-host">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="5" y="2" width="14" height="20" rx="3" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                    FloatingBubbleView.kt
                  </span>
                </div>

                <div className="ap-search">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span>5 Persona Modes</span>
                </div>

                <div className="ap-section">
                  <span>ACTIVE MODES</span>
                  <span className="text-muted text-xs font-mono">5 ENGINES</span>
                </div>

                <div className="ap-bots">
                  {PERSONAS.map((p) => {
                    const isSelected = selectedPersona === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPersona(p.id)}
                        className={`ap-bot ${isSelected ? 'ap-selected' : ''}`}
                        style={{
                          borderLeftColor: isSelected ? p.color : 'transparent',
                        }}
                      >
                        <span className="ap-bot-icon">{p.icon}</span>
                        <div className="ap-bot-info">
                          <div className="flex items-center justify-between">
                            <b style={{ color: isSelected ? '#ffffff' : '#e0e0e8' }}>{p.label}</b>
                            {isSelected && (
                              <span
                                className="ap-active-dot"
                                style={{ background: p.color }}
                              ></span>
                            )}
                          </div>
                          <p>{p.targetApp.split('/')[0].trim()}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="ap-footer-stats">
                  <div className="ap-stat-item">
                    <span className="text-muted">Dock Offset:</span>
                    <span className="font-mono text-emerald font-semibold">48dp Clearance</span>
                  </div>
                  <div className="ap-stat-item">
                    <span className="text-muted">Resting Alpha:</span>
                    <span className="font-mono text-white font-semibold">{restingOpacity}%</span>
                  </div>
                </div>
              </aside>

              {/* Right Column: Chat & Live Dictation Canvas (MausBot ap-chat) */}
              <div className="ap-chat">
                <header className="ap-header">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{currentPersona.icon}</span>
                    <b style={{ color: '#ffffff' }}>{currentPersona.label} Mode</b>
                    <span
                      className="ap-app-badge font-mono"
                      style={{ color: currentPersona.color, borderColor: `${currentPersona.color}40`, background: `${currentPersona.color}15` }}
                    >
                      {currentPersona.targetApp}
                    </span>
                  </div>

                  <div className="ap-header-actions">
                    <div className="ap-model">
                      <span className="ap-model-dot"></span>
                      <span className="text-coral font-medium">Deepgram Nova-3</span>
                      <span className="text-muted">+ Groq Llama 3.3 70B</span>
                    </div>
                  </div>
                </header>

                <div className="ap-messages" data-in="true">
                  <div className="ap-day">
                    <span>LIVE WHISPER ACCESSIBILITY INJECTION SIMULATOR</span>
                  </div>

                  {/* Persona System Prompt Rule Banner */}
                  <div className="text-xs text-muted font-mono bg-[#14141a] border border-[#22222a] p-2.5 rounded-lg mb-2">
                    <b className="text-emerald">Engine Rule: </b>
                    {currentPersona.systemRule}
                  </div>

                  {/* User Spoken Raw Bubble */}
                  <div className="ap-bubble ap-user">
                    <div className="ap-bubble-label">You Spoke (Raw Microphone Audio):</div>
                    <p className="ap-raw-speech">“{currentPersona.raw}”</p>
                    <div className="ap-filler-tags">
                      {currentPersona.removed.map((word, idx) => (
                        <span key={idx} className="ap-filler-pill">
                          <del>{word}</del>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* AI Polished Injection Bubble */}
                  <div className="ap-bubble ap-answer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="ap-bubble-label text-emerald flex items-center gap-1.5 font-semibold">
                        <span>✓</span>
                        <span>Injected into {currentPersona.targetApp.split('/')[0].trim()}:</span>
                      </div>
                      <span className="font-mono text-xs text-muted">0.38s latency</span>
                    </div>

                    <div className="ap-cleaned-text">
                      {currentPersona.cleaned.split('\n').map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>

                    <div className="ap-improvements">
                      {currentPersona.added.map((feat, idx) => (
                        <span key={idx} className="ap-feat-tag">
                          <span className="text-emerald font-bold">+</span> {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Composer with Dual-Button Capsule Pill */}
                <div className="ap-composer">
                  <div className="ap-composer-status">
                    <span className="text-muted text-xs">
                      {isRecording ? (
                        <span className="text-emerald font-medium">
                          ● Recording 16kHz PCM audio ({recordingTimer}s)... Opacity snapped to 100%
                        </span>
                      ) : (
                        <span>Capsule floating at <b className="text-white">{restingOpacity}%</b> resting opacity (48dp above keyboard)</span>
                      )}
                    </span>
                  </div>

                  {/* The Actual Dual-Button Capsule Pill Component */}
                  <div
                    className={`dual-capsule-pill ${isRecording ? 'is-recording' : ''}`}
                    style={{ opacity: activeOpacityDecimal }}
                  >
                    {/* Left Button: Persona Switcher */}
                    <button
                      type="button"
                      onClick={() => {
                        const ids = PERSONAS.map((p) => p.id)
                        const next = ids[(ids.indexOf(selectedPersona) + 1) % ids.length]
                        setSelectedPersona(next)
                      }}
                      className="capsule-persona-btn"
                      title="Tap to switch persona (or auto-detect)"
                    >
                      <span className="capsule-icon">{currentPersona.icon}</span>
                      <span className="capsule-label" style={{ color: currentPersona.color }}>
                        {currentPersona.shortLabel}
                      </span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    <div className="capsule-divider"></div>

                    {/* Right Button: Mic Trigger */}
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`capsule-mic-btn ${isRecording ? 'is-active-mic' : ''}`}
                      title={isRecording ? 'Click to stop dictation' : 'Click to start dictation'}
                    >
                      {isRecording ? (
                        <div className="voice-equalizer">
                          <span className="voice-bar is-speaking" style={{ '--h': '16px' }}></span>
                          <span className="voice-bar is-speaking" style={{ '--h': '22px' }}></span>
                          <span className="voice-bar is-speaking" style={{ '--h': '12px' }}></span>
                          <span className="voice-bar is-speaking" style={{ '--h': '18px' }}></span>
                        </div>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="22" />
                        </svg>
                      )}
                      <span>{isRecording ? 'Listening...' : 'Dictate'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <figcaption className="text-center text-xs text-muted mt-3">
              Interactive dual-capsule simulation running live. Tap the capsule buttons above to test persona switching and voice capture.
            </figcaption>
          </div>
        </section>

        {/* ── TECHNOLOGY & PARTNERS MARQUEE STRIP (like MausBot) ── */}
        <section className="maus-marquee-section">
          <div className="marquee">
            <div className="marquee-track">
              <div className="marquee-copy">
                <span className="marquee-item"><span className="text-emerald">★</span> DEEPGRAM NOVA-3</span>
                <span className="marquee-sep">/</span>
                <span className="marquee-item"><span className="text-blue">★</span> GROQ LLAMA 3.3 70B</span>
                <span className="marquee-sep">/</span>
                <span className="marquee-item"><span className="text-orange">★</span> GEMINI 2.5 FLASH</span>
                <span className="marquee-sep">/</span>
                <span className="marquee-item"><span className="text-purple">★</span> OPENAI GPT-4O-MINI</span>
                <span className="marquee-sep">/</span>
                <span className="marquee-item"><span className="text-teal">★</span> SURPLUS DEEPSEEK V4</span>
                <span className="marquee-sep">/</span>
                <span className="marquee-item"><span className="text-emerald">★</span> LOCAL OLLAMA SERVER</span>
                <span className="marquee-sep">/</span>
                <span className="marquee-item"><span className="text-blue">★</span> HARDWARE KEYSTORE AES-256</span>
                <span className="marquee-sep">/</span>
                <span className="marquee-item"><span className="text-orange">★</span> QUICK SETTINGS SHADE TILE</span>
                <span className="marquee-sep">/</span>
              </div>
              <div className="marquee-copy">
                <span className="marquee-item"><span className="text-emerald">★</span> DEEPGRAM NOVA-3</span>
                <span className="marquee-sep">/</span>
                <span className="marquee-item"><span className="text-blue">★</span> GROQ LLAMA 3.3 70B</span>
                <span className="marquee-sep">/</span>
                <span className="marquee-item"><span className="text-orange">★</span> GEMINI 2.5 FLASH</span>
                <span className="marquee-sep">/</span>
                <span className="marquee-item"><span className="text-purple">★</span> OPENAI GPT-4O-MINI</span>
                <span className="marquee-sep">/</span>
                <span className="marquee-item"><span className="text-teal">★</span> SURPLUS DEEPSEEK V4</span>
                <span className="marquee-sep">/</span>
                <span className="marquee-item"><span className="text-emerald">★</span> LOCAL OLLAMA SERVER</span>
                <span className="marquee-sep">/</span>
                <span className="marquee-item"><span className="text-blue">★</span> HARDWARE KEYSTORE AES-256</span>
                <span className="marquee-sep">/</span>
                <span className="marquee-item"><span className="text-orange">★</span> QUICK SETTINGS SHADE TILE</span>
                <span className="marquee-sep">/</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION: 5 PERSONA ENGINES BREAKDOWN ── */}
        <section id="personas" className="maus-section maus-section-border">
          <div className="maus-section-header">
            <span className="maus-subhead-pill">5 TRANSFORMATION ENGINES</span>
            <h2 className="maus-heading">
              Context-Aware Speech Transformations
            </h2>
            <p className="maus-lead">
              Extracted directly from OpenWhispr’s native prompts engine. Select a persona below to see how raw, rambling speech is instantly cleaned and tailored for the application you are speaking into.
            </p>
          </div>

          {/* Interactive Persona Tabs */}
          <div className="transform-tabs-bar">
            {PERSONAS.map((p) => {
              const isActive = p.id === activeTransformId
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveTransformId(p.id)}
                  className={`transform-tab-btn ${isActive ? 'is-active' : ''}`}
                >
                  <span className="transform-tab-icon">{p.icon}</span>
                  <span className="transform-tab-label">{p.label}</span>
                  <span
                    className="transform-tab-badge"
                    style={{
                      color: isActive ? 'var(--bg)' : p.color,
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : `${p.color}15`,
                    }}
                  >
                    {p.shortLabel}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Featured Side-by-Side Dual Transformation Stage */}
          <div className="transform-showcase-stage">
            {/* Left Panel: Raw Spoken Input */}
            <div className="transform-panel transform-panel-raw">
              <div className="transform-panel-header">
                <div className="flex items-center gap-2">
                  <span className="transform-audio-wave">
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                  </span>
                  <span className="transform-panel-title">Raw Speech Input</span>
                </div>
                <span className="transform-tag transform-tag-raw">Unfiltered Audio</span>
              </div>

              <div className="transform-transcript-box">
                <div className="transform-text-raw">
                  {currentTransform.rawParts ? (
                    currentTransform.rawParts.map((part, idx) => (
                      part.isRemoved ? (
                        <span key={idx} className="raw-removed-token" title="Stripped by AI">
                          {part.text}
                        </span>
                      ) : part.isForeign ? (
                        <span key={idx} className="raw-foreign-token">
                          "{part.text}"
                          <span className="raw-lang-badge">🇪🇸 Spanish Detected</span>
                        </span>
                      ) : (
                        <span key={idx}>{part.text}</span>
                      )
                    ))
                  ) : (
                    <span>"{currentTransform.raw}"</span>
                  )}
                </div>

                <div className="transform-box-footer">
                  <span className="text-xs font-mono text-muted">
                    🎯 Target: <span className="text-fg font-semibold">{currentTransform.targetApp}</span>
                  </span>
                  {currentTransform.removed.length > 0 && (
                    <span className="text-xs font-mono text-coral font-medium">
                      ✕ {currentTransform.removed.length} elements refined
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel: Polished Text Injection */}
            <div className="transform-panel transform-panel-clean">
              <div className="transform-panel-header">
                <div className="flex items-center gap-2">
                  <span className="transform-check-icon">✓</span>
                  <span className="transform-panel-title">Cleaned & Formatted</span>
                </div>
                <span className="transform-tag transform-tag-clean">
                  Injected into {currentTransform.targetApp.split('/')[0].trim()}
                </span>
              </div>

              <div className="transform-transcript-box">
                <div className="transform-text-clean">
                  {currentTransform.cleaned.split('\n').map((line, idx) => (
                    <div key={idx} className={line.startsWith('•') ? 'transform-bullet-line' : ''}>
                      {line}
                    </div>
                  ))}
                </div>

                <div className="transform-box-footer">
                  <div className="transform-feat-badges">
                    {currentTransform.added.map((feat, idx) => (
                      <span key={idx} className="transform-feat-pill">
                        <span className="text-emerald font-bold">+</span> {feat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Balanced 5-Card Grid (Click any card to inspect) */}
          <div className="transform-cards-grid">
            {PERSONAS.map((p) => {
              const isSelected = p.id === activeTransformId
              return (
                <div
                  key={p.id}
                  onClick={() => setActiveTransformId(p.id)}
                  className={`transform-card-item ${isSelected ? 'is-selected' : ''}`}
                >
                  <div className="transform-card-top">
                    <span className="transform-card-icon">{p.icon}</span>
                    <span
                      className="transform-card-badge"
                      style={{ color: p.color, background: `${p.color}15`, borderColor: `${p.color}35` }}
                    >
                      {p.shortLabel}
                    </span>
                  </div>
                  <h4 className="transform-card-name">{p.label}</h4>
                  <p className="transform-card-app font-mono">{p.targetApp.split('/')[0].trim()}</p>
                  <p className="transform-card-rule">{p.systemRule}</p>
                  <div className="transform-card-action">
                    <span className="transform-card-link">
                      {isSelected ? '● Active in Stage' : 'Inspect Mode →'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── SECTION: REAL AI ENGINES & PROVIDERS (api.ts) ── */}
        <section id="engines" className="maus-section">
          <div className="maus-section-header">
            <span className="maus-subhead-pill">BYOK ARCHITECTURE</span>
            <h2 className="maus-heading">
              Supported STT & LLM Engines
            </h2>
            <p className="maus-lead">
              Plug in your existing API credentials or run fully offline. OpenWhispr routes requests directly over TLS without proprietary proxy servers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ENGINES.map((group, idx) => (
              <div key={idx} className="maus-engine-card">
                <h3 className="text-xl font-bold text-fg mb-4 flex items-center gap-2">
                  <span className="text-emerald">●</span>
                  {group.type}
                </h3>
                <div className="flex flex-col gap-3">
                  {group.items.map((item, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-subtle border border-line flex items-start justify-between gap-3">
                      <div>
                        <b className="text-sm text-fg block mb-1">{item.name}</b>
                        <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-1 rounded-md bg-accent-subtle text-accent whitespace-nowrap">
                        {item.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION: FEATURES GRID (MausBot Bento) ── */}
        <section className="maus-section">
          <div className="maus-section-header">
            <span className="maus-subhead-pill">CORE CAPABILITIES</span>
            <h2 className="maus-heading">
              Engineered for Speed, Clarity, & Privacy.
            </h2>
            <p className="maus-lead">
              Every detail is designed to make your daily typing effortless across all Android messaging and productivity apps.
            </p>
          </div>

          <div className="maus-feature-grid">
            {FEATURES.map((feat) => (
              <div key={feat.num} className="maus-feat-card">
                <div className="flex items-center justify-between mb-4">
                  <span className="maus-card-num font-mono text-emerald font-bold">{feat.num}</span>
                  <span className={`maus-feat-badge badge-${feat.badgeColor}`}>{feat.badge}</span>
                </div>
                <h3 className="maus-card-title">{feat.title}</h3>
                <span className="text-xs text-muted font-mono block mb-2 font-medium">{feat.subtitle}</span>
                <p className="maus-card-desc">{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION: ANDROID QUICK SETTINGS SHADE TILE ── */}
        <section className="maus-section maus-section-border">
          <div className="tile-spotlight-card">
            <div className="tile-spotlight-content">
              <span className="maus-subhead-pill">SYSTEM NATIVE</span>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-fg mb-3">
                Android Quick Settings Shade Tile.
              </h2>
              <p className="text-muted text-sm sm:text-base leading-relaxed mb-6">
                OpenWhisprTileService.kt integrates into your Android quick settings pull-down shade. Toggle the floating capsule on or off with a single tap from any screen without switching apps.
              </p>
              <ul className="tile-points-list">
                <li>
                  <span className="tile-check bg-emerald text-white">✓</span>
                  <span>Instant system-wide summon or dismiss from notification shade</span>
                </li>
                <li>
                  <span className="tile-check bg-emerald text-white">✓</span>
                  <span>Zero battery drain when inactive; wakes background service on tap</span>
                </li>
                <li>
                  <span className="tile-check bg-emerald text-white">✓</span>
                  <span>BootReceiver.kt automatically restores capsule after device restart</span>
                </li>
              </ul>
            </div>

            <div className="tile-spotlight-visual">
              <div className="shade-mockup">
                <div className="shade-notch"></div>
                <div className="shade-tiles-row">
                  <div className="shade-tile-box is-inactive">
                    <span>📶</span>
                    <b>Internet</b>
                  </div>
                  <div className="shade-tile-box is-inactive">
                    <span>🔋</span>
                    <b>Battery</b>
                  </div>
                </div>
                <div className="shade-tiles-row">
                  <div className="shade-tile-box is-active shade-active-green">
                    <span>🎙️</span>
                    <b>OpenWhispr</b>
                  </div>
                  <div className="shade-tile-box is-inactive">
                    <span>🌙</span>
                    <b>Do Not Disturb</b>
                  </div>
                </div>
                <div className="shade-slider-mock">
                  <div className="shade-slider-fill bg-emerald"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION: ARCHITECTURE & ZERO-TRUST SECURITY ── */}
        <section id="architecture" className="maus-section">
          <div className="maus-section-header">
            <span className="maus-subhead-pill">SECURITY BY DESIGN</span>
            <h2 className="maus-heading">
              Hardware Keystore. Direct TLS BYOK.
            </h2>
            <p className="maus-lead">
              Your voice and sensitive thoughts should never pass through a proprietary third-party proxy. OpenWhispr connects directly from your phone to your selected AI provider.
            </p>
          </div>

          <div className="arch-flow-box">
            <div className="arch-step">
              <div className="arch-step-circle text-emerald">01</div>
              <b className="text-fg text-sm block mb-1">Android AudioRecord</b>
              <p className="text-xs text-muted">16kHz PCM audio recorded in local RAM buffer</p>
            </div>
            <div className="arch-arrow text-emerald">→</div>
            <div className="arch-step">
              <div className="arch-step-circle text-blue">02</div>
              <b className="text-fg text-sm block mb-1">Direct Cloud TLS</b>
              <p className="text-xs text-muted">Direct stream to Deepgram / Gemini / Groq endpoint</p>
            </div>
            <div className="arch-arrow text-blue">→</div>
            <div className="arch-step">
              <div className="arch-step-circle text-purple">03</div>
              <b className="text-fg text-sm block mb-1">Hardware Keystore</b>
              <p className="text-xs text-muted">API key decrypted in secure hardware enclave</p>
            </div>
            <div className="arch-arrow text-purple">→</div>
            <div className="arch-step">
              <div className="arch-step-circle text-emerald">04</div>
              <b className="text-fg text-sm block mb-1">Accessibility Inject</b>
              <p className="text-xs text-muted">ACTION_SET_TEXT pastes into focused field in 0.38s</p>
            </div>
          </div>
        </section>

        {/* ── SECTION: MULTILINGUAL MARQUEE (Hello from OpenWhispr) ── */}
        <section className="maus-section maus-section-border">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="maus-subhead-pill">MULTILINGUAL VOICE</span>
            <h2 className="maus-heading">
              Speak in Any Language. Output in Pristine English.
            </h2>
            <p className="maus-lead">
              Switch to Instant English mode (TRANSLATE_EN_SYSTEM_PROMPT) and dictate comfortably in your native tongue. OpenWhispr translates and formats simultaneously.
            </p>
          </div>

          <div className="multilingual-strip">
            <span className="lang-tag tag-green">Hola (Spanish)</span>
            <span className="lang-tag tag-orange">नमस्ते (Hindi)</span>
            <span className="lang-tag tag-blue">Bonjour (French)</span>
            <span className="lang-tag tag-purple">こんにちは (Japanese)</span>
            <span className="lang-tag tag-teal">Hallo (German)</span>
            <span className="lang-tag tag-pink">你好 (Chinese)</span>
            <span className="lang-tag tag-green">Olá (Portuguese)</span>
            <span className="lang-tag tag-orange">مرحبا (Arabic)</span>
          </div>
        </section>

        {/* ── SECTION: FAQ ACCORDION ── */}
        <section id="faq" className="maus-section">
          <div className="maus-section-header">
            <span className="maus-subhead-pill">FAQ</span>
            <h2 className="maus-heading">Frequently Asked Questions</h2>
            <p className="maus-lead">
              Everything you need to know about OpenWhispr, privacy, setup, and permissions.
            </p>
          </div>

          <div className="faq-accordion">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i
              return (
                <div
                  key={i}
                  className={`faq-item ${isOpen ? 'is-open' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : i)}
                    className="faq-question-btn"
                  >
                    <span>{faq.q}</span>
                    <span className="faq-icon text-emerald">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="faq-answer-body">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── BOTTOM CTA SECTION ── */}
        <section className="maus-bottom-cta">
          <div className="maus-cta-inner">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-fg mb-4">
              Type at the speed of thought.
            </h2>
            <p className="text-muted text-base sm:text-lg max-w-xl mx-auto mb-8">
              Join developers, founders, and professionals speaking freely on Android without filler words. Free, open source, and privacy first.
            </p>

            <div className="bottom-onscreen-qr-card">
              <div className="hero-qr-media">
                <div className="hero-qr-box">
                  <QRCode
                    value={DOWNLOAD_URL}
                    size={118}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    level="M"
                  />
                </div>
                <div className="hero-qr-caption">
                  <span className="hero-qr-pulse" />
                  <span>Scan with Phone</span>
                </div>
              </div>

              <div className="hero-qr-details">
                <div className="hero-qr-badge-row">
                  <span className="hero-qr-pill">DIRECT SIDELOAD</span>
                  <span className="hero-qr-version font-mono">v1.0.0 Production</span>
                </div>
                <h3 className="hero-qr-heading">Install OpenWhispr in seconds</h3>
                <p className="hero-qr-desc">
                  Point any phone camera or Google Lens here to download and install the official APK directly, or click below.
                </p>

                <div className="hero-qr-btn-group">
                  <a
                    href={DOWNLOAD_URL}
                    className="hero-btn-primary"
                    download
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Download APK (106 MB)</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyInstall}
                    className="hero-btn-secondary text-xs"
                  >
                    {copiedKey ? '✓ Copied Git URL' : 'Copy Git Repository URL'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── MINIMALIST FOOTER ── */}
      <footer className="maus-footer">
        <div className="maus-footer-inner">
          <div className="flex items-center gap-2">
            <span className="text-fg font-semibold">OpenWhispr</span>
            <span className="text-muted text-xs font-mono">• MIT License</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors">
              GitHub
            </a>
            <a href="#preview" className="hover:text-accent transition-colors">
              App Preview
            </a>
            <a href="#engines" className="hover:text-accent transition-colors">
              AI Engines
            </a>
            <a href="#architecture" className="hover:text-accent transition-colors">
              Security
            </a>
            <a href="#faq" className="hover:text-accent transition-colors">
              Docs & FAQ
            </a>
          </div>

          <div className="text-xs text-muted font-mono">
            Direct TLS BYOK • Android 14+
          </div>
        </div>
      </footer>


    </div>
  )
}
