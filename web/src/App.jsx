import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import './App.css'

const DOWNLOAD_URL =
  'https://github.com/YOUR_USERNAME/openwisper-android/releases/latest/download/OpenWhispr.apk'
const GITHUB_URL = 'https://github.com/YOUR_USERNAME/openwisper-android'

// Preset speech examples for the interactive demo and comparison
const DEMO_PRESETS = [
  {
    id: 'casual',
    label: 'Casual Chat',
    icon: '💬',
    context: 'WhatsApp / Telegram',
    raw: 'um so basically yeah I was thinking we should like reschedule our sync to 3pm if that is cool with everyone',
    cleaned: 'Can we reschedule our sync to 3:00 PM today if that works for everyone?',
    removed: ['um', 'so basically yeah', 'like', 'is cool with everyone'],
    added: ['Proper punctuation', '3:00 PM formatted', 'Polite phrasing'],
  },
  {
    id: 'email',
    label: 'Work Email',
    icon: '💼',
    context: 'Gmail / Outlook',
    raw: 'hey Sarah uh quick update on the q3 launch we need to kinda hold off until engineering merges the security fixes',
    cleaned: 'Hi Sarah, quick update on the Q3 launch: we need to hold off until Engineering merges the security fixes.',
    removed: ['uh', 'kinda'],
    added: ['Capitalized Q3 & Engineering', 'Colon structure', 'Formal greeting'],
  },
  {
    id: 'notes',
    label: 'Task List',
    icon: '📝',
    context: 'Google Keep / Notion',
    raw: 'okay action items first fix the api key error second update floating dock clearance to 48dp and third build the release apk',
    cleaned: '• Fix API key error\n• Update floating dock clearance to 48dp\n• Build release APK',
    removed: ['okay action items first', 'second', 'and third'],
    added: ['Auto-bullet formatting', 'Imperative action verbs', 'Clean list'],
  },
  {
    id: 'code',
    label: 'Code / Dev',
    icon: '💻',
    context: 'GitHub / Slack Dev',
    raw: 'const is ready equals false then if user is authenticated arrow function set is ready to true',
    cleaned: 'const isReady = false;\nif (user?.isAuthenticated) {\n  setIsReady(true);\n}',
    removed: ['equals', 'then', 'arrow function', 'to true'],
    added: ['camelCase variables', 'TypeScript syntax', 'Formatted logic'],
  },
  {
    id: 'translate',
    label: 'To English',
    icon: '🌐',
    context: 'Multilingual Voice Input',
    raw: 'por favor envía el reporte financiero antes de las cinco de la tarde muchas gracias',
    cleaned: 'Please send the financial report before 5:00 PM today. Thank you very much!',
    removed: ['Spanish source audio', 'Conversational pauses'],
    added: ['Instant English translation', 'Standard 5:00 PM time', 'Pristine punctuation'],
  },
]

const FEATURES = [
  {
    icon: '🎤',
    title: 'Floating Ember Orb',
    body: 'Rides smoothly on top of any app. Tap once to dictate into WhatsApp, Gmail, Slack, Twitter/X, or any text box.',
  },
  {
    icon: '✨',
    title: 'Instant AI Cleanup',
    body: 'Removes "ums", stutters, and false starts. Fixes grammar and punctuation, keeping your exact voice and intent.',
  },
  {
    icon: '⌨️',
    title: 'Smart Keyboard Dock',
    body: 'Configurable dock clearance (24dp, 48dp, 80dp, 120dp) with left/right side docking so it never covers your keys.',
  },
  {
    icon: '🔑',
    title: 'Bring Your Own Key (BYOK)',
    body: 'Plug in free Groq or Deepgram keys. Zero subscriptions, zero middleman proxy, and complete ownership of your data.',
  },
  {
    icon: '⚡',
    title: 'Sub-Second Latency',
    body: 'Powered by Deepgram Nova-3 & Groq Whisper Large v3 Turbo for transcriptions in as fast as ~240ms.',
  },
  {
    icon: '🛡️',
    title: 'Hardware Keystore Security',
    body: 'All API keys are encrypted on-device using Android Keystore MasterKeys AES-256 GCM. Never sent to any 3rd party.',
  },
]

const ENGINES = [
  { name: 'Groq Whisper', type: 'STT', latency: '~240ms', tier: 'Free Tier Available' },
  { name: 'Deepgram Nova-3', type: 'STT', latency: '~310ms', tier: '$200 Free Credit' },
  { name: 'OpenAI Whisper', type: 'STT', latency: '~920ms', tier: 'Pay as you go' },
  { name: 'Llama 3.3 70B', type: 'LLM Cleanup', latency: '~180ms', tier: 'Ultra fast on Groq' },
  { name: 'Gemini 1.5 Flash', type: 'LLM Cleanup', latency: '~260ms', tier: 'Free quota' },
  { name: 'GPT-4o mini', type: 'LLM Cleanup', latency: '~350ms', tier: 'High accuracy' },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Tap the Floating Ember',
    description:
      'A compact ember bubble rests above your active keyboard. One quick tap starts background 16kHz PCM audio recording.',
    badge: 'System Alert Window',
  },
  {
    step: '02',
    title: 'Stream to Whisper at ~250ms',
    description:
      'Raw audio is streamed directly to Groq Whisper or Deepgram Nova-3 over TLS for instantaneous transcription.',
    badge: 'Zero Middleman Proxy',
  },
  {
    step: '03',
    title: 'AI Polishes & Auto-Pastes',
    description:
      'The cleanup engine strips verbal fillers, fixes grammar, and pastes polished text straight into your text field.',
    badge: 'Hardware Keystore AES-256',
  },
]

const BENCHMARKS = [
  { label: 'Groq Whisper Turbo', latency: 240, color: 'var(--ember)', note: 'Fastest STT Engine' },
  { label: 'Deepgram Nova-3', latency: 310, color: '#f2c08a', note: 'Top Conversational Accuracy' },
  { label: 'OpenAI Whisper Cloud', latency: 920, color: '#93b884', note: 'Standard Cloud Latency' },
  { label: 'Manual Keyboard Typing', latency: 4200, color: '#685e52', note: '10x slower than voice' },
]

const FAQS = [
  {
    q: 'How do I get free API keys for Groq or Deepgram?',
    a: 'Both services offer generous free developer tiers! You can sign up at console.groq.com (free Whisper & Llama 3.3 usage) or deepgram.com ($200 free credit, no credit card required). Simply paste your API key into OpenWhispr settings.',
  },
  {
    q: 'Does OpenWhispr require Root or Shizuku?',
    a: 'No root or special ADB tooling is required. OpenWhispr uses standard Android permissions: "Draw over other apps" (Overlay) to display the floating mic and "Microphone" to capture your audio.',
  },
  {
    q: 'How does the floating mic stay above the keyboard?',
    a: 'OpenWhispr includes an optional Accessibility service that detects when the soft keyboard opens and docks the mic right above the keyboard frame with configurable clearance (24dp, 48dp, 80dp, or 120dp). When the keyboard closes, it stays tucked to the side.',
  },
  {
    q: 'Does OpenWhispr record, store, or sell my voice data?',
    a: 'Never. OpenWhispr has zero central servers, zero cloud database, and zero analytics telemetry. Audio recordings exist only in memory during dictation and travel directly from your phone to your selected API provider over encrypted HTTPS.',
  },
  {
    q: 'Can I customize the AI cleanup prompt or language?',
    a: 'Yes! In the Settings screen, you can specify default language (defaults to English), switch cleanup models, change prompt instructions, or tweak punctuation and formatting behavior.',
  },
  {
    q: 'Is OpenWhispr really free?',
    a: 'Yes, 100% free and open-source under the MIT license. You bring your own API keys, meaning you pay zero app subscription fees and own your speech workflow completely.',
  },
]

const NAV_SECTIONS = [
  { id: 'hero', label: 'Overview' },
  { id: 'showcase', label: 'Showcase' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'benchmarks', label: 'Speed' },
  { id: 'features', label: 'Features' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'faq', label: 'FAQ' },
  { id: 'cta', label: 'Download' },
]

function App() {
  const [copied, setCopied] = useState(false)
  const [activePreset, setActivePreset] = useState(DEMO_PRESETS[0])
  const [openFaq, setOpenFaq] = useState(0)

  // Interactive phone demo state
  const [phoneState, setPhoneState] = useState('cleaned')
  const [phonePresetIndex, setPhonePresetIndex] = useState(0)
  const currentPhonePreset = DEMO_PRESETS[phonePresetIndex]

  // Scroll tracking & active rail section
  const [activeSection, setActiveSection] = useState('hero')

  useEffect(() => {
    // 1. Intersection Observer for progressive scroll reveals
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )

    const revealElements = document.querySelectorAll('.reveal-on-scroll, .reveal-stagger')
    revealElements.forEach((el) => observer.observe(el))

    // 2. Scroll listener for active rail section
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

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
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
      setPhoneState('raw')
      setTimeout(() => {
        setPhoneState('cleaned')
      }, 1400)
    }, 1200)
  }

  const handleNextPhonePreset = () => {
    const nextIdx = (phonePresetIndex + 1) % DEMO_PRESETS.length
    setPhonePresetIndex(nextIdx)
    setPhoneState('cleaned')
  }

  return (
    <div className="site-wrapper">
      {/* Side Slide Navigation Rail (Desktop) */}
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
          STICKY TOP HEADER (Full Width, Frosted Glass)
      ======================================================== */}
      <header className="site-header">
        <div className="header-inner">
          <a href="#hero" className="nav-brand">
            <span className="logo-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15Z" />
                <path
                  d="M18.5 11.5a6.5 6.5 0 0 1-13 0M12 18v3.5M8.5 21.5h7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </span>
            <span className="brand-name">OpenWhispr</span>
            <span className="nav-badge">Android</span>
          </a>

          <nav className="nav-links">
            <a href="#showcase" className={activeSection === 'showcase' ? 'active' : ''}>Showcase</a>
            <a href="#how-it-works" className={activeSection === 'how-it-works' ? 'active' : ''}>How It Works</a>
            <a href="#benchmarks" className={activeSection === 'benchmarks' ? 'active' : ''}>Speed</a>
            <a href="#features" className={activeSection === 'features' ? 'active' : ''}>Features</a>
            <a href="#privacy" className={activeSection === 'privacy' ? 'active' : ''}>Privacy</a>
            <a href="#faq" className={activeSection === 'faq' ? 'active' : ''}>FAQ</a>
          </nav>

          <div className="header-actions">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="nav-github">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z" />
              </svg>
              <span>GitHub</span>
            </a>
            <a href={DOWNLOAD_URL} className="nav-cta-btn">
              <span>Get APK</span>
            </a>
          </div>
        </div>
      </header>

      <div className="page">
        {/* ========================================================
            1. HERO SECTION (Full Page Slide)
        ======================================================== */}
        <section className="fullpage-section hero-screen" id="hero">
          <div className="hero">
            <div className="hero-copy reveal-on-scroll">
              <div className="hero-pill">
                <span className="pulse-dot" /> Free & Open Source · BYOK Architecture
              </div>

              <h1>
                Your voice,
                <br />
                <em>refined</em> anywhere.
              </h1>

              <p className="hero-sub">
                OpenWhispr turns raw, imperfect speech into pristine text across every Android app.
                Tap the floating ember bubble, speak naturally, and let AI polish your words before they land.
              </p>

              <div className="hero-actions">
                <a className="btn btn-primary" href={DOWNLOAD_URL}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
                  </svg>
                  <span>Download APK</span>
                  <span className="btn-tag">v1.0.2</span>
                </a>

                <a className="btn btn-ghost" href="#showcase">
                  <span>Explore Demo</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </a>
              </div>

              {/* QR Card */}
              <div className="qr-card">
                <div className="qr-frame">
                  <QRCode
                    value={DOWNLOAD_URL}
                    size={110}
                    fgColor="#151210"
                    bgColor="transparent"
                    level="M"
                  />
                </div>
                <div className="qr-copy">
                  <div className="qr-title-row">
                    <strong>Scan to install on Android</strong>
                    <span className="qr-chip">Free APK</span>
                  </div>
                  <span>Point your camera to download directly. No Play Store account required.</span>
                  <button className="copy-btn" onClick={copyLink}>
                    {copied ? '✓ Link copied to clipboard' : 'Copy download link'}
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Phone Mockup */}
            <div className="hero-visual reveal-on-scroll" aria-hidden="true">
              <div className="phone-wrapper">
                <div className="phone">
                  {/* Unified Status Bar */}
                  <div className="phone-status">
                    <span className="status-time">9:41</span>
                    <div className="phone-notch" />
                    <span className="status-battery" />
                  </div>

                  {/* Inner Screen */}
                  <div className="mock-app">
                    <div className="mock-header">
                      <div className="mock-header-badge">
                        <span className="mock-indicator" />
                        <span>{currentPhonePreset.context}</span>
                      </div>
                      <button
                        className="mock-switch-btn"
                        onClick={handleNextPhonePreset}
                        title="Switch scenario"
                      >
                        Next preset ↻
                      </button>
                    </div>

                    <div className="mock-content">
                      {phoneState === 'listening' ? (
                        <div className="mock-listening-state">
                          <div className="mock-soundwave">
                            <span /><span /><span /><span /><span />
                          </div>
                          <p className="mock-listening-label">Listening to speech...</p>
                        </div>
                      ) : phoneState === 'raw' ? (
                        <div className="mock-raw-state">
                          <span className="mock-state-tag raw">Raw Whisper</span>
                          <p className="mock-transcript raw">{currentPhonePreset.raw}</p>
                          <div className="mock-caret" />
                        </div>
                      ) : (
                        <div className="mock-cleaned-state">
                          <div className="mock-state-row">
                            <span className="mock-state-tag polished">✨ OpenWhispr AI</span>
                            <span className="mock-speed-tag">~240ms</span>
                          </div>
                          <p className="mock-transcript cleaned">{currentPhonePreset.cleaned}</p>
                          <div className="mock-caret" />
                        </div>
                      )}
                    </div>

                    {/* Floating Action Mic Bubble */}
                    <button
                      className={`float-bubble ${phoneState === 'listening' ? 'active' : ''}`}
                      onClick={handleMicTap}
                      title="Tap to test dictation"
                    >
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15Z" />
                        <path
                          d="M18.5 11.5a6.5 6.5 0 0 1-13 0M12 18v3.5M8.5 21.5h7"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                      <span className="bubble-halo" />
                      <span className="bubble-halo two" />
                    </button>
                  </div>

                  <div className="phone-home" />
                </div>

                <div className="phone-hint">
                  <span className="hint-arrow">↗</span>
                  <span>Tap the ember mic to simulate real-time cleanup</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll Down Indicator */}
          <div className="scroll-hint-bar">
            <a href="#showcase" className="scroll-hint-link">
              <span>Scroll to explore</span>
              <span className="scroll-hint-chevron">↓</span>
            </a>
          </div>
        </section>

        {/* ========================================================
            2. BEFORE & AFTER SHOWCASE (Full Page Slide)
        ======================================================== */}
        <section className="fullpage-section showcase-section" id="showcase">
          <div className="section-head reveal-on-scroll">
            <span className="section-eyebrow">Transformation Engine</span>
            <h2>
              Raw thought in. <em>Pristine text</em> out.
            </h2>
            <p className="section-desc">
              Speak as messy and informal as you want. OpenWhispr strips hesitations, eliminates filler words, and restructures your sentence before pasting it.
            </p>
          </div>

          <div className="preset-tabs reveal-on-scroll">
            {DEMO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`preset-tab ${activePreset.id === preset.id ? 'active' : ''}`}
                onClick={() => setActivePreset(preset)}
              >
                <span className="preset-icon">{preset.icon}</span>
                <span className="preset-label">{preset.label}</span>
                <span className="preset-app">{preset.context}</span>
              </button>
            ))}
          </div>

          <div className="comparison-board reveal-on-scroll">
            <div className="comp-card raw-card">
              <div className="comp-card-head">
                <div className="comp-tag-group">
                  <span className="comp-badge raw">Raw Voice Input</span>
                  <span className="comp-meta">Unfiltered STT</span>
                </div>
                <span className="comp-indicator-dot raw" />
              </div>

              <div className="comp-body">
                <p className="comp-text raw">"{activePreset.raw}"</p>
              </div>

              <div className="comp-footer">
                <span className="comp-critique-label">Detected Fillers:</span>
                <div className="comp-tags-row">
                  {activePreset.removed.map((r, i) => (
                    <span className="filler-chip" key={i}>
                      — {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="comp-divider">
              <div className="comp-sparkle-circle">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="comp-divider-label">Groq + Llama 3.3</span>
            </div>

            <div className="comp-card clean-card">
              <div className="comp-card-head">
                <div className="comp-tag-group">
                  <span className="comp-badge clean">✨ OpenWhispr Polished</span>
                  <span className="comp-meta">Target Input Field</span>
                </div>
                <span className="comp-indicator-dot clean" />
              </div>

              <div className="comp-body">
                <p className="comp-text clean">{activePreset.cleaned}</p>
              </div>

              <div className="comp-footer">
                <span className="comp-critique-label">AI Enhancements:</span>
                <div className="comp-tags-row">
                  {activePreset.added.map((a, i) => (
                    <span className="enhancement-chip" key={i}>
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            3. HOW IT WORKS (Full Page Slide)
        ======================================================== */}
        <section className="fullpage-section how-section" id="how-it-works">
          <div className="section-head reveal-on-scroll">
            <span className="section-eyebrow">Architecture Flow</span>
            <h2>
              Engineered for <em>effortless speed</em>
            </h2>
            <p className="section-desc">
              Zero friction. No switching apps, no copy-pasting, and no subscription paywalls.
            </p>
          </div>

          <div className="how-grid reveal-stagger">
            {HOW_IT_WORKS.map((step) => (
              <div className="how-card" key={step.step}>
                <div className="how-num">{step.step}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <div className="how-badge">{step.badge}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================
            4. SPEED & LATENCY BENCHMARKS (Full Page Slide)
        ======================================================== */}
        <section className="fullpage-section benchmarks-section" id="benchmarks">
          <div className="section-head reveal-on-scroll">
            <span className="section-eyebrow">Real-World Latency</span>
            <h2>
              Fast enough to feel <em>instant</em>
            </h2>
            <p className="section-desc">
              Speaking is over 4x faster than thumbs on glass. Combined with ultra-low latency Groq Whisper and Deepgram Nova-3, text appears almost the moment you finish speaking.
            </p>
          </div>

          <div className="benchmark-box reveal-on-scroll">
            <div className="benchmark-bars">
              {BENCHMARKS.map((item) => (
                <div className="bench-row" key={item.label}>
                  <div className="bench-info">
                    <span className="bench-name">{item.label}</span>
                    <span className="bench-val" style={{ color: item.color }}>
                      {item.latency} ms
                    </span>
                  </div>
                  <div className="bench-track">
                    <div
                      className="bench-fill"
                      style={{
                        width: `${Math.min(100, (item.latency / 4200) * 100)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <span className="bench-note">{item.note}</span>
                </div>
              ))}
            </div>

            <div className="benchmark-stat-card">
              <div className="stat-number">150+</div>
              <div className="stat-label">Words Per Minute</div>
              <div className="stat-sub">
                Versus ~35 WPM on average touch screen keyboards. Save hours every week on messages and notes.
              </div>
              <div className="stat-pill">4.2x Faster Communication</div>
            </div>
          </div>
        </section>

        {/* ========================================================
            5. FEATURES (Full Page Slide)
        ======================================================== */}
        <section className="fullpage-section features" id="features">
          <div className="section-head reveal-on-scroll">
            <span className="section-eyebrow">Power & Flexibility</span>
            <h2>
              Dictation that <em>keeps up</em> with you
            </h2>
            <p className="section-desc">
              Built from the ground up for power users who want professional dictation on Android without compromise.
            </p>
          </div>

          <div className="feature-grid reveal-stagger">
            {FEATURES.map((f) => (
              <article className="feature-card" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ========================================================
            6. PRIVACY & SECURITY (Full Page Slide)
        ======================================================== */}
        <section className="fullpage-section privacy-section" id="privacy">
          <div className="privacy-card reveal-on-scroll">
            <div className="privacy-badge">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4Zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8Z" />
              </svg>
              <span>Absolute Privacy · BYOK (Bring Your Own Key)</span>
            </div>

            <h2>Your voice. Your keys. No middleman.</h2>

            <p className="privacy-copy">
              Unlike commercial speech apps that route your private conversations through proprietary proxy servers and charge a $15/month subscription, OpenWhispr is 100% direct-to-provider.
            </p>

            <div className="privacy-pillars reveal-stagger">
              <div className="pillar">
                <div className="pillar-icon">🔒</div>
                <h4>Direct TLS API Calls</h4>
                <p>Speech audio travels strictly from your phone to your configured Groq or Deepgram endpoint. We operate zero cloud servers.</p>
              </div>

              <div className="pillar">
                <div className="pillar-icon">🗝️</div>
                <h4>Hardware Keystore Vault</h4>
                <p>API keys are secured with Android Keystore MasterKeys AES-256 GCM encryption. Keys never leave your device.</p>
              </div>

              <div className="pillar">
                <div className="pillar-icon">🚫</div>
                <h4>Zero Telemetry or Ads</h4>
                <p>No tracking scripts, no analytics SDKs, and no user profiling. Pure, clean, transparent open-source software.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            7. FAQ (Full Page Slide)
        ======================================================== */}
        <section className="fullpage-section faq-section" id="faq">
          <div className="section-head reveal-on-scroll">
            <span className="section-eyebrow">Got Questions?</span>
            <h2>Frequently Asked Questions</h2>
            <p className="section-desc">
              Everything you need to know about setting up and using OpenWhispr on your phone.
            </p>
          </div>

          <div className="faq-accordion reveal-stagger">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <div className={`faq-item ${isOpen ? 'open' : ''}`} key={index}>
                  <button
                    className="faq-question"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span className="faq-chevron">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ========================================================
            8. FINAL CTA & FOOTER (Full Page Slide)
        ======================================================== */}
        <section className="fullpage-section cta-section" id="cta">
          <div className="cta-box reveal-on-scroll">
            <div className="cta-glow" />
            <h2>
              Stop typing. <em>Start whispering.</em>
            </h2>
            <p className="cta-desc">
              Download the APK directly to your Android device or build it from source. Free forever, no registration needed.
            </p>
            <div className="cta-buttons">
              <a className="btn btn-primary btn-large" href={DOWNLOAD_URL}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
                </svg>
                <span>Download OpenWhispr APK</span>
              </a>
              <a className="btn btn-ghost btn-large" href={GITHUB_URL} target="_blank" rel="noreferrer">
                <span>View Source on GitHub</span>
              </a>
            </div>
            <p className="cta-note">Android 8.0+ · ~28 MB · MIT Open Source License</p>
          </div>

          {/* Footer */}
          <footer className="footer">
            <div className="footer-top">
              <div className="footer-brand">
                <span className="logo-mark" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15Z" />
                    <path
                      d="M18.5 11.5a6.5 6.5 0 0 1-13 0M12 18v3.5M8.5 21.5h7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </span>
                <strong>OpenWhispr</strong>
              </div>
              <div className="footer-links">
                <a href="#hero">Overview</a>
                <a href="#showcase">Showcase</a>
                <a href="#how-it-works">How It Works</a>
                <a href="#benchmarks">Speed</a>
                <a href="#features">Features</a>
                <a href="#privacy">Privacy</a>
                <a href="#faq">FAQ</a>
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
              </div>
            </div>

            <div className="footer-bottom">
              <span>OpenWhispr — Your voice, refined anywhere on your phone.</span>
              <span className="footer-license">Distributed under the MIT License</span>
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}

export default App
