import { useState } from 'react'
import QRCode from 'react-qr-code'
import './App.css'

/**
 * ⬇️ Put your GitHub release link here when it's ready.
 * The QR code and the download button both point to this URL —
 * scanning it on an Android phone starts the APK download directly.
 */
const DOWNLOAD_URL =
  'https://github.com/YOUR_USERNAME/openwisper-android/releases/latest/download/OpenWhispr.apk'

const GITHUB_URL = 'https://github.com/YOUR_USERNAME/openwisper-android'

const features = [
  {
    icon: '🎤',
    title: 'Speak, anywhere',
    body: 'A floating ember bubble rides on top of any app — tap it and dictate straight into WhatsApp, Chrome, or any input field.',
  },
  {
    icon: '✨',
    title: 'AI-polished text',
    body: 'Your raw speech is transcribed, then an LLM removes the “ums”, fixes grammar, and structures it into clean text.',
  },
  {
    icon: '⌨️',
    title: 'Smart keyboard dock',
    body: 'The mic appears above your keyboard only while you type, then politely gets out of the way.',
  },
  {
    icon: '🔑',
    title: 'Your keys, your models',
    body: 'Bring your own API — Deepgram, Groq, OpenAI Whisper, Gemini, or any custom endpoint. No middleman, no subscription.',
  },
]

const engines = ['Surplus Intelligence', 'Deepgram Nova-3', 'Groq Whisper', 'OpenAI Whisper', 'Llama 3.3', 'GPT-4o mini', 'Gemini']

function App() {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(DOWNLOAD_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="page">
      <div className="hero-screen">
        {/* Nav */}
        <nav className="nav">
          <div className="nav-brand">
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
            OpenWhispr
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#download">Download</a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="nav-github">
              GitHub
            </a>
          </div>
        </nav>

        {/* Hero */}
        <header className="hero">
          <div className="hero-copy">
            <div className="hero-pill">
              <span className="pulse-dot" /> Free & open source · Android
            </div>
            <h1>
              Your voice,
              <br />
              <em>refined</em> anywhere.
            </h1>
            <p className="hero-sub">
              OpenWhispr turns raw speech into polished text in any app. Tap the floating bubble,
              talk naturally, and let AI clean it up before it lands wherever you're typing.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href={DOWNLOAD_URL}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
                </svg>
                Download APK
              </a>
              <a className="btn btn-ghost" href={GITHUB_URL} target="_blank" rel="noreferrer">
                View on GitHub
              </a>
            </div>

            {/* QR card */}
            <div className="qr-card" id="download">
              <div className="qr-frame">
                <QRCode
                  value={DOWNLOAD_URL}
                  size={132}
                  fgColor="#151210"
                  bgColor="transparent"
                  level="M"
                />
              </div>
              <div className="qr-copy">
                <strong>Scan to install</strong>
                <span>Point your Android camera at the code — the download starts instantly. No store needed.</span>
                <button className="copy-btn" onClick={copyLink}>
                  {copied ? '✓ Link copied' : 'Copy download link'}
                </button>
              </div>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="hero-visual" aria-hidden="true">
            <div className="phone">
              <div className="phone-status">
                <span className="status-time">9:41</span>
                <div className="phone-notch" />
                <span className="status-battery" />
              </div>
              <div className="mock-app">
                <div className="mock-line short" />
                <div className="mock-line" />
                <div className="mock-line" />
                <div className="mock-line short" />
                <div className="mock-caret" />
                <div className="float-bubble">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15Z" />
                    <path d="M18.5 11.5a6.5 6.5 0 0 1-13 0M12 18v3.5M8.5 21.5h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                  </svg>
                  <span className="bubble-halo" />
                  <span className="bubble-halo two" />
                </div>
              </div>
              <div className="phone-home" />
            </div>
          </div>
        </header>
      </div>

      {/* Features */}
      <section className="features" id="features">
        <h2>
          Dictation that <em>keeps up</em> with you
        </h2>
        <div className="feature-grid">
          {features.map((f) => (
            <article className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Engines strip */}
      <section className="engines">
        <p className="engines-label">Works with the engines you already trust</p>
        <div className="engines-row">
          {engines.map((e) => (
            <span className="engine-chip" key={e}>
              {e}
            </span>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="cta">
        <h2>
          Stop typing. <em>Start whispering.</em>
        </h2>
        <a className="btn btn-primary btn-large" href={DOWNLOAD_URL}>
          Download OpenWhispr
        </a>
        <p className="cta-note">Android 8.0+ · ~30 MB · free forever</p>
      </section>

      <footer className="footer">
        <span>OpenWhispr</span>
        <span className="footer-dot" />
        <span>Your voice, refined — anywhere on your phone.</span>
      </footer>
    </div>
  )
}

export default App
