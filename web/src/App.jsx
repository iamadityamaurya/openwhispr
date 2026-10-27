import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import './App.css'

const DOWNLOAD_URL =
  'https://github.com/YOUR_USERNAME/openwisper-android/releases/latest/download/OpenWhispr.apk'
const GITHUB_URL = 'https://github.com/YOUR_USERNAME/openwisper-android'

// Preset speech examples for the interactive demo and persona showcase
const DEMO_PRESETS = [
  {
    id: 'casual',
    label: 'Casual Chat',
    icon: '💬',
    context: 'WhatsApp / Telegram / Signal',
    targetApp: 'Messaging',
    raw: 'um so basically yeah I was thinking we should like reschedule our sync to 3pm if that is cool with everyone',
    cleaned: 'Can we reschedule our sync to 3:00 PM today if that works for everyone?',
    removed: ['um', 'so basically yeah', 'like', 'is cool with everyone'],
    added: ['Proper punctuation', '3:00 PM format', 'Natural tone'],
  },
  {
    id: 'email',
    label: 'Work Email',
    icon: '✉️',
    context: 'Gmail / Outlook / LinkedIn',
    targetApp: 'Email & Work',
    raw: 'hey Sarah uh quick update on the q3 launch we need to kinda hold off until engineering merges the security fixes',
    cleaned: 'Hi Sarah, quick update on the Q3 launch: we need to hold off until Engineering merges the security fixes.',
    removed: ['uh', 'kinda'],
    added: ['Capitalized Q3 & Engineering', 'Colon structure', 'Executive greeting'],
  },
  {
    id: 'notes',
    label: 'Action Notes',
    icon: '☑️',
    context: 'Google Keep / Notion / Todoist',
    targetApp: 'Task Management',
    raw: 'okay action items first fix the api key error second update floating dock clearance to 48dp and third build the release apk',
    cleaned: '• Fix API key error\n• Update floating dock clearance to 48dp\n• Build release APK',
    removed: ['okay action items first', 'second', 'and third'],
    added: ['Auto-bullet formatting', 'Imperative action verbs', 'Markdown list'],
  },
  {
    id: 'translate',
    label: 'Instant English',
    icon: '文A',
    context: 'Multilingual Voice Input',
    targetApp: 'Translation',
    raw: 'por favor envía el reporte financiero antes de las cinco de la tarde muchas gracias',
    cleaned: 'Please send the financial report before 5:00 PM today. Thank you very much!',
    removed: ['Spanish source audio', 'Conversational pauses'],
    added: ['Instant English translation', 'Standard 5:00 PM time', 'Pristine punctuation'],
  },
]

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="6" />
        <circle cx="17" cy="12" r="3" fill="currentColor" />
        <path d="M7 10v4" />
      </svg>
    ),
    title: 'Dual-Button Capsule Pill',
    badge: 'Option 1 Layout',
    body: 'Rests elegantly above your active keyboard. Features an instant persona switcher on the left and a dedicated recording trigger on the right.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    title: 'Zero-Tap Auto-Persona',
    badge: 'Foreground Detection',
    body: 'Automatically senses when you open WhatsApp, Gmail, or Notion via accessibility events and silently adapts tone with zero taps needed.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 1 0 18v-18z" fill="currentColor" opacity="0.25" />
        <path d="M12 7v10" />
      </svg>
    ),
    title: 'Opacity Slider (30% to 100%)',
    badge: 'Fine-Tuned Comfort',
    body: 'Configurable resting transparency (default 70%) prevents background obstruction, automatically snapping to 100% solid while recording.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.3" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    title: 'Quick Settings Shade Tile',
    badge: 'Pull-Down Shade',
    body: 'Add the OpenWhispr tile to your Android pull-down notification shade for 1-tap toggling of the floating overlay from any game or screen.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: 'Hardware Keystore AES-256',
    badge: 'Zero Middleman',
    body: 'Your API keys are encrypted directly on-device using Android Keystore MasterKeys. Audio travels encrypted via TLS with zero proxy servers.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Sub-Second Latency (~240ms)',
    badge: 'Groq & Deepgram',
    body: 'Powered by Deepgram Nova-3 and Groq Whisper Large v3 Turbo, delivering instant transcriptions before your finger even lifts.',
  },
]

const BENCHMARKS = [
  { label: 'Groq Whisper Large v3 Turbo', latency: 240, note: 'Ultra-low latency STT' },
  { label: 'Deepgram Nova-3', latency: 310, note: 'High conversational accuracy' },
  { label: 'OpenAI Whisper Cloud', latency: 920, note: 'Standard cloud turnaround' },
  { label: 'Manual Touchscreen Typing', latency: 4200, note: '~10x slower than natural speech' },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Tap the Capsule Pill',
    description:
      'The monochrome capsule floats right above your soft keyboard at your chosen opacity. Tap the mic circle to begin 16kHz audio capture.',
    badge: 'Instant Wakeup',
  },
  {
    step: '02',
    title: 'Zero-Proxy Whisper Stream',
    description:
      'Raw audio streams directly from your phone to Groq or Deepgram over encrypted TLS. No middleman cloud intercepts your voice.',
    badge: 'Direct TLS API',
  },
  {
    step: '03',
    title: 'Auto-Persona Formatting & Paste',
    description:
      'The selected persona removes verbal clutter, adds punctuation, and automatically pastes clean text right into your active cursor.',
    badge: 'Accessibility Input',
  },
]

const FAQS = [
  {
    q: 'How does the dual-button capsule pill work?',
    a: 'The pill is divided into two interactive sections: the left side displays the active persona (Casual, Email, Notes, Instant English) which you can tap to expand or long-press to cycle; the right side holds the recording trigger that pulses during capture and snaps to 100% opacity.',
  },
  {
    q: 'How does Zero-Tap Auto-Persona switching work?',
    a: 'When enabled in settings, OpenWhispr uses Android Accessibility window events to identify the foreground application. If you switch into WhatsApp, it adapts to Casual Chat; if you open Gmail, it switches to Work Email; if you open Keep or Notion, it switches to Action Notes.',
  },
  {
    q: 'Can I adjust the floating pill opacity so it is not distracting?',
    a: 'Yes! OpenWhispr has a dedicated resting opacity slider in Settings from 30% (ghost) to 100% (solid). By default, it rests at 70% opacity in sleek monochrome black-and-white. While actively recording, it automatically illuminates to 100% solid.',
  },
  {
    q: 'How do I use the Quick Settings Shade Tile?',
    a: 'Pull down your Android notification shade from the top of your screen, tap the Edit pencil icon, and drag the "OpenWhispr" tile into your active quick toggles. You can now enable or disable the floating overlay in 1 tap from anywhere.',
  },
  {
    q: 'Does OpenWhispr store or sell my audio?',
    a: 'Never. OpenWhispr has zero central databases, zero user telemetry, and zero middleman servers. Audio is held in RAM only while recording and streams directly to your configured provider (Groq, Deepgram, OpenAI) using your own API key.',
  },
  {
    q: 'How do I get free API keys?',
    a: 'Groq offers a generous free tier at console.groq.com with high rate limits for Whisper Large v3 Turbo and Llama 3.3. Deepgram gives $200 in free credits with no credit card required at deepgram.com.',
  },
]

const NAV_SECTIONS = [
  { id: 'hero', label: 'Overview' },
  { id: 'showcase', label: 'Showcase' },
  { id: 'features', label: 'Features' },
  { id: 'simulator', label: 'Capsule & Opacity' },
  { id: 'speed', label: 'Speed' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'faq', label: 'FAQ' },
]

function App() {
  const [copied, setCopied] = useState(false)
  const [activePreset, setActivePreset] = useState(DEMO_PRESETS[0])
  const [openFaq, setOpenFaq] = useState(0)

  // Interactive phone demo state
  const [phoneState, setPhoneState] = useState('cleaned') // 'listening' | 'processing' | 'cleaned'
  const [phonePresetIndex, setPhonePresetIndex] = useState(0)
  const currentPhonePreset = DEMO_PRESETS[phonePresetIndex]

  // Interactive opacity simulator
  const [simulatorOpacity, setSimulatorOpacity] = useState(0.7)
  const [simulatorRecording, setSimulatorRecording] = useState(false)
  const [simulatorPersona, setSimulatorPersona] = useState(DEMO_PRESETS[0])
  const [simulatorPickerOpen, setSimulatorPickerOpen] = useState(false)

  // Active section tracking
  const [activeSection, setActiveSection] = useState('hero')

  useEffect(() => {
    const handleScroll = () => {
      for (let i = NAV_SECTIONS.length - 1; i >= 0; i--) {
        const sec = document.getElementById(NAV_SECTIONS[i].id)
        if (sec) {
          const rect = sec.getBoundingClientRect()
          if (rect.top <= window.innerHeight * 0.45) {
            setActiveSection(NAV_SECTIONS[i].id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(DOWNLOAD_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  const handleMicTap = () => {
    if (phoneState === 'listening') return
    setPhoneState('listening')
    setTimeout(() => {
      setPhoneState('processing')
      setTimeout(() => {
        setPhoneState('cleaned')
      }, 900)
    }, 1100)
  }

  const handleNextPhonePreset = () => {
    const nextIdx = (phonePresetIndex + 1) % DEMO_PRESETS.length
    setPhonePresetIndex(nextIdx)
    setPhoneState('cleaned')
  }

  const toggleSimulatorRecord = () => {
    if (simulatorRecording) {
      setSimulatorRecording(false)
    } else {
      setSimulatorRecording(true)
      setSimulatorPickerOpen(false)
      setTimeout(() => setSimulatorRecording(false), 2200)
    }
  }

  return (
    <div className="site-wrapper">
      {/* Background Subtle Noir Grid Effect */}
      <div className="bg-grid-ambient" aria-hidden="true" />
      <div className="bg-radial-glow" aria-hidden="true" />

      {/* Floating Side Rail for Quick Nav */}
      <aside className="section-rail" aria-label="Section navigation">
        {NAV_SECTIONS.map((sec) => (
          <a
            key={sec.id}
            href={`#${sec.id}`}
            className={`rail-dot ${activeSection === sec.id ? 'active' : ''}`}
            aria-label={`Jump to ${sec.label}`}
          >
            <span className="rail-tooltip">{sec.label}</span>
          </a>
        ))}
      </aside>

      {/* ========================================================
          STICKY MINIMALIST HEADER
      ======================================================== */}
      <header className="site-header">
        <div className="header-inner">
          <a href="#hero" className="nav-brand">
            <span className="logo-box">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </span>
            <span className="brand-name">OpenWhispr</span>
            <span className="brand-subtag">Android</span>
          </a>

          <nav className="nav-links">
            <a href="#showcase" className={activeSection === 'showcase' ? 'active' : ''}>Showcase</a>
            <a href="#features" className={activeSection === 'features' ? 'active' : ''}>Features</a>
            <a href="#simulator" className={activeSection === 'simulator' ? 'active' : ''}>Pill Simulator</a>
            <a href="#speed" className={activeSection === 'speed' ? 'active' : ''}>Speed</a>
            <a href="#privacy" className={activeSection === 'privacy' ? 'active' : ''}>Privacy</a>
            <a href="#faq" className={activeSection === 'faq' ? 'active' : ''}>FAQ</a>
          </nav>

          <div className="header-actions">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn-github">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z" />
              </svg>
              <span>GitHub</span>
            </a>
            <a href={DOWNLOAD_URL} className="btn-header-cta">
              Get APK
            </a>
          </div>
        </div>
      </header>

      <main className="page-content">
        {/* ========================================================
            1. HERO SECTION (Minimalist Monochrome)
        ======================================================== */}
        <section className="section hero-section" id="hero">
          <div className="hero-container">
            <div className="hero-content">
              <div className="badge-pill">
                <span className="dot-live" />
                <span>Zero-Tap Auto-Persona · Dual Capsule Pill · 70% Opacity</span>
              </div>

              <h1 className="hero-title">
                Voice dictation,
                <br />
                <span className="text-white-pure">refined anywhere.</span>
              </h1>

              <p className="hero-description">
                OpenWhispr turns imperfect, conversational speech into pristine text across every Android app.
                A minimalist floating capsule pill, hardware keystore encryption, and zero subscription paywalls.
              </p>

              <div className="hero-cta-group">
                <a className="btn btn-primary" href={DOWNLOAD_URL}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
                  </svg>
                  <span>Download APK</span>
                  <span className="tag-version">v1.0.2</span>
                </a>

                <a className="btn btn-secondary" href="#simulator">
                  <span>Interactive Simulator</span>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </a>
              </div>

              {/* Minimalist QR Code Download Card */}
              <div className="qr-box">
                <div className="qr-wrapper">
                  <QRCode
                    value={DOWNLOAD_URL}
                    size={88}
                    fgColor="#FFFFFF"
                    bgColor="transparent"
                    level="M"
                  />
                </div>
                <div className="qr-details">
                  <div className="qr-headline">
                    <strong>Scan to install directly</strong>
                    <span className="qr-tag">Free APK</span>
                  </div>
                  <p>Point your phone camera to download directly to Android. No Play Store required.</p>
                  <button className="btn-copy-link" onClick={copyLink}>
                    {copied ? '✓ Direct URL copied' : 'Copy download link'}
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Monochrome Phone Preview */}
            <div className="hero-phone-side" aria-hidden="true">
              <div className="phone-chassis">
                <div className="phone-screen">
                  {/* Status Bar */}
                  <div className="phone-top-bar">
                    <span className="phone-time">9:41</span>
                    <div className="phone-camera-punch" />
                    <div className="phone-icons">
                      <span className="phone-sig" />
                      <span className="phone-bat" />
                    </div>
                  </div>

                  {/* App Context Bar */}
                  <div className="mock-chat-header">
                    <div className="mock-app-info">
                      <span className="mock-app-dot" />
                      <span className="mock-app-name">{currentPhonePreset.context}</span>
                    </div>
                    <button className="mock-cycle-btn" onClick={handleNextPhonePreset}>
                      Next app ↻
                    </button>
                  </div>

                  {/* Chat / Content View */}
                  <div className="mock-chat-body">
                    {phoneState === 'listening' ? (
                      <div className="mock-state-box listening">
                        <div className="mock-sound-bars">
                          <span /><span /><span /><span /><span />
                        </div>
                        <span className="mock-state-text">Listening at 16kHz PCM...</span>
                      </div>
                    ) : phoneState === 'processing' ? (
                      <div className="mock-state-box processing">
                        <div className="mock-spinner" />
                        <span className="mock-state-text">Refining with LLM...</span>
                      </div>
                    ) : (
                      <div className="mock-state-box ready">
                        <div className="mock-pill-tag">
                          <span>{currentPhonePreset.icon} {currentPhonePreset.label}</span>
                          <span className="mock-speed">~240ms</span>
                        </div>
                        <p className="mock-text-cleaned">{currentPhonePreset.cleaned}</p>
                      </div>
                    )}
                  </div>

                  {/* Keyboard Frame */}
                  <div className="mock-keyboard">
                    <div className="mock-key-row top">
                      <span /><span /><span /><span /><span /><span /><span />
                    </div>
                    <div className="mock-key-row mid">
                      <span /><span /><span /><span /><span /><span />
                    </div>
                    <div className="mock-key-row space">
                      <span className="spacebar" />
                    </div>
                  </div>

                  {/* The Real Dual-Button Capsule Pill Floating Above Keyboard */}
                  <div className="mock-floating-capsule-holder">
                    <div
                      className={`mock-capsule-pill ${phoneState === 'listening' ? 'recording' : ''}`}
                      onClick={handleMicTap}
                      title="Tap capsule to dictate"
                    >
                      <div className="capsule-persona-section">
                        <span className="capsule-persona-icon">{currentPhonePreset.icon}</span>
                        <span className="capsule-persona-name">{currentPhonePreset.label}</span>
                        <span className="capsule-chevron">▾</span>
                      </div>
                      <div className="capsule-center-divider" />
                      <div className="capsule-mic-trigger">
                        {phoneState === 'listening' ? (
                          <span className="capsule-record-dot" />
                        ) : (
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="#000000">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="phone-hint-caption">
                  <span>↗ Tap the capsule pill to simulate instant voice cleanup</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            2. SHOWCASE (Before & After Comparison)
        ======================================================== */}
        <section className="section showcase-section" id="showcase">
          <div className="section-header">
            <span className="section-kicker">Intelligent Persona Refinement</span>
            <h2 className="section-heading">Raw speech in. Clean text out.</h2>
            <p className="section-subheading">
              Speak as informally as you want. OpenWhispr strips hesitations, corrects grammar, and formats text specifically for the destination app.
            </p>
          </div>

          <div className="persona-selector-tabs">
            {DEMO_PRESETS.map((p) => (
              <button
                key={p.id}
                className={`tab-persona ${activePreset.id === p.id ? 'active' : ''}`}
                onClick={() => setActivePreset(p)}
              >
                <span className="tab-icon">{p.icon}</span>
                <span className="tab-label">{p.label}</span>
                <span className="tab-app-tag">{p.targetApp}</span>
              </button>
            ))}
          </div>

          <div className="comparison-grid">
            <div className="comp-card raw">
              <div className="comp-head">
                <div className="comp-badge-group">
                  <span className="badge-dot-gray" />
                  <span className="badge-text">Raw Speech Transcript</span>
                </div>
                <span className="meta-tag">Unfiltered Whisper</span>
              </div>
              <div className="comp-content">
                <p className="quote-text">"{activePreset.raw}"</p>
              </div>
              <div className="comp-meta-footer">
                <span className="footer-label">Detected Verbal Clutter:</span>
                <div className="tag-chips">
                  {activePreset.removed.map((item, idx) => (
                    <span key={idx} className="chip-removed">— {item}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="comp-arrow-divider">
              <div className="divider-icon-box">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="divider-speed-label">~240ms</span>
            </div>

            <div className="comp-card refined">
              <div className="comp-head">
                <div className="comp-badge-group">
                  <span className="badge-dot-white" />
                  <span className="badge-text">Refined Text Output</span>
                </div>
                <span className="meta-tag active">{activePreset.context}</span>
              </div>
              <div className="comp-content">
                <p className="quote-text refined">{activePreset.cleaned}</p>
              </div>
              <div className="comp-meta-footer">
                <span className="footer-label">Formatting Enhancements:</span>
                <div className="tag-chips">
                  {activePreset.added.map((item, idx) => (
                    <span key={idx} className="chip-added">✓ {item}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            3. FEATURES GRID (Minimalist Monochrome Cards)
        ======================================================== */}
        <section className="section features-section" id="features">
          <div className="section-header">
            <span className="section-kicker">Core System Architecture</span>
            <h2 className="section-heading">Engineered for pure efficiency.</h2>
            <p className="section-subheading">
              No bloated UI, no intrusive overlays. A lean native daemon built specifically for modern Android.
            </p>
          </div>

          <div className="features-grid">
            {FEATURES.map((feat, idx) => (
              <div className="feature-card" key={idx}>
                <div className="feature-icon-frame">{feat.icon}</div>
                <div className="feature-body">
                  <div className="feature-title-row">
                    <h3>{feat.title}</h3>
                    <span className="feat-chip">{feat.badge}</span>
                  </div>
                  <p>{feat.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================
            4. INTERACTIVE SIMULATOR (Capsule Pill & Opacity Slider)
        ======================================================== */}
        <section className="section simulator-section" id="simulator">
          <div className="section-header">
            <span className="section-kicker">Interactive Hardware Sandbox</span>
            <h2 className="section-heading">Fine-tune your resting opacity.</h2>
            <p className="section-subheading">
              Test how the capsule pill feels over simulated text. Adjust resting opacity from 30% to 100%, cycle personas, and tap to trigger dictation.
            </p>
          </div>

          <div className="simulator-workbench">
            <div className="simulator-controls-card">
              <div className="control-row">
                <div className="control-label-group">
                  <span className="control-title">Resting Opacity Level</span>
                  <span className="control-description">Transparency when idle above your keyboard</span>
                </div>
                <span className="control-value-badge">{Math.round(simulatorOpacity * 100)}%</span>
              </div>

              {/* Slider Component */}
              <div className="slider-container">
                <input
                  type="range"
                  min="0.30"
                  max="1.00"
                  step="0.05"
                  value={simulatorOpacity}
                  onChange={(e) => setSimulatorOpacity(parseFloat(e.target.value))}
                  className="opacity-range-slider"
                />
                <div className="slider-ticks">
                  <span onClick={() => setSimulatorOpacity(0.3)}>30% Ghost</span>
                  <span onClick={() => setSimulatorOpacity(0.5)}>50% Soft</span>
                  <span onClick={() => setSimulatorOpacity(0.7)}>70% Default</span>
                  <span onClick={() => setSimulatorOpacity(0.85)}>85% Clear</span>
                  <span onClick={() => setSimulatorOpacity(1.0)}>100% Solid</span>
                </div>
              </div>

              {/* Quick Persona Switcher in Simulator */}
              <div className="simulator-personas-row">
                <span className="control-micro-label">Simulate active persona:</span>
                <div className="mini-persona-chips">
                  {DEMO_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      className={`mini-chip ${simulatorPersona.id === p.id ? 'active' : ''}`}
                      onClick={() => setSimulatorPersona(p)}
                    >
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Interactive Preview Board */}
            <div className="simulator-canvas">
              <div className="canvas-header">
                <span className="canvas-header-dot" />
                <span className="canvas-header-title">Background Text Surface (Simulated Readability)</span>
                <span className="canvas-status">{simulatorRecording ? '● ACTIVE RECORDING (100% Solid)' : `IDLE (${Math.round(simulatorOpacity * 100)}% Opacity)`}</span>
              </div>

              <div className="canvas-text-content">
                <p>
                  "The quick brown fox jumps over the lazy dog. When dictating long articles, email threads, or messaging colleagues, a floating widget must remain readily accessible without ever blocking the words you are reading underneath."
                </p>
                <p>
                  "OpenWhispr achieves this balance with a customizable resting alpha channel. Notice how text remains effortlessly readable right behind the capsule."
                </p>

                {/* Simulated Floating Capsule Pill Widget */}
                <div
                  className={`live-sandbox-capsule ${simulatorRecording ? 'recording' : ''}`}
                  style={{
                    opacity: simulatorRecording ? 1.0 : simulatorOpacity,
                  }}
                >
                  {simulatorPickerOpen ? (
                    <div className="sandbox-picker-strip">
                      {DEMO_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          className={`sandbox-picker-slot ${simulatorPersona.id === p.id ? 'active' : ''}`}
                          onClick={() => {
                            setSimulatorPersona(p)
                            setSimulatorPickerOpen(false)
                          }}
                        >
                          {p.icon}
                        </button>
                      ))}
                      <button
                        className="sandbox-picker-close"
                        onClick={() => setSimulatorPickerOpen(false)}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      className="sandbox-persona-btn"
                      onClick={() => setSimulatorPickerOpen(true)}
                    >
                      <span className="sandbox-persona-icon">{simulatorPersona.icon}</span>
                      <span className="sandbox-persona-label">{simulatorPersona.label}</span>
                      <span className="sandbox-arrow">▾</span>
                    </button>
                  )}

                  <div className="sandbox-divider" />

                  <button
                    className={`sandbox-mic-btn ${simulatorRecording ? 'recording' : ''}`}
                    onClick={toggleSimulatorRecord}
                    title="Tap to test recording state"
                  >
                    {simulatorRecording ? (
                      <span className="sandbox-rec-square" />
                    ) : (
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="#000000">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            5. SPEED & BENCHMARKS
        ======================================================== */}
        <section className="section speed-section" id="speed">
          <div className="section-header">
            <span className="section-kicker">Latency Metrics</span>
            <h2 className="section-heading">Sub-second turnaround.</h2>
            <p className="section-subheading">
              Speaking is over 4x faster than thumbs on glass. Combined with ultra-low latency Groq Whisper, your speech appears almost instantaneously.
            </p>
          </div>

          <div className="speed-container">
            <div className="benchmark-list">
              {BENCHMARKS.map((b, idx) => (
                <div className="bench-row" key={idx}>
                  <div className="bench-meta">
                    <span className="bench-label">{b.label}</span>
                    <span className="bench-time">{b.latency} ms</span>
                  </div>
                  <div className="bench-bar-track">
                    <div
                      className="bench-bar-fill"
                      style={{ width: `${Math.min(100, (b.latency / 4200) * 100)}%` }}
                    />
                  </div>
                  <span className="bench-explainer">{b.note}</span>
                </div>
              ))}
            </div>

            <div className="speed-metric-card">
              <span className="metric-super">150+</span>
              <span className="metric-tag">Words Per Minute</span>
              <p className="metric-sub">
                Compared to an average of ~35 WPM on glass keyboards. Save hours every week on messages and notes.
              </p>
              <div className="metric-badge-white">4.2x Faster Communication</div>
            </div>
          </div>
        </section>

        {/* ========================================================
            6. PRIVACY & ARCHITECTURE
        ======================================================== */}
        <section className="section privacy-section" id="privacy">
          <div className="privacy-card">
            <div className="privacy-header-badge">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Encrypted Keystore · BYOK Architecture</span>
            </div>

            <h2>Your keys. Your speech. Zero telemetry.</h2>
            <p className="privacy-lead">
              Unlike commercial dictation utilities that proxy your conversations through centralized cloud databases, OpenWhispr is 100% direct-to-provider.
            </p>

            <div className="privacy-columns">
              <div className="privacy-col">
                <span className="privacy-col-num">01</span>
                <h4>Direct TLS Stream</h4>
                <p>Speech audio travels strictly from your phone to Groq or Deepgram. No intermediary proxy server ever touches your audio.</p>
              </div>
              <div className="privacy-col">
                <span className="privacy-col-num">02</span>
                <h4>Android Hardware Keystore</h4>
                <p>Your API keys are encrypted at rest with MasterKeys AES-256 GCM in the secure enclave. Keys never leave the device.</p>
              </div>
              <div className="privacy-col">
                <span className="privacy-col-num">03</span>
                <h4>100% Free & Open Source</h4>
                <p>No user tracking, no analytics SDKs, and no subscriptions. Inspect and build the complete source code directly on GitHub.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            7. FAQ SECTION
        ======================================================== */}
        <section className="section faq-section" id="faq">
          <div className="section-header">
            <span className="section-kicker">Documentation & Help</span>
            <h2 className="section-heading">Frequently Asked Questions</h2>
          </div>

          <div className="faq-list">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <div className={`faq-row ${isOpen ? 'open' : ''}`} key={index}>
                  <button
                    className="faq-q-btn"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span className="faq-icon-indicator">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="faq-a-body">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ========================================================
            8. FINAL CTA & FOOTER
        ======================================================== */}
        <section className="section cta-section">
          <div className="cta-banner">
            <h2>Stop typing. Start whispering.</h2>
            <p>Download the APK directly to your phone or inspect the open-source code.</p>

            <div className="cta-button-row">
              <a className="btn btn-primary btn-lg" href={DOWNLOAD_URL}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
                </svg>
                <span>Download OpenWhispr APK</span>
              </a>
              <a className="btn btn-secondary btn-lg" href={GITHUB_URL} target="_blank" rel="noreferrer">
                <span>View on GitHub</span>
              </a>
            </div>

            <span className="cta-disclaimer">Android 8.0+ · ~28 MB · MIT Open Source License</span>
          </div>

          <footer className="footer-bar">
            <div className="footer-left">
              <span className="logo-box mini">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                </svg>
              </span>
              <span>OpenWhispr — Minimalist voice dictation for Android.</span>
            </div>

            <div className="footer-right">
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
              <a href="#hero">Back to top ↑</a>
            </div>
          </footer>
        </section>
      </main>
    </div>
  )
}

export default App
