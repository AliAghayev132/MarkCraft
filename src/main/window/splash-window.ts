// ── node: ──────────────────────────────────────────────────────────────────
import path from 'node:path'

// ── electron ───────────────────────────────────────────────────────────────
import { BrowserWindow, app } from 'electron'

// ── types ──────────────────────────────────────────────────────────────────
import type { SplashOptions } from './types'

/**
 * The launch splash.
 *
 * It exists for one honest reason: the first window cannot be shown until the
 * renderer has parsed a few megabytes of editor bundle, and a cold start with
 * nothing on screen reads as a failed launch. The splash gives that wait a
 * face, and is deliberately capped — it is never allowed to *add* to the wait
 * beyond its minimum, and never to outlast the app being ready.
 *
 * Self-contained by design: the markup is a data URL rather than a file in the
 * renderer bundle, so the splash can appear before Vite, React or any of the
 * application's own code has been touched. That is also why the theme is passed
 * *in*: main resolves it from settings, because nothing here can read the
 * store.
 */
const WIDTH = 300
const HEIGHT = 176

let splash: BrowserWindow | null = null

/**
 * The two palettes, kept to the few tokens this window actually uses.
 *
 * They are literals rather than imports from the renderer's token file: this
 * window cannot load application code, and duplicating four colours is a better
 * trade than making the splash depend on the bundle it exists to cover for.
 */
const PALETTE = {
  dark: {
    surface: '#171a22',
    border: 'rgba(255,255,255,0.08)',
    text: '#e8ebf2',
    muted: 'rgba(255,255,255,0.10)',
    shadow: 'rgba(0,0,0,0.45)'
  },
  light: {
    surface: '#ffffff',
    border: 'rgba(16,20,28,0.10)',
    text: '#1b2029',
    muted: 'rgba(16,20,28,0.09)',
    shadow: 'rgba(16,20,28,0.18)'
  }
} as const

export function createSplashWindow(options: SplashOptions): BrowserWindow {
  splash = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    center: true,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    icon: appIcon(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // The chime is played without a click having happened, which is exactly
      // what the default policy blocks. Safe here: this window plays one sound
      // it generates itself and loads nothing remote.
      autoplayPolicy: 'no-user-gesture-required'
    }
  })

  splash.once('ready-to-show', () => splash?.show())
  void splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(markup(options))}`)

  return splash
}

export function closeSplashWindow(): void {
  if (splash && !splash.isDestroyed()) {
    // Fade out rather than vanish: an abrupt disappearance reads as a crash.
    splash.webContents.executeJavaScript('window.__fadeOut?.()').catch(() => undefined)
    const target = splash
    setTimeout(() => {
      if (!target.isDestroyed()) target.destroy()
    }, 240)
  }
  splash = null
}

/** The packaged icon, or the source PNG in development. */
export function appIcon(): string | undefined {
  const file = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(app.getAppPath(), 'build', 'icon.png')

  return process.platform === 'linux' || !app.isPackaged ? file : undefined
}

function markup({ theme, sound }: SplashOptions): string {
  const c = PALETTE[theme]

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>MarkCraft</title>
<style>
  :root { color-scheme: ${theme} }
  * { margin: 0; padding: 0; box-sizing: border-box }

  html, body {
    width: 100%; height: 100%;
    background: transparent;
    overflow: hidden;
    -webkit-user-select: none; user-select: none;
    font-family: ui-sans-serif, "Segoe UI", system-ui, sans-serif;
  }

  .card {
    width: 100%; height: 100%;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 16px;
    border-radius: 14px;
    border: 1px solid ${c.border};
    background: ${c.surface};
    box-shadow: 0 12px 32px ${c.shadow};
    opacity: 0;
    transition: opacity 220ms ease;
  }
  .card.in { opacity: 1 }
  .card.out { opacity: 0 }

  /* The mark is drawn at its own scale: no tile behind it, because the card
     already is one. */
  .mark { display: block }

  .name {
    font-size: 14px; font-weight: 600; letter-spacing: 0.01em;
    color: ${c.text};
  }

  .track {
    width: 108px; height: 2px; border-radius: 2px;
    background: ${c.muted};
    overflow: hidden;
  }
  .bar {
    display: block; width: 34%; height: 100%; border-radius: 2px;
    background: ${c.text};
    opacity: 0.55;
    animation: sweep 1400ms cubic-bezier(0.4, 0, 0.3, 1) infinite;
  }
  @keyframes sweep {
    from { transform: translateX(-105%) }
    to   { transform: translateX(400%) }
  }

  @media (prefers-reduced-motion: reduce) {
    .card { transition: none }
    .bar { animation: none; width: 100% }
  }
</style>
</head>
<body>
  <div class="card" id="card">
    <!-- The same geometry as build/icon.svg, drawn in the theme's ink rather
         than on a white tile — a white square on a light card would be a
         rectangle floating in nothing. -->
    <svg class="mark" viewBox="0 0 64 64" width="52" height="52" aria-hidden="true">
      <g stroke="${c.text}" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <rect x="11.5" y="12.5" width="41" height="39" rx="10" stroke-width="2.6"/>
        <path d="M18.25 31.5 V19 L23.5 26.8 L28.75 19 V31.5" stroke-width="3"/>
        <path d="M44.41 21.1 A6.2 6.2 0 1 0 44.41 29.4" stroke-width="3"/>
        <path d="M17.5 37.5 H46.5" stroke-width="1.7"/>
        <path d="M17.5 42 H46.5" stroke-width="1.7"/>
        <path d="M17.5 46.5 H36.5" stroke-width="1.7"/>
      </g>
    </svg>

    <div class="name">MarkCraft</div>
    <div class="track"><span class="bar"></span></div>
  </div>

<script>
  const card = document.getElementById('card')
  requestAnimationFrame(() => card.classList.add('in'))

  window.__fadeOut = () => card.classList.add('out')

  ${sound ? CHIME : ''}
</script>
</body>
</html>`
}

/**
 * A short, soft launch chime, synthesised rather than shipped as an audio file:
 * no binary asset, no codec, no licence, and it is quiet by construction.
 *
 * Two sine partials a fifth apart over a low pad, each with a long attack and a
 * gentle exponential release — the envelope is what keeps it from sounding like
 * a notification.
 */
const CHIME = `
  try {
    const audio = new AudioContext()

    const bus = audio.createGain()
    bus.gain.value = 0.9
    bus.connect(audio.destination)

    const voice = (frequency, start, duration, peak) => {
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.value = frequency

      const t = audio.currentTime + start
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.10)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)

      oscillator.connect(gain)
      gain.connect(bus)
      oscillator.start(t)
      oscillator.stop(t + duration + 0.05)
    }

    voice(174.6, 0.00, 1.60, 0.020)          // low pad, felt more than heard
    voice(523.3, 0.06, 1.25, 0.045)          // C5
    voice(784.0, 0.20, 1.35, 0.032)          // G5 — a fifth above, slightly later
    voice(1046.5, 0.34, 1.10, 0.014)         // C6 shimmer

    void audio.resume()
  } catch {}
`
